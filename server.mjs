import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { addPlayer, GameError, newRoom, profileFor, selectChoice, stateFor, teacherAction, tick } from './public/game.mjs';

const PUBLIC = fileURLToPath(new URL('./public/', import.meta.url));
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE = /^[A-HJ-NP-Z2-9]{6}$/;
const MIME = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };
const RETENTION = 7 * 24 * 60 * 60 * 1000;
const key = () => randomBytes(24).toString('base64url');
const digest = (value) => createHash('sha256').update(value).digest();
const keyHash = (value) => digest(value).toString('hex');

function json(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  const pieces = [];
  let length = 0;
  for await (const piece of request) {
    length += piece.length;
    if (length > 8192) throw new GameError('요청이 너무 커요.', 413);
    pieces.push(piece);
  }
  try {
    const result = JSON.parse(Buffer.concat(pieces));
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error();
    return result;
  } catch {
    throw new GameError('요청 내용을 읽을 수 없어요.', 400);
  }
}

function staticResponse(pathname, method, response) {
  const filename = resolve(PUBLIC, pathname === '/' ? 'index.html' : `.${pathname}`);
  const type = MIME[extname(filename)];
  if (!filename.startsWith(resolve(PUBLIC) + sep) || !type || !existsSync(filename) || !statSync(filename).isFile()) {
    json(response, 404, { error: '이 페이지를 찾을 수 없어요.' });
    return;
  }
  response.writeHead(200, { 'content-type': type, 'cache-control': 'no-cache' });
  response.end(method === 'HEAD' ? undefined : readFileSync(filename));
}

