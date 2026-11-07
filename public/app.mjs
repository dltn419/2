import { addPlayer, DEFAULTS, newRoom, profileFor, selectChoice, stateFor, teacherAction, tick } from './game.mjs';
import { escapeHtml as h, icon } from './ui.mjs';
import { homeView, profileView, roomView, settingsFields, sexFields, topView } from './views.mjs';

const top = document.querySelector('#top');
const main = document.querySelector('#main');
const dialog = document.querySelector('#dialog');
const toast = document.querySelector('#toast');
const storedSession = '100nyeon.session';
const lastKey = (role) => `100nyeon.last.${role}`;

let invitedCode = new URL(location.href).searchParams.get('room')?.toUpperCase().match(/^[A-HJ-NP-Z2-9]{6}$/)?.[0] ?? '';
let selectedAvatar = 0;
let session = null;
let state = null;
let practice = null;
let profile = null;
let pane = 'play';
let rank = 'joy';
let busy = false;
let polling = false;
let offline = false;
let clockOffset = 0;
let headerKey;
let toastTimer;

function read(storage, key) {
  try {
    return JSON.parse(storage.getItem(key) ?? 'null');
  } catch {
    return null;
  }
}

function write(storage, key, value) {
  try {
    if (value) storage.setItem(key, JSON.stringify(value));
    else storage.removeItem(key);
  } catch {
    // A session remains usable in this tab when browser storage is blocked.
  }
}

function message(text) {
  const modalMessage = dialog.open && dialog.querySelector('.dialog-message');
  if (modalMessage) {
    modalMessage.textContent = text;
    modalMessage.hidden = false;
    return;
  }
  clearTimeout(toastTimer);
  toast.textContent = text;
  toast.hidden = false;
  toastTimer = setTimeout(() => { toast.hidden = true; }, 4000);
}

async function api(path, { body, token } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body) headers['Content-Type'] = 'application/json';
  const response = await fetch(path, {
    headers, method: body ? 'POST' : 'GET', body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(9000), cache: 'no-store',
  });
  if (response.status === 204) {
    const time = Number(response.headers.get('x-game-time'));
    if (time) clockOffset = time - Date.now();
    return null;
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error || '게임 서버에 연결할 수 없어요.');
    error.status = response.status;
    throw error;
  }
  return result;
}

function render() {
  const key = state ? session.role : 'home';
  if (key !== headerKey) {
    top.innerHTML = topView(session, state);
    headerKey = key;
  }
  const focused = document.activeElement?.dataset.focus;
  main.innerHTML = state ? roomView(session, state, { pane, rank, offline }) :
    homeView(invitedCode, selectedAvatar, { player: read(localStorage, lastKey('player')), host: read(localStorage, lastKey('host')) });
  if (focused) main.querySelector(`[data-focus="${CSS.escape(focused)}"]`)?.focus({ preventScroll: true });
  updateClock();
}

function updateClock() {
  if (!state?.turn) return;
  const { deadline } = state.turn;
  const seconds = deadline ? Math.max(0, Math.ceil((deadline - Date.now() - clockOffset) / 1000)) : null;
  const label = state.paused ? '일시정지' : state.phase === 'ended' ? '마감' :
    seconds === null ? '시간 제한 없음' : `${seconds}초`;
  for (const clock of main.querySelectorAll('[data-clock]')) {
    const number = clock.querySelector('b');
    if (number.textContent !== label) number.textContent = label;
    clock.classList.toggle('urgent', seconds !== null && seconds <= 5 && state.phase === 'play');
  }
}

function accept(next, expected = session) {
  if (!next || expected !== session || (state && next.revision < state.revision)) return;
  clockOffset = next.serverNow - Date.now();
  state = next;
  offline = false;
  render();
}

