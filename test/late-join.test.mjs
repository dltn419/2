import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addPlayer, CAPACITY, newRoom, selectChoice, stateFor, teacherAction } from '../public/game.mjs';
import { applyDeadline, makeGameApi } from '../server/game-api.mjs';
import { homeView, roomView } from '../public/views.mjs';

function makeRoom(pace = 'personal', seconds = 0) {
  const room = newRoom({ code: 'ABC234', seed: 'late-join-classroom',
    name: '늦은 입장 실험', hostKey: 'teacher-secret',
    settings: { pace, seconds, maxAge: 100 }, now: 1000 });
  const first = addPlayer(room, { id: 'first', key: 'first-session', name: '먼저 온 학생', avatar: 0, sex: 'female' });
  return { room, first };
}

function newStudent(room, id = 'late', name = '늦게 온 학생') {
  return addPlayer(room, { id, key: 'new-session-' + id, name, avatar: 1, sex: 'male' });
}

function choose(room, player, now = 1200) {
  const state = stateFor(room, player.id, now);
  const option = state.me.scene.choices.find((item) => !item.locked && item.id === 'rest')
    ?? state.me.scene.choices.find((item) => !item.locked);
  assert.ok(option);
  selectChoice(room, player.id, {
    round: state.turn.number, scene: state.me.scene.key, choice: option.id,
  }, now);
}

test('각자 진행 방은 시작 후에도 0살 신입을 받으며 기존 학생 기록을 보존한다', () => {
  const { room, first } = makeRoom('personal');
  teacherAction(room, 'start', {}, 1000);
  choose(room, first);
  choose(room, first, 1500);
  const oldAge = first.life.age;
  const oldHistory = structuredClone(first.life.history);
  const newcomer = newStudent(room);
  assert.equal(room.phase, 'play');
  assert.equal(newcomer.life.age, 0);
  assert.equal(newcomer.life.generation, 1);
  assert.deepEqual(newcomer.life.history, []);
  assert.equal(stateFor(room, newcomer.id).turn.number, 1);
  assert.equal(stateFor(room, first.id).turn.number, oldAge + 1);
  assert.equal(first.life.age, oldAge);
  assert.deepEqual(first.life.history, oldHistory);
  choose(room, newcomer);
  assert.equal(newcomer.life.age, 1);
  assert.equal(first.life.age, oldAge);
});

test('교사 마감 모드의 신입은 현재 해에 합류하고 기존 학생의 선택을 유지한다', () => {
  const { room, first } = makeRoom('manual');
  teacherAction(room, 'start', {}, 1000);
  choose(room, first);
  teacherAction(room, 'advance', { phase: 'play', round: room.turn.number }, 1300);
  assert.equal(first.life.age, 1);
  choose(room, first, 1500);
  const previousChoice = first.choice;
  const round = room.turn.number;
  const year = room.year;
  const newcomer = newStudent(room);
  assert.equal(room.turn.number, round);
  assert.equal(room.year, year);
  assert.equal(first.choice, previousChoice);
  assert.equal(first.life.age, 1);
  assert.equal(newcomer.life.age, 0);
  assert.equal(stateFor(room, newcomer.id).turn.number, round);
  choose(room, newcomer, 1600);
  teacherAction(room, 'advance', { phase: 'play', round }, 1700);
  assert.equal(first.life.age, 2);
  assert.equal(newcomer.life.age, 1);
});

test('자동 진행에서 도중 참가하면 신규 학생의 제출까지 기다린다', () => {
  const { room, first } = makeRoom('auto', 30);
  const other = newStudent(room, 'other', '다른 학생');
  teacherAction(room, 'start', {}, 1000);
  choose(room, first);
  const round = room.turn.number;
  const newcomer = newStudent(room);
  assert.equal(newcomer.choice, null);
  assert.equal(room.turn.number, round);
  choose(room, other);
  assert.equal(room.turn.number, round);
  choose(room, newcomer);
  assert.equal(room.turn.number, round + 1);
  assert.equal(room.year, 1);
  assert.equal(newcomer.life.age, 1);
  assert.equal(first.life.age, 1);
});

test('만료된 자동 진행 턴은 새 입장 전에 마감하고 새 학생은 다음 해에 들어온다', () => {
  const { room, first } = makeRoom('auto', 10);
  teacherAction(room, 'start', {}, 1000);
  assert.equal(room.turn.deadline, 11000);
  assert.equal(applyDeadline(room, 12000), undefined);
  assert.equal(room.year, 1);
  assert.equal(first.life.age, 1);
  const currentRound = room.turn.number;
  const newcomer = newStudent(room);
  assert.equal(newcomer.life.age, 0);
  assert.equal(room.turn.number, currentRound);
  assert.equal(room.year, 1);
});

test('게임이 일시 정지 중에도 참가되지만 선택은 재개 후 가능하다', () => {
  const { room, first } = makeRoom('manual');
  teacherAction(room, 'start', {}, 1000);
  teacherAction(room, 'pause', {}, 1100);
  const newcomer = newStudent(room);
  assert.equal(room.paused, true);
  const scene = stateFor(room, newcomer.id).me.scene;
  assert.ok(scene);
  assert.throws(() => selectChoice(room, newcomer.id, {
    round: room.turn.number, scene: scene.key, choice: scene.choices.find((c) => !c.locked).id,
  }, 1200), /잠시 멈췄어요/);
  teacherAction(room, 'resume', {}, 1300);
  choose(room, newcomer, 1400);
  assert.equal(first.life.age, 0);
});

