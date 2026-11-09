import { AVATARS, CAREERS, STAGES, STATS } from './content.mjs';
import { CAPACITY, MODES, PASS, RANKS, stageAt } from './game.mjs';
import { SEXES, lifeBadges, pathNotes, pathOf } from './life.mjs';
import { avatar, changes, escapeHtml as h, icon, numeral, statGrid } from './ui.mjs';

const rankInfo = { ...STATS, age: { label: '장수', mark: 'clock', color: 'mint', unit: '살' } };
const stageNames = STAGES.map((stage) => `<li>${stage.label}</li>`).join('');
const lifeCaption = (player) => `${player.age}살 · ${CAREERS[player.career]?.title ?? '직업 없음'}`;
const button = (action, label, mark, type = 'secondary', extra = '') =>
  `<button type="button" class="button ${type}" data-action="${action}" ${extra}>${mark ? icon(mark) : ''}<span>${label}</span></button>`;

export function topView(session, state) {
  const teacher = session?.role === 'host';
  const tag = session?.role === 'demo' ? '혼자 체험' : teacher ? '교사 진행실' : '교실 인생 게임';
  return `<div class="shell topbar">
    <button class="brand" type="button" data-action="home" aria-label="100년 홈"><img src="/art/icon.svg" alt="" width="36" height="36"><span>100년<small>우리들의 인생 기록장</small></span></button>
    <div class="top-actions">
      <span class="top-tag"><i></i>${tag}</span>
      ${session && session.role !== 'demo' && state ? button('share', teacher ? '초대 QR' : '초대 링크', teacher ? 'qr' : 'link', 'quiet') : ''}
      ${button('help', '게임 안내', 'book', 'quiet')}
    </div>
  </div>`;
}

export function sexFields() {
  return `<fieldset class="sex-picker"><legend>캐릭터 성별</legend><div>${Object.entries(SEXES).map(([sex, label]) =>
    `<label><input type="radio" name="sex" value="${sex}" required> ${avatar(0, 'alive', sex)} ${label}</label>`).join('')}</div></fieldset>`;
}

export function homeView(code, selected, saved) {
  const classroom = AVATARS.map((item, index) => avatar(index)).join('');
  return `<div class="shell home">
    <section class="home-hero">
      <div class="hero-copy">
        <div class="eyebrow">${icon('sprout')} <span>CLASSROOM LIFE SIM</span></div>
        <h1>같은 마을,<br>다른 <em>인생.</em></h1>
        <p>태어나고, 배우고, 살아가며 한 권의 기록을 써요.<br class="wide-only"> 친구들과 한 마을에서 각자의 이야기를 만들어 보세요.</p>
        <div class="hero-actions">
          <a class="button primary" href="#join">${icon('down')} 학생 참가</a>
          ${button('practice', '혼자 체험', 'play')}
        </div>
      </div>
      <figure class="world-card">
        <div class="world-top"><span><i></i> 100년 마을</span><span>MAP 01</span></div>
        <img src="/art/village.svg" alt="오렌지색 지붕의 집과 친구들이 있는 햇살 밝은 도트 마을" width="384" height="218" fetchpriority="high">
        <figcaption><span>${icon('sun')} 오늘도 맑음</span><span>이야기가 시작되는 곳</span></figcaption>
      </figure>
    </section>
    <div class="chapter-road"><span>인생의 여정</span><ol>${stageNames}<li>그다음 이야기</li></ol></div>
    <section class="entry-grid" aria-label="게임 시작">
      <article id="join" class="panel entry-panel">
        <div class="entry-top"><span class="tile-icon mint">${icon('users')}</span><span class="eyebrow">01 / 학생</span></div>
        <h2>친구들과 시작하기</h2>
        <p class="subtle">${code ? '초대받은 방의 코드가 들어 있어요. 별명을 골라 참가하세요.' : '선생님에게 받은 6자리 코드로 같은 방에 들어가요.'}</p>
        <form id="join-form">
          <div class="join-fields">
            <label>참가 코드<input name="code" type="text" placeholder="예  ABC234" value="${h(code)}" required minlength="6" maxlength="6" autocomplete="off" autocapitalize="characters" spellcheck="false"></label>
            <label>별명<input name="nickname" type="text" placeholder="게임에서 쓸 별명" required maxlength="14" autocomplete="off"></label>
          </div>
          ${sexFields()}
          <fieldset class="avatars"><legend>캐릭터</legend><div>${AVATARS.map((item, index) =>
            `<button class="avatar-pick" type="button" data-action="avatar" data-index="${index}" aria-label="${item.name} 캐릭터" title="${item.name}" aria-pressed="${index === selected}">${avatar(index)}</button>`).join('')}</div></fieldset>
          <button class="button primary" type="submit">방에 들어가기 ${icon('arrow')}</button>
        </form>
        ${saved.player ? button('resume-player', '지난 인생 이어 하기', 'book', 'quiet') : ''}
      </article>
      <article class="panel entry-panel teacher-entry">
        <div class="entry-top"><span class="tile-icon amber">${icon('board')}</span><span class="eyebrow">02 / 교사</span></div>
        <h2>우리 반 방 만들기</h2>
        <p class="subtle">최대 20명. 같은 마을에서 각자의 속도로 살아가요.</p>
        <div class="chalkboard" aria-hidden="true"><div>우리 반 시간표<span>01 — 100</span></div><div class="classroom">${classroom}</div></div>
        ${button('create', '교사 방 만들기', 'arrow', 'dark')}
        ${button('host-reopen', '코드로 교사 방 열기', 'lock', 'quiet')}
        ${saved.host ? button('resume-host', '지난 진행실 열기', 'clock', 'quiet') : ''}
      </article>
    </section>
  </div>`;
}

