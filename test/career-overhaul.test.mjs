import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CAREERS, CAREER_GROUPS, CAREER_PROMOTIONS, LEGACY_PERFORMANCE_PROMOTIONS } from '../public/content.mjs';
import { addPlayer, newRoom, selectChoice, stateFor, teacherAction } from '../public/game.mjs';
import { advancePath, applyPath, bonusScene, careerGoals, newPath, retirementAge } from '../public/life.mjs';
import { gameMenuView, roomView } from '../public/views.mjs';

const attributes = () => ({ money: 130, health: 90, learning: 120, bond: 110, art: 20, joy: 70 });
function character(sex = 'female', age = 26, career = null) {
  const path = newPath(sex);
  path.school = 'general';
  if (career) path.workYears[career] = 12;
  return { age, career, stats: attributes(), path, history: [] };
}
function classroom(sex = 'female', age = 26, career = null) {
  const room = newRoom({ code: 'ABC234', seed: 'career-overhaul', name: '직업 시험', settings: { pace: 'personal', maxAge: 110 } });
  const player = addPlayer(room, { id: 'p1', name: '학생', avatar: 0, sex });
  player.life.age = age;
  player.life.career = career;
  player.life.stats = attributes();
  player.life.path.school = 'general';
  if (career) player.life.path.workYears[career] = 12;
  teacherAction(room, 'start', {}, 1000);
  return { room, player };
}
function findCareerScene(room) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const view = stateFor(room, 'p1');
    if (view.me.scene.key === 'career') return view;
    assert.equal(view.me.scene.key, 'education');
    selectChoice(room, 'p1', { round: view.turn.number, scene: 'education', choice: 'rest' }, 1000);
  }
  return stateFor(room, 'p1');
}

test('60개 기본 직업이 정확히 5개 직업군에 12개씩 배치된다', () => {
  const starting = Object.entries(CAREERS).filter(([, role]) =>
    !role.promotionFrom && !role.entryVariant && !role.legacyPromotion);
  assert.equal(starting.length, 60);
  assert.equal(Object.keys(CAREER_GROUPS).length, 5);
  const keys = Object.values(CAREER_GROUPS).flatMap(({ ids }) => ids);
  assert.equal(keys.length, 60);
  assert.equal(new Set(keys).size, 60);
  assert.deepEqual(new Set(starting.map(([id]) => id)), new Set(keys));
  for (const group of Object.values(CAREER_GROUPS)) assert.equal(group.ids.length, 12);
});

test('각 기본 직업은 두 단계 이상 성장하거나 부사관·장교 진입 경로를 제공한다', () => {
  const next = (id) => Object.entries(CAREER_PROMOTIONS)
    .filter(([, value]) => value.from === id).map(([key]) => key);
  for (const [id, role] of Object.entries(CAREERS)) {
    if (role.promotionFrom || role.entryVariant || role.legacyPromotion) continue;
    if (role.entryOnlyFamily) {
      for (const variant of ['soldierNco', 'soldierOfficer']) {
        assert.ok(CAREERS[variant].entryVariant);
        assert.ok(next(variant).some((child) => next(child).length > 0), variant);
      }
      continue;
    }
    assert.ok(next(id).some((child) => next(child).length > 0), id);
  }
});

test('무관한 직업에 예술 조건을 붙이지 않고 관련 분야에만 활용한다', () => {
  for (const id of ['developer','seniorDeveloper','engineeringLead','gameDeveloper','police',
    'firefighter','correctional','soldierNco','soldierOfficer','electrician','mechanic']) {
    assert.equal(CAREERS[id].need?.art, undefined, id);
  }
  for (const id of ['studio','marketing','architect','hairdresser','designer','idol','brandedFarmer']) {
    assert.ok(CAREERS[id].need?.art > 0, id);
  }
});

test('교도관은 독립 직업이며 교정직 내부 2단계 성장 경로가 있다', () => {
  assert.equal(CAREERS.correctional.title, '교도관');
  assert.equal(CAREERS.correctionalTeacher.promotionFrom, 'correctional');
  assert.equal(CAREERS.correctionalTeacher.title, '교사(교정직)');
  assert.equal(CAREERS.correctionalSenior.promotionFrom, 'correctionalTeacher');
});

test('성별에 관계없이 부사관과 장교의 지원 조건이 동일하고 학력별로 달라진다', () => {
  for (const sex of ['female', 'male']) {
    const { room, player } = classroom(sex);
    let view = findCareerScene(room);
    assert.equal(view.me.scene.key, 'career');
    const nco = view.me.scene.choices.find(({ id }) => id === 'work-soldierNco');
    const officer = view.me.scene.choices.find(({ id }) => id === 'work-soldierOfficer');
    assert.ok(nco && !nco.locked, sex);
    assert.match(officer.locked, /4년제 대학 졸업/);
    player.life.path.degree = { kind: 'university', field: 'science', age: 24 };
    view = findCareerScene(room);
    assert.ok(!view.me.scene.choices.find(({ id }) => id === 'work-soldierOfficer').locked);
    selectChoice(room, 'p1', { round: view.turn.number, scene: 'career', choice: 'work-soldierOfficer' }, 1000);
    assert.equal(player.life.career, 'soldierOfficer');
    if (sex === 'male') assert.equal(player.life.path.service.status, 'complete');
    else assert.equal(player.life.path.service, null);
  }
});