function activate(nextSession, nextState) {
  session = nextSession;
  state = null;
  pane = 'play';
  rank = 'joy';
  if (session.role !== 'demo') {
    write(sessionStorage, storedSession, session);
    write(localStorage, lastKey(session.role), session);
  }
  if (dialog.open) dialog.close();
  accept(nextState);
  window.scrollTo(0, 0);
  main.focus({ preventScroll: true });
}

function home() {
  session = null;
  state = null;
  practice = null;
  offline = false;
  write(sessionStorage, storedSession, null);
  if (dialog.open) dialog.close();
  render();
  window.scrollTo(0, 0);
  main.focus({ preventScroll: true });
}

function expire(oldSession, error) {
  const previous = read(localStorage, lastKey(oldSession.role));
  if (previous?.token === oldSession.token) write(localStorage, lastKey(oldSession.role), null);
  if (session?.token === oldSession.token) home();
  message(error.message);
}

async function recover(saved) {
  try {
    const next = await api(`/api/rooms/${saved.code}`, { token: saved.token });
    activate(saved, next);
  } catch (error) {
    if ([401, 404].includes(error.status)) expire(saved, error);
    else message(error.status ? error.message : '서버에 연결하면 이어 할 수 있어요.');
  }
}

async function poll() {
  if (!session || document.hidden || polling) return;
  if (session.role === 'demo') {
    if (tick(practice, Date.now())) updatePractice();
    return;
  }
  polling = true;
  const current = session;
  try {
    const next = await api(`/api/rooms/${current.code}?since=${state.revision}`, { token: current.token });
    if (current !== session) return;
    if (next) accept(next, current);
    else if (offline) {
      offline = false;
      render();
    }
  } catch (error) {
    if (current !== session) return;
    if ([401, 404].includes(error.status)) expire(current, error);
    else if (!offline) {
      offline = true;
      render();
    }
  } finally {
    polling = false;
  }
}

async function run(work) {
  if (busy) return;
  busy = true;
  try {
    await work();
  } catch (error) {
    message(error.status ? error.message : '잠시 후 다시 시도해 주세요.');
    if (error.status === 409) void poll();
  } finally {
    busy = false;
  }
}

function modal(title, markup, kind = '') {
  dialog.className = kind;
  dialog.innerHTML = `<div class="dialog-body"><div class="dialog-header"><h2 id="dialog-title">${h(title)}</h2>
    <button type="button" class="icon-button" data-action="close" aria-label="닫기">${icon('close')}</button></div>
    <p class="dialog-message" role="status" hidden></p>${markup}</div>`;
  if (!dialog.open) dialog.showModal();
}

function formModal(creating, pinRequired) {
  const started = !creating && state.phase !== 'lobby';
  modal(creating ? '교사 방 만들기' : '진행 설정', `<form id="settings-form" data-creating="${creating}">
    ${settingsFields(creating ? DEFAULTS : state.settings, { creating, started, pinRequired })}
    <button type="submit" class="button primary full">${icon(creating ? 'arrow' : 'check')} ${creating ? '방 만들기' : '설정 저장'}</button>
  </form>`);
}

function confirmation(title, text, action, id = '') {
  modal(title, `<p class="subtle">${h(text)}</p><div class="actions">
    <button type="button" class="button secondary" data-action="close">돌아가기</button>
    <button type="button" class="button dark" data-action="${action}" data-id="${h(id)}">${h(title)}</button></div>`);
}