export function settingsFields(settings, { creating = false, started = false, pinRequired = false } = {}) {
  const { maxAge, seconds, pace } = settings;
  const personal = pace === 'personal';
  return `
    ${creating ? '<label>방 이름<input name="name" maxlength="30" value="우리 반 100년" required autocomplete="off"></label>' : ''}
    <div class="form-grid">
      <label>한 삶의 최대 나이<input name="maxAge" type="number" min="80" max="110" value="${maxAge}" required ${started ? 'disabled' : ''}></label>
      ${personal ? '' : `<label>진행 방식<select name="pace">
        <option value="auto" ${pace === 'auto' ? 'selected' : ''}>자동 진행</option>
        <option value="manual" ${pace === 'manual' ? 'selected' : ''}>교사가 넘기기</option>
      </select></label>
      <label>선택 시간 (초)<input name="seconds" type="number" min="0" max="180" value="${seconds}" required ${pace === 'manual' ? 'disabled' : ''}></label>`}
    </div>
    <p class="field-note">${personal ? '학생마다 고르는 즉시 자기 인생의 다음 해가 열려요.' :
      '전원이 고르거나 시간이 끝나면 바로 다음 해가 열려요. 0초로 두면 전원이 고를 때까지 기다려요.'}</p>
    ${creating ? '<label>이 방의 교사 비밀번호<input name="roomPassword" type="password" required minlength="4" maxlength="32" autocomplete="new-password" placeholder="4~32자로 새로 정해요"></label><p class="field-note">다른 기기에서 이 방을 이어 열 때 써요. 학생은 참가 코드와 별명으로 들어와요.</p>' : ''}
    ${pinRequired ? '<label>서버 방 열기 암호<input name="pin" type="password" required autocomplete="current-password"></label>' : ''}
  `;
}

function phaseLabel(state) {
  if (state.paused) return '일시정지';
  return { lobby: '입장 중', play: '선택 중', ended: '이야기 마감' }[state.phase];
}

function lifeStage(life, stage) {
  if (life.age < 3) return '아기 시절';
  if (life.age >= 7 && life.age <= 12) return '초등학교';
  if (life.age >= 13 && life.age <= 15) return '중학교';
  if (life.age >= 16 && life.age <= 18) return pathOf(life).school === 'outside' ? '학교 밖에서 배우기' : '고등학교';
  return stage.label;
}

