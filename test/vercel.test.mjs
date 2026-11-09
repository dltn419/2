import assert from 'node:assert/strict';
import { test } from 'node:test';
import pg from 'pg';
import { makeGameApi } from '../server/game-api.mjs';
import { postgresRooms } from '../server/postgres-rooms.mjs';

test('PostgreSQL에 연결한 두 요청 처리기에서 20명이 제각기 한 해씩 진행한다', { skip: !process.env.TEST_DATABASE_URL }, async (t) => {
  const pool = new pg.Pool({
    connectionString: process.env.TEST_DATABASE_URL,
    max: Number(process.env.TEST_DATABASE_POOL_SIZE || 8),
  });
  t.after(() => pool.end());
  const roomPassword = 'local-integration-only';
  const teacher = makeGameApi({ store: postgresRooms(pool), requireRoomPassword: true });
  const students = makeGameApi({ store: postgresRooms(pool), requireRoomPassword: true });

  async function request(instance, path, { body, token, since } = {}) {
    const url = new URL(`https://game.example/api/${path}`);
    if (since !== undefined) url.searchParams.set('since', since);
    const headers = { 'x-forwarded-for': '127.0.0.1' };
    if (token) headers.authorization = `Bearer ${token}`;
    if (body) headers['content-type'] = 'application/json';
    const response = await instance(new Request(url, {
      method: body ? 'POST' : 'GET', body: body && JSON.stringify(body), headers,
    }));
    return { status: response.status, data: response.status === 204 ? null : await response.json() };
  }

  const health = await request(teacher, 'health');
  assert.deepEqual(health, { status: 200, data: { status: 'ok' } });
  assert.equal((await request(teacher, 'rooms', { body: { name: '교실' } })).status, 400);
  const created = await request(teacher, 'rooms', { body: {
    name: 'Vercel 테스트 방', roomPassword, settings: { years: 5, seconds: 0 },
  } });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  const { code } = created.data.session;
  const room = `rooms/${code}`;
  const joined = await Promise.all(Array.from({ length: 20 }, (_, index) => request(index % 2 ? teacher : students, `${room}/join`, {
    body: { name: `테스트 ${index + 1}`, avatar: index % 6, sex: index % 2 ? 'female' : 'male' },
  })));
  assert.ok(joined.every((result) => result.status === 201), JSON.stringify(joined.map((result) => result.status)));
  assert.ok(joined.every(({ data }, index) => data.state.me.name === `테스트 ${index + 1}`));
  const extra = await request(students, `${room}/join`, { body: { name: '추가 참가자', avatar: 0 } });
  assert.equal(extra.status, 409);
  assert.equal((await request(students, `${room}/host`, { body: { roomPassword: 'wrong password' } })).status, 403);
  const reopened = await request(students, `${room}/host`, { body: { roomPassword } });
  assert.equal(reopened.status, 200);
  const { token } = reopened.data.session;
  assert.equal((await request(teacher, room, { token: created.data.session.token })).status, 401);
  assert.equal((await request(students, `${room}/teacher`, {
    token: joined[0].data.session.token, body: { action: 'start' },
  })).status, 403);

  const start = await request(teacher, `${room}/teacher`, { token, body: { action: 'start' } });
  assert.equal(start.status, 200);
  assert.equal(start.data.turn, null);
  const first = await request(students, `${room}/choice`, {
    token: joined[0].data.session.token, body: { round: 1, scene: 'year', choice: 'rest' },
  });
  assert.equal(first.data.me.age, 1);
  assert.equal(first.data.players[1].age, 0);
  const submissions = await Promise.all(joined.map(({ data }, index) => request(index % 2 ? teacher : students, `${room}/choice`, {
    token: data.session.token, body: { round: index === 0 ? 2 : 1, scene: 'year', choice: 'rest' },
  })));
  assert.ok(submissions.every((result) => result.status === 200), JSON.stringify(submissions.map((result) => result.status)));
  assert.equal(submissions.filter(({ data }) => data.turn.number === 2).length, 19);

  const { data: { me } } = await request(students, room, { token: joined[0].data.session.token });
  assert.equal(me.age, 2);
  assert.equal(me.scene.title, '말을 배우는 날');
  assert.equal(me.life.history.length, 2);
  const saved = await request(students, room, { token });
  assert.equal(saved.data.rankings.age.length, 20);
  assert.equal(saved.data.rankings.age[0].name, '테스트 1');
  assert.equal(saved.data.rankings.age[0].age, 2);
  assert.equal((await request(teacher, room, { token, since: saved.data.revision })).status, 204);
});
