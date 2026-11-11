import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CAREERS } from '../public/content.mjs';
import { addPlayer, newRoom, selectChoice, stateFor, teacherAction } from '../public/game.mjs';
import { IDOL_GRADUATION_ART_MAX, IDOL_GRADUATION_ART_MIN, SCHOOLS,
  annualScene, applyPath, bonusScene, careerPay, newPath, retirementAge,
  settleIdolCareer, yearlySources } from '../public/life.mjs';

function newStudent(age = 0, art = 7) {
  return { age, career: null, path: { ...newPath('female'), school: age >= 16 ? 'general' : null },
    stats: { art, health: 70, learning: 40, money: 20, bond: 60, joy: 60 },
    history: [], end: null };
}

test('기본 연간 선택지만으로 계산한 졸업 직전 예술 최고치 30·38·47점', () => {
  const person = newStudent();
  const expected = { 12: 30, 15: 38, 18: 47 };
  for (let age = 0; age < 19; age++) {
    person.age = age;
    if (age === 16) person.path.school = 'general';
    if (age in expected) {
      assert.equal(person.stats.art, expected[age]);
      assert.equal(IDOL_GRADUATION_ART_MAX[age], expected[age]);
      assert.equal(IDOL_GRADUATION_ART_MIN[age], expected[age] - 2);
    }
    const scene = annualScene(person);
    const best = scene.choices.reduce((choice, candidate) =>
      (candidate.effect?.art ?? 0) > (choice.effect?.art ?? 0) ? candidate : choice);
    person.stats.art += best.effect?.art ?? 0;
  }
});

test('각 졸업 화면에서 예술 최고치-2 이상일 때만 다섯 번째 오디션이 나타난다', () => {
  for (const age of [12, 15, 18]) {
    const minimum = IDOL_GRADUATION_ART_MIN[age];
    for (const art of [minimum - 1, minimum, minimum + 1, minimum + 2, minimum + 5]) {
      const student = newStudent(age, art);
      const scene = annualScene(student);
      const auditionIndex = scene.choices.findIndex((item) => item.id === 'idol-audition');
      assert.equal(auditionIndex, art >= minimum ? 4 : -1, `${age}세 예술 ${art}`);
    }
  }
});

test('오디션 합격 시 공연예술학교 진학·연습생 수입 0코인·훈련 시작', () => {
  const student = newStudent(12, 30);
  const audition = annualScene(student).choices.at(-1);
  assert.equal(audition.id, 'idol-audition');
  applyPath(student, 12, audition);
  assert.equal(student.career, 'idol');
  assert.equal(student.path.school, 'idolArts');
  assert.equal(student.path.idolSchool, true);
  assert.match(SCHOOLS.idolArts, /공연예술학교/);
  student.age = 13;
  const school = annualScene(student);
  assert.match(school.title, /^공연예술학교/);
  assert.equal(careerPay(student).total, 0);
  const wage = yearlySources(student).find((item) => item.id === 'job-idol');
  assert.equal(wage.effect.money, 0);
  assert.deepEqual(yearlySources(student).find((item) => item.id === 'idol-practice').effect,
    { art: 2, health: -1, bond: 0 });
  assert.equal(school.choices.length, 3);
});

test('연봉이 0이어도 실제 연습생 경력이 쌓이고 3년 뒤 데뷔 심사가 열린다', () => {
  const room = newRoom({ code: 'IDOL01', seed: 'idol-test', name: '연습생 게임',
    settings: { pace: 'personal', maxAge: 100 }, now: 1000 });
  const player = addPlayer(room, { id: 'student', name: '수험생', avatar: 0, sex: 'female' });
  player.life.age = 12;
  player.life.stats.art = 30;
  player.life.stats.bond = 60;
  teacherAction(room, 'start', {}, 1000);
  for (let i = 0; i < 4; i++) {
    const scene = stateFor(room, 'student').me.scene;
    const id = i === 0 ? 'idol-audition' : scene.choices[0].id;
    selectChoice(room, 'student', { round: stateFor(room, 'student').turn.number, scene: scene.key, choice: id }, 1000);
  }
  assert.equal(player.life.career, 'idol');
  assert.equal(player.life.age, 16);
  assert.equal(player.life.path.workYears.idol, 3);
  // 16세는 공연예술학교 진학 상태이므로 일반 고교 선택 장면을 띄우지 않습니다.
  const review = bonusScene(player.life, []);
  assert.equal(review.key, 'idol-debut');
  const debut = review.choices.find((choice) => choice.id === 'idol-debut-now');
  assert.ok(debut);
});