function villageCast(me) {
  const path = pathOf(me.life);
  const member = (label, image, role) =>
    `<span class="village-person ${role}">${image}<span class="village-person-label">${h(label)}</span></span>`;
  const family = [member('나', avatar(me.avatar, me.mode, path.sex), 'village-self')];
  const spouse = path.sex === 'female' ? 'male' : 'female';
  if (path.married !== null) family.push(member('배우자', avatar((me.avatar + 3) % AVATARS.length, 'alive', spouse), 'village-spouse'));
  for (const [index, born] of path.children.entries()) {
    const age = Math.max(0, me.age - born);
    const label = `${index === 0 ? '첫째' : '둘째'} · ${age}살`;
    const role = age < 7 ? 'village-young' : age < 19 ? 'village-child' : 'village-grown';
    const sex = (born + index + me.avatar) % 2 ? 'female' : 'male';
    family.push(member(label, avatar((me.avatar + 1 + 3 * index) % AVATARS.length, 'alive', sex), role));
  }
  return `<div class="village-cast" role="group" aria-label="${family.length > 1 ? '마을의 나와 가족' : '마을의 내 캐릭터'}">${family.join('')}</div>`;
}

function roomHero(session, state) {
  const teacher = session.role === 'host';
  const me = state.me;
  const stage = me && STAGES[stageAt(me.age)];
  const title = teacher ? '교사 진행실' : state.phase === 'lobby' ? '첫해를 기다리는 중' : `${h(me.name)}의 인생`;
  const sub = teacher ? h(state.name) : state.phase === 'lobby' ? h(state.name) :
    me.mode === 'alive' ? lifeStage(me.life, stage) : MODES[me.mode];
  const heroTone = me?.mode === 'spirit' ? 'spirit-hero' : '';
  const yearLabel = state.phase === 'lobby' ? '새 이야기' :
    state.settings.pace === 'personal' ? me ? `${me.age}살의 마을` : '각자 진행' : `마을 ${state.year}년차`;
  return `<section class="room-hero ${teacher ? '' : 'player-hero'} ${heroTone}">
    <div class="room-hero-main">
      <div class="eyebrow"><i class="status-dot"></i> ${session.role === 'demo' ? '혼자 체험' : `ROOM ${state.code}`} <span class="sep">/</span> ${phaseLabel(state)}</div>
      <div class="room-title">${teacher ? `<span class="tile-icon mint">${icon('board')}</span>` : ''}
        <div><h1>${title}</h1><p>${sub}</p></div>
      </div>
      ${teacher || state.phase === 'lobby' ? '' : `<div class="life-chips"><span>${me.generation}대</span><span>${me.age}살</span>${lifeBadges(me.life).map((badge) => `<span>${h(badge)}</span>`).join('')}</div>`}
    </div>
    <div class="room-hero-art"><img src="/art/village.svg" alt="" width="384" height="218">
      <span class="village-year">${icon('sun')} ${yearLabel}</span>
      ${teacher ? '' : villageCast(me)}
    </div>
  </section>`;
}

function roster(players, { teacher = false, lobby = false, meId } = {}) {
  if (!players.length) return `<div class="empty">${icon('users')}<strong>아직 참가자가 없어요</strong><span>참가 코드나 초대 링크를 친구들에게 알려 주세요.</span></div>`;
  return `<div class="roster">${players.map((player) => `<article class="person">
    <button type="button" class="person-main" data-action="profile" data-id="${player.id}" data-focus="profile-${player.id}">
      ${avatar(player.avatar, player.mode, player.sex)}
      <span><strong>${h(player.name)}${player.id === meId ? ' <small>나</small>' : ''}</strong>
      <span class="person-caption">${lobby ? '대기실에 있어요' : h(lifeCaption(player))}</span>
      ${!lobby && player.mode !== 'alive' ? `<span class="person-caption">${MODES[player.mode]}</span>` : ''}</span>
    </button>
    ${teacher && !lobby ? `<span class="small-badge ${player.submitted ? 'mint' : 'paper'}">${player.submitted ? '제출' : '대기'}</span>` : ''}
    ${teacher && lobby ? `<button type="button" class="icon-button" aria-label="${h(player.name)} 내보내기" data-action="kick" data-id="${player.id}">${icon('close')}</button>` : ''}
  </article>`).join('')}</div>`;
}

