import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CAREER_CREDENTIALS, CAREERS, CAREER_PROMOTIONS, STATS } from '../public/content.mjs';
import { addPlayer, newRoom, selectChoice, stateFor, teacherAction } from '../public/game.mjs';
import { bonusScene, careerGoals, newPath } from '../public/life.mjs';
import { statGrid } from '../public/ui.mjs';
import { gameMenuView, roomView } from '../public/views.mjs';

function setup(age = 19) {
  const room = newRoom({ code: 'CAREER', name: '진로 테스트', seed: 'career-credential', now: 1000,
    settings: { pace: 'personal', maxAge: 110 } });
  const player = addPlayer(room, { id: 'student', name: '테스트', avatar: 0, sex: 'female' });
  player.life.age = age;
  player.life.path.school = 'general';
  player.life.stats = { health: 125, learning: 145, bond: 110, art: 120, money: 200, joy: 75 };
  teacherAction(room, 'start', {}, 1000);
  return { room, player };
}
function screen(room) { return stateFor(room, 'student'); }
function choose(room, id) {
  const scene = screen(room).me.scene;
  const option = scene.choices.find((item) => item.id === id);
  assert.ok(option && !option.locked, `${id}: ${option?.locked}`);
  return selectChoice(room, 'student', { round: screen(room).turn.number, scene: scene.key, choice: id }, 1000);
}
function view(room) { return roomView({ role: 'player' }, screen(room), { pane: 'play', rank: 'money' }); }
function makeLife(career) {
  return { age: 28, career, stats: { health: 120, learning: 140, bond: 120, art: 140, money: 200, joy: 65 },
    path: { ...newPath('female'), school: 'general', workYears: { [career]: 8 } }, history: [], end: null };
}

test('시작 직업은 60개를 유지하고 스포츠·엔터테인먼트 직업 역할을 구분한다', () => {
  assert.equal(Object.values(CAREERS).filter((job) => !job.promotionFrom).length, 60);
  assert.notEqual(CAREERS.athlete.title, CAREERS.coach.title);
  assert.notEqual(CAREERS.coach.title, CAREERS.fitnessTrainer.title);
  assert.match(CAREERS.coach.detail, /동호회|생활체육/);
  assert.match(CAREERS.fitnessTrainer.detail, /헬스장/);
  assert.equal(CAREERS.coach.education, 'sportsCoach');
  assert.equal(CAREERS.soloArtist.promotionFrom, 'rookieIdol');
  assert.equal(CAREER_PROMOTIONS.soloArtist.routeType, '전직');
  assert.equal(CAREERS.rookieIdol.promotionFrom, 'idol');
  assert.equal(CAREERS.debutSinger.title, '활동 가수');
  assert.equal(CAREERS.actor.title, '신인 배우');
});

test('연습생은 신인 아이돌을 거쳐야 솔로로 전직할 수 있다', () => {
  const trainee = makeLife('idol');
  assert.deepEqual(careerGoals(trainee).map(({ career }) => career), ['rookieIdol']);
  const debuted = makeLife('rookieIdol');
  assert.deepEqual(careerGoals(debuted).map(({ career }) => career).sort(),
    ['popularIdol', 'soloArtist']);
  const { room, player } = setup(26);
  player.life.career = 'idol';
  player.life.path.workYears.idol = 10;
  choose(room, 'rest'); // education
  assert.equal(screen(room).me.scene.key, 'career');
  assert.equal(screen(room).me.scene.choices.some((c) => c.id === 'work-soloArtist'), false);
});

test('운동선수에서 지도자로의 전직은 자격시험·연수 완료가 필요하다', () => {
  const life = makeLife('athlete');
  const before = careerGoals(life).find(({ career }) => career === 'coach');
  assert.ok(before);
  assert.equal(before.ready, false);
  assert.equal(before.checks.find(({ id }) => id === 'sportsCoachCertification').met, false);
  life.path.sportsCoachCertificationAge = 26;
  const after = careerGoals(life).find(({ career }) => career === 'coach');
  assert.equal(after.ready, true);
  assert.equal(CAREER_CREDENTIALS.sportsCoach.includes('자격시험'), true);
});