function help() {
  modal('100년 플레이 안내', `<ol class="help-list">
    <li><b>태어날 캐릭터를 골라요.</b><p>교사가 방을 만들면 학생은 6자리 코드, 별명, 캐릭터 성별로 참가해요. 한 방에 최대 20명이 함께할 수 있어요.</p></li>
    <li><b>해마다 한 번 골라요.</b><p>한 턴에 1년이 지나요. 학교에서 적은 장래희망은 전공과 일자리에 영향을 줘요. 진학과 일, 관계는 나이와 지나온 선택에 맞춰 나타나요. 병역은 남자 캐릭터의 청년기 이야기에서 만나요.</p></li>
    <li><b>새 세대를 만나거나 기억을 돌아봐요.</b><p>목표 나이에 이르거나 노년기에 체력이 다하면 한 삶의 기록을 덮어요. 다음 세대의 19살부터 이어가거나 영혼으로 남아 가족의 꿈과 기억이 있는 곳에 들를 수 있어요.</p></li>
    <li><b>친구들의 기록을 읽어요.</b><p>친구들 메뉴에서 서로 다른 삶을 보고, 순위에서 자금·행복·장수 등 여러 분야를 비교해요. 선생님이 반의 마지막 장을 정해요.</p></li>
  </ol>`);
}

function share() {
  const url = new URL('/', location.href);
  url.searchParams.set('room', state.code);
  modal('우리 반 초대장', `<div class="code-preview"><div class="eyebrow">6자리 참가 코드</div><strong class="room-code">${state.code}</strong></div>
    <label>참가 링크<input id="invite-link" type="text" readonly value="${h(url.href)}"></label>
    <button type="button" class="button primary full" data-action="copy">${icon('copy')} 링크 복사</button>`);
}

async function copyLink() {
  const input = document.querySelector('#invite-link');
  let copied = false;
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(input.value);
      copied = true;
    }
  } catch {
    // The local-network URL may not provide the Clipboard API.
  }
  if (!copied) {
    input.focus();
    input.select();
    copied = document.execCommand('copy');
  }
  message(copied ? '초대 링크를 복사했어요.' : '초대 링크를 선택했어요. 복사해서 보내 주세요.');
}

async function sendRoom(action, body) {
  const current = session;
  const result = await api(`/api/rooms/${current.code}/${action}`, { token: current.token, body });
  accept(result, current);
}

async function teacher(action, extra = {}) {
  await sendRoom('teacher', { action, phase: state.phase, round: state.turn?.number, ...extra });
}

async function showProfile(id) {
  const current = session;
  const result = practice ? profileFor(practice, id) : await api(`/api/rooms/${current.code}/profile/${id}`, { token: current.token });
  if (current !== session) return;
  profile = result;
  showGeneration(result.lives.length - 1);
}

function showGeneration(index) {
  modal('인생 기록장', profileView(profile, index), 'profile-dialog');
  dialog.scrollTop = 0;
  dialog.querySelector('[aria-pressed="true"]')?.focus({ preventScroll: true });
}

function practiceSetup() {
  modal('태어날 캐릭터 고르기', `<form id="practice-form">
    ${sexFields()}
    <button class="button primary full" type="submit">${icon('sprout')} 태어나기</button>
  </form>`);
}

function startPractice(sex) {
  const now = Date.now();
  practice = newRoom({ code: 'DEMO', seed: 'a-sunny-village', name: '혼자 체험', hostKey: null, settings: { seconds: 0 }, now });
  addPlayer(practice, { id: 'me', name: '나', avatar: selectedAvatar, sex });
  addPlayer(practice, { id: 'art', name: '노을', avatar: 3, sex: 'female' });
  addPlayer(practice, { id: 'money', name: '마루', avatar: 4, sex: 'male' });
  addPlayer(practice, { id: 'bond', name: '초록', avatar: 1, sex: 'female' });
  teacherAction(practice, 'start', {}, now);
  activate({ role: 'demo' }, stateFor(practice, 'me', now));
}

function updatePractice() {
  practice.revision += 1;
  accept(stateFor(practice, 'me'));
}

function practiceChoice(id) {
  const now = Date.now();
  const round = practice.turn.number;
  selectChoice(practice, 'me', { round, choice: id }, now);
  for (const friend of practice.players.slice(1)) {
    const { scene } = stateFor(practice, friend.id, now).me;
    const options = scene.choices.filter((option) => !option.locked);
    const pick = options.sort((left, right) => (right.effect[friend.id] ?? 0) - (left.effect[friend.id] ?? 0))[0];
    const choice = friend.mode === 'fork' && friend.id === 'art' ? 'spirit' : pick.id;
    selectChoice(practice, friend.id, { round, choice }, now);
  }
  updatePractice();
}