test('중복 별명·정원 제한은 플레이 중에도 유지하고 마감 후에는 참가할 수 없다', () => {
  const { room } = makeRoom('personal');
  teacherAction(room, 'start', {}, 1000);
  assert.throws(() => newStudent(room, 'dupe', '먼저 온 학생'), /같은 별명/);
  for (let n = 1; n < CAPACITY; n++) newStudent(room, 's' + n, '학생' + n);
  assert.equal(room.players.length, CAPACITY);
  assert.throws(() => newStudent(room, 'over-capacity', '정원 초과'), /20명이 모두/);
  teacherAction(room, 'finish', {}, 1300);
  assert.throws(() => newStudent(room, 'after-end', '마감 후 참가'), /마감된 방/);
  assert.equal(room.players.length, CAPACITY);
});

test('게임 중 퇴장시킨 학생도 재참가하면 새 캐릭터로 시작한다', () => {
  const { room } = makeRoom('personal');
  teacherAction(room, 'start', {}, 1000);
  const old = newStudent(room, 'old', '중복 학생');
  old.life.age = 45;
  teacherAction(room, 'kick', { playerId: old.id }, 1300);
  const newcomer = newStudent(room, 'new', '중복 학생');
  assert.equal(newcomer.life.age, 0);
  assert.notEqual(newcomer.id, old.id);
  assert.ok(!room.players.find((p) => p.id === old.id));
  assert.ok(!room.players.some((p) => p.life.age === 45));
});

test('교사 진행실과 입장 화면에 진행 중 참가 안내가 보인다', () => {
  const { room } = makeRoom('personal');
  teacherAction(room, 'start', {}, 1000);
  const host = roomView({ role: 'host' }, stateFor(room, null), { pane: 'play', rank: 'money' });
  assert.match(host, /진행 중에도 QR이나 참가 코드/);
  assert.match(host, /새 학생은 0살부터 시작/);
  const landing = homeView(null, 0, {});
  assert.match(landing, /게임이 이미 시작됐어도 참가할 수 있고/);
});

function memoryStore() {
  const rooms = new Map();
  return {
    rooms, allow: async () => true,
    async insert(room) {
      if (rooms.has(room.code)) return false;
      rooms.set(room.code, structuredClone(room));
      return true;
    },
    async get(code) { return structuredClone(rooms.get(code) ?? null); },
    async edit(code, _now, change) {
      const before = rooms.get(code);
      if (!before) return null;
      const draft = structuredClone(before);
      const result = await change(draft);
      if (draft.revision !== before.revision) rooms.set(code, draft);
      return result;
    },
  };
}

test('API를 통해 게임 중 신규 입장·기존 학생 세션 유지·마감 후 제한이 작동한다', async () => {
  let now = 1000;
  const database = memoryStore();
  const api = makeGameApi({ store: database, clock: () => now, requireRoomPassword: true });
  const send = async (route, body, token) => {
    const response = await api(new Request('https://game.example' + route, {
      method: body === undefined ? 'GET' : 'POST',
      ...(token ? { headers: { authorization: `Bearer ${token}` } } : {}),
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }), { address: 'local-school' });
    return { status: response.status, body: await response.json() };
  };
  const create = await send('/api/rooms', {
    name: '교실', roomPassword: 'test-password', settings: { pace: 'personal', maxAge: 100 },
  });
  assert.equal(create.status, 201);
  const { code, token: host } = create.body.session;
  const old = await send(`/api/rooms/${code}/join`, { name: '먼저 온 학생', avatar: 0, sex: 'male' });
  assert.equal(old.status, 201);
  const oldToken = old.body.session.token;
  assert.equal((await send(`/api/rooms/${code}/teacher`, { action: 'start' }, host)).status, 200);
  const late = await send(`/api/rooms/${code}/join`, { name: '늦게 온 학생', avatar: 1, sex: 'female' });
  assert.equal(late.status, 201);
  assert.equal(late.body.state.phase, 'play');
  assert.equal(late.body.state.me.age, 0);
  assert.equal(late.body.state.turn.number, 1);
  const oldAfter = await send(`/api/rooms/${code}`, undefined, oldToken);
  assert.equal(oldAfter.status, 200);
  assert.equal(oldAfter.body.me.name, '먼저 온 학생');
  assert.equal(oldAfter.body.players.length, 2);
  const choice = late.body.state.me.scene.choices.find((x) => !x.locked);
  const lateChoose = await send(`/api/rooms/${code}/choice`, {
    round: 1, scene: late.body.state.me.scene.key, choice: choice.id,
  }, late.body.session.token);
  assert.equal(lateChoose.status, 200);
  assert.equal(lateChoose.body.me.age, 1);
  const finished = await send(`/api/rooms/${code}/teacher`, { action: 'finish' }, host);
  assert.equal(finished.status, 200);
  const blocked = await send(`/api/rooms/${code}/join`, { name: '나중 참가', avatar: 2, sex: 'male' });
  assert.equal(blocked.status, 409);
  assert.match(blocked.body.error, /마감된 방/);
});
