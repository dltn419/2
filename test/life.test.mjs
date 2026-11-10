import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CAREERS, STORIES } from '../public/content.mjs';
import { addPlayer, newRoom, selectChoice, stateFor, teacherAction, updateRoomRules } from '../public/game.mjs';
import { fallIll, illnessDeathRisk, illnessRisk, settleHealth } from '../public/health.mjs';
import { careerPay } from '../public/life.mjs';
import { avatar } from '../public/ui.mjs';
import { choiceFeedbackView, gameMenuView, roomView, topView } from '../public/views.mjs';

function classroom(students, { age = 0, settings } = {}) {
  const room = newRoom({ code: 'ABC234', name: '한 해씩', seed: 'book-of-years', settings: { years: 7, pace: 'manual', ...settings } });
  for (const [id, sex] of Object.entries(students)) {
    const player = addPlayer(room, { id, name: id, avatar: 0, sex });
    player.life.age = age;
  }
  teacherAction(room, 'start', {}, 1_000);
  return room;
}

const me = (room, id) => stateFor(room, id).me;
const optionAt = (room, id, choice) => me(room, id).scene.choices.find((option) => option.id === choice);

function pick(room, id, scene, choice) {
  return selectChoice(room, id, { round: stateFor(room, id).turn.number, scene, choice }, 1_000);
}

function extras(room, id, choices = {}) {
  let view = me(room, id);
  while (view.scene.bonus) {
    const { key, fallback } = view.scene;
    pick(room, id, key, choices[key] ?? fallback);
    const next = me(room, id);
    assert.equal(next.age, view.age);
    assert.equal(next.submitted, false);
    assert.notEqual(next.scene.key, key);
    view = next;
  }
  return view;
}

function year(room, extraChoices = {}, annualChoice) {
  const { number, from } = room.turn;
  for (const player of room.players) {
    const view = extras(room, player.id, extraChoices[player.id]);
    const options = view.scene.choices.filter((option) => !option.locked);
    const choice = annualChoice?.(view, player.id) ?? options.find((option) => option.id === 'rest')?.id ?? options[0].id;
    pick(room, player.id, 'year', choice);
  }
  teacherAction(room, 'advance', { round: number, phase: 'play' }, 1_000);
  assert.equal(room.phase, 'play');
  assert.equal(room.turn.number, number + 1);
  assert.equal(room.year, from + 1);
}

test('장래희망과 진학을 골라도 같은 나이의 학교생활을 한다', () => {
  const room = classroom({ 과학: 'male', 기술: 'female', 도전: 'female' });
  assert.equal(me(room, '과학').scene.title, '세상에 온 첫해');
  const learning = (view) => view.scene.choices.filter((option) => !option.locked)
    .find((option) => option.effect.learning >= 2)?.id;

  for (let age = 0; age < 19; age++) {
    let choices;
    if ([10, 14, 17].includes(age)) {
      choices = { 과학: { dream: 'dream-stem' }, 기술: { dream: 'dream-stem' }, 도전: { dream: 'dream-creative' } };
    } else if (age === 16) {
      choices = { 과학: { school: 'high-science' }, 기술: { school: 'high-vocational' }, 도전: { school: 'rest' } };
    } else if (age === 18) choices = { 도전: { education: 'equivalency' } };

    year(room, choices, (view, id) => {
      assert.equal(view.age, age);
      if (age === 10) assert.equal(view.scene.title, '우리 반 작은 전시');
      if (age === 14) assert.equal(view.scene.title, '동아리 발표회');
      if (age === 16) {
        assert.equal(view.scene.title, id === '도전' ? '학교 밖의 첫해' : '고등학교 첫해');
        assert.throws(() => pick(room, id, 'school', 'rest'), /새 선택/);
      }
      if (age === 17 && id !== '도전') assert.equal(view.scene.title, '내가 좋아하는 과목');
      return learning(view);
    });
  }

  const dreams = me(room, '과학').life.path.dreams;
  assert.deepEqual(dreams.map(({ age }) => age), [10, 14, 17]);
  assert.equal(me(room, '도전').life.path.diploma, true);
  year(room, { 과학: { education: 'study-university' }, 기술: { career: 'work-tech' }, 도전: { education: 'study-college' } });
  assert.equal(me(room, '과학').life.path.program.field, 'science');
  assert.equal(me(room, '과학').life.path.program.remaining, 3);
  assert.equal(me(room, '기술').career, 'tech');
  assert.equal(me(room, '도전').life.path.program.remaining, 1);
});

