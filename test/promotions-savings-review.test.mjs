import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CAREERS, CAREER_PROMOTIONS } from '../public/content.mjs';
import { addPlayer, newRoom, selectChoice, stateFor, teacherAction, updateRoomRules } from '../public/game.mjs';
import { bonusScene, careerPay, newPath, retirementPayout, retirementTax } from '../public/life.mjs';
import { roomView } from '../public/views.mjs';

function setup(career = 'teacher', age = 42, years = 16) {
  const room = newRoom({ code: 'ABCD23', name: '경력실험', seed: 'promotion-savings',
    settings: { pace: 'personal', maxAge: 110 } });
  const player = addPlayer(room, { id: 'hero', name: '주인공', avatar: 0, sex: 'female' });
  player.life.age = age;
  player.life.career = career;
  player.life.stats.money = 250;
  player.life.stats.health = 90;
  player.life.stats.learning = 110;
  player.life.stats.bond = 100;
  player.life.stats.art = 90;
  player.life.path.workYears[career] = years;
  teacherAction(room, 'start', {}, 1000);
  return { room, life: player.life };
}
const state = (room) => stateFor(room, 'hero');
function choose(room, id) {
  const snapshot = state(room);
  const entry = snapshot.me.scene;
  const choice = entry.choices.find(({ id: name }) => name === id);
  assert.ok(choice && !choice.locked, `선택 가능해야 함: ${id} (${choice?.locked})`);
  selectChoice(room, 'hero', { round: snapshot.turn.number, scene: entry.key, choice: id }, 1000);
}
function clearEducation(room) {
  if (state(room).me.scene.key === 'investment') choose(room, 'rest');
  if (state(room).me.scene.key === 'education') choose(room, 'rest');
}

test('승진 단계는 부모 직위가 모두 존재하며 시작 직업 없이 승진 취업할 수 없다', () => {
  assert.ok(Object.keys(CAREER_PROMOTIONS).length >= 40);
  for (const [key, role] of Object.entries(CAREER_PROMOTIONS)) {
    assert.ok(CAREERS[role.from], key);
    assert.ok(CAREERS[key].wage > CAREERS[role.from].wage, key);
    assert.ok(role.minYears >= 4, key);
  }
  assert.equal(CAREERS.vicePrincipal.promotionFrom, 'teacher');
  assert.equal(CAREERS.principal.promotionFrom, 'vicePrincipal');
  assert.equal(CAREERS.clinicalProfessor.promotionFrom, 'doctor');
  assert.equal(CAREERS.hospitalDirector.promotionFrom, 'clinicalProfessor');
  assert.equal(CAREERS.nursingDirector.promotionFrom, 'headNurse');
  const { room } = setup('staff', 42, 8);
  clearEducation(room);
  assert.ok(!state(room).me.scene.choices.some(({ career }) => career === 'principal'));
});

test('교사 승진은 첫 화면에 표시하고 정확한 능력치와 경력을 요구한다', () => {
  const { room, life } = setup('teacher', 42, 16);
  const scene = state(room).me.scene;
  assert.equal(scene.key, 'career');
  const promotion = scene.choices.find(({ id }) => id === 'work-vicePrincipal');
  assert.equal(promotion.careerGroup, 'advancement');
  assert.ok(!promotion.locked);
  assert.ok(scene.choices.some(({ id, careerGroup }) => id === 'work-staff' && careerGroup === 'other'));
  const html = roomView({ role: 'player' }, state(room), { pane: 'play', rank: 'money' });
  assert.ok(html.indexOf('승진·전직 기회') < html.indexOf('다른 직업 보기'));
  const salary = careerPay(life).total;
  choose(room, 'work-vicePrincipal');
  assert.equal(life.career, 'vicePrincipal');
  assert.equal(careerPay(life).transfer, 16);
  assert.ok(careerPay(life).total > salary);
  assert.equal(life.path.savingsReview.at, 43);
  // 다음 승진 시점은 새로 열린 50세 연차로 검증합니다.
  const next = setup('vicePrincipal', 50, 7);
  next.life.path.workYears.teacher = 16;
  clearEducation(next.room);
  const principal = state(next.room).me.scene.choices.find(({ id }) => id === 'work-principal');
  assert.ok(principal && !principal.locked);
  choose(next.room, 'work-principal');
  assert.equal(next.life.career, 'principal');
  assert.equal(careerPay(next.life).transfer, 23);
});

