import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addPlayer, newRoom, selectChoice, stateFor, teacherAction } from '../public/game.mjs';
import {
  bonusScene, careerPay, investmentPayout, newPath, pathNotes, yearlySources,
} from '../public/life.mjs';
import { roomView } from '../public/views.mjs';

function lifeAt(age = 40, money = 100) {
  return {
    age, career: 'staff', path: newPath('female'), history: [],
    stats: { money, health: 80, learning: 80, art: 50, bond: 70, joy: 60 },
  };
}
function roomAt(age = 40, money = 100) {
  const room = newRoom({
    code: 'ABC234', name: '재테크 수업', seed: 'investing-lifecycle',
    settings: { pace: 'personal', maxAge: 110 }, now: 1_000,
  });
  const player = addPlayer(room, { id: 'one', name: '학생', avatar: 0, sex: 'female' });
  player.life.age = age;
  player.life.career = 'staff';
  player.life.stats.money = money;
  player.life.path.workYears.staff = 15;
  teacherAction(room, 'start', {}, 1_000);
  return { room, player };
}
const view = (room) => stateFor(room, 'one');
function choose(room, id) {
  const current = view(room);
  const card = current.me.scene.choices.find(({ id: option }) => option === id);
  assert.ok(card && !card.locked, `${current.me.scene.key}: ${id}, ${card?.locked}`);
  selectChoice(room, 'one', { round: current.turn.number,
    scene: current.me.scene.key, choice: id }, 1_000);
}

test('재테크 선택은 중년 40·50·60세, 노년 70·76세에만 열린다', () => {
  for (const age of [40, 50, 60, 70, 76]) {
    const investment = bonusScene(lifeAt(age), []);
    assert.equal(investment.key, 'investment', age);
    assert.deepEqual(investment.choices.map(({ id }) => id),
      ['invest-bond', 'invest-fund', 'invest-stocks', 'rest']);
    assert.ok(investment.detail.includes('2년'), age);
  }
  for (const age of [39, 41, 49, 51, 69, 77, 80]) {
    assert.notEqual(bonusScene(lifeAt(age), [])?.key, 'investment', age);
  }
  assert.notEqual(bonusScene(lifeAt(40), ['investment'])?.key, 'investment');
});

test('투자 상품은 원금, 위험 범위, 2년 만기를 화면에 명시한다', () => {
  const { room } = roomAt();
  const snapshot = view(room).me.scene;
  assert.equal(snapshot.key, 'investment');
  assert.match(snapshot.choices[0].detail, /12코인 투자.*2년 뒤.*13코인/);
  assert.match(snapshot.choices[0].detail, /원금 보장/);
  assert.match(snapshot.choices[1].detail, /손실 가능/);
  assert.match(snapshot.choices[2].detail, /큰 손실도 가능/);
  assert.match(roomView({ role: 'player' }, view(room), { pane: 'play', rank: 'money' }),
    /중년의 재테크 선택/);
});

test('실제 투자는 선택 시 원금을 한 번 차감하고 2년 뒤 만기 정보를 저장한다', () => {
  const { room, player } = roomAt(40, 100);
  choose(room, 'invest-bond');
  assert.equal(player.life.stats.money, 88);
  assert.deepEqual(player.life.path.investments, [
    { kind: 'bond', amount: 12, boughtAt: 40, maturityAge: 42 },
  ]);
  assert.equal(player.life.age, 40);
  assert.ok(pathNotes(player.life).some((note) =>
    note.includes('안정형 국채') && note.includes('42살 만기 예정')));
  assert.notEqual(view(room).me.scene.key, 'investment');
});

test('보유 자금이 부족하면 투자 세 가지는 잠기지만 현금 보유는 가능하다', () => {
  const { room, player } = roomAt(40, 9);
  const choices = view(room).me.scene.choices;
  for (const id of ['invest-bond', 'invest-fund', 'invest-stocks']) {
    assert.match(choices.find((item) => item.id === id).locked, /자금/);
  }
  assert.ok(!choices.find((item) => item.id === 'rest').locked);
  choose(room, 'rest');
  assert.equal(player.life.stats.money, 9);
  assert.deepEqual(player.life.path.investments, []);
});