function settingsSummary(settings) {
  const personal = settings.pace === 'personal';
  return `<dl class="settings-summary">
    <div><dt>일상 선택마다</dt><dd>1년</dd></div>
    <div><dt>최대 나이</dt><dd>${settings.maxAge}살</dd></div>
    <div><dt>진행 방식</dt><dd>${personal ? '각자 진행' : settings.pace === 'auto' ? '자동 진행' : '교사가 넘기기'}</dd></div>
    ${personal ? '' : `<div><dt>선택 시간</dt><dd>${settings.pace === 'auto' && settings.seconds ? `${settings.seconds}초` : '시간 제한 없음'}</dd></div>`}
  </dl>`;
}

function lobbyView(session, state) {
  const teacher = session.role === 'host';
  return `<div class="room-grid">
    <section class="panel section-panel">
      <div class="section-heading"><div class="eyebrow">${icon('users')} 대기실</div><span class="small-badge mint">${state.players.length} / ${CAPACITY}명</span></div>
      <h2>${teacher ? '참가자 명단' : '함께 시작할 친구들'}</h2>
      <p class="subtle">${teacher ? '학생이 모이면 게임을 시작하세요.' : '선생님이 시작하면 첫 번째 인생 선택이 열려요.'}</p>
      ${roster(state.players, { teacher, lobby: true, meId: state.me?.id })}
    </section>
    <aside class="stack">
      <section class="panel section-panel code-panel">
        <div class="eyebrow">${icon('link')} 참가 코드</div>
        <strong class="room-code">${state.code}</strong>
        ${teacher ? button('share', '초대 QR 크게 보기', 'qr') : button('share', '초대 링크 열기', 'copy')}
      </section>
      <section class="panel section-panel">
        <div class="section-heading"><h2>방 설정</h2>${teacher ? button('settings', '설정', 'settings', 'quiet') : ''}</div>
        ${settingsSummary(state.settings)}
        ${teacher ? button('start', '게임 시작', 'play', 'primary full', state.players.length ? 'data-focus="start"' : 'disabled') : ''}
      </section>
    </aside>
  </div>`;
}

function navigation(session, pane, state) {
  const teacher = session.role === 'host';
  const labels = [['play', teacher ? '진행 현황' : '내 인생', teacher ? 'board' : 'book'],
    ['friends', `친구들 ${state.players.length}`, 'users'], ['rank', '순위', 'trophy']];
  return `<nav class="tabs" aria-label="게임 메뉴">${labels.map(([id, label, mark]) =>
    `<button type="button" data-action="pane" data-id="${id}" data-focus="pane-${id}" ${pane === id ? 'aria-current="page"' : ''}>${icon(mark)} ${label}</button>`).join('')}</nav>`;
}

function roundMeta(state) {
  const personal = state.settings.pace === 'personal';
  return `<div class="section-heading round-meta">
    <div class="eyebrow"><i class="status-dot"></i> ${state.me ? `${state.me.age}살` : personal ? '각자 진행' : `마을 ${state.turn.to}년차`}</div>
    ${personal ? '' : `<span class="timer" data-clock>${icon('clock')} <b></b></span>`}
  </div>`;
}

function sourceLine(source) {
  const term = source.years ? `${source.years}년 동안` : source.term;
  return `<span class="effect-row"><span class="effect-caption">${h(source.label)}${term ? ` <small>${h(term)}</small>` : ''}</span>
    <span class="delta-list">${changes(source.effect)}</span></span>`;
}

function recurringView(option, bonus) {
  if (!option.recurring) return '';
  const { starts, stops } = option.recurring;
  const when = bonus ? '올해부터' : '다음 해부터';
  const end = option.action?.kind === 'service' ? '복무 중 잠시 멈춰요' : `${when} 끝나요`;
  return `<span class="choice-recurring">
    ${starts.length ? `<span class="effect-label">${icon('clock')} ${when} 매년</span>${starts.map(sourceLine).join('')}` : ''}
    ${stops.length ? `<span class="effect-stop"><b>${end}</b> <span>${stops.map(h).join(' · ')}</span></span>` : ''}
  </span>`;
}

