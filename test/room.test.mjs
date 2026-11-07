import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
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

  async function room(settings) {
    const result = await request('/api/rooms', null, { name: '우리 반', pin: 'test-pin', settings });
    assert.equal(result.status, 201);
    const root = `/api/rooms/${result.body.session.code}`;
    const host = result.body.session.token;
    return {
      root, host,
      async join(name) {
        return request(root + '/join', null, { name, avatar: 1 });
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
      async choose(player, round, choice) {
        return request(root + '/choice', player.session.token, { round, choice });
      },
    };
  }

  return { request, room, elapse: (ms) => { now += ms; }, restart: async () => { await stop(); await start(); } };
}

test('20명이 동시에 선택하면 한 턴만 마감하고 서버 재시작 뒤에도 이어진다', async (t) => {
  const app = await fixture(t);
  assert.equal((await app.request('/api/rooms', null, { name: '교실', pin: 'incorrect' })).status, 403);
  const room = await app.room({ seconds: 0 });
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
  assert.equal(results.filter(({ body }) => body.phase === 'review').length, 1);
  assert.equal((await room.choose(players[0], 1, 'rest')).status, 409);
  const reviewed = await room.state(players[0].session.token);
  assert.equal(reviewed.year, 1);
  assert.equal(reviewed.me.age, 1);
  assert.equal(reviewed.me.life.history.length, 1);
  assert.equal(reviewed.rankings.health.length, 20);

  await room.teacher('pause');
  await app.restart();
  app.elapse(30_000);
  const paused = await room.state();
  assert.equal(paused.phase, 'review');
  assert.equal(paused.paused, true);
  await room.teacher('settings', { settings: { years: 5, maxAge: 110 } });
  await room.teacher('resume');
  app.elapse(6001);
  const next = await room.state();
  assert.equal(next.turn.number, 2);
  assert.equal(next.turn.to, 6);
  assert.equal(next.settings.maxAge, 100);
});

test('수명에 도달한 두 플레이어가 자녀와 영혼으로 갈라지고 기록이 남는다', async (t) => {
  const app = await fixture(t);
  const room = await app.room({ years: 10, maxAge: 80, pace: 'manual' });
  const child = (await room.join('새싹')).body;
  const spirit = (await room.join('바람')).body;
  await room.teacher('start');

  async function advance(choices) {
    const state = await room.state();
    await Promise.all([child, spirit].map(async (player, index) => {
      const me = (await room.state(player.session.token)).me;
      const result = await room.choose(player, state.turn.number, choices(me, index));
      assert.equal(result.status, 200, JSON.stringify(result.body));
    }));
    const review = await room.teacher('advance', { round: state.turn.number, phase: 'play' });
    assert.equal(review.phase, 'review');
    await room.teacher('advance', { round: state.turn.number, phase: 'review' });
  }

  for (let round = 0; round < 8; round++) {
    await advance((me) => {
      const options = me.scene.choices.filter((item) => !item.locked);
      return (options.find((item) => item.career) ?? options.find((item) => item.effect.learning > 0) ?? options.find((item) => item.id === 'rest')).id;
    });
  }
  const fork = (await room.state(spirit.session.token)).me;
  assert.equal(fork.age, 80);
  assert.equal(fork.mode, 'fork');
  assert.ok(fork.career);
  await advance((me, index) => index === 0 ? 'child' : 'spirit');
  const successor = (await room.state(child.session.token)).me;
  assert.equal(successor.generation, 2);
  assert.equal(successor.age, 19);
  assert.equal(successor.mode, 'alive');
  await advance((me, index) => index === 0 ? 'rest' : 'funeral');
  await advance((me, index) => index === 0 ? 'rest' : 'workplace');
  const ghost = (await room.state(spirit.session.token)).me;
  assert.deepEqual(ghost.visits.map((visit) => visit.id), ['funeral', 'workplace']);
  const family = await app.request(room.root + '/profile/' + successor.id, spirit.session.token);
  assert.equal(family.status, 200);
  assert.equal(family.body.lives.length, 2);
  assert.equal(family.body.lives[0].age, 80);
  const ending = await room.teacher('finish');
  assert.equal(ending.phase, 'ended');
  assert.ok(ending.rankings.age.every((row) => row.value === 80));
});