test('안정형 상품은 정해진 양의 수익을 주고 위험형은 수익과 손실이 모두 가능하다', () => {
  const investment = { boughtAt: 40, amount: 12, kind: 'bond' };
  assert.equal(investmentPayout(investment, 9), 13);
  assert.equal(investmentPayout(investment, 90000), 13);
  for (const kind of ['fund', 'stocks']) {
    const asset = { ...investment, kind };
    const payouts = Array.from({ length: 100 }, (_, seed) => investmentPayout(asset, seed));
    assert.ok(payouts.some((value) => value < 12), kind + ' loss');
    assert.ok(payouts.some((value) => value > 12), kind + ' gain');
    assert.equal(investmentPayout(asset, 42), investmentPayout(asset, 42));
    assert.equal(investmentPayout(asset, 42), investmentPayout(structuredClone(asset), 42));
  }
});

test('2년 뒤 수령액을 지급하되 그 전에는 지급하지 않고 결산 이후 중복 지급하지 않는다', () => {
  const { room, player } = roomAt();
  player.life.path.romanceSeed = 321;
  choose(room, 'invest-fund');
  player.life.age = 41;
  assert.ok(!yearlySources(player.life).some(({ id }) => id.startsWith('investment-')));
  player.life.age = 42;
  const expected = investmentPayout(player.life.path.investments[0], player.life.path.romanceSeed);
  const first = yearlySources(player.life).find(({ id }) => id === 'investment-0');
  const again = yearlySources(player.life).find(({ id }) => id === 'investment-0');
  assert.ok(first);
  assert.equal(first.effect.money, expected);
  assert.deepEqual(first, again);
  // 42세에 열리는 다른 추가 선택을 처리한 뒤 실제 1년을 진행합니다.
  for (let count = 0; count < 8 && view(room).me.scene.bonus; count++) {
    choose(room, view(room).me.scene.fallback ?? 'rest');
  }
  assert.equal(view(room).me.scene.key, 'year');
  const before = player.life.stats.money;
  const base = view(room).me.scene.base.money;
  const yearlyChoice = view(room).me.scene.choices.find((item) => item.id === 'rest') ??
    view(room).me.scene.choices.find((item) => !item.locked);
  choose(room, yearlyChoice.id);
  assert.equal(player.life.path.investments[0].settledAt, 42);
  assert.ok(player.life.stats.money > before - 30);
  assert.ok(base >= expected, '만기 수령액을 올해 변화에 포함');
  player.life.age = 42; // 이미 정산한 연도에도 재지급이 없어야 합니다.
  assert.equal(yearlySources(player.life).find(({ id }) => id === 'investment-0'), undefined);
  assert.ok(pathNotes(player.life).some((note) => note.includes('코인 수령')));
});

test('노년에는 적은 원금으로 같은 선택을 하고 은퇴 후에도 만기 자산을 받는다', () => {
  for (const age of [70, 76]) {
    const person = lifeAt(age, 100);
    person.path.retired = 65;
    const choice = bonusScene(person, []).choices.find(({ id }) => id === 'invest-bond');
    assert.equal(choice.effect.money, -8);
    assert.equal(choice.action.value.amount, 8);
    person.path.investments.push({ kind: 'bond', amount: 8, boughtAt: age, maturityAge: age + 2 });
    person.age = age + 2;
    assert.equal(yearlySources(person).find(({ id }) => id === 'investment-0')?.effect.money, 9);
    assert.equal(yearlySources(person).find(({ id }) => id === 'pension')?.effect.money, 1);
  }
});

test('기존 노후 적금과 일회성 투자는 서로 다른 돈으로 독립 정산한다', () => {
  const person = lifeAt(42, 200);
  person.path.savings = { annual: 4, balance: 100, interestRate: 0.04 };
  person.path.investments.push({ kind: 'bond', amount: 12, boughtAt: 40, maturityAge: 42 });
  const incomes = yearlySources(person);
  assert.equal(incomes.find(({ id }) => id === 'retirement-saving').effect.money, -4);
  assert.equal(incomes.find(({ id }) => id === 'investment-0').effect.money, 13);
  assert.equal(person.path.savings.balance, 100);
  assert.equal(careerPay(person).total, incomes.find(({ id }) => id === 'job-staff').effect.money);
});

test('이전 버전의 투자 목록 없는 저장 데이터도 오류 없이 돌아간다', () => {
  const person = lifeAt(45, 150);
  delete person.path.investments;
  assert.ok(yearlySources(person).length > 0);
  assert.ok(Array.isArray(pathNotes(person)));
  assert.equal(bonusScene(person, [])?.key !== 'investment', true);
});

test('투자 행동은 자금 이외의 능력치에 새 부작용을 주지 않는다', () => {
  const entry = bonusScene(lifeAt(40), []);
  for (const item of entry.choices) {
    assert.deepEqual(Object.keys(item.effect).filter((stat) => stat !== 'money'), []);
  }
});
