import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CAREERS } from '../public/content.mjs';
import { addPlayer, newRoom, selectChoice, stateFor, teacherAction } from '../public/game.mjs';
import { gameMenuView } from '../public/views.mjs';
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
    { art: 2, health: -1, bond: 1 });
  assert.equal(school.choices.length, 4); // 13세 학교 활동과 운동부 선택지가 공존
});

test('연봉이 0이어도 실제 연습생 경력이 쌓이고 3년 뒤 데뷔 심사가 열린다', () => {
  const room = newRoom({ code: 'IDOL01', seed: 'idol-test', name: '연습생 게임',
    settings: { pace: 'personal', maxAge: 100 }, now: 1000 });
  const player = addPlayer(room, { id: 'student', name: '수험생', avatar: 0, sex: 'female' });
  player.life.age = 12;
  player.life.stats.art = 30;
  player.life.stats.bond = 60;
  teacherAction(room, 'start', {}, 1000);
  let step = 0;
  while (player.life.age < 16 && step++ < 12) {
    const scene = stateFor(room, 'student').me.scene;
    const id = step === 1 ? 'idol-audition' : scene.choices[0].id;
    selectChoice(room, 'student', { round: stateFor(room, 'student').turn.number,
      scene: scene.key, choice: id }, 1000);
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

test('신인 4~5년 차에는 생존 기회, 6년 차에는 계약 종료 후 작별 이벤트', () => {
  const student = newStudent(24, 76);
  student.career = 'rookieIdol';
  student.path.school = 'idolArts';
  student.path.idolSchool = true;
  student.path.workYears.rookieIdol = 4;
  assert.equal(settleIdolCareer(student, 99), '');
  assert.equal(student.career, 'rookieIdol');
  const ended = settleIdolCareer(student, 0);
  assert.match(ended, /다음 해에 작별 무대/);
  assert.equal(student.career, 'rookieIdol');
  assert.ok(student.path.idolExitPending);
  assert.equal(student.path.idolExitAt, null);
  assert.equal(student.path.retired, null);
  const farewell = bonusScene(student, []);
  assert.equal(farewell.key, 'idol-exit');
  assert.deepEqual(farewell.choices.map(c => c.id),
    ['idol-farewell-show', 'idol-farewell-study', 'idol-farewell-rest']);
  applyPath(student, student.age, farewell.choices[1]);
  assert.equal(student.career, null);
  assert.equal(student.path.idolExitPending, null);
  assert.equal(student.path.idolExitAt, 24);
  assert.equal(student.path.retired, null);

  const late = newStudent(26, 90);
  late.career = 'rookieIdol';
  late.path.workYears.rookieIdol = 5;
  assert.equal(settleIdolCareer(late, 99), '');
  late.path.workYears.rookieIdol = 6;
  assert.match(settleIdolCareer(late, 99), /다음 해에 작별 무대/);
});

test('연습생·신인·인기·솔로 활동은 서로 다른 나이 제한을 갖는다', () => {
  assert.equal(retirementAge('idol'), 24);
  assert.equal(retirementAge('rookieIdol'), 29);
  assert.equal(retirementAge('popularIdol'), 34);
  assert.equal(retirementAge('soloArtist'), Infinity);
  assert.equal(CAREERS.idol.wage, 0);
  assert.ok(CAREERS.popularIdol.wage > CAREERS.rookieIdol.wage * 2);
  assert.ok(CAREERS.soloArtist.wage > CAREERS.popularIdol.wage);
  const popular = newStudent(34, 90);
  popular.career = 'popularIdol';
  assert.equal(bonusScene(popular, []).key, 'idol-exit');
});

test('직업 안내에도 졸업 나이별 오디션 기준과 0코인 수입이 보인다', () => {
  const html = gameMenuView('jobs', null);
  assert.match(html, /12세 초등 졸업 오디션: 예술 28점 이상/);
  assert.match(html, /15세 중등 졸업 오디션: 예술 36점 이상/);
  assert.match(html, /18세 고등 졸업 오디션: 예술 45점 이상/);
  assert.match(html, /연습생 연봉 0코인/);
  assert.match(html, /솔로 데뷔 가수/);
});

test('연습생과 신인은 예술 훈련만으로도 관계 요구치에 근접할 수 있다', () => {
  const debutBond = 10 + 3 * 1; // 초기 관계 10, 무급 연습생 3년 매년 관계 +1
  const popularBond = debutBond + 3 * 2; // 신인 그룹 3년 매년 관계 +2
  const debutArt = 30 + 1 + 3 * (2 + 4); // 초등 졸업 후 오디션과 학교 예술 수업
  const popularArt = debutArt + 3 * 3; // 데뷔 후 신인 그룹 훈련 효과만
  assert.ok(debutBond >= CAREERS.rookieIdol.need.bond);
  assert.ok(debutArt >= CAREERS.rookieIdol.need.art);
  assert.ok(popularBond >= CAREERS.popularIdol.need.bond);
  assert.ok(popularArt >= CAREERS.popularIdol.need.art);
  assert.ok(CAREERS.soloArtist.need.bond > CAREERS.popularIdol.need.bond);
});

test('아이돌 활동 중 일반 직업·진학 이벤트가 전용 승급 이벤트와 겹치지 않는다', () => {
  const student = newStudent(19, 75);
  student.path.idolSchool = true;
  student.path.school = 'idolArts';
  student.path.idolDebutAge = 16;
  student.path.firstJobAge = 16;
  student.path.savings = { annual: 0, balance: 0, interestRate: 0.04 };
  student.career = 'rookieIdol';
  student.path.workYears.rookieIdol = 1;
  assert.equal(bonusScene(student, []), null);
  student.path.workYears.rookieIdol = 3;
  assert.equal(bonusScene(student, []).key, 'idol-breakthrough');
  assert.equal(bonusScene(student, ['idol-breakthrough']), null);
});

test('12세 무급 입사·16세 유급 데뷔여도 19세에 적금 안내가 반드시 열린다', () => {
  const student = newStudent(19, 75);
  student.career = 'rookieIdol';
  student.path.idolJoinedAt = 12;
  student.path.idolDebutAge = 16;
  student.path.firstJobAge = 12; // 이전 버전 저장 데이터와 같은 상태
  student.path.workYears.rookieIdol = 1;
  const offer = bonusScene(student, []);
  assert.equal(offer.key, 'saving');
  assert.match(offer.title, /노후 적금/);
  assert.ok(offer.choices.some(({ id }) => id === 'save-2'));
  applyPath(student, 19, offer.choices.find(({ id }) => id === 'save-2'));
  assert.equal(student.path.savings.annual, 2);
  assert.notEqual(bonusScene(student, [])?.key, 'saving');
});

test('기획사 재계약이 불발되어도 실직/은퇴를 즉시 적용하지 않고 다음 선택을 제공한다', () => {
  const student = newStudent(23, 81);
  student.career = 'rookieIdol';
  student.path.idolSchool = true;
  student.path.school = 'idolArts';
  student.path.workYears.rookieIdol = 4;
  assert.match(settleIdolCareer(student, 0), /작별 무대/);
  assert.equal(student.career, 'rookieIdol');
  assert.equal(student.path.retired, null);
  const farewell = bonusScene(student, []);
  assert.equal(farewell.key, 'idol-exit');
  assert.match(farewell.detail, /인생 전체의 은퇴가 아니에요/);
  assert.match(farewell.detail, /노후 적금/);
  applyPath(student, student.age, farewell.choices[1]);
  assert.equal(student.career, null);
  assert.equal(student.path.retired, null);
  assert.equal(bonusScene(student, []).key, 'education');
  assert.equal(bonusScene(student, ['education']).key, 'career');
});

test('신인 급여는 급상승하지 않고 인기/솔로 활동은 경력 보상을 받는다', () => {
  const rookie = newStudent(22, 78);
  rookie.career = 'rookieIdol';
  rookie.path.workYears.rookieIdol = 4;
  const rookiePay = careerPay(rookie);
  assert.equal(rookiePay.experience, 0);
  const popular = newStudent(26, 90);
  popular.career = 'popularIdol';
  popular.path.workYears.rookieIdol = 3;
  popular.path.workYears.popularIdol = 5;
  const popularPay = careerPay(popular);
  assert.equal(popularPay.track, '성과 성장');
  assert.ok(popularPay.total > popularPay.base);
});

test('솔로 가수는 40·55·70세에도 자동 은퇴하지 않고 활동과 연봉을 유지한다', () => {
  for (const age of [40, 55, 70]) {
    const artist = newStudent(age, 85);
    artist.career = 'soloArtist';
    artist.path.idolDebutAge = 19;
    artist.path.workYears.soloArtist = age - 26;
    artist.path.workYears.rookieIdol = 3;
    const pay = careerPay(artist);
    assert.ok(pay.total >= CAREERS.soloArtist.wage, `${age}세 연봉`);
    assert.equal(artist.path.retired, null);
    assert.notEqual(bonusScene(artist, [])?.key, 'idol-exit', `${age}세 강제 종료 없음`);
    const yearly = annualScene(artist);
    assert.doesNotMatch(yearly.title, /정년의 날/, `${age}세`);
    if (age === 55 && yearly.choices.some(({ id }) => id === 'mentor-work')) {
      assert.match(yearly.choices.find(({ id }) => id === 'mentor-work').detail,
        /정해진 활동 연령 상한이 없어요/);
      assert.doesNotMatch(yearly.choices.find(({ id }) => id === 'mentor-work').detail, /Infinity/);
    }
  }
  const guide = gameMenuView('jobs', null);
  const start = guide.indexOf('솔로 데뷔 가수');
  assert.ok(start >= 0);
  assert.match(guide, /연령 제한 없음/);
});
