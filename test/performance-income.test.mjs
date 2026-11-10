import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CAREERS, CAREER_PROMOTIONS, LEGACY_PERFORMANCE_PROMOTIONS } from '../public/content.mjs';
import { addPlayer, newRoom, selectChoice, stateFor, teacherAction, updateRoomRules } from '../public/game.mjs';
import { careerPay, newPath, yearlySources, careerGoals } from '../public/life.mjs';
import { gameMenuView, roomView } from '../public/views.mjs';

const BASE_STATS = { money: 100, health: 80, learning: 90, bond: 75, art: 85, joy: 60 };
const previouslyBonused = ['farmer', 'studio', 'sales', 'creator', 'shop', 'athlete'];
function life(career, age = 39, years = 10) {
  const path = newPath('female');
  path.workYears[career] = years;
  return { age, career, stats: { ...BASE_STATS }, path, history: [] };
}

test('농부·창작자·영업·자영업·선수 모두 승급 경로가 있고 성과 보너스가 사라졌다', () => {
  for (const career of previouslyBonused) {
    assert.ok(Object.values(CAREER_PROMOTIONS).some(({ from }) => from === career), career);
    const person = life(career);
    const salary = careerPay(person).total;
    const sources = yearlySources(person);
    assert.equal(sources.filter(({ id }) => id.startsWith('performance-')).length, 0);
    assert.equal(sources.filter(({ id }) => id.startsWith('job-')).length, 1);
    assert.equal(sources.find(({ id }) => id === `job-${career}`).effect.money, salary);
    assert.ok(careerGoals(person).length >= 1);
  }
});

test('직업의 연봉은 경력과 능력치에 따라 정해지고 같은 상태에선 항상 같다', () => {
  for (const career of previouslyBonused) {
    const person = life(career, 39, 5);
    const first = careerPay(person).total;
    const clone = structuredClone(person);
    assert.equal(careerPay(clone).total, first);
    person.age = 40;
    assert.equal(careerPay(person).total, first, '나이가 변해도 같은 경력과 능력치면 같은 연봉');
    person.path.workYears[career] = 20;
    assert.ok(careerPay(person).total >= first, career);
    assert.equal(yearlySources(person).filter(({ id }) => id.startsWith('performance-')).length, 0);
  }
});

test('종전 직업의 연봉 계산에서도 별도 성과 수입 없이 기본 연봉만 지급된다', () => {
  const room = newRoom({ code: 'ABC234', seed: 'career-base-only', name: '수입검증',
    settings: { pace: 'personal', maxAge: 110 } });
  const player = addPlayer(room, { id: 'hero', name: '농부', avatar: 0, sex: 'female' });
  player.life.age = 39;
  player.life.career = 'farmer';
  player.life.path.workYears.farmer = 10;
  player.life.stats.money = 150;
  teacherAction(room, 'start', {}, 1000);
  const scene = stateFor(room, 'hero').me.scene;
  assert.equal(scene.key, 'year');
  assert.equal(scene.base.money, careerPay(player.life).total);
  const html = roomView({ role: 'player' }, stateFor(room, 'hero'), { pane: 'play', rank: 'money' });
  assert.doesNotMatch(html, /농작물 수확 보너스|올해 성과/);
  const before = player.life.stats.money;
  const choice = scene.choices.find(({ id }) => id === 'rest');
  assert.ok(choice);
  selectChoice(room, 'hero', { round: stateFor(room, 'hero').turn.number,
    scene: 'year', choice: 'rest' }, 1000);
  assert.equal(player.life.stats.money - before, careerPay({ ...player.life, age: 39,
    path: { ...player.life.path, workYears: { farmer: 10 } } }).total);
});

test('승진·전직과 기존 성과형 직업의 경력 성장은 그대로 유지한다', () => {
  for (const career of ['teacher', 'nurse', 'civil', 'developer', 'coach', ...previouslyBonused]) {
    assert.ok(Object.values(CAREER_PROMOTIONS).some(({ from }) => from === career), career);
  }
  assert.equal(CAREERS.vicePrincipal.promotionFrom, 'teacher');
  assert.equal(CAREERS.principal.promotionFrom, 'vicePrincipal');
  assert.equal(CAREERS.coach.promotionFrom, undefined);
});

test('과거 저장용 직위 10개는 취업 목록에 노출하지 않고 기존 급여는 유지한다', () => {
  assert.equal(Object.keys(LEGACY_PERFORMANCE_PROMOTIONS).length, 10);
  for (const id of Object.keys(LEGACY_PERFORMANCE_PROMOTIONS)) {
    assert.equal(CAREERS[id].legacyPromotion, true);
    assert.ok(!Object.hasOwn(CAREER_PROMOTIONS, id));
    assert.ok(careerPay(life(id)).total > 0);
    assert.ok(!gameMenuView('jobs', life()).includes(`class="job-guide-title">${CAREERS[id].title}`));
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
  assert.ok(!yearlySources(player.life).some(({ id }) => id.startsWith('performance-')));
  const scene = stateFor(room, 'old').me.scene;
  assert.equal(scene.key, 'career');
  assert.ok(!scene.choices.some(({ id }) => id === 'work-farmDirector'));
});

test('기존 성과형 직업도 직업 선택 화면에서 승급할 수 있다', () => {
  const room = newRoom({ code: 'PERF42', seed: 'performance-career-ui', name: '직업 성장',
    settings: { pace: 'personal', maxAge: 110 } });
  const player = addPlayer(room, { id: 'artist', name: '창작자', avatar: 0, sex: 'female' });
  player.life.age = 42;
  player.life.career = 'studio';
  player.life.path.workYears.studio = 12;
  player.life.stats.art = 90;
  teacherAction(room, 'start', {}, 1000);
  const snapshot = stateFor(room, 'artist');
  assert.equal(snapshot.me.scene.key, 'career');
  assert.ok(snapshot.me.scene.choices.some(({ careerGroup }) => careerGroup === 'advancement'));
  const html = roomView({ role: 'player' }, snapshot, { pane: 'play', rank: 'money' });
  assert.match(html, /지금 일 계속하기/);
  assert.match(html, /다른 직업 보기/);
  assert.doesNotMatch(html, /성과 보너스|성과 수입/);
});

test('은퇴와 군복무 중에도 연간 성과 보너스 항목은 없다', () => {
  const person = life('athlete', 35);
  person.path.retired = 34;
  assert.ok(!yearlySources(person).some(({ id }) => id.startsWith('performance-')));
  person.path.retired = null;
  person.path.service = { status: 'serving', until: 37 };
  assert.ok(!yearlySources(person).some(({ id }) => id.startsWith('performance-')));
});