export function makeServer({ dataDir = process.env.DATA_DIR || './data', hostPin = process.env.HOST_PIN || '', clock = Date.now } = {}) {
  const directory = resolve(dataDir);
  const rooms = new Map();
  const active = new Map();
  const requests = new Map();
  mkdirSync(directory, { recursive: true, mode: 0o700 });

  const roomFile = (code) => resolve(directory, `${code}.json`);
  for (const filename of readdirSync(directory)) {
    const code = filename.slice(0, -5);
    if (!filename.endsWith('.json') || !CODE.test(code)) continue;
    const room = JSON.parse(readFileSync(roomFile(code), 'utf8'));
    if (clock() - room.updated > RETENTION) rmSync(roomFile(code));
    else rooms.set(code, room);
  }

  function commit(room, now) {
    room.revision += 1;
    room.updated = now;
    const file = roomFile(room.code);
    writeFileSync(`${file}.tmp`, JSON.stringify(room), { mode: 0o600 });
    renameSync(`${file}.tmp`, file);
    rooms.set(room.code, room);
    return room;
  }

  function refresh(room, now) {
    if (room.paused || !room.turn?.deadline || room.turn.deadline > now) return room;
    const draft = structuredClone(room);
    return tick(draft, now) ? commit(draft, now) : room;
  }

  function throttle(request, type, maximum, now) {
    const address = `${type}:${request.socket.remoteAddress}`;
    const bucket = requests.get(address);
    if (!bucket || bucket.until <= now) requests.set(address, { count: 1, until: now + 60_000 });
    else if (++bucket.count > maximum) throw new GameError('요청이 많아요. 잠시 후 다시 시도해 주세요.', 429);
  }

  function authenticate(request, room) {
    const raw = /^Bearer ([A-Za-z0-9_-]{32})$/.exec(request.headers.authorization ?? '')?.[1];
    if (!raw) throw new GameError('이 방에 다시 참가해 주세요.', 401);
    const hash = keyHash(raw);
    if (hash === room.hostKey) return { role: 'host', playerId: null };
    const player = room.players.find((item) => item.key === hash);
    if (!player) throw new GameError('이 방에서 사용할 수 없는 접속 정보예요.', 401);
    return { role: 'player', playerId: player.id };
  }

  async function api(request, response, url) {
    const { method } = request;
    const { pathname } = url;
    if (method === 'GET' && pathname === '/api/health') return json(response, 200, { status: 'ok' });
    if (method === 'GET' && pathname === '/api/meta') return json(response, 200, { hostPinRequired: Boolean(hostPin) });
    const body = method === 'POST' ? await readJson(request) : {};
    const now = clock();

    if (method === 'POST' && pathname === '/api/rooms') {
      throttle(request, 'create', 12, now);
      if (hostPin && !timingSafeEqual(digest(hostPin), digest(typeof body.pin === 'string' ? body.pin : ''))) {
        throw new GameError('교사용 비밀번호가 맞지 않아요.', 403);
      }
      if (rooms.size >= 100) throw new GameError('지금은 새 방을 만들 수 없어요. 잠시 후 다시 시도해 주세요.', 503);
      let code;
      do {
        code = Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
      } while (rooms.has(code));
      const token = key();
      const room = commit(newRoom({ code, seed: randomBytes(12).toString('hex'), name: body.name, hostKey: keyHash(token), settings: body.settings, now }), now);
      active.set(code, now);
      return json(response, 201, { session: { code, token, role: 'host', name: room.name }, state: stateFor(room, null, now) });
    }

    const route = /^\/api\/rooms\/([^/]+)(?:\/(join|choice|teacher|profile)(?:\/([A-Za-z0-9_-]+))?)?$/.exec(pathname);
    if (!route) throw new GameError('이 주소를 찾을 수 없어요.', 404);
    const [, code, action, profileId] = route;
    let room = rooms.get(code);
    if (!room) throw new GameError('방을 찾을 수 없어요. 참가 코드를 확인해 주세요.', 404);

    if (method === 'POST' && action === 'join' && !profileId) {
      throttle(request, 'join', 120, now);
      const token = key();
      const draft = structuredClone(room);
      const player = addPlayer(draft, { id: randomBytes(8).toString('hex'), key: keyHash(token), name: body.name, avatar: body.avatar });
      room = commit(draft, now);
      active.set(code, now);
      return json(response, 201, { session: { code, token, role: 'player', name: player.name }, state: stateFor(room, player.id, now) });
    }

    const { role, playerId } = authenticate(request, room);
    active.set(code, now);
    room = refresh(room, now);
    if (method === 'GET' && !action) {
      if (url.searchParams.get('since') === String(room.revision)) {
        response.writeHead(204, { 'cache-control': 'no-store', 'x-game-time': String(now) });
        response.end();
        return;
      }
      return json(response, 200, stateFor(room, playerId, now));
    }
    if (method === 'GET' && action === 'profile' && profileId) return json(response, 200, profileFor(room, profileId));

    if (method === 'POST' && !profileId) {
      const draft = structuredClone(room);
      if (action === 'choice' && role === 'player') {
        if (selectChoice(draft, playerId, body, now)) room = commit(draft, now);
      } else if (action === 'teacher' && role === 'host') {
        if (teacherAction(draft, body.action, body, now)) room = commit(draft, now);
      } else {
        throw new GameError('이 작업을 할 권한이 없어요.', 403);
      }
      return json(response, 200, stateFor(room, playerId, now));
    }
    throw new GameError('이 주소를 찾을 수 없어요.', 404);
  }

  const server = createServer(async (request, response) => {
    response.setHeader('x-content-type-options', 'nosniff');
    response.setHeader('referrer-policy', 'no-referrer');
    response.setHeader('content-security-policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; base-uri 'none'; frame-ancestors 'self'; form-action 'self'");
    try {
      const url = new URL(request.url, 'http://localhost');
      if (url.pathname.startsWith('/api/')) await api(request, response, url);
      else if (request.method === 'GET' || request.method === 'HEAD') staticResponse(url.pathname, request.method, response);
      else json(response, 405, { error: '지원하지 않는 요청이에요.' });
    } catch (error) {
      if (response.destroyed || response.headersSent) return;
      if (error instanceof GameError) json(response, error.status, { error: error.message });
      else {
        console.error(error);
        json(response, 500, { error: '게임 서버에서 문제가 생겼어요. 잠시 후 다시 시도해 주세요.' });
      }
    }
  });
  const timer = setInterval(() => {
    const now = clock();
    for (const [code, last] of active) {
      if (now - last > 120_000) active.delete(code);
      else {
        try {
          refresh(rooms.get(code), now);
        } catch (error) {
          active.delete(code);
          console.error(error);
        }
      }
    }
  }, 500);
  const cleanup = setInterval(() => {
    const now = clock();
    for (const [address, bucket] of requests) if (bucket.until <= now) requests.delete(address);
    for (const [code, room] of rooms) {
      if (now - room.updated > RETENTION && !active.has(code)) {
        try {
          rmSync(roomFile(code), { force: true });
          rooms.delete(code);
        } catch (error) {
          console.error(error);
        }
      }
    }
  }, 60_000);
  server.on('close', () => { clearInterval(timer); clearInterval(cleanup); });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values } = parseArgs({ options: {
    port: { type: 'string' }, host: { type: 'string' }, strictPort: { type: 'boolean' },
  } });
  const port = Number(values.port ?? process.env.PORT ?? 3000);
  makeServer().listen(port, values.host ?? '0.0.0.0', () => console.log(`100년이 열렸어요. http://localhost:${port}`));
}