function yearlyView(scene) {
  if (!scene.yearly?.length) return '';
  return `<details class="year-effects">
    <summary data-focus="year-effects"><strong>올해 자동 변화</strong><span class="delta-list">${changes(scene.base) || '<span>합계 변화 없음</span>'}</span></summary>
    <div class="year-effect-rows">${scene.yearly.map(sourceLine).join('')}</div>
  </details>`;
}

function conditionView(option) {
  if (!option.conditions) return option.locked ? `<span class="requirement">${h(option.locked)}</span>` : '';
  if (!option.conditions.length) return '<span class="choice-conditions"><b>지원 조건</b> 바로 시작할 수 있어요</span>';
  return `<span class="choice-conditions"><b>${option.career ? '지원 조건' : '선택 조건'}</b>
    ${option.conditions.map(({ label, met }) => `<span class="requirement${met ? ' met' : ''}">
      ${h(label)} · ${met ? '충족' : '필요'}</span>`).join('')}</span>`;
}

function choiceCard(option, me, bonus) {
  const locked = Boolean(option.locked);
  const picked = me.choice === option.id;
  const tone = ({ heart: 'rose', book: 'blue', coin: 'amber', sun: 'lime', spark: 'plum', ghost: 'plum', flower: 'plum', house: 'amber' })[option.mark] ?? 'mint';
  const effect = changes(option.effect);
  return `<button type="button" class="choice${picked ? ' picked' : ''}${locked ? ' locked' : ''}" data-action="${option.id === 'successor' ? 'successor' : 'choose'}" data-id="${option.id}" data-focus="choice-${option.id}"
    aria-pressed="${picked}" ${locked ? 'disabled' : ''}>
    <span class="choice-top"><span class="tile-icon ${tone}">${icon(option.mark)}</span>
      <strong>${h(option.title)}</strong>
      <span class="choice-tag" aria-hidden="true">${icon(locked ? 'lock' : picked ? 'check' : option.opportunity ? 'spark' : 'arrow')}</span></span>
    <span class="choice-detail">${h(option.detail)}</span>
    ${effect ? `<span class="choice-bottom"><span class="effect-once">이번에 한 번</span>${effect}</span>` : ''}
    ${option.career && option.opportunity ? '<span class="small-badge mint">내 꿈과 이어지는 일</span>' : ''}
    ${recurringView(option, bonus)}
    ${conditionView(option)}
  </button>`;
}

function latestView(latest) {
  if (!latest) return '';
  const label = latest.type === 'bonus' ? '방금 고른 일' : '지난 선택';
  return `<details class="latest" data-result="${h(latest.year + '-' + latest.type + '-' + latest.title)}">
    <summary data-focus="latest"><span>${label}</span> <strong>${h(latest.title)}</strong></summary>
    ${latest.text || latest.line ? `<p>${h(latest.text || latest.line)}</p>` : ''}<div class="delta-list">${changes(latest.changes)}</div>
  </details>`;
}

export function choiceFeedbackView(state) {
  const me = state?.me;
  if (!me) return '';
  const pending = me.choice && !me.scene?.waiting &&
    (me.choice === PASS.id ? PASS : me.scene?.choices.find(({ id }) => id === me.choice));
  const result = me.latest;
  if (!pending && !result) return '';

  const last = me.name.replace(/[^가-힣0-9A-Za-z]+$/u, '').at(-1) ?? '';
  const syllable = last.charCodeAt(0);
  const hasFinal = syllable >= 0xac00 && syllable <= 0xd7a3 ? (syllable - 0xac00) % 28 !== 0 : /[013678LMNR]/i.test(last);
  const subject = me.name + (hasFinal ? '은' : '는');
  const line = pending ? pending.narration ?? pending.detail : result.line ?? `‘${result.title}’ 선택을 했어요.`;
  const key = pending ? `${state.turn.number}-pending-${pending.id}` : `${result.year}-${result.type}-${result.title}`;
  const deltas = pending ? '' : changes(result.changes);
  return `<div class="choice-feedback-note" data-choice-result="${h(key)}">
    <span class="choice-feedback-icon">${icon('book')}</span>
    <div><p><strong>${h(subject)}</strong> ${h(line)}</p>
      ${deltas ? `<div class="delta-list">${deltas}</div>` : ''}</div>
  </div>`;
}

