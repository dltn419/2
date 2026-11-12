import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addPlayer, newRoom, selectChoice, stateFor, teacherAction } from '../public/game.mjs';
import { careerGoals, careerInterestGoals, newPath } from '../public/life.mjs';
import { roomView } from '../public/views.mjs';

const stats = () => ({ money: 150, health: 80, learning: 70, bond: 55, art: 45, joy: 60 });
function life(career, age = 42, years = 0) {
  const path = newPath('female');
  path.workYears[career] = years;
  return { career, age, stats: stats(), path, history: [] };
}
function setup(career, age = 42, years = 0) {
  const room = newRoom({ code: 'ABC123', name: '진로 확인', seed: 'goals-test',
    settings: { pace: 'personal', maxAge: 110 } });
  const player = addPlayer(room, { id: 'p1', name: '학생', avatar: 0, sex: 'female' });
  player.life.career = career;
  player.life.age = age;
  player.life.stats = stats();
  player.life.path.workYears[career] = years;
  teacherAction(room, 'start', {}, 1000);
  return { room, player };
}

test('관심 직업은 어릴 때부터 진학과 필요 능력치를 보여주고 실제 지원 조건과 맞는다', () => {
  const { room, player } = setup('staff', 34, 8);
  player.interests = ['teacher'];
  const child = { ...player.life, age: 0, career: null, stats: { ...stats(), learning: 8, bond: 10 }, path: newPath('female') };
  const [goal] = careerInterestGoals(child, player.interests);
  assert.equal(goal.checks.find(({ label }) => label === '교육대 졸업').met, false);
  assert.match(goal.notes.join(' '), /교육대 진학 기준 · 배움 47점 · 관계 22점/);
  assert.deepEqual(goal.checks.find(({ label }) => label === '배움'),
    { label: '배움', current: 8, required: 59, unit: '점', met: false });

  player.life.path.degree = { kind: 'teaching', field: 'education', age: 23 };
  const current = stateFor(room, 'p1');
  const [prepared] = careerInterestGoals(player.life, player.interests);
  const hiring = current.me.scene.choices.find(({ id }) => id === 'work-teacher');
  assert.ok(hiring && !hiring.locked);
  for (const { label, required, unit, met } of prepared.checks) {
    assert.ok(hiring.conditions.some((check) => check.label === (required ? `${label} ${required}${unit}` : label) && check.met === met));
  }
  const html = roomView({ role: 'player' }, current, { pane: 'play', rank: 'money' });
  assert.match(html, /data-career-goal="interest-teacher"/);
  assert.match(html, /70\/53점/);
});

test('아이돌 관심 직업은 다음 졸업 오디션 기준을 표시한다', () => {
  const person = life(null, 13);
  person.stats.art = 33;
  const [goal] = careerInterestGoals(person, ['idol']);
  assert.equal(goal.checks.find(({ label }) => label === '예술').required, 36);
  assert.equal(goal.closed, false);
  person.age = 19;
  assert.equal(careerInterestGoals(person, ['idol'])[0].closed, true);
});

test('교사의 승진 목표에서 경력과 능력치를 개별 충족·미충족으로 보여준다', () => {
  const person = life('teacher', 42, 9);
  const goal = careerGoals(person)[0];
  assert.equal(goal.title, '교감');
  assert.equal(goal.type, '승진');
  assert.equal(goal.met, 0);
  assert.equal(goal.total, 3);
  assert.deepEqual(goal.checks.map(({ id, met }) => [id, met]),
    [['years', false], ['learning', false], ['bond', false]]);
  person.path.workYears.teacher = 12;
  person.stats.learning = 75;
  assert.deepEqual(careerGoals(person)[0].checks.map(({ met }) => met), [true, true, false]);
  person.stats.bond = 63;
  assert.equal(careerGoals(person)[0].ready, true);
});

test('플레이 화면에서 승진 목표를 펼치면 실제 숫자와 달성 여부가 표시된다', () => {
  const { room, player } = setup('teacher', 42, 9);
  const page = () => roomView({ role: 'player' }, stateFor(room, 'p1'), { pane: 'play', rank: 'money' });
  const initial = page();
  assert.match(initial, /승진·전직 준비/);
  assert.match(initial, /승진 목표 · 교감/);
  assert.match(initial, /0\/3 충족/);
  assert.match(initial, /교사 경력/);
  assert.match(initial, /9\/12년/);
  assert.match(initial, /배움/);
  assert.match(initial, /70\/74점/);
  assert.match(initial, /55\/60점/);
  assert.match(initial, /미충족/);
  player.life.path.workYears.teacher = 15;
  player.life.stats.learning = 76;
  player.life.stats.bond = 65;
  const updated = page();
  assert.match(updated, /3\/3 충족/);
  assert.match(updated, /모든 조건 충족/);
  assert.match(updated, /다음 직업 선택 때 도전/);
});

