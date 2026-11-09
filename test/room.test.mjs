import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { renderSVG } from 'uqr';
import { roomView, topView } from '../public/views.mjs';
import { makeServer } from '../server.mjs';

async function fixture(t) {
  const dataDir = mkdtempSync(join(tmpdir(), '100nyeon-test-'));
  let now = 1_800_000_000_000;
  let server;
  let origin;
  async function start() {
    server = makeServer({ dataDir, clock: () => now, hostPin: 'test-pin' });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    origin = `http://127.0.0.1:${server.address().port}`;
  }
  const stop = () => new Promise((resolve) => server.close(resolve));
  await start();
  t.after(async () => {
    if (server.listening) await stop();
    rmSync(dataDir, { recursive: true, force: true });
  });

  async function request(path, token, body) {
    const headers = {};
    if (token) headers.authorization = `Bearer ${token}`;
    if (body) headers['content-type'] = 'application/json';
    const response = await fetch(origin + path, { headers, method: body ? 'POST' : 'GET', body: body ? JSON.stringify(body) : undefined });
    return { status: response.status, body: response.status === 204 ? null : await response.json() };
  }

  async function room(settings, roomPassword) {
    const result = await request('/api/rooms', null, { name: '우리 반', pin: 'test-pin', roomPassword, settings });
    assert.equal(result.status, 201);
    const root = `/api/rooms/${result.body.session.code}`;
    const host = result.body.session.token;
    return {
      root, host,
      async join(name, sex = 'female') {
        return request(root + '/join', null, { name, avatar: 1, sex });
      },
      async state(token = host) {
        const result = await request(root, token);
        assert.equal(result.status, 200);
        return result.body;
      },
      async teacher(action, extra) {
        const result = await request(root + '/teacher', host, { action, ...extra });
        assert.equal(result.status, 200, JSON.stringify(result.body));
        return result.body;
      },
      async choose(player, round, choice, scene) {
        return request(root + '/choice', player.session.token, { round, choice, scene });
      },
    };
  }

  return { request, room, get origin() { return origin; },
    elapse: (ms) => { now += ms; }, restart: async () => { await stop(); await start(); } };
}

test('교사 초대 QR은 현재 사이트와 그 방의 참가 코드를 담는다', async (t) => {
  const app = await fixture(t);
  const room = await app.room();
  const state = await room.state();
  const teacher = { role: 'host' };
  assert.match(topView(teacher, state), /초대 QR/);
  assert.match(roomView(teacher, state, { pane: 'play' }), /초대 QR 크게 보기/);
  const params = new URLSearchParams({ room: state.code, origin: app.origin });
  const response = await fetch(`${app.origin}/api/invite.svg?${params}`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^image\/svg\+xml/);
  assert.equal(await response.text(), renderSVG(`${app.origin}/?room=${state.code}`, { border: 4, ecc: 'M' }));

  params.set('origin', 'https://other.example');
  assert.equal((await app.request(`/api/invite.svg?${params}`)).status, 400);
  params.set('origin', app.origin);
  params.set('room', 'invalid');
  assert.equal((await app.request(`/api/invite.svg?${params}`)).status, 400);
});

