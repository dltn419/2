import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { addPlayer, GameError, RULE_VERSION, newRoom, profileFor, selectChoice, stateFor, teacherAction, tick, updateRoomRules } from '../public/game.mjs';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ROOM_CODE = /^[A-HJ-NP-Z2-9]{6}$/;
export const ROOM_LIMIT = 100;
export const RETENTION = 7 * 24 * 60 * 60 * 1000;
const key = () => randomBytes(24).toString('base64url');
const digest = (value) => createHash('sha256').update(value).digest();
const keyHash = (value) => digest(value).toString('hex');

function json(status, body) {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

async function readJson(request) {
  const pieces = [];
  let length = 0;
  if (request.body) {
    for await (const piece of request.body) {
      length += piece.length;
      if (length > 8192) throw new GameError('요청이 너무 커요.', 413);
      pieces.push(piece);
    }
  }
  try {
    const result = JSON.parse(Buffer.concat(pieces));
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error();
    return result;
  } catch {
    throw new GameError('요청 내용을 읽을 수 없어요.', 400);
  }
}

function authenticate(request, room) {
  const raw = /^Bearer ([A-Za-z0-9_-]{32})$/.exec(request.headers.get('authorization') ?? '')?.[1];
  if (!raw) throw new GameError('이 방에 다시 참가해 주세요.', 401);
  const hash = keyHash(raw);
  if (hash === room.hostKey) return { role: 'host', playerId: null };
  const player = room.players.find((item) => item.key === hash);
  if (!player) throw new GameError('이 방에서 사용할 수 없는 접속 정보예요.', 401);
  return { role: 'player', playerId: player.id };
}

function markChanged(room, now) {
  room.revision += 1;
  room.updated = now;
}

export function applyDeadline(room, now) {
  const upgraded = updateRoomRules(room, now);
  if (tick(room, now) || upgraded) markChanged(room, now);
}

function requireRoom(value) {
  if (!value) throw new GameError('방을 찾을 수 없어요. 참가 코드를 확인해 주세요.', 404);
  return value;
}

export function makeGameApi({ store, hostPin = '', requirePin = false, clock = Date.now, onActivity = () => {} }) {
  const hostPinRequired = requirePin || Boolean(hostPin);
  const throttle = async (address, scope, now, maximum) => {
    if (!await store.allow(keyHash(`${scope}:${address}`), now, maximum)) {
      throw new GameError('요청이 많아요. 잠시 후 다시 시도해 주세요.', 429);
    }
  };

  return async function handle(request, { pathname = new URL(request.url).pathname, address = 'unknown' } = {}) {
    try {
      const { method } = request;
      if (method === 'GET' && pathname === '/api/meta') return json(200, { hostPinRequired });
      if (!store) throw new GameError('게임 서버에 방 저장소를 연결해 주세요.', 503);
      if (method === 'GET' && pathname === '/api/health') {
        if (requirePin && !hostPin) throw new GameError('게임 서버에 교사용 비밀번호를 설정해 주세요.', 503);
        await store.check?.();
        return json(200, { status: 'ok' });
      }

      const body = method === 'POST' ? await readJson(request) : {};
      const now = clock();

      if (method === 'POST' && pathname === '/api/rooms') {
        if (requirePin && !hostPin) throw new GameError('게임 서버에 교사용 비밀번호를 설정해 주세요.', 503);
        await throttle(address, 'create', now, 12);
        if (hostPin && !timingSafeEqual(digest(hostPin), digest(typeof body.pin === 'string' ? body.pin : ''))) {
          throw new GameError('교사용 비밀번호가 맞지 않아요.', 403);
        }
        const token = key();
        const seed = randomBytes(12).toString('hex');
        for (let attempt = 0; attempt < 8; attempt++) {
          const code = Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
          const room = newRoom({ code, seed, name: body.name, hostKey: keyHash(token), settings: body.settings, now });
          markChanged(room, now);
          if (!await store.insert(room)) continue;
          onActivity(code, now);
          return json(201, { session: { code, token, role: 'host', name: room.name }, state: stateFor(room, null, now) });
        }
        throw new GameError('참가 코드를 만들 수 없어요. 다시 시도해 주세요.', 503);
      }

      const route = /^\/api\/rooms\/([^/]+)(?:\/(join|choice|teacher|profile)(?:\/([A-Za-z0-9_-]+))?)?$/.exec(pathname);
      if (!route) throw new GameError('이 주소를 찾을 수 없어요.', 404);
      const [, code, action, profileId] = route;
      if (!ROOM_CODE.test(code)) requireRoom(null);

      if (method === 'POST' && action === 'join' && !profileId) {
        await throttle(address, 'join', now, 120);
        const token = key();
        const result = requireRoom(await store.edit(code, now, (room) => {
          const player = addPlayer(room, { id: randomBytes(8).toString('hex'), key: keyHash(token), name: body.name, avatar: body.avatar, sex: body.sex });
          const joinedAt = clock();
          updateRoomRules(room, joinedAt);
          markChanged(room, joinedAt);
          return { session: { code, token, role: 'player', name: player.name }, state: stateFor(room, player.id, joinedAt) };
        }));
        onActivity(code, now);
        return json(201, result);
      }

      if (method === 'GET' && (!action || (action === 'profile' && profileId))) {
        let room = requireRoom(await store.get(code, now));
        const { playerId } = authenticate(request, room);
        const observedAt = clock();
        onActivity(code, observedAt);
        if (room.rules !== RULE_VERSION || (!room.paused && room.turn?.deadline && room.turn.deadline <= observedAt)) {
          room = requireRoom(await store.edit(code, observedAt, (draft) => {
            authenticate(request, draft);
            applyDeadline(draft, clock());
            return draft;
          }));
        }
        if (action === 'profile') return json(200, profileFor(room, profileId));
        const serverNow = clock();
        if (new URL(request.url).searchParams.get('since') === String(room.revision)) {
          return new Response(null, { status: 204, headers: { 'cache-control': 'no-store', 'x-game-time': String(serverNow) } });
        }
        return json(200, stateFor(room, playerId, serverNow));
      }

      if (method === 'POST' && !profileId) {
        const outcome = requireRoom(await store.edit(code, now, (room) => {
          const { role, playerId } = authenticate(request, room);
          const decidedAt = clock();
          applyDeadline(room, decidedAt);
          try {
            let changed;
            if (action === 'choice' && role === 'player') changed = selectChoice(room, playerId, body, decidedAt);
            else if (action === 'teacher' && role === 'host') changed = teacherAction(room, body.action, body, decidedAt);
            else throw new GameError('이 작업을 할 권한이 없어요.', 403);
            if (changed) markChanged(room, decidedAt);
            return { room, playerId, decidedAt };
          } catch (error) {
            if (!(error instanceof GameError)) throw error;
            // An expired turn still advances when a late choice is rejected.
            return { error };
          }
        }));
        onActivity(code, now);
        if (outcome.error) throw outcome.error;
        return json(200, stateFor(outcome.room, outcome.playerId, outcome.decidedAt));
      }
      throw new GameError('이 주소를 찾을 수 없어요.', 404);
    } catch (error) {
      if (error instanceof GameError) return json(error.status, { error: error.message });
      // Driver messages can include connection details. Keep them out of hosted logs.
      console.error('100nyeon API request failed', error?.code ?? error?.name ?? 'Error');
      return json(500, { error: '게임 서버에서 문제가 생겼어요. 잠시 후 다시 시도해 주세요.' });
    }
  };
}