function miniRank(state, rank) {
  const rows = state.rankings[rank] ?? [];
  const data = rankInfo[rank];
  return `<section class="panel section-panel mini-rank">
    <div class="section-heading"><h2>우리 반 기록</h2><span class="small-badge ${data.color}">${data.label}</span></div>
    ${rows.slice(0, 3).map((row) => `<button type="button" class="mini-row" data-action="profile" data-id="${row.id}">
      <span class="medal rank-${row.rank}">${row.rank}</span>${avatar(row.avatar, row.mode, row.sex)}
      <span class="rank-person"><strong>${h(row.name)}</strong><span class="person-caption">${h(lifeCaption(row))}</span></span><b>${numeral(row.value)}</b>
    </button>`).join('')}
    ${button('pane', '분야별 순위 보기', 'arrow', 'quiet', 'data-id="rank"')}
  </section>`;
}

function playerView(session, state, rank) {
  const { me, phase } = state;
  const personal = state.settings.pace === 'personal';
  const progress = `${state.players.filter((player) => player.submitted).length}/${state.players.length}명 선택`;
  let body;
  if (phase === 'ended') {
    body = `<div class="section-heading"><div class="eyebrow">${icon('flag')} 마지막 장</div><span class="small-badge mint">${personal ? `${me.age}살의 기록` : `${state.year}년의 기록`}</span></div>
      <h2>우리 반 이야기를 마쳤어요</h2><p class="subtle">${h(state.endReason)}</p>${latestView(me.latest)}
      <div class="actions">${button('profile', '내 기록 보기', 'book', 'primary', `data-id="${me.id}"`)} ${button('pane', '최종 순위', 'trophy', 'secondary', 'data-id="rank"')}</div>`;
  } else if (state.paused) {
    body = `${roundMeta(state)}<div class="empty paused">${icon('pause')}<strong>잠시 쉬어요</strong><span>선생님이 시작하면 계속 골라요.</span></div>`;
  } else {
    const { scene } = me;
    const waiting = state.turn.auto ? '골랐어요. 친구들을 기다려요.' : '골랐어요. 선생님이 마감하면 다음 해로 가요.';
    body = `${roundMeta(state)}
      ${scene.bonus ? '<p class="extra-label">추가 선택 <span>지금 나이 그대로</span></p>' : ''}
      <h2 tabindex="-1">${h(scene.title)}</h2><p class="subtle scene-detail">${h(scene.detail)}</p>
      ${scene.healthWarning ? `<p class="health-warning">${icon('heart')} 큰 병을 치료 중이에요. 올해는 체력을 아껴요.</p>` : ''}
      ${me.mode === 'fork' && me.life.end ? `<p class="fork-note">${icon('book')} ${h(me.life.end.note)}</p>` : ''}
      <div class="choice-grid">${scene.choices.map((item) => choiceCard(item, me, scene.bonus)).join('')}</div>
      <div class="choice-footer"><span>${scene.waiting ? waiting : scene.bonus ? '고르면 같은 나이의 이야기가 이어져요.' :
        me.choice ? waiting : !scene.choices.length ? '친구들 메뉴에서 다른 이야기를 볼 수 있어요.' :
          me.mode === 'alive' && (personal || session.role === 'demo') ? '고르면 바로 한 살 자라요.' : '하나를 눌러 골라요.'}</span>
      ${!personal && me.mode !== 'alive' && !scene.waiting ? button('choose', me.choice === 'pass' ? '기다리기를 골랐어요' : '이번엔 기다리기', 'clock', 'quiet', 'data-id="pass"') : ''}</div>
      ${yearlyView(scene)}
      ${personal || session.role === 'demo' ? '' : `<div class="submission-note"><span>${icon('users')} ${progress}</span></div>`}
      ${latestView(me.latest)}`;
  }
  const storyKey = `${state.turn.number}-${me.scene?.key ?? phase}-${Boolean(me.scene?.waiting)}`;
  return `<div class="play-grid">
    <div class="play-sidebar">
      ${roomHero(session, state)}
      <aside class="stack play-stats">
        <section class="panel section-panel">
          <div class="section-heading"><h2>${me.mode === 'alive' ? '내 능력치' : '남긴 능력치'}</h2><span class="small-badge paper">${me.generation}대</span></div>
          ${statGrid(me.life.stats)}
          ${button('profile', '인생 기록장', 'book', 'quiet', `data-id="${me.id}"`)}
        </section>
        ${miniRank(state, rank)}
      </aside>
    </div>
    <div class="play-main">
      <div class="play-navigation">${navigation(session, 'play', state)}<p class="landscape-hint">화면을 가로로 돌리면 마을과 능력치를 같이 볼 수 있어요.</p></div>
      <section class="panel section-panel story-panel" data-story-key="${h(storyKey)}">${body}</section>
    </div>
  </div>`;
}

