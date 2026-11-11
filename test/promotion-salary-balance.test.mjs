import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CAREERS, CAREER_PROMOTIONS } from '../public/content.mjs';
import { careerPay, newPath, yearlySources } from '../public/life.mjs';
import { gameMenuView } from '../public/views.mjs';

function employee(career, age = 30, years = 0) {
  const path = newPath('female');
  path.workYears[career] = years;
  return {
    age, career, end: null, history: [], path,
    stats: { money: 100, learning: 110, art: 110, health: 110, bond: 110, joy: 70 },
  };
}

test('진입 조건과 업무 난이도에 맞춰 여섯 기본 직업의 연봉을 상향했다', () => {
  for (const [career, wage] of Object.entries({
    crew: 3, construction: 5, busDriver: 5, firefighter: 6, teacher: 6, banker: 6,
  })) assert.equal(CAREERS[career].wage, wage, career);
});

test('연봉 보정 없이 모든 승급은 명시된 기본 연봉을 적용하고 역전은 없다', () => {
  for (const [id, role] of Object.entries(CAREER_PROMOTIONS)) {
    assert.ok(CAREERS[role.from], id);
    assert.equal(CAREERS[id].wage, role.wage, id);
    assert.ok(CAREERS[id].wage > CAREERS[role.from].wage, id);
  }
  // 기존의 최소 2코인 보정이 남아 있다면 이 연봉이 9로 바뀝니다.
  assert.equal(CAREERS.militaryOfficer.wage, 7);
  assert.equal(CAREERS.militaryLieutenant.wage, 8);
});

test('일반 직업 여섯 경력 사다리의 첫 승급과 최종 승급 연봉이 일관된다', () => {
  for (const [first, middle, last, values] of [
    ['crew', 'storeLead', 'storeManager', [3,5,7]],
    ['construction', 'seniorConstruction', 'constructionDirector', [5,7,9]],
    ['busDriver', 'seniorBusDriver', 'busDirector', [5,7,9]],
    ['firefighter', 'seniorFirefighter', 'fireCommander', [6,8,10]],
    ['teacher', 'vicePrincipal', 'principal', [6,8,10]],
    ['banker', 'seniorBanker', 'bankManager', [6,8,10]],
  ]) assert.deepEqual([first,middle,last].map((id) => CAREERS[id].wage), values, first);
  assert.equal(CAREERS.masterTeacher.wage, 10);
});

test('창작·운동·영업·자영업은 승급했을 때 기본 연봉이 크게 상승한다', () => {
  const ladders = [
    ['farmer', 'experiencedFarmer', 'farmOwner', [4,8,12]],
    ['studio', 'fulltimeCreator', 'recognizedCreator', [4,8,12]],
    ['sales', 'topSales', 'regionalSales', [5,8,12]],
    ['creator', 'growingCreator', 'bigCreator', [5,9,14]],
    ['shop', 'successfulShop', 'shopChain', [7,11,15]],
    ['athlete', 'startingAthlete', 'starAthlete', [6,10,15]],
    ['actor', 'supportingActor', 'leadActor', [4,7,12]],
    ['singer', 'debutSinger', 'popularSinger', [4,7,12]],
    ['webtoon', 'serialWebtoon', 'famousWebtoon', [4,7,12]],
    ['photographer', 'professionalPhotographer', 'famousPhotographer', [4,7,11]],
  ];
  for (const [entry, middle, top, expected] of ladders) {
    const actual = [entry,middle,top].map((id) => CAREERS[id].wage);
    assert.deepEqual(actual, expected, entry);
    assert.ok(actual[1] - actual[0] >= 3 && actual[2] - actual[1] >= 4, entry);
  }
  assert.equal(CAREERS.rookieIdol.wage, 4);
  assert.equal(CAREERS.popularIdol.wage, 12);
  assert.equal(CAREERS.soloArtist.wage, 15);
});

test('과거 무작위 성과 보너스는 제거되고 해마다 확정 연봉만 적용된다', () => {
  for (const career of [
    'farmer','experiencedFarmer','farmOwner','studio','recognizedCreator','sales',
    'regionalSales','creator','bigCreator','shop','shopChain','athlete','starAthlete',
  ]) {
    const person = employee(career, 32, 6);
    const sources = yearlySources(person);
    assert.ok(sources.find((item) => item.id === `job-${career}`), career);
    assert.equal(sources.find((item) => item.id === `job-${career}`).effect.money,
      careerPay(person).total, career);
    assert.equal(sources.filter((item) => item.id.startsWith('performance-')).length, 0, career);
  }
  const help = gameMenuView('tips', null);
  const guide = gameMenuView('jobs', null);
  assert.doesNotMatch(help, /성과형 직업은 추가 보너스/);
  assert.doesNotMatch(guide, /성과 수입: 매년 0~|농작물 수확 보너스|콘텐츠 광고·후원 수입/);
});