test('4년제는 학업 4년으로 끝나고 복무한 해만큼만 늦어진다', () => {
  const room = classroom({ 입영: 'male', 미루기: 'male', 여학생: 'female' }, { age: 19 });
  for (const { life } of room.players) Object.assign(life.stats, { money: 80, learning: 35 });
  assert.deepEqual(optionAt(room, '입영', 'study-university').recurring.starts[0].effect, { learning: 1 });
  assert.equal(optionAt(room, '입영', 'study-university').recurring.starts[0].years, 4);
  year(room, Object.fromEntries(room.players.map(({ id }) => [id, { education: 'study-university' }])));
  assert.deepEqual(optionAt(room, '입영', 'enlist').recurring.stops, ['대학에서 배우기']);
  year(room, { 입영: { military: 'enlist' }, 미루기: { military: 'service-after-study' } });
  assert.deepEqual(me(room, '입영').scene.yearly.map(({ id }) => id), ['service']);
  assert.equal(me(room, '입영').life.path.program.remaining, 3);
  assert.equal(me(room, '미루기').life.path.program.remaining, 2);
  assert.equal(me(room, '여학생').life.path.service, null);
  year(room);
  assert.equal(me(room, '입영').life.path.service.endedAt, 22);
  assert.match(extras(room, '입영').scene.detail, /학교로 돌아왔어요/);
  assert.equal(me(room, '입영').scene.base.learning, 1);
  year(room);
  assert.equal(me(room, '미루기').life.path.degree.age, 23);
  assert.equal(me(room, '여학생').life.path.degree.age, 23);
  const degreeScene = me(room, '여학생').scene;
  assert.equal(degreeScene.key, 'education');
  assert.ok(degreeScene.choices.some(({ id }) => id === 'study-graduate'));
  assert.ok(!degreeScene.choices.some(({ id }) => id === 'study-university'));
  year(room, { 미루기: { military: 'enlist' }, 여학생: { education: 'study-graduate' } });
  year(room);
  assert.equal(me(room, '입영').life.path.degree.age, 25);
  assert.equal(me(room, '미루기').life.path.service.endedAt, 25);
  assert.deepEqual(me(room, '여학생').life.path.degree, { kind: 'graduate', field: 'explore', age: 25 });
});

test('체력이 낮으면 병에 더 자주 걸리고 치료 경로에는 다른 비용이 든다', () => {
  assert.ok(illnessRisk(66, 8) > illnessRisk(66, 45));
  assert.ok(illnessRisk(66, 45) > illnessRisk(66, 90));
  const room = classroom({ 수술: 'female', 돌봄: 'female' }, { age: 65 });
  for (const { life } of room.players) {
    Object.assign(life.stats, { health: 1, money: 40 });
    fallIll(life, life.path, 0, 0);
    assert.equal(life.path.illness.serious, true);
  }
  const operation = me(room, '수술').scene.choices.find(({ id }) => id === 'operation');
  assert.equal(operation.effect.money, -40);
  assert.match(operation.locked, /41코인/);
  assert.throws(() => pick(room, '수술', 'illness', 'operation'), /선택을 할 수 없어요/);
  room.players[0].life.stats.money += 1;
  extras(room, '수술', { illness: 'operation' });
  assert.equal(me(room, '수술').life.path.illness, null);
  assert.equal(me(room, '수술').life.stats.money, 1);
  extras(room, '돌봄', { illness: 'clinic-care' });
  assert.equal(me(room, '돌봄').life.path.illness.steps, 1);
  year(room);
  assert.equal(me(room, '돌봄').mode, 'alive');
  year(room);
  year(room);
  assert.equal(me(room, '돌봄').life.path.illness, null);
  assert.ok(room.players.every(({ life }) => Object.values(life.stats).every((value) => value >= 1)));
});

test('큰 병과 체력 저하가 겹치면 집에서 돌볼 때보다 병원 치료가 생존에 유리하다', () => {
  const deaths = { rest: 0, 'clinic-care': 0, operation: 0, 'assisted-care': 0 };
  for (let seed = 0; seed < 80; seed++) {
    for (const choice of Object.keys(deaths)) {
      const room = classroom({ 환자: 'female' }, { age: 67 });
      room.seed = `care-${seed}`;
      const { life } = room.players[0];
      Object.assign(life.stats, { health: 1, money: choice === 'operation' ? 41 : choice === 'clinic-care' ? 11 : 1,
        bond: choice === 'assisted-care' ? 34 : 10 });
      fallIll(life, life.path, 0, 0);
      year(room, { 환자: { illness: choice } });
      if (life.end) {
        assert.equal(life.end.reason, 'illness');
        deaths[choice] += 1;
      }
    }
  }
  assert.ok(deaths.rest > deaths['clinic-care']);
  assert.ok(deaths.rest > deaths['assisted-care']);
  assert.equal(deaths.operation, 0);
  const healthy = classroom({ 학생: 'female' }, { age: 49 }).players[0].life;
  healthy.stats.health = 1;
  assert.equal(illnessDeathRisk(healthy), 0);
});

