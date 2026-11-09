import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CAREERS } from '../public/content.mjs';
import { addPlayer, newRoom, selectChoice, stateFor, teacherAction } from '../public/game.mjs';
import {
  annualScene, bonusScene, careerGrowth, careerPay, newPath, retirementAge,
  retirementLumpSum, retirementPayout, retirementTax, yearlySources,
} from '../public/life.mjs';

const stats = () => ({ money: 100, learning: 50, bond: 50, health: 80, art: 50, joy: 50 });
function person(career, age, years = 0) {
  const path = newPath('female');
  path.workYears = { [career]: years };
  return { age, career, stats: stats(), path, history: [] };
}
function roomAt(career, age, years = 0) {
  const room = newRoom({ code: 'ABC234', seed: 'balance-test', name: '직업 테스트', settings: { pace: 'personal', maxAge: 110 } });
  const player = addPlayer(room, { id: 'one', name: '주인공', avatar: 0, sex: 'female' });
  player.life.age = age;
  player.life.career = career;
  player.life.stats.money = 200;
  player.life.path.workYears[career] = years;
  teacherAction(room, 'start', {}, 1000);
  return { room, life: player.life };
}
const state = (room) => stateFor(room, 'one');
function choose(room, choice) {
  const entry = state(room).me.scene;
  assert.ok(entry.choices.some((item) => item.id === choice && !item.locked), `선택 가능: ${choice}`);
  selectChoice(room, 'one', { round: state(room).turn.number, scene: entry.key, choice }, 1000);
}

test('직업 유형마다 서로 다른 경력 보너스와 정년이 적용된다', () => {
  for (const job of Object.values(CAREERS)) assert.ok(careerGrowth(Object.keys(CAREERS).find((id) => CAREERS[id] === job)));
  assert.equal(careerPay(person('crew', 40, 10)).experience, 3);
  assert.equal(careerPay(person('staff', 40, 10)).experience, 2);
  assert.equal(careerPay(person('tech', 40, 10)).experience, 2);
  assert.equal(careerPay(person('shop', 40, 10)).experience, 4);
  assert.equal(careerPay(person('chip', 40, 10)).experience, 2);
  assert.equal(retirementAge('athlete'), 38);
  assert.equal(retirementAge('factory'), 60);
  assert.equal(retirementAge('staff'), 65);
  assert.equal(retirementAge('doctor'), 68);
  assert.equal(CAREERS.factory.fatigue, 1);
  assert.equal(CAREERS.shop.startup, 24);
});

test('관련 업종으로 옮기면 최대 10년까지 이전 경력의 절반을 인정한다', () => {
  const life = person('marketing', 45);
  life.path.workYears = { staff: 14, marketing: 0 };
  assert.equal(careerPay(life).transfer, 7);
  assert.equal(careerPay(life).experience, 2);
  life.path.workYears.staff = 28;
  assert.equal(careerPay(life).transfer, 10);
  life.career = 'chip';
  assert.equal(careerPay(life).transfer, 0);
});

test('정년에 도달한 직원은 일을 계속하는 선택지를 받지 않는다', () => {
  for (const [career, age] of [['factory', 60], ['staff', 65], ['doctor', 68]]) {
    const life = person(career, age, 25);
    assert.deepEqual(annualScene(life).choices.map(({ id }) => id), ['retire']);
    assert.ok(!annualScene({ ...life, age: age - 1 })?.choices.some(({ id }) => id === 'retire'));
  }
});

test('38세 운동선수는 지도자로 전직하거나 은퇴한다', () => {
  const life = person('athlete', 38, 12);
  const actions = annualScene(life).choices;
  assert.deepEqual(actions.map(({ id }) => id), ['retire', 'coach-transition']);
  assert.equal(actions[1].career, 'coach');
  assert.equal(CAREERS.coach.wage, 5);
  const { room, life: actual } = roomAt('athlete', 38, 12);
  actual.stats.bond = 40;
  actual.path.romanceSeed = 0;
  for (let guard = 0; guard < 6 && state(room).me.scene.bonus; guard++) {
    const extra = state(room).me.scene;
    choose(room, extra.fallback ?? extra.choices.find((item) => !item.locked).id);
  }
  choose(room, 'coach-transition');
  assert.equal(actual.career, 'coach');
  assert.equal(actual.path.retired, null);
});

test('복리 4%는 실제 적립에만 적용하고 이자까지 원금에 포함한다', () => {
  const { room, life } = roomAt('staff', 40, 10);
  life.path.savings = { annual: 4, chosenAt: 28, balance: 100, interestRate: 0.04 };
  const source = yearlySources(life);
  assert.equal(source.find(({ id }) => id === 'retirement-saving').effect.money, -4);
  const entry = state(room).me.scene;
  assert.equal(entry.key, 'year');
  choose(room, 'rest');
  assert.equal(life.path.savings.balance, 108);
  assert.ok(life.stats.money < 200 + careerPay(life).total);
});

test('일시금은 높은 세금으로 즉시 수령, 연금은 10년 동안 낮은 세금으로 지급한다', () => {
  const { room, life } = roomAt('staff', 66, 25);
  life.path.retired = 65;
  life.path.savings = { annual: 4, chosenAt: 26, balance: 100, interestRate: 0.04 };
  assert.equal(retirementLumpSum(life.path.savings), 75);
  assert.equal(retirementPayout(life.path.savings), 9.5);
  assert.equal(retirementTax(life.path.savings, 'lump'), 25);
  assert.equal(retirementTax(life.path.savings, 'pension'), 5);
  assert.equal(state(room).me.scene.key, 'savings-payout');
  const before = life.stats.money;
  choose(room, 'savings-lump');
  assert.equal(life.path.savings.payoutMode, 'lump');
  assert.equal(life.stats.money, before + 75);
  assert.ok(!yearlySources(life).some(({ id }) => id === 'retirement-payout'));

  const second = roomAt('staff', 66, 25);
  second.life.path.retired = 65;
  second.life.path.savings = { annual: 4, chosenAt: 26, balance: 100, interestRate: 0.04 };
  choose(second.room, 'savings-pension');
  for (let age = 66; age <= 75; age++) {
    second.life.age = age;
    assert.equal(yearlySources(second.life).find(({ id }) => id === 'retirement-payout')?.effect.money, 9.5);
  }
  second.life.age = 76;
  assert.ok(!yearlySources(second.life).some(({ id }) => id === 'retirement-payout'));
});

test('노후 생활비는 단계적으로 증가하며 건강·주거 지출 선택지도 생긴다', () => {
  const life = person(null, 49);
  const cost = (age) => {
    life.age = age;
    return yearlySources(life).find(({ id }) => id === 'age-living')?.effect.money ?? 0;
  };
  assert.deepEqual([49, 50, 65, 75, 85].map(cost), [0, -1, -2, -3, -4]);
  life.age = 72;
  life.path.home = { kind: 'own', at: 33, deposit: 0 };
  assert.equal(yearlySources(life).find(({ id }) => id === 'home-maintenance')?.effect.money, -1);
  life.age = 80;
  assert.equal(yearlySources(life).find(({ id }) => id === 'home-maintenance')?.effect.money, -2);
  life.age = 72;
  const choices = annualScene(life).choices;
  assert.ok(choices.some(({ id, effect }) => id === 'age-health' && effect.money === -12));
  assert.ok(choices.some(({ id }) => id === 'age-comfort'));
  assert.ok(choices.some(({ id }) => id === 'rest'));
});
