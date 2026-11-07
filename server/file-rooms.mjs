import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GameError } from '../public/game.mjs';
import { RETENTION, ROOM_CODE, ROOM_LIMIT } from './game-api.mjs';

export function fileRooms(dataDir, clock) {
  const directory = resolve(dataDir);
  const rooms = new Map();
  const requests = new Map();
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const pathFor = (code) => resolve(directory, `${code}.json`);

  for (const filename of readdirSync(directory)) {
    const code = filename.slice(0, -5);
    if (!filename.endsWith('.json') || !ROOM_CODE.test(code)) continue;
    const room = JSON.parse(readFileSync(pathFor(code), 'utf8'));
    if (clock() - room.updated > RETENTION) rmSync(pathFor(code));
    else rooms.set(code, room);
  }

  function save(room) {
    const file = pathFor(room.code);
    writeFileSync(`${file}.tmp`, JSON.stringify(room), { mode: 0o600 });
    renameSync(`${file}.tmp`, file);
    rooms.set(room.code, room);
  }

  return {
    get(code) {
      return rooms.get(code) ?? null;
    },
    insert(room) {
      if (rooms.size >= ROOM_LIMIT) throw new GameError('지금은 새 방을 만들 수 없어요. 잠시 후 다시 시도해 주세요.', 503);
      if (rooms.has(room.code)) return false;
      save(room);
      return true;
    },
    edit(code, _now, change) {
      const current = rooms.get(code);
      if (!current) return null;
      const draft = structuredClone(current);
      const result = change(draft);
      if (draft.revision !== current.revision) save(draft);
      return result;
    },
    allow(scope, now, maximum) {
      const bucket = requests.get(scope);
      if (!bucket || bucket.until <= now) {
        requests.set(scope, { count: 1, until: now + 60_000 });
        return true;
      }
      return ++bucket.count <= maximum;
    },
    cleanup(now, active) {
      for (const [scope, bucket] of requests) if (bucket.until <= now) requests.delete(scope);
      for (const [code, room] of rooms) {
        if (now - room.updated > RETENTION && !active.has(code)) {
          rmSync(pathFor(code), { force: true });
          rooms.delete(code);
        }
      }
    },
  };
}