document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target || target.disabled) return;
  const { action, id, index } = target.dataset;
  switch (action) {
    case 'home': home(); break;
    case 'help': help(); break;
    case 'close': dialog.close(); break;
    case 'share': share(); break;
    case 'copy': void run(copyLink); break;
    case 'create': void run(async () => {
      const info = await api('/api/meta');
      formModal(true, info.hostPinRequired);
    }); break;
    case 'settings': formModal(false); break;
    case 'resume-host':
    case 'resume-player': void run(() => recover(read(localStorage, lastKey(action.slice(7))))); break;
    case 'avatar':
      selectedAvatar = Number(index);
      for (const item of document.querySelectorAll('.avatar-pick')) item.setAttribute('aria-pressed', String(item === target));
      break;
    case 'practice': practiceSetup(); break;
    case 'practice-next':
      teacherAction(practice, 'advance', { round: practice.turn.number, phase: 'review' }, Date.now());
      updatePractice();
      break;
    case 'pane': pane = id; render(); break;
    case 'rank-filter': rank = id; render(); break;
    case 'profile': void run(() => showProfile(id)); break;
    case 'generation': showGeneration(Number(index)); break;
    case 'choose': void run(() => practice ? practiceChoice(id) : sendRoom('choice', { round: state.turn.number, choice: id })); break;
    case 'start':
    case 'advance':
    case 'pause':
    case 'resume': void run(() => teacher(action)); break;
    case 'kick': confirmation('참가자 내보내기', '이 별명으로 접속한 참가자를 대기실에서 내보낼까요?', 'confirm-kick', id); break;
    case 'finish': confirmation('전체 게임 마감', '지금까지 마감한 턴을 우리 반의 최종 기록으로 남길까요?', 'confirm-finish'); break;
    case 'confirm-kick':
    case 'confirm-finish': void run(async () => {
      await teacher(action.slice(8), { playerId: id });
      dialog.close();
    }); break;
  }
});

document.addEventListener('change', (event) => {
  if (event.target.matches('#settings-form [name="pace"]')) {
    event.target.form.elements.seconds.disabled = event.target.value === 'manual';
  }
});

document.addEventListener('submit', (event) => {
  const form = event.target;
  if (!['join-form', 'settings-form', 'practice-form'].includes(form.id)) return;
  event.preventDefault();
  void run(async () => {
    if (form.id === 'practice-form') {
      startPractice(form.elements.sex.value);
      return;
    }
    if (form.id === 'join-form') {
      const code = form.elements.code.value.trim().toUpperCase();
      if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) {
        message('6자리 참가 코드를 확인해 주세요.');
        return;
      }
      const result = await api(`/api/rooms/${code}/join`, { body: { name: form.elements.nickname.value, avatar: selectedAvatar, sex: form.elements.sex.value } });
      activate(result.session, result.state);
      return;
    }
    const fields = form.elements;
    const settings = { maxAge: fields.maxAge.valueAsNumber, seconds: fields.seconds.valueAsNumber, pace: fields.pace.value };
    if (form.dataset.creating === 'true') {
      const result = await api('/api/rooms', { body: { name: fields.name.value, pin: fields.pin?.value, settings } });
      activate(result.session, result.state);
    } else {
      await teacher('settings', { settings });
      dialog.close();
      message('방 설정을 저장했어요.');
    }
  });
});

dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});
document.addEventListener('visibilitychange', () => void poll());

render();
const saved = read(sessionStorage, storedSession);
if (saved && (!invitedCode || invitedCode === saved.code)) void run(() => recover(saved));
else if (invitedCode) document.querySelector('#join').scrollIntoView();
setInterval(updateClock, 250);
setInterval(() => void poll(), 1200);