test('승진 경력이 부족하면 표시되더라도 선택할 수 없다', () => {
  const { room, life } = setup('teacher', 42, 6);
  const choice = state(room).me.scene.choices.find(({ id }) => id === 'work-vicePrincipal');
  assert.match(choice.locked, /경력 12년 이상/);
  life.path.workYears.teacher = 16;
  life.stats.learning = 73;
  assert.match(state(room).me.scene.choices.find(({ id }) => id === 'work-vicePrincipal').locked, /배움 74점/);
});

test('임상교수는 의사 경력·높은 능력과 관련 대학원 수료가 필요하다', () => {
  const { room, life } = setup('doctor', 50, 12);
  clearEducation(room);
  const find = () => state(room).me.scene.choices.find(({ id }) => id === 'work-clinicalProfessor');
  assert.match(find().locked, /관련 대학원 수료/);
  life.path.degree = { kind: 'graduate', field: 'medical', age: 48 };
  assert.ok(!find().locked);
  choose(room, 'work-clinicalProfessor');
  assert.equal(life.career, 'clinicalProfessor');
  assert.equal(careerPay(life).transfer, 12);
});

test('연봉 인상 후 가입·증액 선택지가 나오고 기존 적금 잔액이 유지된다', () => {
  const { room, life } = setup('crew', 40, 1);
  life.path.savings = { annual: 1, balance: 100, chosenAt: 24, interestRate: 0.04 };
  const previousSalary = careerPay(life).total;
  if (state(room).me.scene.key === 'investment') choose(room, 'rest');
  assert.equal(state(room).me.scene.key, 'year');
  const regular = state(room).me.scene.choices.find(({ id }) => id === 'rest') ??
    state(room).me.scene.choices[0];
  choose(room, regular.id);
  assert.equal(life.path.savings.balance, 105);
  assert.ok(careerPay(life).total > previousSalary);
  assert.equal(state(room).me.scene.key, 'saving');
  assert.deepEqual(state(room).me.scene.choices.map(({ id }) => id),
    ['save-1', 'save-2', 'save-3', 'save-5']);
  choose(room, 'save-3');
  assert.equal(life.path.savings.balance, 105);
  assert.equal(life.path.savings.annual, 3);
  assert.equal(life.path.savingsReview, null);
});

test('저축 미가입자도 연봉 인상 후 다시 가입할 수 있다', () => {
  const { room, life } = setup('crew', 40, 1);
  life.path.savings = { annual: 0, balance: 0, chosenAt: 22, interestRate: 0.04 };
  if (state(room).me.scene.key === 'investment') choose(room, 'rest');
  choose(room, 'rest');
  assert.equal(state(room).me.scene.key, 'saving');
  assert.deepEqual(state(room).me.scene.choices.map(({ id }) => id),
    ['save-none', 'save-1', 'save-2', 'save-4']);
  choose(room, 'save-2');
  assert.equal(life.path.savings.annual, 2);
});

test('이자·연금에 소수 코인이 전혀 없고 5% 세금을 제외한 금액 전액을 10번 지급한다', () => {
  const account = { annual: 4, balance: 100, chosenAt: 20, interestRate: 0.04 };
  const payments = Array.from({ length: 10 }, (_, i) => retirementPayout(account, i));
  assert.deepEqual(payments, [10, 10, 10, 10, 10, 9, 9, 9, 9, 9]);
  assert.equal(payments.reduce((sum, value) => sum + value, 0), 95);
  assert.equal(retirementTax(account), 5);
  assert.ok(payments.every(Number.isInteger));
  const smaller = { ...account, balance: 85 };
  assert.equal(retirementTax(smaller), 5);
  assert.deepEqual(Array.from({ length: 10 }, (_, i) => retirementPayout(smaller, i)), Array(10).fill(8));
});

test('이전 저장 기록의 소수 적금은 정수로 바꾸고 기존 인생을 이어간다', () => {
  const { room, life } = setup('staff', 40, 6);
  life.path.savings = { annual: 2, balance: 66.19, chosenAt: 23, interestRate: 0.04 };
  room.rules = 9;
  assert.equal(updateRoomRules(room, 1000), true);
  assert.equal(life.path.savings.balance, 66);
  assert.equal(life.path.savings.annual, 2);
  assert.equal(life.age, 40);
});