test('연습생은 3년 경력과 예술 조건을 채우면 데뷔, 신인은 3년 후 승급 심사', () => {
  const student = newStudent(16, 70);
  student.path.idolSchool = true;
  student.path.school = 'idolArts';
  student.career = 'idol';
  student.path.idolJoinedAt = 12;
  student.path.workYears.idol = 3;
  const debutScene = bonusScene(student, []);
  assert.equal(debutScene.key, 'idol-debut');
  applyPath(student, 16, debutScene.choices.find((item) => item.id === 'idol-debut-now'));
  assert.equal(student.career, 'rookieIdol');
  assert.equal(student.path.idolDebutAge, 16);
  student.path.workYears.rookieIdol = 3;
  student.age = 19;
  assert.equal(settleIdolCareer(student, 0), ''); // 승급 기회를 보기 전에는 조기 해체하지 않음
  const review = bonusScene(student, []);
  assert.equal(review.key, 'idol-breakthrough');
  assert.deepEqual(review.choices.map((item) => item.id), ['idol-grow-popular', 'idol-go-solo', 'rest']);
  applyPath(student, 19, review.choices.find((choice) => choice.id === 'idol-grow-popular'));
  assert.equal(student.career, 'popularIdol');
  assert.equal(careerPay(student).base, 12);
  assert.equal(settleIdolCareer(student, 0), '');
});

test('장기 연습생은 계약 종료 후 학교 또는 새로운 진로로 돌아갈 수 있다', () => {
  const student = newStudent(18, 60);
  student.career = 'idol';
  student.path.school = 'idolArts';
  student.path.idolSchool = true;
  student.path.workYears.idol = 6;
  const ended = bonusScene(student, []);
  assert.equal(ended.key, 'idol-exit');
  applyPath(student, 18, ended.choices[0]);
  assert.equal(student.career, null);
  assert.equal(student.path.school, 'general');
  assert.equal(student.path.idolExitAt, 18);
  assert.equal(student.path.retired, null);
});

test('신인 4년 차에는 활동 종료 위험, 5년 차에는 활동 종료 확정', () => {
  const student = newStudent(24, 76);
  student.career = 'rookieIdol';
  student.path.school = 'idolArts';
  student.path.idolSchool = true;
  student.path.workYears.rookieIdol = 4;
  assert.equal(settleIdolCareer(student, 99), '');
  assert.equal(student.career, 'rookieIdol');
  const ended = settleIdolCareer(student, 0);
  assert.match(ended, /그룹 활동이 종료/);
  assert.equal(student.career, null);
  assert.equal(student.path.idolExitAt, 24);
  assert.equal(student.path.retired, null);

  const late = newStudent(26, 90);
  late.career = 'rookieIdol';
  late.path.workYears.rookieIdol = 5;
  assert.match(settleIdolCareer(late, 99), /그룹 활동이 종료/);
});

test('연습생·신인·인기·솔로 활동은 서로 다른 나이 제한을 갖는다', () => {
  assert.equal(retirementAge('idol'), 24);
  assert.equal(retirementAge('rookieIdol'), 29);
  assert.equal(retirementAge('popularIdol'), 32);
  assert.equal(retirementAge('soloArtist'), 38);
  assert.equal(CAREERS.idol.wage, 0);
  assert.ok(CAREERS.popularIdol.wage > CAREERS.rookieIdol.wage * 2);
  assert.ok(CAREERS.soloArtist.wage > CAREERS.popularIdol.wage);
  const popular = newStudent(32, 90);
  popular.career = 'popularIdol';
  assert.equal(bonusScene(popular, []).key, 'idol-exit');
});
