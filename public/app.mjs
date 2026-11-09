import { addPlayer, DEFAULTS, newRoom, profileFor, selectChoice, stateFor, teacherAction, tick } from './game.mjs';
import { deltaText, escapeHtml as h, icon } from './ui.mjs';
import { choiceFeedbackView, gameMenuView, homeView, profileView, roomView, settingsFields, sexFields, topView } from './views.mjs';

const top = document.querySelector('#top');
const main = document.querySelector('#main');
const dialog = document.querySelector('#dialog');
const toast = document.querySelector('#toast');
const feedback = document.querySelector('#choice-feedback');
const storedSession = '100nyeon.session';
const lastKey = (role) => `100nyeon.last.${role}`;
const playSections = ['.notice', '.room-hero', '.play-stats', '.play-navigation', '.story-panel'];

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
let feedbackMarkup = '';
let mainMarkup = '';
let playMarkup = new Map();

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

function updateMain(markup) {
  if (markup === mainMarkup) return;
  const template = document.createElement('template');
  template.innerHTML = markup;
  const current = main.firstElementChild;
  const next = template.content.firstElementChild;
  const sections = next?.classList.contains('playing-room')
    ? playSections.map((selector) => [selector, next.querySelector(selector)]) : [];
  const nextMarkup = new Map(sections.map(([selector, node]) => [selector, node?.outerHTML]));
  if (current?.classList.contains('playing-room') && sections.length) {
    for (const [selector, node] of sections) {
      if (nextMarkup.get(selector) === playMarkup.get(selector)) continue;
      const old = current.querySelector(selector);
      if (old && node) old.replaceWith(node);
      else if (old) old.remove();
      else if (node) current.prepend(node);
    }
  } else {
    main.replaceChildren(template.content);
  }
  mainMarkup = markup;
  playMarkup = nextMarkup;
}