test('위중한 병을 치료하지 않으면 숨은 위험이 쌓이고 수술로 그 병이 끝난다', () => {
  const room = classroom({ 환자: 'female' }, { age: 75 });
  const { life } = room.players[0];
  life.stats.health = 5;
  life.stats.money = 12;
  fallIll(life, life.path, 0, 0);
  assert.equal(life.path.illness.critical, true);
  assert.match(optionAt(room, '환자', 'operation').locked, /41코인/);
  assert.match(optionAt(room, '환자', 'clinic-care').locked, /23코인/);
  const firstRisk = illnessDeathRisk(life);
  assert.ok(firstRisk >= 75);
  settleHealth(life);
  assert.equal(life.path.healthBurden, 2);
  assert.ok(illnessDeathRisk(life) > firstRisk);
  assert.ok(!Object.hasOwn(me(room, '환자').life.path, 'healthBurden'));
  life.stats.money = 41;
  extras(room, '환자', { illness: 'operation' });
  assert.equal(life.path.illness, null);
  assert.equal(life.path.healthBurden, 0);
  assert.equal(illnessDeathRisk(life), 0);
});

test('의료 장래희망에서 영재학교와 의대 6년을 지나 면허와 일자리로 이어진다', () => {
  const room = classroom({ 학생: 'female' });
  const { life } = room.players[0];
  for (let age = 0; age < 25; age++) {
    if (age === 16) {
      assert.equal(optionAt(room, '학생', 'high-general').locked, '');
      assert.equal(optionAt(room, '학생', 'high-science').need.learning, 34);
      assert.equal(optionAt(room, '학생', 'high-gifted').need.learning, 45);
    }
    const choices = { dream: 'dream-stem', school: 'high-gifted', education: 'study-medicine' };
    year(room, { 학생: choices }, (view) => view.scene.choices.filter(({ locked, effect }) => !locked && effect.learning > 0)
      .sort((left, right) => right.effect.learning - left.effect.learning)[0]?.id);
    if (age >= 19 && age < 24) assert.equal(life.path.program.remaining, 24 - age);
  }
  assert.deepEqual(life.path.degree, { kind: 'medicine', field: 'medical', age: 25 });
  assert.equal(life.career, null);
  const withoutLicense = structuredClone(room);
  pick(withoutLicense, '학생', 'license', 'rest');
  pick(withoutLicense, '학생', 'education', 'rest');
  assert.match(optionAt(withoutLicense, '학생', 'work-doctor').locked, /의사 면허/);
  pick(room, '학생', 'license', 'doctor-license');
  pick(room, '학생', 'education', 'rest');
  assert.equal(optionAt(room, '학생', 'work-doctor').locked, '');
  assert.equal(optionAt(room, '학생', 'work-doctor').recurring.starts[0].effect.money, 11);
  year(room, { 학생: { career: 'work-doctor' } });
  assert.equal(life.career, 'doctor');
});

test('쉬기는 체력을, 걷기는 행복을 더 많이 얻는다', () => {
  const scene = STORIES.flat().find(({ choices }) => choices.some(({ id }) => id === 'breathe'));
  const rest = scene.choices.find(({ id }) => id === 'rest');
  const walk = scene.choices.find(({ id }) => id === 'breathe');
  assert.ok(rest.effect.health > walk.effect.health);
  assert.ok(walk.effect.joy > rest.effect.joy);
});

test('플레이 화면은 성별이 다른 도트 캐릭터와 마을, 선택지, 능력치를 보여 준다', () => {
  const room = classroom({ 학생: 'female' });
  const html = roomView({ role: 'player' }, stateFor(room, '학생'), { pane: 'play', rank: 'age' });
  const female = avatar(0, 'alive', 'female');
  assert.notEqual(female, avatar(0, 'alive', 'male'));
  assert.ok(html.includes(female));
  for (const region of ['play-sidebar', 'play-main', 'village-cast', 'stat-grid', 'choice-grid']) assert.ok(html.includes(region));
});

test('일상 선택은 실제 능력치 변화와 이름을 넣은 문장을 남긴다', () => {
  const room = classroom({ 새싹: 'female' }, { settings: { pace: 'auto', seconds: 0 } });
  const before = stateFor(room, '새싹');
  assert.equal(choiceFeedbackView(before), '');
  pick(room, '새싹', 'year', 'birth-voice');
  const after = stateFor(room, '새싹');
  assert.equal(after.me.life.stats.bond, before.me.life.stats.bond + 1);
  assert.equal(after.me.age, 1);
  const note = choiceFeedbackView(after);
  assert.match(note, /새싹은<\/strong> 가족이 처음 이름을 불러 주자 작은 눈을 떴어요/);
  assert.match(note, /관계 \+1/);
  assert.doesNotMatch(note, /체력 [−+]/);
  assert.match(roomView({ role: 'demo' }, after, { pane: 'play', rank: 'age' }), /data-stat="bond"/);
});

