import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addPlayer, newRoom, selectChoice, stateFor, teacherAction, updateRoomRules } from '../public/game.mjs';
import { fallIll, illnessRisk } from '../public/health.mjs';

function classroom(students, { age = 0, settings } = {}) {
  const room = newRoom({ code: 'ABC234', name: '한 해씩', seed: 'book-of-years', settings: { years: 7, pace: 'manual', ...settings } });
  for (const [id, sex] of Object.entries(students)) {
    const player = addPlayer(room, { id, name: id, avatar: 0, sex });
    player.life.age = age;
  }
  teacherAction(room, 'start', {}, 1_000);
  return room;
}

const me = (room, id) => stateFor(room, id).me;

function pick(room, id, scene, choice) {
  return selectChoice(room, id, { round: room.turn.number, scene, choice }, 1_000);
}

function extras(room, id, choices = {}) {
  let view = me(room, id);
  while (view.scene.bonus) {
    const { key, fallback } = view.scene;
    pick(room, id, key, choices[key] ?? fallback);
    const next = me(room, id);
    assert.equal(next.age, view.age);
    assert.equal(next.submitted, false);
    assert.notEqual(next.scene.key, key);
    view = next;
  }
  return view;
}

function year(room, extraChoices = {}, annualChoice) {
  const { number, from } = room.turn;
  for (const player of room.players) {
    const view = extras(room, player.id, extraChoices[player.id]);
    const options = view.scene.choices.filter((option) => !option.locked);
    const choice = annualChoice?.(view, player.id) ?? options.find((option) => option.id === 'rest')?.id ?? options[0].id;
    pick(room, player.id, 'year', choice);
  }
  teacherAction(room, 'advance', { round: number, phase: 'play' }, 1_000);
  assert.equal(room.phase, 'play');
  assert.equal(room.turn.number, number + 1);
  assert.equal(room.year, from + 1);
}

test('장래희망과 진학을 골라도 같은 나이의 학교생활을 한다', () => {
  const room = classroom({ 과학: 'male', 기술: 'female', 도전: 'female' });
  assert.equal(me(room, '과학').scene.title, '세상에 온 첫해');
  const learning = (view) => view.scene.choices.filter((option) => !option.locked)
    .find((option) => option.effect.learning >= 2)?.id;

  for (let age = 0; age < 19; age++) {
    let choices;
    if ([10, 14, 17].includes(age)) {
      choices = { 과학: { dream: 'dream-science' }, 기술: { dream: 'dream-tech' }, 도전: { dream: 'dream-art' } };
    } else if (age === 16) {
      choices = { 과학: { school: 'high-science' }, 기술: { school: 'high-vocational' }, 도전: { school: 'rest' } };
    } else if (age === 18) choices = { 도전: { education: 'equivalency' } };

    year(room, choices, (view, id) => {
      assert.equal(view.age, age);
      if (age === 10) assert.equal(view.scene.title, '우리 반 작은 전시');
      if (age === 14) assert.equal(view.scene.title, '동아리 발표회');
      if (age === 16) {
        assert.equal(view.scene.title, id === '도전' ? '학교 밖의 첫해' : '고등학교 첫해');
        assert.throws(() => pick(room, id, 'school', 'rest'), /새 선택/);
      }
      if (age === 17 && id !== '도전') assert.equal(view.scene.title, '내가 좋아하는 과목');
      return learning(view);
    });
  }

  const dreams = me(room, '과학').life.path.dreams;
  assert.deepEqual(dreams.map(({ age }) => age), [10, 14, 17]);
  assert.equal(me(room, '도전').life.path.diploma, true);
  year(room, { 과학: { education: 'study-university' }, 기술: { education: 'work-dream' }, 도전: { education: 'study-college' } });
  assert.equal(me(room, '과학').life.path.program.field, 'science');
  assert.equal(me(room, '과학').life.path.program.remaining, 3);
  assert.equal(me(room, '기술').career, 'tech');
  assert.equal(me(room, '도전').life.path.program.remaining, 1);
});