test('직업 안내에서는 경로가 합쳐지지 않고 각각 분기된다', () => {
  const html = gameMenuView('jobs', null);
  assert.match(html, /job-route-branches multiple/);
  assert.match(html, /경로 [12] · 인기 아이돌/);
  assert.match(html, /경로 [12] · 솔로 데뷔 가수/);
  assert.match(html, /진료과장/);
  assert.match(html, /병원장/);
  assert.match(html, /생활체육 지도자/);
});

test('약학·치의학·물리치료학과는 대학과 면허시험을 별개로 거친다', () => {
  const { room } = setup();
  const scene = screen(room).me.scene;
  assert.equal(scene.key, 'education');
  for (const id of ['study-pharmacy', 'study-dentistry', 'study-physicalTherapy']) {
    const choice = scene.choices.find((c) => c.id === id);
    assert.ok(choice && !choice.locked);
    assert.equal(choice.educationGroup, 'medical');
  }
  assert.match(view(room), /data-choice-section="medical"/);
  for (const [kind, career, licenseChoice] of [
    ['pharmacy', 'pharmacist', 'pharmacist-license'],
    ['dentistry', 'dentist', 'dentist-license'],
    ['physicalTherapy', 'physicalTherapist', 'physical-therapist-license'],
  ]) {
    const { room: next, player } = setup(26);
    player.life.path.degree = { kind, field: 'medical', age: 26 };
    assert.equal(screen(next).me.scene.key, 'license', kind);
    const exam = screen(next).me.scene.choices.find((c) => c.id === licenseChoice);
    assert.ok(exam && !exam.locked, licenseChoice);
    choose(next, licenseChoice);
    assert.equal(Number.isInteger(player.life.path[{
      pharmacy: 'pharmacyLicenseAge', dentistry: 'dentistLicenseAge',
      physicalTherapy: 'physicalTherapyLicenseAge',
    }[kind]]), true);
    // 학과 졸업과 면허가 둘 다 있어야 채용 조건이 충족된다.
    const job = CAREERS[career];
    assert.ok(job.education && CAREER_CREDENTIALS[job.education]);
  }
});

test('공인중개사·세무사·스포츠 지도자 자격은 교육 선택에서 취득한다', () => {
  const { room, player } = setup();
  assert.match(view(room), /data-choice-section="qualifications"/);
  for (const id of ['qualify-realtor', 'qualify-taxation', 'qualify-sportsCoach']) {
    assert.ok(screen(room).me.scene.choices.some((c) => c.id === id));
  }
  choose(room, 'qualify-realtor');
  assert.equal(player.life.path.realtorCertificationAge, 19);
  assert.equal(screen(room).me.scene.key, 'career');
  assert.equal(screen(room).me.scene.choices.find((c) => c.id === 'work-realtor').locked, '');
  assert.match(CAREERS.tax.education, /taxation/);
});

test('전공이나 면허 없는 상태에서는 약사·치과의사 등으로 바로 취업할 수 없다', () => {
  const { room } = setup(26);
  choose(room, 'rest');
  const jobs = screen(room).me.scene.choices;
  for (const id of ['pharmacist','dentist','physicalTherapist','tax','realtor','coach']) {
    assert.ok(jobs.find((c) => c.id === `work-${id}`)?.locked, id);
  }
});

test('능력치 막대는 분야 색상과 정확한 숫자를 함께 제공한다', () => {
  const data = { health: 50, learning: 75, money: 100, joy: 90, art: 40, bond: 80 };
  const html = statGrid(data, { affection: 65 });
  for (const [key, item] of Object.entries(STATS)) {
    assert.match(html, new RegExp('data-stat="' + key + '"'));
    assert.match(html, new RegExp('stat-tile ' + item.color));
  }
  assert.match(html, /width:50%/);
  assert.match(html, /width:75%/);
  assert.match(html, /애정/);
  assert.match(html, /65 <small>\/ 100/);
  assert.match(html, /막대 기준/);
  assert.match(statGrid({ ...data, health: 150 }), /150 <small>점/);
});
