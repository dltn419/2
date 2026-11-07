import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addPlayer, newRoom, selectChoice, stateFor, teacherAction, updateRoomRules } from '../public/game.mjs';

function storyRoom() {
  const room = newRoom({ code: 'ABC234', name: '한 해씩', seed: 'book-of-years', settings: { years: 7, pace: 'manual' } });
  addPlayer(room, { id: 'male', name: '단풍', avatar: 0, sex: 'male' });
  addPlayer(room, { id: 'female', name: '풀잎', avatar: 1, sex: 'female' });
  addPlayer(room, { id: 'outside', name: '파도', avatar: 2, sex: 'female' });
  teacherAction(room, 'start', {}, 0);
  return room;
}

function advance(room, picks = {}) {
  const { number: round } = room.turn;
  for (const player of room.players) {
    const me = stateFor(room, player.id).me;
    const options = me.scene.choices.filter((option) => !option.locked);
    const choice = picks[player.id] ?? options.find((option) => option.id === 'rest')?.id ?? options[0].id;
    assert.ok(options.some((option) => option.id === choice), `${player.id} ${me.age}살에 ${choice} 선택 불가`);
    selectChoice(room, player.id, { round, choice }, 0);
  }
  teacherAction(room, 'advance', { round, phase: 'play' }, 0);
  teacherAction(room, 'advance', { round, phase: 'review' }, 0);
}

test('초·중·고 희망이 전공과 직업에 반영되고 병역은 남자 캐릭터에게만 나온다', () => {
  const room = storyRoom();
  const me = (id) => stateFor(room, id).me;
  assert.equal(me('male').scene.title, '세상에 온 첫해');
  assert.equal(room.turn.to - room.turn.from, 1);

  for (let age = 0; age < 19; age++) {
    const title = me('male').scene.title;
    if (age === 7) assert.match(title, /초등학교/);
    if (age === 13) assert.match(title, /중학교/);
    if ([10, 14, 17].includes(age)) {
      assert.match(title, /장래희망 조사/);
      advance(room, { male: 'dream-science', female: 'dream-tech', outside: 'dream-art' });
    } else if (age === 16) {
      advance(room, { male: 'high-science', female: 'high-vocational', outside: 'rest' });
    } else {
      const learning = me('male').scene.choices.find((option) => option.effect.learning > 1 && !option.locked);
      advance(room, { male: learning?.id });
    }
  }
  assert.deepEqual(me('male').life.path.dreams.map(({ age }) => age), [10, 14, 17]);
  assert.match(me('male').scene.choices.find((option) => option.id === 'study-university').title, /연구·과학/);
  assert.equal(me('female').scene.choices.find((option) => option.id === 'work-dream').career, 'tech');
  assert.ok(me('outside').scene.choices.some((option) => option.id === 'equivalency'));
  assert.ok(!me('outside').scene.choices.some((option) => option.id === 'study-university'));
  advance(room, { male: 'study-university', female: 'work-dream', outside: 'equivalency' });
  assert.equal(me('outside').life.path.diploma, true);
  assert.equal(me('female').career, 'tech');
  assert.equal(me('male').scene.title, '입영을 앞두고');
  assert.notEqual(me('female').scene.title, '입영을 앞두고');
  advance(room, { male: 'service-after-study' });
  advance(room);
  advance(room);
  assert.equal(me('male').life.path.degree.kind, 'university');
  assert.equal(me('male').scene.title, '입영을 앞두고');
  advance(room, { male: 'enlist' });
  assert.equal(me('male').scene.title, '복무를 마무리하는 해');
  advance(room, { male: 'service-letter', female: 'date' });
  assert.equal(me('male').life.path.service.status, 'complete');
  assert.ok(me('male').scene.choices.some((option) => option.id === 'study-graduate' && !option.locked));
  assert.ok(me('male').scene.choices.some((option) => option.id === 'work-dream' && !option.locked));
  advance(room, { male: 'study-graduate' });
  advance(room);
  assert.equal(me('male').life.path.degree.kind, 'graduate');
  for (let age = 27; age < 29; age++) advance(room);
  advance(room, { female: 'marry' });
  advance(room);
  advance(room, { female: 'have-child' });
  assert.equal(me('female').life.path.married, 29);
  assert.deepEqual(me('female').life.path.children, [31]);
  assert.deepEqual(me('outside').life.path.children, []);
});

test('예전 방의 진행 중인 여러 해 턴을 1년으로 바꾸고 마감된 기록을 보존한다', () => {
  const room = storyRoom();
  advance(room);
  delete room.rules;
  delete room.players[0].life.path;
  const history = structuredClone(room.players[0].life.history);
  room.settings.years = 5;
  room.turn.to = 6;
  room.turn.auto = true;
  room.turn.seconds = 20;
  room.turn.deadline = 5;
  room.players[0].choice = 'old-choice';
  assert.equal(updateRoomRules(room, 1_000), true);
  assert.equal(room.turn.to, 2);
  assert.equal(room.turn.deadline, 21_000);
  assert.equal(room.players[0].choice, null);
  assert.deepEqual(room.players[0].life.history, history);
  assert.equal(stateFor(room, 'male').me.life.path.sex, null);
  assert.equal(updateRoomRules(room, 2_000), false);
});
