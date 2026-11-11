import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CAREERS, CAREER_PROMOTIONS, LEGACY_PERFORMANCE_PROMOTIONS } from '../public/content.mjs';
import { addPlayer, newRoom, selectChoice, stateFor, teacherAction, updateRoomRules } from '../public/game.mjs';
import { careerPay, newPath, yearlySources } from '../public/life.mjs';
import { gameMenuView, roomView } from '../public/views.mjs';

const BASE_STATS = { money: 100, health: 75, learning: 70, bond: 75, art: 75, joy: 65 };
const formerBonusCareers = ['farmer', 'studio', 'sales', 'creator', 'shop', 'athlete'];
function life(career, age = 38, years = 10) {
  const path = newPath('female');
  path.romanceSeed = 153876;
  path.workYears[career] = years;
  return { age, career, stats: { ...BASE_STATS }, path, history: [] };
}

test('과거 성과 수당 직업은 승급 경로를 유지하고 무작위 소득은 받지 않는다', () => {
  for (const career of formerBonusCareers) {
    assert.ok(Object.values(CAREER_PROMOTIONS).some(({ from }) => from === career), career);
    const person = life(career);
    const sources = yearlySources(person);
    assert.equal(sources.find(({ id }) => id === `job-${career}`).effect.money, careerPay(person).total);
    assert.ok(!sources.some(({ id }) => id.startsWith('performance-')), career);
  }
});

test('교사·간호사·공무원·개발자 승진과 운동선수 지도자 전직은 유지한다', () => {
  for (const career of ['teacher', 'nurse', 'civil', 'developer', 'coach']) {
    assert.ok(Object.values(CAREER_PROMOTIONS).some(({ from }) => from === career), career);
  }
  assert.equal(CAREERS.vicePrincipal.promotionFrom, 'teacher');
  assert.equal(CAREERS.principal.promotionFrom, 'vicePrincipal');
  assert.equal(CAREERS.coach.promotionFrom, undefined);
});

test('이전 승진 캐릭터는 연봉을 받으면서도 신규 승진·직업 안내에는 옛 직위가 보이지 않는다', () => {
  assert.equal(Object.keys(LEGACY_PERFORMANCE_PROMOTIONS).length, 10);
  for (const id of Object.keys(LEGACY_PERFORMANCE_PROMOTIONS)) {
    assert.equal(CAREERS[id].legacyPromotion, true);
    assert.ok(!Object.hasOwn(CAREER_PROMOTIONS, id));
    assert.ok(careerPay(life(id)));
    assert.ok(!gameMenuView('jobs', life()).includes(`<h3>${CAREERS[id].title}</h3>`));
    assert.ok(!yearlySources(life(id)).some(({ id: source }) => source.startsWith('performance-')));
  }
  const room = newRoom({ code: 'ABC123', seed: 'legacy-performance', name: '기록', settings: { pace: 'personal', maxAge: 110 } });
  const player = addPlayer(room, { id: 'old', name: '옛 농장', avatar: 0, sex: 'female' });
  player.life.age = 42;
  player.life.career = 'farmManager';
  player.life.path.workYears.farmer = 8;
  player.life.path.workYears.farmManager = 4;
  teacherAction(room, 'start', {}, 1000);
  room.rules = 10;
  assert.equal(updateRoomRules(room, 1001), false);
  assert.ok(careerPay(player.life).total > 0);
  assert.equal(stateFor(room, 'old').me.scene.key, 'career');
  assert.ok(!stateFor(room, 'old').me.scene.choices.some(({ id }) => id === 'work-farmDirector'));
});

test('성과 난수 없이 정해진 연봉이 실제 한 해 진행에 반영된다', () => {
  function hash(value) {
    let result = 2166136261;
    for (const char of value) result = Math.imul(result ^ char.charCodeAt(0), 16777619);
    return result >>> 0;
  }
  let seed = 'bonustest';
  while (hash(`${seed}:hero:1:39:event`) % 7 === 0) seed += 'x';
  const room = newRoom({ code: 'ABC234', seed, name: '정규 수입', settings: { pace: 'personal', maxAge: 110 } });
  const player = addPlayer(room, { id: 'hero', name: '농부', avatar: 0, sex: 'female' });
  player.life.age = 39;
  player.life.career = 'farmer';
  player.life.path.workYears.farmer = 10;
  player.life.stats.money = 150;
  teacherAction(room, 'start', {}, 1000);
  const before = player.life.stats.money;
  const salary = careerPay(player.life).total;
  const scene = stateFor(room, 'hero').me.scene;
  assert.equal(scene.key, 'year');
  assert.equal(scene.base.money, salary);
  assert.doesNotMatch(roomView({ role: 'player' }, stateFor(room, 'hero'), { pane: 'play', rank: 'money' }),
    /농작물 수확 보너스/);
  const option = scene.choices.find(({ id }) => id === 'rest');
  assert.ok(option);
  selectChoice(room, 'hero', { round: stateFor(room, 'hero').turn.number, scene: 'year', choice: 'rest' }, 1000);
  assert.equal(player.life.stats.money - before, salary);
});

test('은퇴나 군 복무 중에는 해당 직업의 정규 수입도 발생하지 않는다', () => {
  const person = life('athlete', 35);
  person.path.retired = 34;
  assert.ok(!yearlySources(person).some(({ id }) => id === 'job-athlete'));
  person.path.retired = null;
  person.path.service = { status: 'serving', until: 37 };
  assert.ok(!yearlySources(person).some(({ id }) => id === 'job-athlete'));
  assert.ok(yearlySources(person).some(({ id }) => id === 'service'));
});

test('예술·자영업 직업에도 승급 카드와 계속 일하기·다른 직업 보기가 표시된다', () => {
  const room = newRoom({ code: 'PERF42', seed: 'promotion-career-ui', name: '승급 직업', settings: { pace: 'personal', maxAge: 110 } });
  const player = addPlayer(room, { id: 'artist', name: '작가', avatar: 0, sex: 'female' });
  player.life.age = 42;
  player.life.career = 'studio';
  player.life.path.workYears.studio = 12;
  player.life.stats.art = 90;
  teacherAction(room, 'start', {}, 1000);
  const current = stateFor(room, 'artist');
  assert.equal(current.me.scene.key, 'career');
  assert.ok(current.me.scene.choices.some(({ careerGroup }) => careerGroup === 'advancement'));
  const html = roomView({ role: 'player' }, current, { pane: 'play', rank: 'money' });
  assert.match(html, /지금 일 계속하기/);
  assert.match(html, /다른 직업 보기/);
  assert.match(html, /<h3>승진·전직 기회<\/h3>/);
});
