import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addPlayer, newRoom, selectChoice, stateFor, teacherAction } from '../public/game.mjs';
import { roomView } from '../public/views.mjs';
import { makeGameApi } from '../server/game-api.mjs';

function classroom(pace = 'manual') {
  const room = newRoom({ code: 'ABC234', seed: 'duplicate-join-classroom',
    name: '학생 관리', hostKey: 'teacher', settings: { pace, seconds: 0, maxAge: 100 }, now: 1000 });
  const first = addPlayer(room, { id: 'first', key: 'first-secret', name: '학생', avatar: 0, sex: 'female' });
  const duplicate = addPlayer(room, { id: 'duplicate', key: 'duplicate-secret', name: '학생2', avatar: 1, sex: 'female' });
  return { room, first, duplicate };
}
const snapshot = (room, playerId) => stateFor(room, playerId, 1200);
const screen = (room, role, pane = 'play', playerId = null) =>
  roomView({ role }, snapshot(room, playerId), { pane, rank: 'money' });

test('대기실과 플레이 중에 중복 참가자 한 명만 내보내고 다른 학생은 유지한다', () => {
  const { room, first, duplicate } = classroom();
  assert.match(screen(room, 'host'), /data-action="kick" data-id="duplicate"/);
  teacherAction(room, 'kick', { playerId: duplicate.id }, 1100);
  assert.deepEqual(room.players.map((p) => p.id), ['first']);
  assert.equal(room.phase, 'lobby');
  addPlayer(room, { id: 'replacement', name: '재입장', avatar: 2, sex: 'male' });
  teacherAction(room, 'start', {}, 1200);
  first.life.stats.money = 75;
  teacherAction(room, 'kick', { playerId: 'replacement' }, 1300);
  assert.deepEqual(room.players.map((p) => p.id), ['first']);
  assert.equal(room.players[0].life.stats.money, 75);
  assert.equal(room.phase, 'play');
  assert.deepEqual(snapshot(room, null).rankings.money.map((p) => p.id), ['first']);
});

test('자동 진행에서 아직 선택하지 않은 학생을 퇴장시키면 남은 제출자로 다음 해가 열린다', () => {
  const { room, first, duplicate } = classroom('auto');
  teacherAction(room, 'start', {}, 1000);
  const scene = snapshot(room, first.id).me.scene;
  const selected = scene.choices.find((option) => !option.locked);
  assert.ok(selected);
  selectChoice(room, first.id, { round: room.turn.number, scene: scene.key, choice: selected.id }, 1100);
  assert.equal(room.turn.number, 1);
  assert.equal(first.life.age, 0);
  assert.equal(duplicate.choice, null);
  teacherAction(room, 'kick', { playerId: duplicate.id }, 1300);
  assert.equal(room.turn.number, 2);
  assert.equal(first.life.age, 1);
  assert.equal(room.players.length, 1);
  assert.equal(room.year, 1);
});

test('일시정지 상태에서 학생을 퇴장시켜도 일시정지는 유지한다', () => {
  const { room, first, duplicate } = classroom('auto');
  teacherAction(room, 'start', {}, 1000);
  const scene = snapshot(room, first.id).me.scene;
  const selected = scene.choices.find((option) => !option.locked);
  selectChoice(room, first.id, { round: room.turn.number, scene: scene.key, choice: selected.id }, 1100);
  teacherAction(room, 'pause', {}, 1200);
  teacherAction(room, 'kick', { playerId: duplicate.id }, 1300);
  assert.equal(room.paused, true);
  assert.equal(room.turn.number, 1);
  teacherAction(room, 'resume', {}, 1400);
  assert.equal(room.paused, false);
});

test('개인별 진행은 다른 학생 퇴장 후에도 기존 학생의 나이·진행을 보존한다', () => {
  const { room, first, duplicate } = classroom('personal');
  teacherAction(room, 'start', {}, 1000);
  const scene = snapshot(room, first.id).me.scene;
  const selected = scene.choices.find((option) => !option.locked);
  selectChoice(room, first.id, { round: snapshot(room, first.id).turn.number, scene: scene.key, choice: selected.id }, 1100);
  assert.equal(first.life.age, 1);
  teacherAction(room, 'kick', { playerId: duplicate.id }, 1200);
  assert.equal(first.life.age, 1);
  assert.equal(room.year, 0);
  assert.equal(room.phase, 'play');
  assert.equal(room.players.length, 1);
});

test('없는 학생이나 마감된 방의 학생을 내보내지 못한다', () => {
  const { room, duplicate } = classroom();
  assert.throws(() => teacherAction(room, 'kick', { playerId: 'missing' }, 1000), /찾을 수 없어요/);
  assert.equal(room.players.length, 2);
  teacherAction(room, 'start', {}, 1100);
  teacherAction(room, 'finish', {}, 1200);
  assert.throws(() => teacherAction(room, 'kick', { playerId: duplicate.id }, 1300), /지금은 할 수 없는 작업/);
  assert.equal(room.players.length, 2);
});

