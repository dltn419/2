import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CAREER_GROUPS, CAREER_PROMOTIONS, CAREERS, PERFORMANCE_BONUSES } from '../public/content.mjs';
import { addPlayer, newRoom, selectChoice, stateFor, teacherAction } from '../public/game.mjs';
import { bonusScene, careerGoals, newPath, pathNotes, performanceBonus } from '../public/life.mjs';
import { gameMenuView, roomView } from '../public/views.mjs';

function roomFor({ age = 42, sex = 'female', career = null } = {}) {
  const room = newRoom({ code: 'ABC234', name: '직업 60개 테스트', seed: 'career-sixty-coverage',
    settings: { pace: 'personal', maxAge: 110 }, now: 1000 });
  const player = addPlayer(room, { id: 'student', name: '학생', avatar: 0, sex });
  player.life.age = age;
  player.life.path.school = 'general';
  player.life.stats = { learning: 150, health: 120, bond: 120, art: 95, money: 200, joy: 65 };
  player.life.career = career;
  if (career) player.life.path.workYears[career] = 15;
  teacherAction(room, 'start', {}, 1000);
  return { room, player };
}
const view = (room) => stateFor(room, 'student');
function choose(room, id) {
  const snapshot = view(room);
  const selected = snapshot.me.scene.choices.find(({ id: option }) => option === id);
  assert.ok(selected && !selected.locked, id + ': ' + selected?.locked);
  selectChoice(room, 'student', { round: snapshot.turn.number,
    scene: snapshot.me.scene.key, choice: id }, 1000);
}

test('기본 직업은 정확히 60개이며 5개 분야에 각 12개씩 배치된다', () => {
  const base = Object.entries(CAREERS).filter(([, job]) => !job.promotionFrom && !job.legacyPromotion);
  assert.equal(base.length, 60);
  assert.equal(CAREER_GROUPS.length, 5);
  assert.equal(new Set(base.map(([id]) => id)).size, 60);
  for (const group of CAREER_GROUPS) {
    assert.equal(base.filter(([, job]) => job.group === group.id).length, 12, group.title);
  }
  for (const id of ['prisonOfficer', 'militaryNco', 'militaryOfficer', 'idol', 'architect']) {
    assert.ok(CAREERS[id] && !CAREERS[id].promotionFrom, id);
  }
});

test('모든 시작 직업은 1차·2차 성장 경로와 상승하는 기본 연봉을 갖는다', () => {
  for (const [id, job] of Object.entries(CAREERS).filter(([, role]) => !role.promotionFrom)) {
    const next = Object.entries(CAREERS).filter(([, candidate]) =>
      candidate.promotionFrom === id && !candidate.legacyPromotion);
    assert.ok(next.length > 0, id + ': 첫 단계');
    assert.ok(next.some(([first]) =>
      Object.values(CAREERS).some((second) => second.promotionFrom === first && !second.legacyPromotion)),
      id + ': 두 번째 단계');
    for (const [rank, nextJob] of next) assert.ok(nextJob.wage > job.wage, rank + ': 연봉');
  }
  assert.ok(Object.keys(CAREER_PROMOTIONS).length > 100);
});

test('기존 교감·교장과 간호사·의사 직위 식별자는 보존하고 복수 진로를 추가한다', () => {
  assert.equal(CAREERS.vicePrincipal.promotionFrom, 'teacher');
  assert.equal(CAREERS.principal.promotionFrom, 'vicePrincipal');
  assert.equal(CAREERS.clinicalProfessor.promotionFrom, 'doctor');
  assert.equal(CAREERS.hospitalDirector.promotionFrom, 'clinicalProfessor');
  assert.equal(CAREERS.nursingDirector.promotionFrom, 'headNurse');
  assert.equal(CAREERS.masterTeacher.promotionFrom, 'teacher');
  assert.equal(CAREERS.universityProfessor.promotionFrom, 'seniorResearcher');
  assert.equal(CAREERS.schoolNurse.promotionFrom, 'nurse');
  assert.equal(CAREERS.masterTeacher.routeType, '전직');
  assert.equal(CAREERS.universityProfessor.requiresGraduate, true);
});

