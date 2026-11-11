import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { fileRooms } from './server/file-rooms.mjs';
import { applyDeadline, makeGameApi } from './server/game-api.mjs';

const PUBLIC = fileURLToPath(new URL('./public/', import.meta.url));
const MIME = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };

function errorResponse(response, status, error) {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  response.end(JSON.stringify({ error }));
}

function staticResponse(pathname, method, response) {
  const filename = resolve(PUBLIC, pathname === '/' ? 'index.html' : `.${pathname}`);
  const type = MIME[extname(filename)];
  if (!filename.startsWith(resolve(PUBLIC) + sep) || !type || !existsSync(filename) || !statSync(filename).isFile()) {
    return errorResponse(response, 404, '이 페이지를 찾을 수 없어요.');
  }
  response.writeHead(200, { 'content-type': type, 'cache-control': 'no-cache' });
  response.end(method === 'HEAD' ? undefined : readFileSync(filename));
}

export function makeServer({ dataDir = process.env.DATA_DIR || './data', hostPin = process.env.HOST_PIN || '', clock = Date.now, store: suppliedStore } = {}) {
  const store = suppliedStore ?? fileRooms(dataDir, clock, process.env.RAILWAY_DEPLOYMENT_ID || null);
  const active = new Map();
  const api = makeGameApi({ store, hostPin, clock, onActivity: (code, now) => active.set(code, now) });

  const server = createServer(async (request, response) => {
    response.setHeader('x-content-type-options', 'nosniff');
    response.setHeader('referrer-policy', 'no-referrer');
    response.setHeader('content-security-policy', "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; base-uri 'none'; frame-ancestors 'self'; form-action 'self'");
    try {
      const url = new URL(request.url, 'http://localhost');
      if (url.pathname.startsWith('/api/')) {
        const init = { method: request.method, headers: request.headers };
        if (!['GET', 'HEAD'].includes(request.method)) {
          init.body = Readable.toWeb(request);
          init.duplex = 'half';
        }
        const result = await api(new Request(url, init), { address: request.socket.remoteAddress });
        response.writeHead(result.status, Object.fromEntries(result.headers));
        response.end(result.body ? Buffer.from(await result.arrayBuffer()) : undefined);
      } else if (request.method === 'GET' || request.method === 'HEAD') {
        staticResponse(url.pathname, request.method, response);
      } else errorResponse(response, 405, '지원하지 않는 요청이에요.');
    } catch (error) {
      if (response.destroyed || response.headersSent) return;
      console.error(error);
      errorResponse(response, 500, '게임 서버에서 문제가 생겼어요. 잠시 후 다시 시도해 주세요.');
    }
  });

  if (!suppliedStore) {
    const timer = setInterval(() => {
      const now = clock();
      for (const [code, last] of active) {
        const room = store.get(code);
        if (!room || now - last > 120_000) active.delete(code);
        else if (!room.paused && room.turn?.deadline && room.turn.deadline <= now) {
          try {
            store.edit(code, now, (draft) => applyDeadline(draft, now));
          } catch (error) {
            active.delete(code);
            console.error(error);
          }
        }
      }
    }, 500);
    const cleanup = setInterval(() => {
      try {
        store.cleanup(clock(), active);
      } catch (error) {
        console.error(error);
      }
    }, 60_000);
    server.on('close', () => { clearInterval(timer); clearInterval(cleanup); });
  }
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values } = parseArgs({ options: {
    port: { type: 'string' }, host: { type: 'string' }, strictPort: { type: 'boolean' },
  } });
  const port = Number(values.port ?? process.env.PORT ?? 3000);
  makeServer().listen(port, values.host ?? '0.0.0.0', () => console.log(`100년이 열렸어요. http://localhost:${port}`));
}