test('교감이 되면 교장 조건으로 자동 변경되며 기존 달성 상태는 유지된다', () => {
  const person = life('teacher', 42, 16);
  person.stats.learning = 95;
  person.stats.bond = 82;
  assert.equal(careerGoals(person)[0].title, '교감');
  person.career = 'vicePrincipal';
  person.age = 50;
  person.path.workYears.vicePrincipal = 4;
  const goal = careerGoals(person)[0];
  assert.equal(goal.title, '교장');
  assert.equal(goal.checks[0].required, 6);
  assert.equal(goal.checks[0].current, 4);
  assert.deepEqual(goal.checks.map(({ met }) => met), [false, true, true]);
});

test('의사에서 임상교수 승진은 관련 대학원 수료 여부를 함께 표시한다', () => {
  const person = life('doctor', 50, 12);
  person.stats.learning = 110;
  person.stats.bond = 70;
  let goal = careerGoals(person)[0];
  assert.equal(goal.title, '임상교수');
  assert.equal(goal.ready, false);
  assert.equal(goal.checks.find(({ id }) => id === 'graduate')?.met, false);
  person.path.degree = { kind: 'graduate', field: 'medical', age: 45 };
  goal = careerGoals(person)[0];
  assert.equal(goal.ready, true);
  assert.equal(goal.checks.find(({ id }) => id === 'graduate')?.met, true);
});

test('운동선수의 지도자 전직은 경력·체력·관계 조건을 제시한다', () => {
  const athlete = life('athlete', 35, 2);
  athlete.stats.health = 60;
  athlete.stats.bond = 40;
  const goal = careerGoals(athlete).find(({ career }) => career === 'coach');
  assert.equal(goal.title, '생활체육 지도자');
  assert.equal(goal.type, '전직');
  assert.equal(goal.checks[0].required, 3);
  assert.equal(goal.ready, false);
  athlete.path.workYears.athlete = 3;
  assert.equal(careerGoals(athlete).find(({ career }) => career === 'coach').ready, false);
  athlete.path.sportsCoachCertificationAge = 34;
  assert.equal(careerGoals(athlete).find(({ career }) => career === 'coach').ready, true);
  athlete.age = 38;
  assert.equal(careerGoals(athlete).find(({ career }) => career === 'coach').ready, true);
  athlete.age = 39;
  assert.equal(careerGoals(athlete).length, 0);
});

test('예술·자영업 직업도 승급 목표가 있고 최종 직급·은퇴 후에는 사라진다', () => {
  for (const career of ['farmer', 'studio', 'sales', 'creator', 'shop']) {
    assert.ok(careerGoals(life(career, 40, 12)).length > 0, career);
  }
  assert.deepEqual(careerGoals(life('principal', 40, 12)), []);
  const teacher = life('teacher', 66, 30);
  assert.deepEqual(careerGoals(teacher), []);
  teacher.age = 60;
  teacher.path.retired = 60;
  assert.deepEqual(careerGoals(teacher), []);
  const { room } = setup('farmer', 42, 12);
  const html = roomView({ role: 'player' }, stateFor(room, 'p1'), { pane: 'play', rank: 'money' });
  assert.match(html, /class="career-goals"/);
});

test('직업 선택 시점의 실제 승진 제한과 목표 표시가 일치한다', () => {
  const { room, player } = setup('teacher', 42, 10);
  let goal = careerGoals(player.life)[0];
  assert.equal(goal.ready, false);
  let option = stateFor(room, 'p1').me.scene.choices.find(({ id }) => id === 'work-vicePrincipal');
  assert.ok(option.locked);
  assert.equal(goal.checks.filter(({ met }) => !met).length, option.conditions.filter(({ met }) => !met).length);
  player.life.path.workYears.teacher = 14;
  player.life.stats.learning = 82;
  player.life.stats.bond = 70;
  goal = careerGoals(player.life)[0];
  option = stateFor(room, 'p1').me.scene.choices.find(({ id }) => id === 'work-vicePrincipal');
  assert.equal(goal.ready, true);
  assert.ok(!option.locked);
  const state = stateFor(room, 'p1');
  selectChoice(room, 'p1', { round: state.turn.number, scene: state.me.scene.key, choice: 'work-vicePrincipal' }, 1000);
  assert.equal(player.life.career, 'vicePrincipal');
  assert.equal(careerGoals(player.life)[0].title, '교장');
});