test('한 명뿐인 학생을 퇴장시켜도 제출 진행률에 NaN이 없고 마감할 수 있다', () => {
  const { room, duplicate } = classroom();
  teacherAction(room, 'start', {}, 1100);
  teacherAction(room, 'kick', { playerId: duplicate.id }, 1200);
  teacherAction(room, 'kick', { playerId: 'first' }, 1300);
  assert.equal(room.players.length, 0);
  const html = screen(room, 'host');
  assert.match(html, /0 \/ 0명/);
  assert.doesNotMatch(html, /NaN/);
  teacherAction(room, 'finish', {}, 1400);
  assert.equal(room.phase, 'ended');
});

test('교사 화면에서는 퇴장 버튼이 보이고 학생 화면·마감 화면에서는 숨긴다', () => {
  const { room, first } = classroom('personal');
  const lobby = screen(room, 'host');
  assert.match(lobby, /data-action="kick" data-id="first"/);
  assert.doesNotMatch(screen(room, 'player', 'play', first.id), /data-action="kick"/);
  teacherAction(room, 'start', {}, 1100);
  assert.match(screen(room, 'host'), /data-action="kick" data-id="first"/);
  assert.match(screen(room, 'host', 'friends'), /data-action="kick" data-id="first"/);
  assert.doesNotMatch(screen(room, 'player', 'friends', first.id), /data-action="kick"/);
  teacherAction(room, 'finish', {}, 1200);
  assert.doesNotMatch(screen(room, 'host'), /data-action="kick"/);
});

function store() {
  const rooms = new Map();
  return {
    rooms, allow: async () => true,
    async insert(room) { rooms.set(room.code, structuredClone(room)); return true; },
    async get(code) { return structuredClone(rooms.get(code) ?? null); },
    async edit(code, _now, change) {
      const before = rooms.get(code);
      if (!before) return null;
      const copy = structuredClone(before);
      const result = await change(copy);
      if (copy.revision !== before.revision) rooms.set(code, copy);
      return result;
    },
  };
}

test('API는 교사만 플레이 도중 강퇴할 수 있고 퇴장 학생 토큰은 즉시 차단한다', async () => {
  let now = 1000;
  const database = store();
  const handle = makeGameApi({ store: database, clock: () => now, requireRoomPassword: true });
  const request = async (path, body, token) => {
    const response = await handle(new Request('https://example.test' + path, {
      method: body === undefined ? 'GET' : 'POST',
      ...(token ? { headers: { authorization: `Bearer ${token}` } } : {}),
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }), { address: 'device-one' });
    return { status: response.status, data: await response.json() };
  };
  const created = await request('/api/rooms', {
    name: '킥 테스트', roomPassword: 'teacher-password', settings: { pace: 'personal', seconds: 0, maxAge: 100 },
  });
  assert.equal(created.status, 201);
  const { code, token: host } = created.data.session;
  const joined = await request(`/api/rooms/${code}/join`, { name: '본 학생', avatar: 0, sex: 'male' });
  const duplicate = await request(`/api/rooms/${code}/join`, { name: '중복 학생', avatar: 1, sex: 'male' });
  assert.equal(joined.status, 201);
  assert.equal(duplicate.status, 201);
  const studentToken = duplicate.data.session.token;
  const duplicateId = database.rooms.get(code).players.find((p) => p.name === '중복 학생').id;
  assert.equal((await request(`/api/rooms/${code}/teacher`, { action: 'start' }, host)).status, 200);
  assert.equal((await request(`/api/rooms/${code}/teacher`, { action: 'kick', playerId: duplicateId }, studentToken)).status, 403);
  const kicked = await request(`/api/rooms/${code}/teacher`, { action: 'kick', playerId: duplicateId }, host);
  assert.equal(kicked.status, 200);
  assert.equal(kicked.data.players.length, 1);
  assert.equal(kicked.data.players[0].name, '본 학생');
  assert.equal((await request(`/api/rooms/${code}`, undefined, studentToken)).status, 401);
  assert.equal((await request(`/api/rooms/${code}/choice`, { round: 1, scene: 'year', choice: 'rest' }, studentToken)).status, 401);
  const rejoined = await request(`/api/rooms/${code}/join`, { name: '중복 학생', avatar: 1, sex: 'male' });
  assert.equal(rejoined.status, 201);
  assert.equal(rejoined.data.state.me.age, 0);
  assert.notEqual(rejoined.data.state.me.id, duplicateId);
  assert.equal(database.rooms.get(code).players.length, 2);
  assert.equal((await request(`/api/rooms/${code}`, undefined, joined.data.session.token)).status, 200);
});