test('추가 선택에도 현재 나이에서 입학과 장래희망 이야기가 나타난다', () => {
  const college = classroom({ 이수: 'female' }, { age: 19, settings: { pace: 'personal' } });
  college.players[0].life.stats.learning = 24;
  pick(college, '이수', 'education', 'study-university');
  const after = stateFor(college, '이수');
  assert.equal(after.me.age, 19);
  assert.match(choiceFeedbackView(after), /이수는<\/strong> 설레는 마음으로 대학교의 첫 강의실에 들어갔어요/);
  assert.match(choiceFeedbackView(after), /자금 −2/);

  const school = classroom({ 이수: 'female' }, { age: 10, settings: { pace: 'personal' } });
  const before = stateFor(school, '이수');
  pick(school, '이수', 'dream', 'dream-creative');
  const dreamed = stateFor(school, '이수');
  assert.equal(dreamed.me.age, 10);
  assert.deepEqual(dreamed.me.life.stats, before.me.life.stats);
  assert.match(choiceFeedbackView(dreamed), /장래희망 칸에 ‘예술·체육·창작’라고/);
  assert.doesNotMatch(choiceFeedbackView(dreamed), /class="delta /);
});

test('대학은 가족 학비 지원으로 잔액이 적어도 학업 조건만 충족하면 갈 수 있다', () => {
  const room = classroom({ 학생: 'female' }, { age: 19, settings: { pace: 'personal' } });
  const { life } = room.players[0];
  Object.assign(life.stats, { learning: 52, bond: 22, money: 1 });
  assert.match(optionAt(room, '학생', 'study-medicine').locked, /^배움 63점 필요$/);
  assert.equal(optionAt(room, '학생', 'study-engineering').need.learning, 33);
  assert.equal(optionAt(room, '학생', 'study-nursing').need.bond, 20);
  assert.equal(optionAt(room, '학생', 'study-teaching').need.learning, 47);
  assert.equal(optionAt(room, '학생', 'study-university').locked, '');
  const html = roomView({ role: 'player' }, stateFor(room, '학생'), { pane: 'play', rank: 'age' });
  assert.match(html, /data-choice-section="college"[\s\S]*data-id="study-university"/);
  assert.match(html, /data-choice-section="further"[\s\S]*data-id="study-training"/);

  life.stats.learning = 63;
  assert.equal(optionAt(room, '학생', 'study-medicine').locked, '');
  assert.deepEqual(optionAt(room, '학생', 'study-medicine').effect, {});
  pick(room, '학생', 'education', 'study-medicine');
  assert.equal(life.path.program.kind, 'medicine');
  assert.equal(life.stats.money, 1);
  assert.equal(life.age, 19);
});

test('공유 진행에서 선택 문장은 바로 나오고 수치 변화는 한 해가 지나면 표시된다', () => {
  const room = classroom({ 학생: 'female' });
  pick(room, '학생', 'year', 'rest');
  const pending = stateFor(room, '학생');
  assert.match(choiceFeedbackView(pending), /따뜻한 품에서 스르르 잠들어요/);
  assert.doesNotMatch(choiceFeedbackView(pending), /체력 \+2/);
  teacherAction(room, 'advance', { round: room.turn.number, phase: 'play' }, 1_000);
  assert.match(choiceFeedbackView(stateFor(room, '학생')), /체력 \+2/);
});

test('각자 진행에서 세대를 잇거나 영혼으로 선택해도 친구는 그대로이고 순위는 현재 인생을 보여 준다', () => {
  const room = classroom({ 새싹: 'female', 바람: 'female' }, { age: 79, settings: { pace: 'personal', maxAge: 80 } });
  room.players[0].life.career = 'crew';
  room.players[1].life.career = 'nurse';
  room.players[0].life.path.retired = 65;
  room.players[1].life.path.retired = 60;
  pick(room, '새싹', 'year', 'rest');
  assert.equal(me(room, '바람').age, 79);
  assert.equal(me(room, '새싹').mode, 'fork');
  pick(room, '새싹', 'year', 'child-male');
  assert.equal(me(room, '새싹').age, 0);
  assert.equal(me(room, '새싹').scene.title, '세상에 온 첫해');
  assert.equal(me(room, '새싹').latest.type, 'child');
  pick(room, '바람', 'year', 'rest');
  pick(room, '바람', 'year', 'spirit');
  pick(room, '바람', 'year', 'workplace');
  assert.equal(me(room, '바람').age, 80);
  assert.equal(me(room, '바람').visits.length, 1);
  assert.ok(me(room, '바람').latest.text);
  assert.match(choiceFeedbackView(stateFor(room, '바람')), /오래 일하던 곳에 들러/);
  assert.throws(() => pick(room, '바람', 'year', 'workplace'), /이 선택을 할 수 없어요/);

  const state = stateFor(room, '새싹');
  const parent = state.rankings.age.find(({ name }) => name === '새싹');
  assert.equal(parent.age, 0);
  assert.equal(parent.career, null);
  assert.equal(parent.value, 80);
  assert.equal(parent.generation, 1);
  const html = roomView({ role: 'player' }, state, { pane: 'rank', rank: 'age' });
  assert.match(html, /0살 · 직업 없음/);
  assert.match(html, /80살 · 간호사/);
  const teacher = roomView({ role: 'host' }, stateFor(room, null), { pane: 'play', rank: 'age' });
  assert.match(teacher, /학생 현황/);
  assert.doesNotMatch(teacher, /data-action="advance"|data-clock/);
});

test('다음 세대는 부모의 수치와 관계없이 기본 능력치 이상으로 태어난다', () => {
  const initial = classroom({ 기준: 'female' }).players[0].life.stats;
  const room = classroom({ 새싹: 'female', 가람: 'female' }, { age: 79, settings: { pace: 'personal', maxAge: 80 } });
  Object.assign(room.players[0].life.stats, { money: -10, bond: -5 });
  Object.assign(room.players[1].life.stats, { money: 500, bond: 140 });
  for (const id of ['새싹', '가람']) {
    pick(room, id, 'year', 'rest');
    pick(room, id, 'year', 'child-female');
  }
  assert.deepEqual(me(room, '새싹').life.stats, initial);
  assert.deepEqual(me(room, '가람').life.stats, { ...initial, money: initial.money + 30, bond: initial.bond + 8 });
  assert.ok(room.players.every(({ life }) => life.age === 0 && life.generation === 2));
});

test('운동선수는 훈련 기록과 체력이 필요하고 영상 크리에이터는 꿈이나 능력치에 따라 나타난다', () => {
  const room = classroom({ 운동: 'female', 꿈: 'female' }, { age: 11 });
  for (let age = 11; age < 19; age++) {
    year(room, { 꿈: { dream: 'dream-creative' } },
      (_, id) => id === '운동' && [11, 13].includes(age) ? 'sports-team' : 'rest');
  }
  assert.equal(me(room, '운동').life.path.sportYears, 2);
  pick(room, '운동', 'education', 'rest');
  pick(room, '꿈', 'education', 'rest');
  assert.equal(optionAt(room, '운동', 'work-athlete').locked, '');
  assert.match(optionAt(room, '꿈', 'work-athlete').locked, /훈련 2회/);
  assert.equal(optionAt(room, '운동', 'work-creator'), undefined);
  Object.assign(room.players[0].life.stats, { art: 35, bond: 24, money: 10 });
  assert.equal(optionAt(room, '운동', 'work-creator').locked, '');
  room.players[1].life.path.dreams.push({ age: 17, field: 'media' });
  assert.match(optionAt(room, '꿈', 'work-creator').locked, /예술 30점/);
});

test('간호학과와 면허, 돌봄 교육과 시험이 서로 다른 직업을 연다', () => {
  const room = classroom({ 간호: 'female', 돌봄: 'female' }, { age: 19 });
  const [nurse, caregiver] = room.players;
  for (const { life } of room.players) {
    life.path.dreams.push({ age: 17, field: 'medical' });
    Object.assign(life.stats, { learning: 40, bond: 28 });
  }
  year(room, { 간호: { education: 'study-nursing' }, 돌봄: { education: 'study-caregiving' } });
  assert.equal(nurse.life.path.program.remaining, 3);
  assert.equal(caregiver.life.path.caregivingAge, 20);
  assert.equal(optionAt(room, '돌봄', 'work-caregiver').locked, '');
  assert.match(optionAt(room, '돌봄', 'work-nurse').locked, /간호사 면허/);
  while (nurse.life.age < 23) {
    year(room, { 돌봄: { career: 'work-caregiver' } }, (view, id) => id === '간호' && view.scene.choices
      .some(({ id }) => id === 'study-project') ? 'study-project' : undefined);
  }
  assert.equal(caregiver.life.career, 'caregiver');
  assert.deepEqual(nurse.life.path.degree, { kind: 'nursing', field: 'medical', age: 23 });
  const unlicensed = structuredClone(room);
  pick(unlicensed, '간호', 'license', 'rest');
  pick(unlicensed, '간호', 'education', 'rest');
  assert.match(optionAt(unlicensed, '간호', 'work-nurse').locked, /간호사 면허/);
  year(room, { 간호: { license: 'nurse-license', career: 'work-nurse' } });
  assert.equal(nurse.life.career, 'nurse');
  assert.equal(nurse.life.path.nursingLicenseAge, 23);
});

test('직업마다 학력과 능력치가 다르고 선택해야 고정 수입이 생긴다', () => {
  const room = classroom({ 학생: 'female' }, { age: 19 });
  const { life } = room.players[0];
  Object.assign(life.path, { school: 'outside', dreams: [{ age: 17, field: 'science' }] });
  Object.assign(life.stats, { learning: 90, bond: 36, money: 57 });
  pick(room, '학생', 'education', 'rest');
  assert.equal(optionAt(room, '학생', 'work-crew').locked, '');
  assert.match(optionAt(room, '학생', 'work-staff').locked, /고등학교 졸업 또는 검정고시/);
  assert.match(optionAt(room, '학생', 'work-chip').locked, /4년제 대학 졸업 이상/);
  assert.match(optionAt(room, '학생', 'work-sales').locked, /관계 37점/);
  life.stats.money = 41;
  assert.match(optionAt(room, '학생', 'work-shop').locked, /자금 42코인/);
  life.stats.money = 57;
  assert.match(roomView({ role: 'player' }, stateFor(room, '학생'), { pane: 'play', rank: 'age' }), /생활·서비스·자영업/);
  assert.throws(() => pick(room, '학생', 'career', 'work-chip'), /선택을 할 수 없어요/);
  life.stats.bond = 37;
  assert.deepEqual(optionAt(room, '학생', 'work-sales').recurring.starts[0].effect, { money: 5, health: -1 });
  life.stats.money = 42;
  assert.equal(optionAt(room, '학생', 'work-shop').effect.money, -24);
  assert.equal(optionAt(room, '학생', 'work-shop').locked, '');
  assert.equal(life.career, null);
  year(room, { 학생: { career: 'work-crew' } });
  assert.equal(life.career, 'crew');
  assert.equal(me(room, '학생').scene.base.money, 2);
  life.age = 26;
  life.path.degree = { kind: 'university', field: 'science', age: 25 };
  life.stats.learning = 70;
  pick(room, '학생', 'education', 'rest');
  assert.match(optionAt(room, '학생', 'work-chip').locked, /배움 71점/);
  life.stats.learning = 71;
  const researcher = optionAt(room, '학생', 'work-chip');
  assert.equal(researcher.locked, '');
  assert.ok(researcher.conditions.every(({ met }) => met));
  assert.deepEqual(researcher.recurring.starts[0].effect, { money: 8, health: -1 });
  assert.deepEqual(researcher.recurring.stops, ['매장 직원 수입']);
  year(room, { 학생: { career: 'work-chip' } });
  assert.equal(life.career, 'chip');
  assert.equal(me(room, '학생').scene.base.money, 8);
});

test('경력과 직무 능력이 먼저 연봉을 올리고 관련 대학원을 마치면 학위 수당이 붙는다', () => {
  const room = classroom({ 연구원: 'female' }, { age: 26 });
  const { life } = room.players[0];
  life.career = 'chip';
  life.path.workYears.chip = 2;
  life.path.degree = { kind: 'university', field: 'tech', age: 23 };
  life.path.dreams.push({ age: 17, field: 'art' });
  Object.assign(life.stats, { learning: 98, money: 40 });
  pick(room, '연구원', 'education', 'study-graduate');
  assert.equal(life.path.program.field, 'tech');
  assert.equal(careerPay(life).total, 8);
  year(room, {}, () => 'study-project');
  assert.equal(life.path.workYears.chip, 3);
  assert.equal(life.path.program.remaining, 1);
  assert.equal(careerPay(life).total, 9);
  assert.equal(me(room, '연구원').latest.changes.money, 8);
  assert.deepEqual(me(room, '연구원').latest.raise, { from: 8, to: 9 });
  assert.match(choiceFeedbackView(stateFor(room, '연구원')), /다음 해 연봉 8 → 9코인/);
  year(room);
  assert.equal(life.path.degree.kind, 'graduate');
  assert.equal(careerPay(life).education, 2);
  assert.equal(careerPay(life).total, 12);
  assert.equal(me(room, '연구원').latest.changes.money, 9);
  assert.deepEqual(me(room, '연구원').latest.raise, { from: 9, to: 12 });
});

test('복무 중에는 직업 경력을 쉬고 복무를 마친 뒤 기존 경력을 이어간다', () => {
  const room = classroom({ 학생: 'male' }, { age: 20 });
  const { life } = room.players[0];
  life.career = 'crew';
  life.path.workYears.crew = 2;
  year(room, { 학생: { military: 'enlist' } });
  year(room);
  assert.equal(life.path.workYears.crew, 2);
  assert.equal(careerPay(life).total, 3);
  year(room);
  assert.equal(life.path.workYears.crew, 3);
  assert.equal(careerPay(life).total, 3);
});

test('이전 방의 근무 기록에서 직업별 경력을 복원한다', () => {
  const room = classroom({ 학생: 'male' }, { age: 27 });
  const { life } = room.players[0];
  life.career = 'crew';
  life.path.retired = 25;
  delete life.path.workYears;
  life.history = [
    { type: 'bonus', title: '회사원', decisionAge: 19 },
    { type: 'life', decisionAge: 19 },
    { type: 'bonus', title: '올해 입영하기', decisionAge: 20 },
    { type: 'life', decisionAge: 20 },
    { type: 'life', decisionAge: 21 },
    { type: 'life', decisionAge: 22 },
    { type: 'bonus', title: '매장 직원', decisionAge: 23 },
    { type: 'life', decisionAge: 23 },
    { type: 'life', decisionAge: 24 },
    { type: 'life', decisionAge: 25 },
    { type: 'life', decisionAge: 26 },
  ];
  room.rules = 6;
  assert.equal(updateRoomRules(room, 2_000), true);
  assert.deepEqual(life.path.workYears, { staff: 2, crew: 3 });
  assert.equal(updateRoomRules(room, 2_001), false);
});

test('게임 메뉴에는 팁과 모든 직업의 조건 및 연봉이 있다', () => {
  const room = classroom({ 학생: 'female' }, { age: 20 });
  const { life } = room.players[0];
  life.career = 'crew';
  life.path.workYears.crew = 3;
  assert.match(topView({ role: 'player' }, stateFor(room, '학생')), /<span>메뉴<\/span>/);
  assert.match(gameMenuView('tips', life), /직업과 승진/);
  const guide = gameMenuView('jobs', life);
  assert.equal([...guide.matchAll(/class="job-guide-entry"/g)].length,
    Object.values(CAREERS).filter((job) => !job.promotionFrom && !job.legacyPromotion && !job.entryVariant).length);
  assert.match(guide, /매장 직원 · 연봉 3코인/);
  assert.match(guide, /초기 연봉 11코인/);
  assert.doesNotMatch(guide, /월급|월 약|12개월/);
  assert.match(guide, /의대 졸업과 의사 면허/);
  assert.match(guide, /30살까지 지원/);
});

test('미룬 복무 일정은 다시 정할 수 있고 낮은 체력에는 마을 복무가 열린다', () => {
  const room = classroom({ 학생: 'male' }, { age: 20 });
  const { life } = room.players[0];
  year(room, { 학생: { military: 'rest' } });
  assert.equal(life.path.service.at, 21);
  assert.equal(optionAt(room, '학생', 'rest').title, '내년에 다시 정하기');
  while (life.age < 28) year(room, { 학생: { military: 'rest' } });
  assert.equal(life.path.service.at, 28);
  life.path.illness = null;
  assert.equal(optionAt(room, '학생', 'rest'), undefined);
  life.stats.health = 41;
  assert.match(optionAt(room, '학생', 'service-community').locked, /체력 40점 이하/);
  life.stats.health = 40;
  const next = extras(room, '학생', { military: 'service-community' });
  assert.equal(next.scene.title, '마을 복무 첫해');
  assert.equal(next.life.path.service.kind, 'community');
  year(room);
  year(room);
  assert.equal(life.path.service.endedAt, 30);
});

test('전세금을 집값에 보태고 능력치는 100을 넘겨도 계속 쌓인다', () => {
  const room = classroom({ 이사: 'female' }, { age: 28 });
  const { life } = room.players[0];
  Object.assign(life.stats, { money: 90, joy: 99 });
  year(room, {}, () => 'lease-home');
  assert.deepEqual(life.path.home, { kind: 'lease', at: 28, deposit: 36 });
  assert.equal(life.stats.money, 50);
  assert.equal(life.stats.joy, 104);
  while (life.age < 33) year(room);
  life.stats.money = 44;
  let purchase = me(room, '이사').scene.choices.find(({ id }) => id === 'buy-home');
  assert.equal(purchase.effect.money, -44);
  assert.match(purchase.locked, /45코인/);
  life.stats.money = 45;
  year(room, {}, () => 'buy-home');
  assert.equal(life.path.home.kind, 'own');
  assert.equal(life.stats.money, 1);
  assert.ok(life.stats.joy > 104);
  while (life.age < 54) year(room);
  life.stats.money = 18;
  year(room, {}, () => 'move-home');
  assert.equal(life.path.home.at, 54);
  assert.equal(life.stats.money, 1);
});

test('운동 효과는 선택한 해 다음부터 3년간 한 번씩 쌓인다', () => {
  const room = classroom({ 운동: 'female' }, { age: 24 });
  const { life } = room.players[0];
  while (!optionAt(room, '운동', 'routine') && life.age < 33) year(room);
  const at = life.age;
  const routine = optionAt(room, '운동', 'routine');
  assert.deepEqual(routine.recurring.starts[0], { id: 'habit-exercise', label: '꾸준한 운동', years: 3, effect: { health: 2 } });
  assert.equal(life.path.habit, null);
  const healthBefore = life.stats.health;
  year(room, {}, () => 'routine');
  assert.equal(life.stats.health, healthBefore + routine.effect.health);
  for (const years of [3, 2, 1]) {
    const view = extras(room, '운동');
    assert.equal(view.scene.yearly.find(({ id }) => id === 'habit-exercise').years, years);
    const health = life.stats.health;
    const rest = view.scene.choices.find(({ id }) => id === 'rest');
    year(room);
    assert.ok(life.stats.health >= health + rest.effect.health + 2);
  }
  assert.equal(life.age, at + 4);
  assert.equal(life.path.habit, null);
  assert.ok(!me(room, '운동').scene.yearly.some(({ id }) => id === 'habit-exercise'));
});

test('연봉과 월세를 따로 표시하고 집을 사면 다음 해 월세가 끝난다', () => {
  const room = classroom({ 학생: 'female' }, { age: 19 });
  const { life } = room.players[0];
  life.stats.learning = 25;
  pick(room, '학생', 'education', 'rest');
  assert.deepEqual(optionAt(room, '학생', 'work-staff').recurring.starts[0].effect, { money: 3 });
  year(room, { 학생: { career: 'work-staff' } });
  life.age = 28;
  life.stats.money = 100;
  const rent = optionAt(room, '학생', 'rent-room');
  assert.equal(rent.effect.money, -8);
  assert.deepEqual(rent.recurring.starts[0].effect, { money: -2 });
  year(room, {}, () => 'rent-room');
  assert.equal(life.stats.money, 95);
  assert.equal(me(room, '학생').scene.base.money, 1);
  assert.deepEqual(me(room, '학생').scene.yearly.map(({ id }) => id), ['job-staff', 'rent']);
  life.age = 33;
  assert.deepEqual(optionAt(room, '학생', 'buy-home').recurring.stops, ['월세']);
  year(room, {}, () => 'buy-home');
  assert.equal(life.stats.money, 16);
  assert.equal(me(room, '학생').scene.base.money, careerPay(life).total);
  assert.equal(me(room, '학생').latest.raise?.to ?? careerPay(life).total, careerPay(life).total);
});

test('결혼한 뒤에만 아이를 맞이하고 자녀가 자랄 때까지 돌봄이 이어진다', () => {
  const room = classroom({ 미혼: 'female', 부부: 'female' }, { age: 29 });
  for (const { life } of room.players) {
    life.path.partner = 24;
    life.path.romance = { name: '철수', career: 'staff', ageOffset: 0, metAge: 24, affection: 75 };
    life.stats.money = 100;
  }
  extras(room, '부부', { dating: 'date-walk' });
  extras(room, '미혼', { dating: 'date-walk' });
  assert.ok(optionAt(room, '부부', 'marry').recurring.starts.some(({ id }) => id === 'spouse-income'));
  year(room, {}, (_, id) => id === '부부' ? 'marry' : 'keep-dating');
  year(room);
  assert.equal(me(room, '미혼').life.path.married, null);
  assert.equal(optionAt(room, '미혼', 'have-child'), undefined);
  extras(room, '미혼', { dating: 'date-walk' });
  assert.throws(() => pick(room, '미혼', 'year', 'have-child'), /선택을 할 수 없어요/);
  assert.equal(optionAt(room, '부부', 'have-child').recurring.starts[0].effect.money, -2);
  year(room, {}, (_, id) => id === '부부' ? 'have-child' : undefined);
  assert.deepEqual(me(room, '부부').life.path.children, [31]);
  assert.equal(me(room, '부부').scene.base.bond, 2);
  assert.ok(me(room, '부부').scene.yearly.some(({ id }) => id === 'spouse-income'));
  assert.ok(me(room, '부부').scene.yearly.some(({ id }) => id === 'household'));
  assert.ok(me(room, '부부').scene.yearly.some(({ id }) => id === 'child-0'));
  room.players[1].life.age = 50;
  assert.ok(!me(room, '부부').scene.yearly.some(({ id }) => id === 'child-0'));
});

test('현재 방의 정상 선택과 지난 가족 기록을 유지하고 미혼 출산 제출만 다시 받는다', () => {
  const room = classroom({ 한명: 'female', 두명: 'female' }, { age: 34 });
  const [first, second] = room.players;
  first.life.path.partner = 24;
  first.life.path.children = [31];
  first.choice = 'have-child';
  second.choice = 'rest';
  room.rules = 4;
  const turn = { ...room.turn };
  assert.equal(updateRoomRules(room, 2_000), true);
  assert.deepEqual(room.turn, turn);
  assert.equal(first.choice, null);
  assert.equal(second.choice, 'rest');
  assert.deepEqual(first.life.path.children, [31]);
});

test('예전 방을 열면 기록과 학년을 보존하고 한 해 선택을 다시 연다', () => {
  const room = classroom({ 학생: 'male' }, { age: 21, settings: { pace: 'auto', seconds: 20 } });
  const [player] = room.players;
  player.life.path.program = { kind: 'university', field: 'science', until: 25 };
  player.life.path.service = { status: 'serving', until: 22 };
  player.life.history.push({ title: '지난해', year: 1 });
  player.life.stats.money = 0;
  player.choice = 'old-choice';
  room.rules = 2;
  room.settings.years = 5;
  room.turn.to = 5;
  room.phase = 'review';
  room.paused = true;
  assert.equal(updateRoomRules(room, 2_000), true);
  assert.equal(room.phase, 'play');
  assert.equal(room.turn.number, 2);
  assert.equal(room.turn.to, 1);
  assert.equal(room.turn.deadline, null);
  assert.equal(room.turn.remaining, 20_000);
  assert.equal(player.choice, null);
  assert.equal(player.life.path.program.remaining, 3);
  assert.equal(player.life.stats.money, 1);
  assert.deepEqual(player.life.history, [{ title: '지난해', year: 1 }]);
  assert.equal(updateRoomRules(room, 3_000), false);
});