function teacherView(state) {
  const { players, phase, paused } = state;
  const personal = state.settings.pace === 'personal';
  const submitted = players.filter((player) => player.submitted).length;
  const ended = phase === 'ended';
  return `<div class="room-grid">
    <section class="panel section-panel">
      <div class="section-heading"><div class="eyebrow">${icon('users')} 실시간 참가 현황</div><span class="small-badge mint">${players.length} / ${CAPACITY}명</span></div>
      <h2>${ended ? '우리 반 최종 기록' : personal ? '학생들의 현재 인생' : '누가 선택을 마쳤나요?'}</h2>
      ${phase === 'play' && !personal ? `<div class="progress-card"><span>선택 제출</span><strong>${submitted} / ${players.length}명</strong><span class="progress-bar"><i style="width:${submitted * 100 / players.length}%"></i></span></div>` : ''}
      ${roster(players, { teacher: phase === 'play' && !personal })}
    </section>
    <aside class="stack">
      <section class="panel section-panel control-panel">
        ${roundMeta(state)}
        <h2>${ended ? '수업 마감' : '진행 제어'}</h2>
        <p class="subtle">${ended ? h(state.endReason) : paused ? '학생의 선택을 잠시 멈췄어요.' : personal ? '학생마다 자기 속도로 한 해씩 진행해요.' :
          state.turn.auto ? '전원이 고르거나 시간이 끝나면 다음 해가 열려요.' : '학생들이 다 고르면 올해를 마감하세요.'}</p>
        ${ended ? button('pane', '최종 순위 보기', 'trophy', 'primary full', 'data-id="rank"') :
          `<div class="stack compact">
            ${paused ? button('resume', '계속 진행', 'play', 'primary full', 'data-focus="teacher-next"') :
              personal ? '' : button('advance', '올해 마감', 'arrow', 'primary full', 'data-focus="teacher-next"')}
            ${paused ? '' : button('pause', '일시정지', 'pause', 'secondary full', 'data-focus="pause"')}
            ${button('finish', '전체 게임 마감', 'flag', 'quiet danger', 'data-focus="finish"')}
          </div>`}
      </section>
      <section class="panel section-panel">
        <div class="section-heading"><h2>방 설정</h2>${ended || personal ? '' : button('settings', '설정', 'settings', 'quiet')}</div>
        ${settingsSummary(state.settings)}
        ${ended || personal ? '' : '<p class="field-note">바꾼 설정은 다음 해부터 적용돼요.</p>'}
      </section>
    </aside>
  </div>`;
}