test('20명이 동시에 선택하면 한 턴만 마감하고 서버 재시작 뒤에도 이어진다', async (t) => {
  const app = await fixture(t);
  assert.equal((await app.request('/api/rooms', null, { name: '교실', pin: 'incorrect' })).status, 403);
  const room = await app.room({ pace: 'auto', seconds: 10 });
  const joined = await Promise.all(Array.from({ length: 20 }, (_, index) => room.join(`학생 ${index + 1}`)));
  assert.ok(joined.every(({ status }) => status === 201));
  const players = joined.map(({ body }) => body);
  assert.equal((await room.join('21번째')).status, 409);
  assert.equal((await app.request(room.root)).status, 401);
  assert.equal((await app.request(room.root + '/teacher', players[0].session.token, { action: 'start' })).status, 403);
  const started = await room.teacher('start');
  assert.equal(started.turn.to, 1);
  assert.equal((await app.request(room.root + `?since=${started.revision}`, room.host)).status, 204);

  const results = await Promise.all(players.map((player) => room.choose(player, 1, 'rest')));
  assert.ok(results.every(({ status }) => status === 200));
  assert.equal(results.filter(({ body }) => body.turn.number === 2).length, 1);
  assert.equal((await room.choose(players[0], 1, 'rest')).status, 409);
  const reviewed = await room.state(players[0].session.token);
  assert.equal(reviewed.phase, 'play');
  assert.equal(reviewed.me.scene.title, '첫걸음');
  assert.equal(reviewed.year, 1);
  assert.equal(reviewed.me.age, 1);
  assert.equal(reviewed.me.life.history.length, 1);
  assert.equal(reviewed.rankings.health.length, 20);

  await room.teacher('pause');
  await app.restart();
  app.elapse(30_000);
  const paused = await room.state();
  assert.equal(paused.phase, 'play');
  assert.equal(paused.turn.number, 2);
  assert.equal(paused.paused, true);
  await room.teacher('settings', { settings: { years: 5, maxAge: 110, seconds: 0 } });
  await room.teacher('resume');
  app.elapse(10_001);
  const next = await room.state();
  assert.equal(next.turn.number, 3);
  assert.equal(next.turn.to, 3);
  assert.equal(next.turn.deadline, null);
  assert.equal(next.settings.years, 1);
  assert.equal(next.settings.maxAge, 100);

  let school = next;
  while (school.year < 10) school = await room.teacher('advance', { round: school.turn.number, phase: 'play' });
  const schoolRound = school.turn.number;
  const surveys = await Promise.all(players.map(async (player) => {
    let { me } = await room.state(player.session.token);
    if (me.scene.key === 'illness') {
      const rested = await room.choose(player, schoolRound, me.scene.fallback, me.scene.key);
      assert.equal(rested.status, 200);
      me = rested.body.me;
    }
    assert.equal(me.scene.key, 'dream');
    return room.choose(player, schoolRound, 'dream-art', me.scene.key);
  }));
  assert.ok(surveys.every(({ status, body }) => status === 200 && body.year === 10 && !body.me.submitted &&
    body.me.age === 10 && body.me.scene.title === '우리 반 작은 전시'));
  const schoolYears = await Promise.all(players.map((player) => room.choose(player, schoolRound, 'rest', 'year')));
  assert.equal(schoolYears.filter(({ body }) => body.year === 11).length, 1);
});

test('새 멀티 방은 학생마다 곧장 한 살씩 자라고 중복 요청은 한 번만 반영한다', async (t) => {
  const app = await fixture(t);
  const room = await app.room({ seconds: 30 });
  const fast = (await room.join('새싹')).body;
  const slow = (await room.join('단풍')).body;
  const started = await room.teacher('start');
  assert.equal(started.settings.pace, 'personal');
  assert.equal(started.settings.seconds, 0);
  assert.equal(started.turn, null);
  assert.equal((await app.request(room.root + '/teacher', room.host, { action: 'advance' })).status, 409);

  const concurrent = await Promise.all([room.choose(fast, 1, 'rest', 'year'), room.choose(fast, 1, 'rest', 'year')]);
  assert.deepEqual(concurrent.map(({ status }) => status).sort(), [200, 409]);
  assert.equal(concurrent.find(({ status }) => status === 200).body.me.age, 1);
  await app.restart();
  app.elapse(60_000);
  let state = await room.state(fast.session.token);
  assert.equal(state.turn.deadline, null);
  assert.equal(state.me.age, 1);

  while (state.me.age < 10 || state.me.scene.key === 'illness') {
    const { turn, me } = state;
    const result = await room.choose(fast, turn.number, me.scene.fallback ?? 'rest', me.scene.key);
    assert.equal(result.status, 200);
    state = result.body;
  }
  assert.equal(state.me.scene.key, 'dream');
  const dream = await room.choose(fast, state.turn.number, 'dream-sports', 'dream');
  assert.equal(dream.status, 200);
  assert.equal(dream.body.me.age, 10);
  assert.equal(dream.body.turn.number, state.turn.number);
  assert.equal(dream.body.me.scene.key, 'year');
  const slower = await room.state(slow.session.token);
  assert.equal(slower.me.age, 0);
  assert.equal(slower.turn.number, 1);
  assert.deepEqual(slower.rankings.age.map(({ name, age, career }) => ({ name, age, career })), [
    { name: '새싹', age: 10, career: null },
    { name: '단풍', age: 0, career: null },
  ]);

  await room.teacher('pause');
  assert.equal((await room.choose(slow, 1, 'rest', 'year')).status, 409);
  await room.teacher('resume');
  const first = await room.choose(slow, 1, 'rest', 'year');
  assert.equal(first.body.me.age, 1);
  assert.equal(first.body.players.find(({ name }) => name === '새싹').age, 10);
  assert.equal((await room.teacher('finish')).phase, 'ended');
  assert.equal((await room.choose(slow, 2, 'rest', 'year')).status, 409);
});