test('예술이 필요한 분야에만 예술 조건을 두고 개발자·교도관·직업군인에는 요구하지 않는다', () => {
  for (const id of ['developer', 'gameDeveloper', 'prisonOfficer', 'militaryNco',
    'militaryOfficer', 'police', 'firefighter', 'nurse', 'banker']) {
    assert.ok(!Object.hasOwn(CAREERS[id].need ?? {}, 'art'), id);
  }
  for (const id of ['baker', 'hairdresser', 'architect', 'designer', 'idol', 'producer', 'webtoon']) {
    assert.ok((CAREERS[id].need?.art ?? 0) > 0, id);
  }
  assert.ok((CAREERS.farmBrand.need?.art ?? 0) > 0);
});

test('교도관은 남녀 모두 채용되며 교정직 성장 경로가 표시된다', () => {
  for (const sex of ['female', 'male']) {
    const { room } = roomFor({ sex, age: 19 });
    const snapshot = view(room);
    assert.equal(snapshot.me.scene.key, 'education');
    choose(room, 'rest');
    const option = view(room).me.scene.choices.find(({ id }) => id === 'work-prisonOfficer');
    assert.ok(option && !option.locked, sex);
    choose(room, 'work-prisonOfficer');
    assert.equal(room.players[0].life.career, 'prisonOfficer');
    const goals = careerGoals(room.players[0].life);
    assert.equal(goals[0].title, '교사(교정직)');
    assert.equal(CAREERS.prisonCaptain.promotionFrom, 'prisonTeacher');
  }
});

test('여성과 남성에게 동일한 부사관 진입 기회가 있고 남성의 의무복무는 중복되지 않는다', () => {
  for (const sex of ['female', 'male']) {
    const { room, player } = roomFor({ age: 19, sex });
    choose(room, 'rest');
    const option = view(room).me.scene.choices.find(({ id }) => id === 'work-militaryNco');
    assert.ok(option && !option.locked, sex);
    choose(room, 'work-militaryNco');
    assert.equal(player.life.career, 'militaryNco');
    assert.equal(careerGoals(player.life)[0].title, '중사');
    if (sex === 'male') {
      assert.equal(player.life.path.service.status, 'complete');
      assert.equal(player.life.path.service.kind, 'professional');
      player.life.age = 20;
      assert.notEqual(bonusScene(player.life, []).key, 'military');
    } else {
      assert.equal(player.life.path.service, null);
    }
  }
});

test('장교 경로는 대학 졸업 조건이 있으며 남녀에게 동일하게 열린다', () => {
  for (const sex of ['female', 'male']) {
    const { room, player } = roomFor({ age: 26, sex });
    player.life.path.degree = null;
    let scene = view(room).me.scene;
    if (scene.key === 'education') {
      choose(room, 'rest');
      scene = view(room).me.scene;
    }
    const before = scene.choices.find(({ id }) => id === 'work-militaryOfficer');
    assert.match(before.locked, /4년제 대학 졸업/);
    player.life.path.degree = { kind: 'university', field: 'office', age: 23 };
    const after = view(room).me.scene.choices.find(({ id }) => id === 'work-militaryOfficer');
    assert.ok(after && !after.locked, sex);
    choose(room, 'work-militaryOfficer');
    assert.equal(player.life.career, 'militaryOfficer');
    assert.equal(careerGoals(player.life)[0].title, '대위');
  }
});

test('간호학과 교직이수는 재학 중 단 한 번 선택하며 배움 조건을 요구한다', () => {
  const { room, player } = roomFor({ age: 21 });
  player.life.path.program = { kind: 'nursing', field: 'medical', remaining: 2 };
  player.life.stats.learning = 60;
  let scene = view(room).me.scene;
  assert.equal(scene.key, 'nursing-teaching');
  const candidate = scene.choices.find(({ id }) => id === 'nursing-teaching-apply');
  assert.match(candidate.locked, /배움 65점/);
  player.life.stats.learning = 70;
  choose(room, 'nursing-teaching-apply');
  assert.equal(player.life.path.nursingTeachingDecision, true);
  assert.ok(pathNotes(player.life).includes('간호학과 교직이수 수료'));
  assert.notEqual(view(room).me.scene.key, 'nursing-teaching');
  assert.equal(bonusScene(player.life, ['nursing-teaching'])?.key === 'nursing-teaching', false);
});

