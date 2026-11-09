import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addPlayer, newRoom, selectChoice, stateFor, teacherAction, updateRoomRules } from '../public/game.mjs';
import { retirementPayout, retirementTax, yearlySources } from '../public/life.mjs';
import { roomView } from '../public/views.mjs';

function roomAt(age, seed = 'new-relationships') {
  const room = newRoom({ code: 'ABC234', seed, name: '인생', settings: { pace: 'personal', maxAge: 110 } });
  const player = addPlayer(room, { id: 'main', name: '주인공', avatar: 0, sex: 'female' });
  player.life.age = age;
  player.life.stats.money = 100;
  teacherAction(room, 'start', {}, 1_000);
  return { room, life: player.life };
}
const view = (room) => stateFor(room, 'main');
function choose(room, id) {
  const scene = view(room).me.scene;
  assert.ok(scene.choices.some((item) => item.id === id && !item.locked), `선택 가능해야 함: ${id}`);
  selectChoice(room, 'main', { round: view(room).turn.number, scene: scene.key, choice: id }, 1_000);
}
function annual(room) {
  let scene = view(room).me.scene;
  while (scene.bonus) {
    choose(room, scene.fallback ?? scene.choices.find((item) => !item.locked).id);
    scene = view(room).me.scene;
  }
  assert.equal(scene.key, 'year');
  const choice = scene.choices.find((item) => item.id === 'rest' && !item.locked) ??
    scene.choices.find((item) => !item.locked);
  choose(room, choice.id);
}

test('첫 만남은 이름·성인 나이·직업을 공개하고 연애 후 애정 수치를 만든다', () => {
  const { room, life } = roomAt(24);
  const detail = view(room).me.scene.detail;
  assert.match(detail, /[가-힣]+\(\d+세, [가-힣 ]+\)/);
  assert.doesNotMatch(detail, /연봉|월급|코인/);
  const age = Number(detail.match(/\((\d+)세/)[1]);
  assert.ok(age >= 21 && age <= 27);
  assert.doesNotMatch(roomView({ role: 'demo' }, view(room), { pane: 'play', rank: 'money' }), /애정<\/span>/);
  choose(room, 'date');
  assert.equal(life.path.romance.affection, 55);
  assert.ok(['철수', '민수', '영수', '준호', '지훈'].includes(life.path.romance.name));
  assert.equal(life.age, 25);
  assert.equal(view(room).me.scene.key, 'dating');
  const html = roomView({ role: 'demo' }, view(room), { pane: 'play', rank: 'money' });
  assert.match(html, /애정/);
  assert.match(html, /연인/);
  choose(room, 'date-trip');
  assert.equal(life.path.romance.affection, 67);
  assert.equal(life.age, 25, '데이트는 추가 선택이라 나이를 먹지 않음');
  annual(room);
  choose(room, 'date-alone');
  assert.equal(life.path.romance.affection, 62);
});

test('결혼은 애정·비용 조건을 확인하고 배우자 수입과 생활비를 반영한다', () => {
  const { room, life } = roomAt(29);
  life.path.partner = 25;
  life.path.romance = { name: '철수', ageOffset: 1, career: 'nurse', metAge: 25, affection: 60 };
  choose(room, 'date-walk');
  const blocked = view(room).me.scene.choices.find((item) => item.id === 'marry');
  assert.match(blocked.locked, /애정 65점 이상/);
  assert.equal(blocked.effect.money, -20);
  choose(room, 'keep-dating');
  assert.equal(life.path.married, null);
  life.age = 32;
  life.path.illness = null; // 연애 시나리오 검증 중 무작위 질병 이벤트는 분리
  choose(room, 'date-trip');
  const marry = view(room).me.scene.choices.find((item) => item.id === 'marry');
  assert.ok(!marry.locked);
  choose(room, 'marry');
  assert.equal(life.path.married, 32);
  const yearly = yearlySources(life);
  assert.ok(yearly.some((item) => item.id === 'spouse-income' && item.effect.money >= 1));
  assert.ok(yearly.some((item) => item.id === 'household' && item.effect.money === -2));
});

test('취업 후 저축 옵션, 실제 적립, 은퇴 후 정확히 10년 수령과 세금', () => {
  const { room, life } = roomAt(21, 'retirement-plan');
  life.career = 'crew';
  life.path.firstJobAge = 19;
  life.path.romanceSeed = 1; // 입사 후 2년차에 제안
  const offer = view(room).me.scene;
  assert.equal(offer.key, 'saving');
  assert.deepEqual(offer.choices.map(({ id }) => id), ['save-none', 'save-1', 'save-2', 'save-4']);
  choose(room, 'save-4');
  assert.equal(life.path.savings.annual, 4);
  annual(room);
  assert.equal(life.path.savings.balance, 4);
  life.stats.money = 1;
  annual(room);
  assert.equal(life.stats.money, 1);
  assert.equal(life.path.savings.balance, 6.16, '기존 4코인의 연 4% 이자와 납부 가능한 2코인이 적립');
  life.path.savings.balance = 85;
  life.path.retired = 60;
  life.age = 61;
  assert.equal(retirementPayout(life.path.savings), 8);
  assert.equal(retirementTax(life.path.savings), 5);
  assert.equal(view(room).me.scene.key, 'savings-payout');
  choose(room, 'savings-pension');
  assert.equal(life.path.savings.payoutMode, 'pension');
  for (let age = 61; age <= 70; age++) {
    life.age = age;
    assert.equal(yearlySources(life).find(({ id }) => id === 'retirement-payout')?.effect.money, 8);
  }
  life.age = 71;
  assert.equal(yearlySources(life).find(({ id }) => id === 'retirement-payout'), undefined);
});

test('기존 방의 연애·결혼 기록은 유지하면서 새 정보로 보강된다', () => {
  const { room, life } = roomAt(45);
  life.path.partner = 24;
  life.path.married = 29;
  life.path.romance = null;
  life.path.romanceSeed = 0;
  room.rules = 7;
  assert.equal(updateRoomRules(room, 2_000), true);
  assert.equal(life.path.partner, 24);
  assert.equal(life.path.married, 29);
  assert.ok(life.path.romance?.name);
  assert.ok(life.path.romanceSeed > 0);
  assert.ok(yearlySources(life).some(({ id }) => id === 'spouse-income'));
});
