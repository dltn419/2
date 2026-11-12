import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileRooms } from '../server/file-rooms.mjs';

const dirs = [];
const now = 1_810_000_000_000;
function dir() {
  const name = mkdtempSync(join(tmpdir(), '100nyeon-deploy-'));
  dirs.push(name);
  return name;
}
function fakeRoom(code, updated = now) {
  return { code, updated, revision: 1, name: '테스트 방', players: [] };
}
afterEach(() => {
  while (dirs.length) rmSync(dirs.pop(), { recursive: true, force: true });
});

test('첫 배포 때 이전 게임방만 삭제하고 무관한 파일은 지키며 배포 표시를 기록한다', () => {
  const directory = dir();
  const old = fileRooms(directory, () => now);
  assert.equal(old.insert(fakeRoom('ABC234')), true);
  assert.equal(old.insert(fakeRoom('XYZ789')), true);
  writeFileSync(join(directory, 'keep.txt'), 'unrelated');
  writeFileSync(join(directory, 'other.json'), '{"settings":true}');

  const current = fileRooms(directory, () => now, 'railway-deployment-1');
  assert.equal(current.get('ABC234'), null);
  assert.equal(current.get('XYZ789'), null);
  assert.equal(existsSync(join(directory, 'ABC234.json')), false);
  assert.equal(existsSync(join(directory, 'XYZ789.json')), false);
  assert.equal(readFileSync(join(directory, 'keep.txt'), 'utf8'), 'unrelated');
  assert.equal(readFileSync(join(directory, 'other.json'), 'utf8'), '{"settings":true}');
  assert.equal(readFileSync(join(directory, '.room-deployment-id'), 'utf8'), 'railway-deployment-1');
});

test('같은 배포 내 앱 재시작은 새 게임방을 유지한다', () => {
  const directory = dir();
  const first = fileRooms(directory, () => now, 'railway-deployment-1');
  first.insert(fakeRoom('ABC234'));
  const restarted = fileRooms(directory, () => now, 'railway-deployment-1');
  assert.equal(restarted.get('ABC234')?.name, '테스트 방');
  assert.ok(existsSync(join(directory, 'ABC234.json')));
});

test('다음 패치 배포가 시작되면 기존 방을 전부 다시 초기화한다', () => {
  const directory = dir();
  fileRooms(directory, () => now, 'deployment-1').insert(fakeRoom('ABC234'));
  const next = fileRooms(directory, () => now, 'deployment-2');
  assert.equal(next.get('ABC234'), null);
  next.insert(fakeRoom('BCD345'));
  assert.equal(fileRooms(directory, () => now, 'deployment-2').get('BCD345')?.code, 'BCD345');
  assert.equal(fileRooms(directory, () => now, 'deployment-3').get('BCD345'), null);
});

test('Railway 배포 ID 없이 실행하는 로컬 게임은 기존 데이터를 보존한다', () => {
  const directory = dir();
  fileRooms(directory, () => now).insert(fakeRoom('ABC234'));
  assert.equal(fileRooms(directory, () => now).get('ABC234')?.code, 'ABC234');
});
