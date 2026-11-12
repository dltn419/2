import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CAREERS } from '../public/content.mjs';
import { addPlayer, newRoom, selectChoice, stateFor, teacherAction } from '../public/game.mjs';
import { careerGoals, retirementAge } from '../public/life.mjs';

function setup(sex = 'female', age = 19) {
  const room = newRoom({ code: 'ABC234', seed: 'military-paths', name: '임관 테스트',
    settings: { pace: 'personal', seconds: 0 }, now: 1000 });
  const player = addPlayer(room, { id: 'student', name: '학생', avatar: 0, sex });
  player.life.age = age;
  player.life.path.school = 'general';
  Object.assign(player.life.stats, { health: 90, learning: 100, bond: 80, money: 80 });
  teacherAction(room, 'start', {}, 1000);
  return { room, life: player.life };
}

function screen(room) { return stateFor(room, 'student', 1000); }
function options(room) { return screen(room).me.scene.choices; }
function choose(room, id) {
  const view = screen(room);
  const match = view.me.scene.choices.find((choice) => choice.id === id);
  assert.ok(match, `${view.me.age}세 / ${view.me.scene.key}: missing ${id}`);
  assert.equal(match.locked, '', `choice ${id} was locked: ${match.locked}`);
  selectChoice(room, 'student',
    { round: view.turn.number, scene: view.me.scene.key, choice: id }, 1000);
}
function finishYear(room) {
  let guard = 0;
  while (screen(room).me.scene.bonus) {
    const scene = screen(room).me.scene;
    choose(room, scene.fallback);
    assert.ok(++guard < 20, 'repeating bonus scene');
  }
  const allowed = options(room).find((choice) => !choice.locked);
  assert.ok(allowed, 'no playable annual action');
  choose(room, allowed.id);
}

test('부사관은 바로 취업하지 않고 선발·양성교육 뒤 하사로 임관한다', () => {
  const { room, life } = setup('female', 19);
  choose(room, 'rest'); // education
  assert.equal(screen(room).me.scene.key, 'career');
  assert.equal(options(room).some(({ id }) => id === 'work-militaryNco'), false);
  assert.equal(options(room).some(({ id }) => id === 'work-militaryOfficer'), false);
  choose(room, 'apply-military-nco');
  assert.equal(life.career, null);
  assert.equal(life.path.militaryTraining.route, 'nco-public');
  finishYear(room);
  assert.equal(life.age, 20);
  assert.equal(life.career, 'militaryNco');
  assert.equal(life.path.service, null); // Female applicants have no conscription
});

test('남자도 부사관 임관이 의무병역 이행으로 인정되어 이중 복무하지 않는다', () => {
  const { room, life } = setup('male', 19);
  choose(room, 'rest'); // education
  choose(room, 'apply-military-nco');
  finishYear(room);
  assert.equal(life.path.service.kind, 'professional');
  assert.equal(life.career, 'militaryNco');
  assert.notEqual(screen(room).me.scene.key, 'military');
});

test('학사사관은 4년제 졸업과 체력·학습 조건이 있어야 지원된다', () => {
  const { room, life } = setup('female', 26);
  choose(room, 'rest'); // education
  const ocs = options(room).find(({ id }) => id === 'apply-military-ocs');
  assert.ok(ocs);
  assert.match(ocs.locked, /4년제 대학 졸업/);
  life.path.degree = { kind: 'university', field: 'office', age: 23 };
  assert.equal(options(room).find(({ id }) => id === 'apply-military-ocs').locked, '');
  choose(room, 'apply-military-ocs');
  finishYear(room);
  assert.equal(life.career, 'militaryOfficer');
  assert.equal(life.path.militaryRoute.kind, 'officer-ocs');
});

test('여학생도 ROTC 후보생으로 선발돼 대학 졸업과 함께 소위로 임관한다', () => {
  const { room, life } = setup('female', 20);
  life.path.program = { kind: 'university', field: 'science', remaining: 3 };
  assert.equal(screen(room).me.scene.key, 'rotc');
  choose(room, 'rotc-apply');
  assert.equal(life.path.militaryRoute.kind, 'rotc');
  for (let i = 0; i < 3; i++) finishYear(room);
  assert.equal(life.age, 23);
  assert.equal(life.career, 'militaryOfficer');
  assert.equal(life.path.degree.kind, 'university');
  assert.equal(life.path.service, null);
});

test('남학생은 입영을 유예한 뒤 ROTC를 선택하면 중복 입영하지 않는다', () => {
  const { room, life } = setup('male', 20);
  life.path.program = { kind: 'university', field: 'tech', remaining: 3 };
  assert.equal(screen(room).me.scene.key, 'military');
  choose(room, 'service-after-study');
  assert.equal(screen(room).me.scene.key, 'rotc');
  choose(room, 'rotc-apply');
  for (let i = 0; i < 3; i++) finishYear(room);
  assert.equal(life.career, 'militaryOfficer');
  assert.equal(life.path.service.kind, 'professional');
});

test('육군사관학교는 고교 졸업 직후 4년 교육 후 임관한다', () => {
  const { room, life } = setup('female', 19);
  choose(room, 'study-academy');
  for (let i = 0; i < 4; i++) finishYear(room);
  assert.equal(life.age, 23);
  assert.equal(life.path.degree.kind, 'academy');
  assert.equal(life.career, 'militaryOfficer');
});

test('전문대 졸업 후 3사관학교에서 2년을 마치면 소위로 임관한다', () => {
  const { room, life } = setup('female', 22);
  life.path.degree = { kind: 'college', field: 'tech', age: 21 };
  choose(room, 'study-academy3');
  finishYear(room);
  finishYear(room);
  assert.equal(life.age, 24);
  assert.equal(life.career, 'militaryOfficer');
});

test('현역병에서 부사관으로 전환한 남성은 병역 기간이 중복되지 않는다', () => {
  const { room, life } = setup('male', 21);
  life.path.service = { status: 'serving', kind: 'military', until: 22 };
  assert.equal(screen(room).me.scene.key, 'military-nco');
  choose(room, 'military-nco-service');
  finishYear(room);
  assert.equal(life.career, 'militaryNco');
  assert.equal(life.path.service.kind, 'professional');
});

test('군 계급은 하사→중사→상사→원사, 소위→중위→대위→소령이고 직급별 정년을 따른다', () => {
  assert.equal(CAREERS.militarySergeant.promotionFrom, 'militaryNco');
  assert.equal(CAREERS.militaryMasterSergeant.promotionFrom, 'militarySergeant');
  assert.equal(CAREERS.militarySergeantMajor.promotionFrom, 'militaryMasterSergeant');
  assert.equal(CAREERS.militaryLieutenant.promotionFrom, 'militaryOfficer');
  assert.equal(CAREERS.militaryCaptain.promotionFrom, 'militaryLieutenant');
  assert.equal(CAREERS.militaryMajor.promotionFrom, 'militaryCaptain');
  assert.deepEqual(['militaryNco', 'militarySergeant', 'militaryMasterSergeant', 'militarySergeantMajor',
    'militaryOfficer', 'militaryLieutenant', 'militaryCaptain', 'militaryMajor'].map(retirementAge),
    [40, 45, 53, 55, 43, 43, 43, 50]);
  const { life } = setup('female', 27);
  life.career = 'militaryOfficer';
  assert.deepEqual(careerGoals(life).map((goal) => goal.career), ['militaryLieutenant']);
});
