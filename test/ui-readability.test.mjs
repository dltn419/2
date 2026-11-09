import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addPlayer, newRoom, profileFor, stateFor, teacherAction } from '../public/game.mjs';
import { gameMenuView, homeView, profileView, roomView } from '../public/views.mjs';

function classroom(age = 35, career = 'crew') {
  const room = newRoom({ code: 'ABC234', name: 'UI 점검 교실', seed: 'readability-refresh',
    settings: { pace: 'personal', maxAge: 110 }, now: 1000 });
  const player = addPlayer(room, { id: 'one', key: 'student-one',
    name: '학생', avatar: 0, sex: 'female' });
  player.life.age = age;
  player.life.career = career;
  player.life.stats.money = 140;
  player.life.stats.learning = 90;
  player.life.stats.bond = 90;
  player.life.path.workYears[career] = 14;
  teacherAction(room, 'start', {}, 1000);
  return { room, player };
}
const screen = (room, role = 'player', pane = 'play') =>
  roomView({ role }, stateFor(room, role === 'player' ? 'one' : null), { pane, rank: 'money' });

test('시작 화면은 짧은 소개와 학생 입장·교사 방 생성 동선을 유지한다', () => {
  const html = homeView('ABC234', 0, {});
  assert.match(html, /나만의 인생/);
  assert.match(html, /id="join-form"/);
  assert.match(html, /ABC234/);
  assert.match(html, /게임이 이미 시작됐어도 참가할 수 있고/);
  assert.match(html, /data-action="create"/);
  assert.match(html, /data-action="host-reopen"/);
  assert.match(html, /혼자 체험/);
});

test('올해 변화가 선택지보다 위에 한 번만 나타나 수입 확인 후 선택할 수 있다', () => {
  const { room } = classroom(36, 'crew');
  const html = screen(room);
  const yearIndex = html.indexOf('class="year-effects"');
  const optionIndex = html.indexOf('class="choice-grid"');
  assert.ok(yearIndex >= 0, '올해 변화가 있어야 함');
  assert.ok(optionIndex > yearIndex, '선택 카드보다 올해 변화가 먼저');
  assert.equal([...html.matchAll(/class="year-effects"/g)].length, 1);
  assert.match(html, /data-action="choose"/);
  assert.match(html, /data-action="profile"/);
  assert.match(html, /능력치/);
});

test('교사 진행실은 학생 현황을 강조하고 방 설정을 접어 두되 제어 버튼을 보존한다', () => {
  const { room } = classroom();
  const html = screen(room, 'host');
  assert.match(html, /<h2>학생 현황<\/h2>/);
  assert.match(html, /<details class="teacher-settings">/);
  assert.match(html, /<summary><strong>방 설정<\/strong>/);
  assert.match(html, /data-action="finish"/);
  assert.match(html, /data-action="pause"/);
  assert.match(html, /data-action="kick" data-id="one"/);
  assert.doesNotMatch(html, /학생들의 현재 인생/);
});

test('교사 마감 후에는 초기화가 여전히 가능하다', () => {
  const { room } = classroom();
  teacherAction(room, 'finish', {}, 2000);
  const html = screen(room, 'host');
  assert.match(html, /data-action="reset-room"/);
  assert.match(html, /최종 기록/);
  assert.doesNotMatch(html, /data-action="kick"/);
});

test('직업 안내는 간결한 지원 조건을 보여주되 상세에는 실제 필요 조건이 남아 있다', () => {
  const html = gameMenuView('jobs', null);
  assert.match(html, /job-guide-summary-req/);
  assert.match(html, /지원 조건/);
  assert.match(html, /job-guide-full-req/);
  assert.match(html, /외 [1-9]개/);
  assert.match(html, /승진·전직 경로와 필요 조건/);
  assert.match(html, /초등교사 경력 12년 이상/);
});

test('승진 준비 현황은 조건을 숨기지 않고 펼친 상태를 추적할 식별자를 제공한다', () => {
  const { room } = classroom(42, 'teacher');
  const html = screen(room);
  assert.match(html, /class="career-goal-card" data-career-goal="vicePrincipal"/);
  assert.match(html, /승진·전직 준비/);
  assert.match(html, /초등교사 경력/);
  assert.match(html, /배움/);
  assert.match(html, /충족/);
});

test('인생 연대기는 연도·제목·수치를 먼저 보여주고 이야기는 클릭해 펼친다', () => {
  const { room, player } = classroom();
  player.life.history.push({
    year: 1, age: 11, decisionAge: 10, title: '학교에서 친구와 놀기',
    text: '친구와 보낸 봄날을 기록했어요.', type: 'life',
    changes: { joy: 3 },
  });
  player.life.history.push({
    year: 2, age: 12, decisionAge: 11, title: '책을 읽기',
    text: '도서관에서 새로운 책을 발견했어요.', type: 'life',
    changes: { learning: 2 },
  });
  const html = profileView(profileFor(room, player.id), 0);
  assert.equal([...html.matchAll(/<details class="timeline-entry">/g)].length, 2);
  assert.equal([...html.matchAll(/<summary>/g)].length, 2);
  assert.match(html, /학교에서 친구와 놀기/);
  assert.match(html, /친구와 보낸 봄날을 기록했어요/);
  assert.match(html, /도서관에서 새로운 책을 발견했어요/);
  assert.match(html, /행복 \+3/);
  assert.doesNotMatch(html, /<details class="timeline-entry" open/);
});

test('게임 팁은 길게 늘어놓지 않고 핵심만 다섯 묶음으로 안내한다', () => {
  const html = gameMenuView('tips', null);
  assert.equal([...html.matchAll(/<li>/g)].length, 5);
  for (const text of ['한 해씩 성장', '직업과 승진', '돈과 건강', '노후 준비', '다음 세대']) {
    assert.ok(html.includes(text), text);
  }
});