function rankView(state, rank) {
  const data = rankInfo[rank];
  return `<section class="panel section-panel sheet">
    <div class="eyebrow">${icon('trophy')} ${state.phase === 'ended' ? '최종 기록' : '우리 반 기록'}</div>
    <h2>분야별 순위</h2><p class="subtle">각 가계에서 지금 또는 앞 세대가 남긴 가장 높은 값을 기준으로 해요.</p>
    <div class="rank-filters" aria-label="순위 분야">${RANKS.map((key) => {
      const item = rankInfo[key];
      return `<button type="button" class="filter ${item.color}" data-action="rank-filter" data-id="${key}" data-focus="rank-${key}" aria-pressed="${key === rank}">${icon(item.mark)} ${item.label}</button>`;
    }).join('')}</div>
    <div class="rank-list">${(state.rankings[rank] ?? []).map((row) => `<button type="button" class="rank-row" data-action="profile" data-id="${row.id}">
      <span class="medal rank-${row.rank}">${row.rank}</span>${avatar(row.avatar, row.mode, row.sex)}
      <span class="rank-person"><strong>${h(row.name)}${row.id === state.me?.id ? ' <small>나</small>' : ''}</strong>
        <span class="person-caption">${h(lifeCaption(row))}</span></span><span class="rank-generation">${row.generation}대 기록</span>
      <b>${numeral(row.value)} <small>${data.unit ?? '점'}</small></b>
    </button>`).join('')}</div>
  </section>`;
}

export function roomView(session, state, { pane, rank, offline }) {
  const teacher = session.role === 'host';
  const notice = offline ? '<div class="notice" role="status">연결을 다시 확인하고 있어요. 연결되면 방의 진행 상황을 불러와요.</div>' : '';
  if (!teacher && state.phase !== 'lobby' && pane === 'play') {
    return `<div class="shell room playing-room">${notice}${playerView(session, state, rank)}</div>`;
  }
  return `<div class="shell room">
    ${notice}
    ${roomHero(session, state)}
    ${state.phase === 'lobby' ? lobbyView(session, state) : `${navigation(session, pane, state)}
      ${pane === 'rank' ? rankView(state, rank) : pane === 'friends' ? `<section class="panel section-panel sheet">
        <div class="eyebrow">${icon('users')} 마을 사람들</div>
        <h2>친구들의 인생 기록</h2><p class="subtle">한 사람을 고르면 어떤 선택을 하며 살아왔는지 볼 수 있어요.</p>
        ${roster(state.players, { meId: state.me?.id })}</section>` : teacherView(state)}`}
  </div>`;
}

export function profileView(profile, index) {
  const life = profile.lives[index];
  const badges = lifeBadges(life);
  const notes = pathNotes(life);
  const visits = index === profile.lives.length - 1 ? profile.visits : [];
  const entries = [...life.history, ...visits].reverse().sort((left, right) => right.year - left.year);
  return `
    <div class="profile-title">${avatar(profile.avatar, profile.mode, pathOf(life).sex)}<div><strong>${h(profile.name)}</strong><span>${[life.generation + '대', life.age + '살', ...badges].map(h).join(' · ')}</span></div></div>
    ${profile.lives.length > 1 ? `<div class="rank-filters" aria-label="세대 고르기">${profile.lives.map((record, recordIndex) =>
      `<button type="button" class="filter mint" data-action="generation" data-index="${recordIndex}" aria-pressed="${index === recordIndex}">${record.generation}대</button>`).join('')}</div>` : ''}
    ${life.end ? `<p class="fork-note">${icon('flag')} ${h(life.end.note)}</p>` : ''}
    ${statGrid(life.stats)}
    ${notes.length ? `<h3>지나온 길</h3><div class="life-chips">${notes.map((note) => `<span>${h(note)}</span>`).join('')}</div>` : ''}
    <h3>인생 연대기</h3>
    ${entries.length ? `<ol class="timeline">${entries.map((entry) => `<li>
      <span class="timeline-year">${entry.type === 'spirit' ? '영혼' : `${entry.decisionAge ?? entry.age}살`}${entry.type === 'bonus' ? '<small>추가 선택</small>' : ''}</span><div><strong>${h(entry.title)}</strong>
        ${entry.text || entry.line ? `<p>${h(entry.text || entry.line)}</p>` : ''}<div class="delta-list">${changes(entry.changes)}</div></div>
    </li>`).join('')}</ol>` : '<p class="subtle">첫 선택을 기다리고 있어요.</p>'}
  `;
}