function render() {
  const key = state ? `${session.role}-${state.phase === 'lobby' ? 'lobby' : 'game'}` : 'home';
  if (key !== headerKey) {
    top.innerHTML = topView(session, state);
    headerKey = key;
  }
  const active = document.activeElement;
  const focused = active?.dataset.focus;
  const openedResult = main.querySelector('.latest[open]')?.dataset.result;
  const showYearly = main.querySelector('.year-effects[open]');
  const oldStory = main.querySelector('[data-story-key]');
  const oldStoryKey = oldStory?.dataset.storyKey;
  const openSections = new Set(Array.from(oldStory?.querySelectorAll('[data-choice-section][open]') ?? [],
    (section) => section.dataset.choiceSection));
  const storyScroll = oldStory?.scrollTop ?? 0;
  const mainScroll = main.scrollTop;
  updateMain(state ? roomView(session, state, { pane, rank, offline }) :
    homeView(invitedCode, selectedAvatar, { player: read(localStorage, lastKey('player')), host: read(localStorage, lastKey('host')) }));
  const nextFeedback = pane === 'play' ? choiceFeedbackView(state) : '';
  if (nextFeedback !== feedbackMarkup) {
    feedbackMarkup = nextFeedback;
    feedback.innerHTML = nextFeedback;
  }
  const nextResult = main.querySelector('details.latest');
  if (nextResult && nextResult.dataset.result === openedResult) nextResult.open = true;
  const nextYearly = main.querySelector('details.year-effects');
  if (nextYearly && showYearly) nextYearly.open = true;
  const newStory = main.querySelector('[data-story-key]');
  if (oldStoryKey && newStory?.dataset.storyKey === oldStoryKey) {
    if (newStory !== oldStory) {
      for (const section of newStory.querySelectorAll('[data-choice-section]')) {
        if (openSections.has(section.dataset.choiceSection)) section.open = true;
      }
      newStory.scrollTop = storyScroll;
    }
    if (main.scrollTop !== mainScroll) main.scrollTop = mainScroll;
  }
  if (focused && !main.contains(active)) main.querySelector(`[data-focus="${CSS.escape(focused)}"]`)?.focus({ preventScroll: true });
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

function highlightStats(before, after) {
  if (!before || !after || before.generation !== after.generation) return;
  for (const tile of main.querySelectorAll('.play-stats [data-stat]')) {
    const stat = tile.dataset.stat;
    const delta = stat === 'affection'
      ? (after.path?.romance?.affection ?? 0) - (before.path?.romance?.affection ?? 0)
      : after.stats[stat] - before.stats[stat];
    if (!delta) continue;
    const badge = document.createElement('span');
    badge.className = 'stat-pop';
    badge.textContent = deltaText(delta);
    badge.setAttribute('aria-hidden', 'true');
    tile.dataset.change = delta > 0 ? 'gain' : 'loss';
    tile.append(badge);
    setTimeout(() => {
      badge.remove();
      delete tile.dataset.change;
    }, 1250);
  }
}

function accept(next, expected = session) {
  if (!next || expected !== session || (state && next.revision < state.revision)) return;
  const beforeLife = state?.me?.life;
  const memory = next.me?.latest;
  const previous = state?.me?.latest;
  const newMemory = state && ['spirit', 'child'].includes(memory?.type) &&
    (memory.year !== previous?.year || memory.title !== previous?.title);
  const newChoice = state?.me?.scene && next.me?.scene &&
    (state.turn.number !== next.turn.number || state.me.scene.key !== next.me.scene.key);
  const played = document.activeElement?.dataset.action === 'choose';
  clockOffset = next.serverNow - Date.now();
  state = next;
  offline = false;
  render();
  highlightStats(beforeLife, next.me?.life);
  if (newChoice && pane === 'play' && !dialog.open && !next.paused) {
    const story = main.querySelector('.story-panel');
    if (story) {
      const offset = story.getBoundingClientRect().top - main.getBoundingClientRect().top;
      if (offset < 0) main.scrollBy({ top: offset, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
    if (played) story?.querySelector('h2')?.focus({ preventScroll: true });
  }
  if (newMemory) modal(memory.title, `<p class="memory-text">${h(memory.text)}</p>
    <button type="button" class="button primary full" data-action="close">이야기 닫기</button>`, 'memory-dialog');
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
  main.scrollTop = 0;
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
  else dialog.querySelector('.dialog-header button')?.focus({ preventScroll: true });
}

function formModal(creating, pinRequired) {
  const started = !creating && state.phase !== 'lobby';
  modal(creating ? '교사 방 만들기' : '진행 설정', `<form id="settings-form" data-creating="${creating}">
    ${settingsFields(creating ? DEFAULTS : state.settings, { creating, started, pinRequired })}
    <button type="submit" class="button primary full">${icon(creating ? 'arrow' : 'check')} ${creating ? '방 만들기' : '설정 저장'}</button>
  </form>`);
}

function openTeacherForm() {
  modal('코드로 교사 방 열기', `<form id="host-form">
    <label>참가 코드<input name="code" type="text" required minlength="6" maxlength="6" autocomplete="off" autocapitalize="characters"></label>
    <label>이 방의 교사 비밀번호<input name="roomPassword" type="password" required minlength="4" maxlength="32" autocomplete="current-password"></label>
    <p class="field-note">이 기기에서 교사 진행실을 이어 열어요.</p>
    <button type="submit" class="button primary full">교사 방 열기</button>
  </form>`);
}

function confirmation(title, text, action, id = '') {
  modal(title, `<p class="subtle">${h(text)}</p><div class="actions">
    <button type="button" class="button secondary" data-action="close">돌아가기</button>
    <button type="button" class="button dark" data-action="${action}" data-id="${h(id)}">${h(title)}</button></div>`);
}

function gameMenu(page) {
  modal(state && state.phase !== 'lobby' ? '게임 메뉴' : '게임 안내', gameMenuView(page, state?.me?.life), 'game-menu-dialog');
  dialog.scrollTop = 0;
  dialog.querySelector('.menu-tabs [aria-pressed="true"]')?.focus({ preventScroll: true });
}

function share() {
  const url = new URL('/', location.href);
  url.searchParams.set('room', state.code);
  const qrUrl = '/api/invite.svg?' + new URLSearchParams({ room: state.code, origin: url.origin });
  modal('우리 반 초대장', `${session.role === 'host' ? `<figure class="invite-qr">
      <img src="${h(qrUrl)}" width="320" height="320" alt="우리 반 참가 QR 코드">
      <figcaption>휴대폰 카메라로 찍으면 참가 화면이 열려요.</figcaption>
    </figure>` : ''}
    <div class="code-preview"><div class="eyebrow">6자리 참가 코드</div><strong class="room-code">${state.code}</strong></div>
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
  practice = newRoom({ code: 'DEMO', seed: String(now), name: '혼자 체험', hostKey: null, settings: { pace: 'auto', seconds: 0 }, now });
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
  selectChoice(practice, 'me', { round, scene: state.me.scene.key, choice: id }, now);
  for (const friend of practice.players.slice(1)) {
    while (practice.turn.number === round && !friend.choice) {
      const { scene } = stateFor(practice, friend.id, now).me;
      const options = scene.choices.filter((option) => !option.locked);
      const score = (option) => (option.effect[friend.id] ?? 0) +
        (option.recurring?.starts.reduce((total, effect) => total + (effect.effect[friend.id] ?? 0), 0) ?? 0) * 2;
      const best = options.sort((left, right) => score(right) - score(left))[0];
      const choice = friend.mode === 'fork' ? (friend.id === 'art' ? 'spirit' : 'child-female') : best?.id ?? 'pass';
      selectChoice(practice, friend.id, { round, scene: scene.key, choice }, now);
    }
  }
  updatePractice();
}

function choose(id) {
  return practice ? practiceChoice(id) : sendRoom('choice', { round: state.turn.number, scene: state.me.scene.key, choice: id });
}

document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target || target.disabled) return;
  const { action, id, index } = target.dataset;
  switch (action) {
    case 'home': home(); break;
    case 'help': gameMenu(id); break;
    case 'close': dialog.close(); break;
    case 'share': share(); break;
    case 'copy': void run(copyLink); break;
    case 'create': void run(async () => {
      const info = await api('/api/meta');
      formModal(true, info.hostPinRequired);
    }); break;
    case 'host-reopen': openTeacherForm(); break;
    case 'settings': formModal(false); break;
    case 'resume-host':
    case 'resume-player': void run(() => recover(read(localStorage, lastKey(action.slice(7))))); break;
    case 'avatar':
      selectedAvatar = Number(index);
      for (const item of document.querySelectorAll('.avatar-pick')) item.setAttribute('aria-pressed', String(item === target));
      break;
    case 'practice': practiceSetup(); break;
    case 'pane': pane = id; render(); break;
    case 'rank-filter': rank = id; render(); break;
    case 'profile': void run(() => showProfile(id)); break;
    case 'generation': showGeneration(Number(index)); break;
    case 'choose': void run(() => choose(id)); break;
    case 'successor': modal('다음 세대 고르기', `<form id="successor-form">${sexFields()}
      <button type="submit" class="button primary full">다음 세대로 시작하기</button></form>`); break;
    case 'start':
    case 'advance':
    case 'pause':
    case 'resume': void run(() => teacher(action)); break;
    case 'kick': confirmation('참가자 내보내기', '이 별명으로 접속한 참가자를 대기실에서 내보낼까요?', 'confirm-kick', id); break;
    case 'finish': confirmation('전체 게임 마감', '지금까지의 인생과 순위를 우리 반의 최종 기록으로 남길까요?', 'confirm-finish'); break;
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

document.addEventListener('input', (event) => {
  if (event.target.id !== 'job-search') return;
  const search = event.target.value.trim().toLowerCase();
  let found = false;
  for (const job of dialog.querySelectorAll('.job-guide-entry')) {
    job.hidden = !job.textContent.toLowerCase().includes(search);
    if (!job.hidden) found = true;
  }
  dialog.querySelector('#job-no-match').hidden = found;
});

document.addEventListener('submit', (event) => {
  const form = event.target;
  if (!['join-form', 'settings-form', 'practice-form', 'host-form', 'successor-form'].includes(form.id)) return;
  event.preventDefault();
  void run(async () => {
    if (form.id === 'practice-form') {
      startPractice(form.elements.sex.value);
      return;
    }
    if (form.id === 'successor-form') {
      await choose(`child-${form.elements.sex.value}`);
      return;
    }
    if (form.id === 'host-form') {
      const code = form.elements.code.value.trim().toUpperCase();
      if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) throw Object.assign(new Error('6자리 참가 코드를 확인해 주세요.'), { status: 400 });
      const result = await api(`/api/rooms/${code}/host`, { body: { roomPassword: form.elements.roomPassword.value } });
      activate(result.session, result.state);
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
    const settings = { maxAge: fields.maxAge.valueAsNumber, seconds: fields.seconds?.valueAsNumber ?? 0,
      pace: fields.pace?.value ?? 'personal' };
    if (form.dataset.creating === 'true') {
      const result = await api('/api/rooms', { body: { name: fields.name.value, roomPassword: fields.roomPassword.value, pin: fields.pin?.value, settings } });
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