test('간호학과 교직이수 포기자는 나중에 배움을 올려도 보건교사가 불가능하다', () => {
  const { room, player } = roomFor({ age: 21 });
  player.life.path.program = { kind: 'nursing', field: 'medical', remaining: 2 };
  choose(room, 'rest');
  assert.equal(player.life.path.nursingTeachingDecision, false);
  player.life.age = 42;
  player.life.career = 'nurse';
  player.life.path.program = null;
  player.life.path.degree = { kind: 'nursing', field: 'medical', age: 25 };
  player.life.path.nursingLicenseAge = 26;
  player.life.path.workYears.nurse = 12;
  const goal = careerGoals(player.life).find(({ career }) => career === 'schoolNurse');
  assert.ok(goal);
  assert.equal(goal.checks.find(({ id }) => id === 'nursingTeaching').met, false);
  assert.equal(goal.ready, false);
  const option = view(room).me.scene.choices.find(({ id }) => id === 'work-schoolNurse');
  assert.match(option.locked, /교직이수/);
});

test('보건교사는 교직이수·간호사 면허·경력·능력 조건을 모두 채워야 전직할 수 있다', () => {
  const { room, player } = roomFor({ age: 42, career: 'nurse' });
  player.life.path.degree = { kind: 'nursing', field: 'medical', age: 24 };
  player.life.path.nursingTeachingDecision = true;
  player.life.path.nursingLicenseAge = null;
  let goal = careerGoals(player.life).find(({ career }) => career === 'schoolNurse');
  assert.equal(goal.checks.find(({ id }) => id === 'nursingLicense').met, false);
  let schoolOption = view(room).me.scene.choices.find(({ id }) => id === 'work-schoolNurse');
  assert.match(schoolOption.locked, /간호사 면허/);
  player.life.path.nursingLicenseAge = 25;
  goal = careerGoals(player.life).find(({ career }) => career === 'schoolNurse');
  assert.equal(goal.ready, true);
  schoolOption = view(room).me.scene.choices.find(({ id }) => id === 'work-schoolNurse');
  assert.equal(schoolOption.locked, '');
  choose(room, 'work-schoolNurse');
  assert.equal(player.life.career, 'schoolNurse');
});

test('진학과 직업 선택은 다섯 분야별로 펼치고 기존 뒤로가기를 유지한다', () => {
  const { room } = roomFor({ age: 26 });
  const initial = view(room);
  if (initial.me.scene.key === 'education') choose(room, 'rest');
  const html = roomView({ role: 'player' }, view(room), { pane: 'play', rank: 'money' });
  assert.match(html, /data-choice-section="career-start"/);
  for (const group of CAREER_GROUPS) {
    assert.match(html, new RegExp('data-choice-section="career-start-' + group.id + '"'));
  }
  assert.match(html, /data-choice-section="career-locked"/);
  assert.match(html, /이전 선택지로/);
  const guide = gameMenuView('jobs', room.players[0].life);
  assert.equal([...guide.matchAll(/class="job-guide-entry"/g)].length, 60);
  assert.equal([...guide.matchAll(/class="job-guide-category"/g)].length, 5);
});

test('기존 보너스 직업은 성장 단계가 생겨도 성과 보너스 계산을 유지한다', () => {
  for (const id of ['farmer', 'studio', 'sales', 'creator', 'shop', 'athlete']) {
    assert.ok(Object.values(CAREERS).some((job) => job.promotionFrom === id));
    const path = newPath('female');
    path.workYears[id] = 10;
    const person = { age: 35, career: id, history: [], path, stats: {
      health: 100, learning: 100, money: 150, joy: 60, bond: 100, art: 100,
    } };
    const p = performanceBonus(person);
    assert.ok(p && p.money >= 0 && p.money <= PERFORMANCE_BONUSES[id].max);
  }
});