test('4년제는 학업 4년으로 끝나고 복무한 해만큼만 늦어진다', () => {
  const room = classroom({ 입영: 'male', 미루기: 'male', 여학생: 'female' }, { age: 19 });
  for (const { life } of room.players) Object.assign(life.stats, { money: 80, learning: 35 });
  year(room, Object.fromEntries(room.players.map(({ id }) => [id, { education: 'study-university' }])));
  year(room, { 입영: { military: 'enlist' }, 미루기: { military: 'service-after-study' } });
  assert.equal(me(room, '입영').life.path.program.remaining, 3);
  assert.equal(me(room, '미루기').life.path.program.remaining, 2);
  assert.equal(me(room, '여학생').life.path.service, null);
  year(room);
  assert.equal(me(room, '입영').life.path.service.endedAt, 22);
  assert.match(extras(room, '입영').scene.detail, /학교로 돌아왔어요/);
  year(room);
  assert.equal(me(room, '미루기').life.path.degree.age, 23);
  assert.equal(me(room, '여학생').life.path.degree.age, 23);
  const degreeScene = me(room, '여학생').scene;
  assert.equal(degreeScene.key, 'education');
  assert.ok(degreeScene.choices.some(({ id }) => id === 'study-graduate'));
  assert.ok(!degreeScene.choices.some(({ id }) => id === 'study-university'));
  year(room, { 미루기: { military: 'enlist' }, 여학생: { education: 'study-graduate' } });
  year(room);
  assert.equal(me(room, '입영').life.path.degree.age, 25);
  assert.equal(me(room, '미루기').life.path.service.endedAt, 25);
  assert.deepEqual(me(room, '여학생').life.path.degree, { kind: 'graduate', field: 'explore', age: 25 });
});

test('체력이 낮으면 병에 더 자주 걸리고 치료 경로에는 다른 비용이 든다', () => {
  assert.ok(illnessRisk(66, 8) > illnessRisk(66, 45));
  assert.ok(illnessRisk(66, 45) > illnessRisk(66, 90));
  const room = classroom({ 수술: 'female', 돌봄: 'female' }, { age: 65 });
  for (const { life } of room.players) {
    Object.assign(life.stats, { health: 1, money: 40 });
    fallIll(life, life.path, 0, 0);
    assert.equal(life.path.illness.serious, true);
  }
  const operation = me(room, '수술').scene.choices.find(({ id }) => id === 'operation');
  assert.equal(operation.effect.money, -40);
  assert.match(operation.locked, /41코인/);
  assert.throws(() => pick(room, '수술', 'illness', 'operation'), /선택을 할 수 없어요/);
  room.players[0].life.stats.money += 1;
  extras(room, '수술', { illness: 'operation' });
  assert.equal(me(room, '수술').life.path.illness, null);
  assert.equal(me(room, '수술').life.stats.money, 1);
  year(room);
  assert.equal(me(room, '돌봄').life.path.illness.steps, 2);
  assert.equal(me(room, '돌봄').mode, 'alive');
  year(room);
  year(room);
  assert.equal(me(room, '돌봄').life.path.illness, null);
  assert.ok(room.players.every(({ life }) => Object.values(life.stats).every((value) => value >= 1)));
});

test('전세금을 집값에 보태고 능력치는 100을 넘겨도 계속 쌓인다', () => {
  const room = classroom({ 이사: 'female' }, { age: 28 });
  const { life } = room.players[0];
  Object.assign(life.stats, { money: 90, joy: 99 });
  year(room, {}, () => 'lease-home');
  assert.deepEqual(life.path.home, { kind: 'lease', at: 28, deposit: 36 });
  assert.equal(life.stats.money, 50);
  assert.equal(life.stats.joy, 104);
  while (life.age < 33) year(room);
  life.stats.money = 44;
  let purchase = me(room, '이사').scene.choices.find(({ id }) => id === 'buy-home');
  assert.equal(purchase.effect.money, -44);
  assert.match(purchase.locked, /45코인/);
  life.stats.money = 45;
  year(room, {}, () => 'buy-home');
  assert.equal(life.path.home.kind, 'own');
  assert.equal(life.stats.money, 1);
  assert.ok(life.stats.joy > 104);
  while (life.age < 54) year(room);
  life.stats.money = 17;
  year(room, {}, () => 'move-home');
  assert.equal(life.path.home.at, 54);
  assert.equal(life.stats.money, 1);
});

test('예전 방을 열면 기록과 학년을 보존하고 한 해 선택을 다시 연다', () => {
  const room = classroom({ 학생: 'male' }, { age: 21, settings: { pace: 'auto', seconds: 20 } });
  const [player] = room.players;
  player.life.path.program = { kind: 'university', field: 'science', until: 25 };
  player.life.path.service = { status: 'serving', until: 22 };
  player.life.history.push({ title: '지난해', year: 1 });
  player.life.stats.money = 0;
  player.choice = 'old-choice';
  room.rules = 2;
  room.settings.years = 5;
  room.turn.to = 5;
  room.phase = 'review';
  room.paused = true;
  assert.equal(updateRoomRules(room, 2_000), true);
  assert.equal(room.phase, 'play');
  assert.equal(room.turn.number, 2);
  assert.equal(room.turn.to, 1);
  assert.equal(room.turn.deadline, null);
  assert.equal(room.turn.remaining, 20_000);
  assert.equal(player.choice, null);
  assert.equal(player.life.path.program.remaining, 3);
  assert.equal(player.life.stats.money, 1);
  assert.deepEqual(player.life.history, [{ title: '지난해', year: 1 }]);
  assert.equal(updateRoomRules(room, 3_000), false);
});