test('교사는 방의 비밀번호로 다시 열고 학생은 별명으로 참가한다', async (t) => {
  const app = await fixture(t);
  assert.equal((await app.request('/api/rooms', null, { name: '교실', pin: 'test-pin', roomPassword: '123' })).status, 400);
  const room = await app.room({ seconds: 0 }, '별이빛나는밤');
  const student = await room.join('  작은별  ');
  assert.equal(student.status, 201);
  assert.equal(student.body.state.me.name, '작은별');
  await app.restart();

  assert.equal((await app.request(room.root + '/host', null, { roomPassword: '다른비밀번호' })).status, 403);
  const reopened = await app.request(room.root + '/host', null, { roomPassword: '별이빛나는밤' });
  assert.equal(reopened.status, 200);
  assert.ok(!JSON.stringify(reopened.body).includes('별이빛나는밤'));
  assert.ok(!JSON.stringify(reopened.body).includes('hostPass'));
  assert.equal((await app.request(room.root, room.host)).status, 401);
  assert.equal((await room.state(student.body.session.token)).me.name, '작은별');
  const started = await app.request(room.root + '/teacher', reopened.body.session.token, { action: 'start' });
  assert.equal(started.status, 200);
  assert.equal(started.body.phase, 'play');
});

test('삶을 마친 두 플레이어가 자녀와 영혼으로 갈라지고 메시지가 바로 보인다', async (t) => {
  const app = await fixture(t);
  const room = await app.room({ maxAge: 80, pace: 'manual' });
  const child = (await room.join('새싹')).body;
  const spirit = (await room.join('바람')).body;
  await room.teacher('start');

  async function advance(choices, message) {
    const state = await room.state();
    await Promise.all([child, spirit].map(async (player, index) => {
      let { me } = await room.state(player.session.token);
      while (me.scene.bonus) {
        const surgery = me.scene.key === 'illness' && me.scene.choices.find(({ id, locked }) => id === 'operation' && !locked);
        const choice = me.age === 19 && me.scene.key === 'career' ? 'work-crew' : surgery?.id ?? me.scene.fallback;
        const selected = await room.choose(player, state.turn.number, choice, me.scene.key);
        assert.equal(selected.status, 200, JSON.stringify(selected.body));
        assert.equal(selected.body.me.age, me.age);
        me = selected.body.me;
      }
      const choice = choices(me, index);
      const result = await room.choose(player, state.turn.number, choice, me.scene.key);
      assert.equal(result.status, 200, JSON.stringify(result.body));
      if (message && index === 1) {
        assert.match(result.body.me.latest.text, message);
        assert.equal(result.body.me.scene.waiting, true);
        const replay = await room.choose(player, state.turn.number, choice, me.scene.key);
        assert.equal(replay.status, 200);
        assert.deepEqual(replay.body.me.visits, result.body.me.visits);
      }
    }));
    const next = await room.teacher('advance', { round: state.turn.number, phase: 'play' });
    assert.equal(next.phase, 'play');
    assert.equal(next.turn.number, state.turn.number + 1);
    return next;
  }

  let state = await room.state();
  while (state.year < 80 && state.players.some(({ mode }) => mode === 'alive')) {
    state = await advance((me) => {
      if (me.mode === 'fork') return 'pass';
      const options = me.scene.choices.filter((item) => !item.locked);
      return (options.find((item) => item.id === 'rest') ?? options[0]).id;
    });
  }
  const fork = (await room.state(spirit.session.token)).me;
  assert.equal(fork.mode, 'fork');
  assert.ok(fork.career);
  assert.deepEqual(fork.scene.choices.map(({ id }) => id), ['successor', 'spirit']);
  const parent = (await room.state(child.session.token)).me;
  assert.equal(parent.mode, 'fork');
  await advance((me, index) => index === 0 ? 'child-male' : 'spirit', /집에 불이 켜졌어요/);
  const successor = (await room.state(child.session.token)).me;
  assert.equal(successor.generation, 2);
  assert.equal(successor.age, 19);
  assert.equal(successor.mode, 'alive');
  assert.equal(successor.life.path.sex, 'male');
  await advance((me, index) => index === 0 ? 'rest' : 'family-dream', /꿈에/);
  await advance((me, index) => index === 0 ? 'rest' : 'funeral', /./);
  await advance((me, index) => index === 0 ? 'rest' : 'workplace', /./);
  const ghost = (await room.state(spirit.session.token)).me;
  assert.deepEqual(ghost.visits.map((visit) => visit.id), ['family-dream', 'funeral', 'workplace']);
  assert.match(ghost.visits[0].text, /꿈에/);
  assert.ok(ghost.scene.choices.every(({ id }) => !ghost.visits.some((visit) => visit.id === id)));
  const family = await app.request(room.root + '/profile/' + successor.id, spirit.session.token);
  assert.equal(family.status, 200);
  assert.equal(family.body.lives.length, 2);
  assert.equal(family.body.lives[0].age, parent.age);
  const ending = await room.teacher('finish');
  assert.equal(ending.phase, 'ended');
  assert.deepEqual(ending.rankings.age.map(({ value }) => value), [parent.age, fork.age].sort((a, b) => b - a));
});
