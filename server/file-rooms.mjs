import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { GameError } from '../public/game.mjs';
import { RETENTION, ROOM_CODE, ROOM_LIMIT } from './game-api.mjs';

export function fileRooms(dataDir, clock, deploymentId = null) {
  const directory = resolve(dataDir);
  const rooms = new Map();
  const requests = new Map();
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const pathFor = (code) => resolve(directory, `${code}.json`);
  const isRoomFile = (filename) => filename.endsWith('.json') && ROOM_CODE.test(filename.slice(0, -5));

  // Railway 볼륨은 배포 후에도 유지됩니다. 새 배포가 처음 시작될 때
  // 이전 게임방만 지웁니다. 같은 배포의 프로세스 재시작에서는 보존합니다.
  // 무관한 파일·폴더는 절대 삭제하지 않습니다.
  if (deploymentId) {
    const marker = resolve(directory, '.room-deployment-id');
    const previous = existsSync(marker) ? readFileSync(marker, 'utf8').trim() : null;
    if (previous !== deploymentId) {
      let removed = 0;
      for (const filename of readdirSync(directory)) {
        if (!isRoomFile(filename)) continue;
        rmSync(pathFor(filename.slice(0, -5)), { force: true });
        removed++;
      }
      writeFileSync(`${marker}.tmp`, deploymentId, { mode: 0o600 });
      renameSync(`${marker}.tmp`, marker);
      console.log(`100년 새 배포: 이전 게임방 ${removed}개 초기화 완료`);
    }
  }

  for (const filename of readdirSync(directory)) {
    const code = filename.slice(0, -5);
    if (!isRoomFile(filename)) continue;
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
