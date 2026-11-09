import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CAREERS, CAREER_PROMOTIONS, LEGACY_PERFORMANCE_PROMOTIONS, PERFORMANCE_BONUSES } from '../public/content.mjs';
import { addPlayer, newRoom, selectChoice, stateFor, teacherAction, updateRoomRules } from '../public/game.mjs';
import { bonusScene, careerPay, newPath, performanceBonus, performanceProfile, yearlySources } from '../public/life.mjs';
import { gameMenuView, roomView } from '../public/views.mjs';

const STATS = { money: 100, health: 75, learning: 70, bond: 75, art: 75, joy: 65 };
function life(career, age = 38, years = 10) {
  const path = newPath('female');
  path.romanceSeed = 153876;
  path.workYears[career] = years;
  return { age, career, stats: { ...STATS }, path, history: [] };
}
const performanceCareers = ['farmer', 'studio', 'sales', 'creator', 'shop', 'athlete'];

test('자영업·창작·영업·운동선수는 승진 대신 성과 보너스가 적용된다', () => {
  assert.deepEqual(Object.keys(PERFORMANCE_BONUSES), performanceCareers);
  for (const career of performanceCareers) {
    const profile = performanceProfile(career);
    assert.ok(profile);
    assert.equal(profile.root, career);
    assert.ok(profile.max >= 4 && profile.max <= 6);
    assert.ok(!Object.values(CAREER_PROMOTIONS).some(({ from }) => from === career),
      `${career}에 일반 승진 단계가 남아 있으면 안 됨`);
    const person = life(career);
    const result = performanceBonus(person);
    assert.ok(Number.isInteger(result.money) && result.money >= 0 && result.money <= profile.max);
    const source = yearlySources(person).find(({ id }) => id === `performance-${career}`);
    assert.equal(source.effect.money, result.money);
    assert.match(source.label, /보너스|수당|수입|상금/);
  }
});

test('교사·간호사·공무원·개발자 승진과 운동선수 지도자 전직은 유지한다', () => {
  for (const career of ['teacher', 'nurse', 'civil', 'developer', 'coach']) {
    assert.ok(Object.values(CAREER_PROMOTIONS).some(({ from }) => from === career), career);
    assert.equal(performanceBonus(life(career)), null);
  }
  assert.equal(CAREERS.vicePrincipal.promotionFrom, 'teacher');
  assert.equal(CAREERS.principal.promotionFrom, 'vicePrincipal');
  assert.equal(CAREERS.coach.promotionFrom, undefined);
});

test('성과 보너스는 같은 상황·나이에선 같고 연도별로 변동한다', () => {
  for (const career of performanceCareers) {
    const person = life(career, 30, 5);
    const first = performanceBonus(person).money;
    const second = performanceBonus(structuredClone(person)).money;
    assert.equal(first, second);
    const years = new Set(Array.from({ length: 25 }, (_, i) =>
      performanceBonus({ ...person, age: 30 + i }).money));
    assert.ok(years.size >= 2, `${career} 보너스가 25년 동안 고정되면 안 됨`);
  }
});

test('높은 능력치와 숙련 경력은 낮은 값과 비교해 보너스를 올리거나 유지한다', () => {
  for (const career of performanceCareers) {
    const weak = life(career, 36, 1);
    weak.stats[PERFORMANCE_BONUSES[career].stat] = 15;
    const strong = structuredClone(weak);
    strong.stats[PERFORMANCE_BONUSES[career].stat] = 120;
    strong.path.workYears[career] = 15;
    const x = performanceBonus(weak).money;
    const y = performanceBonus(strong).money;
    assert.ok(y >= x, `${career}: ${x} > ${y}`);
  }
});

test('이전 승진 캐릭터는 데이터를 보존하지만 신규 승진·직업 안내에 노출하지 않는다', () => {
  assert.equal(Object.keys(LEGACY_PERFORMANCE_PROMOTIONS).length, 10);
  for (const role of Object.keys(LEGACY_PERFORMANCE_PROMOTIONS)) {
    assert.equal(CAREERS[role].legacyPromotion, true);
    assert.ok(!Object.hasOwn(CAREER_PROMOTIONS, role));
    assert.ok(performanceProfile(role));
    assert.ok(careerPay(life(role)));
    assert.ok(!gameMenuView('jobs', life()).includes(`<h3>${CAREERS[role].title}</h3>`));
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
  assert.ok(yearlySources(player.life).some(({ id }) => id === 'performance-farmer'));
  const scene = stateFor(room, 'old').me.scene;
  assert.equal(scene.key, 'career');
  assert.ok(!scene.choices.some(({ id }) => id === 'work-farmDirector'));
});

test('성과 수입은 정규 연봉과 별도 지급되고 실제 1년 진행에 반영된다', () => {
  // 무작위 일반 사건의 개입을 피하기 위해 명시적으로 사건이 없는 방 시드를 택합니다.
  function hash(value) {
    let result = 2166136261;
    for (const char of value) result = Math.imul(result ^ char.charCodeAt(0), 16777619);
    return result >>> 0;
  }
  let seed = 'bonustest';
  while (hash(`${seed}:hero:1:39:event`) % 7 === 0) seed += 'x';
  const room = newRoom({ code: 'ABC234', seed, name: '실전', settings: { pace: 'personal', maxAge: 110 } });
  const player = addPlayer(room, { id: 'hero', name: '농부', avatar: 0, sex: 'female' });
  player.life.age = 39;
  player.life.career = 'farmer';
  player.life.path.workYears.farmer = 10;
  player.life.stats.money = 150;
  teacherAction(room, 'start', {}, 1000);
  const before = player.life.stats.money;
  const scene = stateFor(room, 'hero').me.scene;
  assert.equal(scene.key, 'year');
  const payout = performanceBonus(player.life).money;
  assert.equal(scene.base.money, careerPay(player.life).total + payout);
  assert.match(roomView({ role: 'player' }, stateFor(room, 'hero'), { pane: 'play', rank: 'money' }),
    /농작물 수확 보너스/);
  const option = scene.choices.find(({ id }) => id === 'rest');
  assert.ok(option);
  selectChoice(room, 'hero', { round: room.turn.number, scene: 'year', choice: 'rest' }, 1000);
  assert.equal(player.life.stats.money - before, careerPay({ ...player.life, age: 39,
    path: { ...player.life.path, workYears: { farmer: 10 } } }).total + payout);
});

test('은퇴 또는 군복무 중에는 성과 보너스를 지급하지 않는다', () => {
  const person = life('athlete', 35);
  person.path.retired = 34;
  assert.ok(!yearlySources(person).some(({ id }) => id.startsWith('performance-')));
  person.path.retired = null;
  person.path.service = { status: 'serving', until: 37 };
  assert.ok(!yearlySources(person).some(({ id }) => id.startsWith('performance-')));
});
