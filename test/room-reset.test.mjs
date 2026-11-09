import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addPlayer, newRoom, stateFor, teacherAction, GameError } from '../public/game.mjs';
import { makeGameApi } from '../server/game-api.mjs';

function sampleRoom() {
  const room = newRoom({
    code: 'ABC234', seed: 'classroom-reset-seed', name: '우리 반',
    hostKey: 'secret-host-digest', settings: { pace: 'manual', seconds: 0, maxAge: 105 },
    now: 1000,
  });
  room.hostPass = { salt: 'saved-salt', hash: 'saved-hash' };
  addPlayer(room, { id: 'student-one', key: 'saved-student-key', name: '학생', avatar: 0, sex: 'male' });
  return room;
}

test('마감한 교사방만 초기화하고 방 코드·교사 인증·설정은 유지한다', () => {
  const room = sampleRoom();
  const oldSettings = structuredClone(room.settings);
  const oldPass = structuredClone(room.hostPass);
  const hostKey = room.hostKey;
  const seed = room.seed;
  assert.throws(() => teacherAction(room, 'reset', { confirmCode: 'ABC234' }, 1100),
    /지금은 할 수 없는 작업/);
  teacherAction(room, 'start', {}, 1100);
  teacherAction(room, 'advance', { phase: 'play', round: room.turn.number }, 1200);
  assert.ok(room.year > 0);
  teacherAction(room, 'finish', {}, 1300);
  assert.equal(room.phase, 'ended');
  assert.ok(room.players[0].life.history.length > 0);
  assert.throws(() => teacherAction(room, 'reset', { confirmCode: 'WRONG1' }, 1400),
    /방 코드를 정확히/);
  assert.equal(room.phase, 'ended');
  assert.equal(room.players.length, 1);

  teacherAction(room, 'reset', { confirmCode: room.code }, 1500);
  assert.equal(room.phase, 'lobby');
  assert.equal(room.year, 0);
  assert.equal(room.turn, null);
  assert.equal(room.paused, false);
  assert.equal(room.endReason, null);
  assert.deepEqual(room.players, []);
  assert.equal(room.code, 'ABC234');
  assert.equal(room.name, '우리 반');
  assert.equal(room.seed, seed);
  assert.equal(room.hostKey, hostKey);
  assert.deepEqual(room.hostPass, oldPass);
  assert.deepEqual(room.settings, oldSettings);
  assert.deepEqual(stateFor(room, null).rankings, {});

  assert.throws(() => teacherAction(room, 'reset', { confirmCode: room.code }, 1600),
    /지금은 할 수 없는 작업/);
  addPlayer(room, { id: 'second-student', key: 'new-student-key', name: '새 학생', avatar: 0, sex: 'female' });
  teacherAction(room, 'start', {}, 1700);
  assert.equal(room.phase, 'play');
  assert.equal(room.turn.number, 1);
  assert.equal(room.players[0].life.age, 0);
  assert.equal(room.year, 0);
});

function memoryStore() {
  const rooms = new Map();
  return {
    rooms,
    async allow() { return true; },
    async insert(room) {
      if (rooms.has(room.code)) return false;
      rooms.set(room.code, structuredClone(room));
      return true;
    },
    async get(code) { return structuredClone(rooms.get(code) ?? null); },
    async edit(code, _now, change) {
      const before = rooms.get(code);
      if (!before) return null;
      const room = structuredClone(before);
      const result = await change(room);
      if (room.revision !== before.revision) rooms.set(code, room);
      return result;
    },
  };
}

test('실제 API에서 교사만 마감 후 방 초기화 가능하며 학생 토큰은 무효화된다', async () => {
  let now = 1000;
  const store = memoryStore();
  const api = makeGameApi({ store, requireRoomPassword: true, clock: () => now });
  const send = async (route, body, token) => {
    const request = new Request('https://game.example' + route, {
      method: body === undefined ? 'GET' : 'POST',
      ...(token ? { headers: { authorization: `Bearer ${token}` } } : {}),
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const response = await api(request, { address: 'test-device' });
    return { status: response.status, body: await response.json() };
  };
  const created = await send('/api/rooms', {
    name: '재사용할 교실', roomPassword: 'fresh-room-pass',
    settings: { pace: 'personal', maxAge: 105, seconds: 0 },
  });
  assert.equal(created.status, 201);
  const { code, token: hostToken } = created.body.session;
  const joined = await send(`/api/rooms/${code}/join`,
    { name: '첫 학생', avatar: 0, sex: 'male' });
  assert.equal(joined.status, 201);
  const studentToken = joined.body.session.token;
  const started = await send(`/api/rooms/${code}/teacher`, { action: 'start' }, hostToken);
  assert.equal(started.status, 200);
  assert.equal(started.body.phase, 'play');

  const blockedBeforeFinish = await send(`/api/rooms/${code}/teacher`,
    { action: 'reset', confirmCode: code }, hostToken);
  assert.equal(blockedBeforeFinish.status, 409);
  const finished = await send(`/api/rooms/${code}/teacher`, { action: 'finish' }, hostToken);
  assert.equal(finished.status, 200);
  assert.equal(finished.body.phase, 'ended');

  const blockedStudent = await send(`/api/rooms/${code}/teacher`,
    { action: 'reset', confirmCode: code }, studentToken);
  assert.equal(blockedStudent.status, 403);
  const wrongCode = await send(`/api/rooms/${code}/teacher`,
    { action: 'reset', confirmCode: 'WRONG1' }, hostToken);
  assert.equal(wrongCode.status, 400);
  assert.equal(store.rooms.get(code).phase, 'ended');

  const revision = store.rooms.get(code).revision;
  now = 2000;
  const reset = await send(`/api/rooms/${code}/teacher`,
    { action: 'reset', confirmCode: code }, hostToken);
  assert.equal(reset.status, 200);
  assert.equal(reset.body.phase, 'lobby');
  assert.equal(reset.body.code, code);
  assert.equal(reset.body.players.length, 0);
  assert.deepEqual(reset.body.rankings, {});
  assert.equal(reset.body.turn, null);
  assert.ok(reset.body.revision > revision);
  assert.equal(reset.body.settings.maxAge, 105);

  const oldStudent = await send(`/api/rooms/${code}`, undefined, studentToken);
  assert.equal(oldStudent.status, 401);
  const hostStillValid = await send(`/api/rooms/${code}`, undefined, hostToken);
  assert.equal(hostStillValid.status, 200);
  assert.equal(hostStillValid.body.phase, 'lobby');

  const second = await send(`/api/rooms/${code}/join`,
    { name: '두 번째 학생', avatar: 0, sex: 'female' });
  assert.equal(second.status, 201);
  const restarted = await send(`/api/rooms/${code}/teacher`, { action: 'start' }, hostToken);
  assert.equal(restarted.status, 200);
  assert.equal(restarted.body.phase, 'play');
  assert.equal(restarted.body.players.length, 1);
  assert.equal(restarted.body.players[0].name, '두 번째 학생');

  const reopened = await send(`/api/rooms/${code}/host`,
    { roomPassword: 'fresh-room-pass' });
  assert.equal(reopened.status, 200);
  assert.equal(reopened.body.session.role, 'host');
  assert.equal(reopened.body.state.phase, 'play');
});
