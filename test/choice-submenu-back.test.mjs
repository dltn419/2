import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addPlayer, newRoom, selectChoice, stateFor, teacherAction } from '../public/game.mjs';
import { roomView } from '../public/views.mjs';

function setup(age = 19, career = null) {
  const room = newRoom({ code: 'ABC234', name: '선택 화면 이동 테스트',
    seed: 'choice-submenu-back', settings: { pace: 'personal', maxAge: 110 } });
  const player = addPlayer(room, { id: 'student', name: '학생', avatar: 0, sex: 'female' });
  player.life.age = age;
  player.life.path.school = 'general';
  if (career) {
    player.life.career = career;
    player.life.path.workYears[career] = 6;
  }
  teacherAction(room, 'start', {}, 1000);
  return room;
}
const state = (room) => stateFor(room, 'student');
const html = (room) => roomView({ role: 'player' }, state(room), { pane: 'play', rank: 'money' });

test('대학 진학 목록에 접었다가 돌아오는 버튼이 있다', () => {
  const room = setup();
  assert.equal(state(room).me.scene.key, 'education');
  const markup = html(room);
  assert.match(markup, /data-choice-section="college"/);
  assert.match(markup, /data-action="choice-back"\s+data-id="college"/);
  assert.match(markup, /대학 진학 목록 닫고 이전 선택지로 돌아가기/);
  assert.match(markup, /← 이전 선택지로/);
  assert.match(markup, /data-choice-section="further"/);
  assert.match(markup, /data-action="choice-back"\s+data-id="further"/);
  // 뒤로가기에는 선택을 확정하는 액션이 연결되지 않습니다.
  assert.doesNotMatch(markup, /data-action="choose"\s+data-id="college"/);
});

test('대학 선택 후 직업 선택 목록에서도 뒤로가기가 나타난다', () => {
  const room = setup(26, 'crew');
  assert.equal(state(room).me.scene.key, 'education');
  const before = state(room);
  selectChoice(room, 'student', {
    round: before.turn.number, scene: 'education', choice: 'rest',
  }, 1000);
  assert.equal(state(room).me.scene.key, 'career');
  const markup = html(room);
  assert.match(markup, /data-choice-section="career-service"/);
  assert.match(markup, /data-action="choice-back"\s+data-id="career-service"/);
  assert.match(markup, /생활·서비스·자영업 목록 닫고 이전 선택지로 돌아가기/);
  assert.match(markup, /data-choice-section="career-industry"/);
  assert.match(markup, /data-action="choice-back"\s+data-id="career-industry"/);
  assert.equal(room.players[0].life.career, 'crew');
});

test('직업·대학 목록은 위쪽에 뒤로가기가 있고 길면 아래에도 있다', () => {
  const college = html(setup());
  const choicePanel = college.slice(college.indexOf('data-choice-section="college"'));
  const top = choicePanel.indexOf('data-action="choice-back"');
  const choices = choicePanel.indexOf('class="choice-grid"');
  assert.ok(top >= 0 && top < choices);
  const workRoom = setup(26, 'crew');
  const scene = state(workRoom);
  selectChoice(workRoom, 'student', { round: scene.turn.number, scene: 'education', choice: 'rest' }, 1000);
  const work = html(workRoom);
  const others = work.slice(work.indexOf('data-choice-section="career-service"'));
  const section = others.slice(0, others.indexOf('</details>'));
  const buttons = [...section.matchAll(/data-action="choice-back"/g)];
  assert.ok(buttons.length >= 1);
  if (state(workRoom).me.scene.choices.filter((c) => c.careerGroup === 'other' && !c.locked).length > 5) {
    assert.equal(buttons.length, 2);
    assert.match(section, /class="choice-section-navigation bottom"/);
  }
});

test('뒤로가기 버튼은 그룹에서만 렌더링되고 게임 선택 데이터는 바꾸지 않는다', () => {
  const room = setup(19);
  const before = room.players[0].life.age;
  const choicesBefore = JSON.stringify(state(room).me.scene.choices);
  const markup = html(room);
  assert.ok(markup.includes('data-action="choice-back"'));
  assert.equal(room.players[0].life.age, before);
  assert.equal(JSON.stringify(state(room).me.scene.choices), choicesBefore);
  assert.equal(room.players[0].choice, null);
});