test('부사관은 고졸부터 가능하고 남성 선택 시 의무복무가 중복되지 않는다', () => {
  const { room, player } = classroom('male');
  const view = findCareerScene(room);
  assert.ok(!view.me.scene.choices.find(({ id }) => id === 'work-soldierNco').locked);
  selectChoice(room, 'p1', { round: view.turn.number, scene: 'career', choice: 'work-soldierNco' }, 1000);
  assert.equal(player.life.path.service.status, 'complete');
  assert.equal(player.life.career, 'soldierNco');
});

test('간호학과 재학 중 배움 65 이상으로 교직이수 과정을 선택할 수 있다', () => {
  const life = character('female', 19);
  life.stats.learning = 65;
  life.path.program = { kind: 'nursing', field: 'medical', remaining: 4 };
  const track = bonusScene(life, []);
  assert.equal(track.key, 'nursing-teaching');
  const option = track.choices.find(({ id }) => id === 'nursing-teaching-apply');
  assert.equal(option.need.learning, 65);
  applyPath(life, 19, option);
  assert.equal(life.path.nursingTeachingTrack, 'selected');
  for (let i = 0; i < 4; i++) { life.age++; advancePath(life); }
  assert.equal(life.path.nursingTeachingTrack, 'completed');
  assert.equal(life.path.degree.kind, 'nursing');
});

test('교직이수 없이 간호학과를 졸업했다면 보건교사 전직은 불가능하다', () => {
  const life = character('female', 26, 'nurse');
  life.path.degree = { kind: 'nursing', field: 'medical', age: 23 };
  life.path.nursingLicenseAge = 24;
  life.path.schoolNurseExamAge = 25;
  const goal = careerGoals(life).find(({ career }) => career === 'schoolNurse');
  assert.ok(goal);
  assert.equal(goal.ready, false);
  assert.equal(goal.checks.find(({ id }) => id === 'nursing-teaching').met, false);
  assert.equal(bonusScene(life, ['education','career'])?.key === 'school-nurse-exam', false);
});

test('교직이수 후 면허와 임용시험을 얻으면 보건교사 전직이 가능하다', () => {
  const life = character('female', 26, 'nurse');
  life.path.degree = { kind: 'nursing', field: 'medical', age: 23 };
  life.path.nursingTeachingTrack = 'completed';
  life.path.nursingLicenseAge = 25;
  const exam = bonusScene(life, []);
  assert.equal(exam.key, 'school-nurse-exam');
  const taking = exam.choices.find(({ id }) => id === 'school-nurse-exam-pass');
  applyPath(life, 26, taking);
  assert.equal(life.path.schoolNurseExamAge, 26);
  const goal = careerGoals(life).find(({ career }) => career === 'schoolNurse');
  assert.equal(goal.ready, true);
  const room = newRoom({ code: 'XYZ234', seed: 'school-nurse', name: '보건교사',
    settings: { pace: 'personal', maxAge: 110 } });
  const player = addPlayer(room, { id: 'nurse', name: '간호사', avatar: 0, sex: 'female' });
  player.life = life;
  teacherAction(room, 'start', {}, 1000);
  const view = stateFor(room, 'nurse');
  const scene = view.me.scene.key === 'education' ? (selectChoice(room, 'nurse',
    { round: view.turn.number, scene: 'education', choice: 'rest' }, 1000), stateFor(room,'nurse')) : view;
  assert.equal(scene.me.scene.key, 'career');
  assert.ok(!scene.me.scene.choices.find(({ id }) => id === 'work-schoolNurse').locked);
});

test('관련 대학원과 경력이 갖춰지면 연구원에서 대학교수로 분기한다', () => {
  const person = character('female', 42, 'seniorResearcher');
  person.path.workYears.seniorResearcher = 8;
  person.path.degree = { kind: 'graduate', field: 'science', age: 38 };
  assert.ok(careerGoals(person).some(({ career, ready }) => career === 'professor' && ready));
});

test('직업 안내와 취업 화면은 다섯 직업군으로 나눠 표시된다', () => {
  const guide = gameMenuView('jobs', null);
  assert.equal([...guide.matchAll(/class="job-guide-entry"/g)].length, 60);
  assert.equal([...guide.matchAll(/class="job-guide-group-title"/g)].length, 5);
  const { room } = classroom('female', 26);
  const scene = findCareerScene(room);
  const html = roomView({ role: 'player' }, scene, { pane: 'play', rank: 'money' });
  for (const group of Object.keys(CAREER_GROUPS)) {
    assert.match(html, new RegExp(`data-choice-section="career-${group}"`));
  }
});
