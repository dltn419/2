import { AVATARS, STAGES, STATS } from './content.mjs';
import { CAPACITY, MODES, RANKS, stageAt } from './game.mjs';
import { SEXES, lifeBadges, pathNotes, pathOf } from './life.mjs';
import { avatar, changes, escapeHtml as h, icon, numeral, statGrid } from './ui.mjs';

const rankInfo = { ...STATS, age: { label: '장수', mark: 'clock', color: 'mint', unit: '살' } };
const stageNames = STAGES.map((stage) => `<li>${stage.label}</li>`).join('');
const button = (action, label, mark, type = 'secondary', extra = '') =>
  `<button type="button" class="button ${type}" data-action="${action}" ${extra}>${mark ? icon(mark) : ''}<span>${label}</span></button>`;

export function topView(session, state) {
  const tag = session?.role === 'demo' ? '혼자 체험' : session?.role === 'host' ? '교사 진행실' : '교실 인생 게임';
  return `<div class="shell topbar">
    <button class="brand" type="button" data-action="home" aria-label="100년 홈"><img src="/art/icon.svg" alt="" width="36" height="36"><span>100년<small>우리들의 인생 기록장</small></span></button>
    <div class="top-actions">
      <span class="top-tag"><i></i>${tag}</span>
      ${session && session.role !== 'demo' && state ? button('share', '초대 링크', 'link', 'quiet') : ''}
      ${button('help', '게임 안내', 'book', 'quiet')}
    </div>
  </div>`;
}

export function sexFields() {
  return `<fieldset class="sex-picker"><legend>캐릭터 성별</legend><div>${Object.entries(SEXES).map(([sex, label]) =>
    `<label><input type="radio" name="sex" value="${sex}" required> ${label}</label>`).join('')}</div></fieldset>`;
}

export function homeView(code, selected, saved) {
  const classroom = AVATARS.map((item, index) => avatar(index)).join('');
  return `<div class="shell home">
    <section class="home-hero">
      <div class="hero-copy">
        <div class="eyebrow">${icon('sprout')} <span>CLASSROOM LIFE SIM</span></div>
        <h1>같은 해,<br>다른 <em>인생.</em></h1>
        <p>태어나고, 배우고, 살아가며 한 권의 기록을 써요.<br class="wide-only"> 친구들과 같은 시간을 저마다의 선택으로 채워 보세요.</p>
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
        <p class="subtle">최대 20명. 한 해의 선택 시간을 정하고 친구들을 초대하세요.</p>
        <div class="chalkboard" aria-hidden="true"><div>우리 반 시간표<span>01 — 100</span></div><div class="classroom">${classroom}</div></div>
        ${button('create', '교사 방 만들기', 'arrow', 'dark')}
        ${saved.host ? button('resume-host', '지난 진행실 열기', 'clock', 'quiet') : ''}
      </article>
    </section>
  </div>`;
}

export function settingsFields(settings, { creating = false, started = false, pinRequired = false } = {}) {
  const { maxAge, seconds, pace } = settings;
  return `
    ${creating ? '<label>방 이름<input name="name" maxlength="30" value="우리 반 100년" required autocomplete="off"></label>' : ''}
    <div class="form-grid">
      <label>한 삶의 목표 나이<input name="maxAge" type="number" min="80" max="110" value="${maxAge}" required ${started ? 'disabled' : ''}></label>
      <label>진행 방식<select name="pace">
        <option value="auto" ${pace === 'auto' ? 'selected' : ''}>자동 진행</option>
        <option value="manual" ${pace === 'manual' ? 'selected' : ''}>교사가 넘기기</option>
      </select></label>
      <label>선택 시간 (초)<input name="seconds" type="number" min="0" max="180" value="${seconds}" required ${pace === 'manual' ? 'disabled' : ''}></label>
    </div>
    <p class="field-note">한 턴마다 1년이 지나요. 자동 진행은 전원이 제출하거나 타이머가 끝나면 마감해요. 타이머는 10~180초로 설정하고, 0초로 두면 전원 제출까지 기다려요.</p>
    ${pinRequired ? '<label>교사용 비밀번호<input name="pin" type="password" required autocomplete="current-password"></label>' : ''}
  `;
}

function phaseLabel(state) {
  if (state.paused) return '일시정지';
  return { lobby: '입장 중', play: '선택 중', review: '결과 확인 중', ended: '이야기 마감' }[state.phase];
}

function lifeStage(life, stage) {
  if (life.age < 3) return '아기 시절';
  if (life.age >= 7 && life.age <= 12) return '초등학교';
  if (life.age >= 13 && life.age <= 15) return '중학교';
  if (life.age >= 16 && life.age <= 18) return pathOf(life).school === 'outside' ? '학교 밖에서 배우는 시절' : '고등학교';
  return stage.label;
}

function roomHero(session, state) {
  const teacher = session.role === 'host';
  const me = state.me;
  const stage = me && STAGES[stageAt(me.age)];
  const title = teacher ? '교사 진행실' : state.phase === 'lobby' ? '첫해를 기다리는 중' : `${h(me.name)}의 인생`;
  const sub = teacher ? h(state.name) : state.phase === 'lobby' ? h(state.name) :
    me.mode === 'alive' ? `${lifeStage(me.life, stage)} · ${stage.cue}` : MODES[me.mode];
  const heroTone = me?.mode === 'spirit' ? 'spirit-hero' : '';
  return `<section class="room-hero ${heroTone}">
    <div class="room-hero-main">
      <div class="eyebrow"><i class="status-dot"></i> ${session.role === 'demo' ? '혼자 체험' : `ROOM ${state.code}`} <span class="sep">/</span> ${phaseLabel(state)}</div>
      <div class="room-title">${teacher ? `<span class="tile-icon mint">${icon('board')}</span>` : avatar(me.avatar, me.mode)}
        <div><h1>${title}</h1><p>${sub}</p></div>
      </div>
      ${teacher || state.phase === 'lobby' ? '' : `<div class="life-chips"><span>${me.generation}대</span><span>${me.age}살</span>${lifeBadges(me.life).map((badge) => `<span>${h(badge)}</span>`).join('')}</div>`}
    </div>
    <div class="room-hero-art"><img src="/art/village.svg" alt="" width="384" height="218"><span>${icon('sun')} ${state.phase === 'lobby' ? '새 이야기' : `마을 ${state.year}년차`}</span></div>
  </section>`;
}

function roster(players, { teacher = false, lobby = false, meId } = {}) {
  if (!players.length) return `<div class="empty">${icon('users')}<strong>아직 참가자가 없어요</strong><span>참가 코드나 초대 링크를 친구들에게 알려 주세요.</span></div>`;
  return `<div class="roster">${players.map((player) => `<article class="person">
    <button type="button" class="person-main" data-action="profile" data-id="${player.id}" data-focus="profile-${player.id}">
      ${avatar(player.avatar, player.mode)}
      <span><strong>${h(player.name)}${player.id === meId ? ' <small>나</small>' : ''}</strong>
      <span class="person-caption">${lobby ? '대기실에 있어요' : `${player.generation}대 · ${player.age}살 · ${MODES[player.mode]}`}</span></span>
    </button>
    ${teacher && !lobby ? `<span class="small-badge ${player.submitted ? 'mint' : 'paper'}">${player.submitted ? '제출' : '대기'}</span>` : ''}
    ${teacher && lobby ? `<button type="button" class="icon-button" aria-label="${h(player.name)} 내보내기" data-action="kick" data-id="${player.id}">${icon('close')}</button>` : ''}
  </article>`).join('')}</div>`;
}

function settingsSummary(settings) {
  return `<dl class="settings-summary">
    <div><dt>턴마다</dt><dd>1년</dd></div>
    <div><dt>목표 나이</dt><dd>${settings.maxAge}살</dd></div>
    <div><dt>진행 방식</dt><dd>${settings.pace === 'auto' ? '자동 진행' : '교사가 넘기기'}</dd></div>
    <div><dt>선택 시간</dt><dd>${settings.pace === 'auto' && settings.seconds ? `${settings.seconds}초` : '시간 제한 없음'}</dd></div>
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
        ${button('share', '초대 링크 열기', 'copy')}
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
  return `<div class="section-heading round-meta">
    <div class="eyebrow"><i class="status-dot"></i> 턴 ${String(state.turn.number).padStart(2, '0')}</div>
    <span class="timer" data-clock>${icon('clock')} <b></b></span>
  </div>`;
}

function choiceCard(option, me) {
  const locked = Boolean(option.locked);
  const picked = me.choice === option.id;
  const tone = ({ heart: 'rose', book: 'blue', coin: 'amber', sun: 'lime', spark: 'plum', ghost: 'plum', flower: 'plum' })[option.mark] ?? 'mint';
  return `<button type="button" class="choice${picked ? ' picked' : ''}${locked ? ' locked' : ''}" data-action="choose" data-id="${option.id}" data-focus="choice-${option.id}"
    aria-pressed="${picked}" ${locked ? 'disabled' : ''}>
    <span class="choice-top"><span class="tile-icon ${tone}">${icon(option.mark)}</span>
    <span class="choice-tag">${locked ? `${icon('lock')} 조건 필요` : picked ? `${icon('check')} 제출 완료` : option.opportunity ? `${icon('spark')} 특별 기회` : icon('arrow')}</span></span>
    <strong>${h(option.title)}</strong>
    <span class="choice-detail">${h(option.detail)}</span>
    <span class="choice-bottom">${locked ? `<span class="requirement">${h(option.locked)}</span>` : changes(option.effect)}</span>
  </button>`;
}

function latestView(latest) {
  if (!latest) return '';
  return `<div class="latest"><div class="eyebrow">${icon('flag')} ${latest.year}년차의 기록</div><strong>${h(latest.title)}</strong>
    ${latest.text ? `<p>${h(latest.text)}</p>` : ''}<div class="delta-list">${changes(latest.changes)}</div></div>`;
}

function miniRank(state, rank) {
  const rows = state.rankings[rank] ?? [];
  const data = rankInfo[rank];
  return `<section class="panel section-panel mini-rank">
    <div class="section-heading"><h2>우리 반 기록</h2><span class="small-badge ${data.color}">${data.label}</span></div>
    ${rows.slice(0, 3).map((row) => `<button type="button" class="mini-row" data-action="profile" data-id="${row.id}">
      <span class="medal rank-${row.rank}">${row.rank}</span>${avatar(row.avatar)}<strong>${h(row.name)}</strong><b>${numeral(row.value)}</b>
    </button>`).join('')}
    ${button('pane', '분야별 순위 보기', 'arrow', 'quiet', 'data-id="rank"')}
  </section>`;
}

function playerView(session, state, rank) {
  const { me, phase, turn } = state;
  const canChoose = phase === 'play' && !state.paused;
  const span = turn.to - turn.from;
  const progress = `${state.players.filter((player) => player.submitted).length}/${state.players.length}명 제출`;
  let body;
  if (phase === 'ended') {
    body = `<div class="section-heading"><div class="eyebrow">${icon('flag')} 마지막 장</div><span class="small-badge mint">${state.year}년의 기록</span></div>
      <h2>우리 반의 이야기를 덮어요</h2><p class="subtle">${h(state.endReason)}</p>${latestView(me.latest)}
      <div class="actions">${button('profile', '내 기록 펼치기', 'book', 'primary', `data-id="${me.id}"`)} ${button('pane', '최종 순위', 'trophy', 'secondary', 'data-id="rank"')}</div>`;
  } else if (phase === 'review') {
    body = `${roundMeta(state)}<h2>${span === 1 ? '한 해가 지나갔어요' : `${span}년이 지나갔어요`}</h2>
      <p class="subtle">지난 선택이 남긴 기록을 살펴봐요.</p>${latestView(me.latest) || '<div class="latest">잠시 머물며 마을이 변하는 모습을 지켜봤어요.</div>'}
      ${session.role === 'demo' ? button('practice-next', '다음 선택 열기', 'arrow', 'primary') : ''}`;
  } else if (state.paused) {
    body = `${roundMeta(state)}<div class="empty paused">${icon('pause')}<strong>잠시 쉬어 가요</strong><span>교사가 다시 시작하면 선택을 이어갈 수 있어요.</span></div>`;
  } else {
    body = `${roundMeta(state)}<h2>${h(me.scene.title)}</h2><p class="subtle scene-detail">${h(me.scene.detail)}</p>
      ${me.mode === 'fork' && me.life.end ? `<p class="fork-note">${icon('book')} ${h(me.life.end.note)}</p>` : ''}
      <div class="choice-grid">${me.scene.choices.map((item) => choiceCard(item, me)).join('')}</div>
      <div class="choice-footer"><span>${me.choice ? '선택을 제출했어요.' : '카드를 누르면 제출돼요.'} 마감 전에는 바꿀 수 있어요.</span>
        ${me.mode !== 'alive' && canChoose ? button('choose', me.choice === 'pass' ? '기다리기 제출됨' : '이번에는 기다리기', 'clock', 'quiet', 'data-id="pass"') : ''}</div>
      ${session.role === 'demo' ? '' : `<div class="submission-note"><span>${icon('users')} ${progress}</span><span>한 해씩 진행</span></div>`}`;
  }
  return `<div class="room-grid">
    <section class="panel section-panel story-panel">${body}</section>
    <aside class="stack">
      <section class="panel section-panel">
        <div class="section-heading"><h2>${me.mode === 'alive' ? '내 능력치' : '남긴 능력치'}</h2><span class="small-badge paper">${me.generation}대</span></div>
        ${statGrid(me.life.stats)}
        ${button('profile', '인생 기록장', 'book', 'quiet', `data-id="${me.id}"`)}
      </section>
      ${miniRank(state, rank)}
    </aside>
  </div>`;
}

function teacherView(state) {
  const { players, phase, paused } = state;
  const submitted = players.filter((player) => player.submitted).length;
  const ended = phase === 'ended';
  return `<div class="room-grid">
    <section class="panel section-panel">
      <div class="section-heading"><div class="eyebrow">${icon('users')} 실시간 참가 현황</div><span class="small-badge mint">${players.length} / ${CAPACITY}명</span></div>
      <h2>${ended ? '우리 반 최종 기록' : '누가 선택을 마쳤나요?'}</h2>
      ${phase === 'play' ? `<div class="progress-card"><span>선택 제출</span><strong>${submitted} / ${players.length}명</strong><span class="progress-bar"><i style="width:${submitted * 100 / players.length}%"></i></span></div>` : ''}
      ${roster(players, { teacher: phase === 'play' })}
    </section>
    <aside class="stack">
      <section class="panel section-panel control-panel">
        ${roundMeta(state)}
        <h2>${ended ? '수업 마감' : '진행 제어'}</h2>
        <p class="subtle">${ended ? h(state.endReason) : paused ? '타이머와 학생의 선택이 멈춰 있어요.' :
          phase === 'review' ? '학생들이 선택의 결과를 보고 있어요.' : '학생들이 이번 턴의 선택을 고르고 있어요.'}</p>
        ${ended ? button('pane', '최종 순위 보기', 'trophy', 'primary full', 'data-id="rank"') :
          `<div class="stack compact">
            ${button(paused ? 'resume' : 'advance', paused ? '계속 진행' : phase === 'play' ? '선택 마감' : '다음 선택 열기', paused ? 'play' : 'arrow', 'primary full', 'data-focus="teacher-next"')}
            ${paused ? '' : button('pause', '일시정지', 'pause', 'secondary full', 'data-focus="pause"')}
            ${button('finish', '전체 게임 마감', 'flag', 'quiet danger', 'data-focus="finish"')}
          </div>`}
      </section>
      <section class="panel section-panel">
        <div class="section-heading"><h2>방 설정</h2>${ended ? '' : button('settings', '설정', 'settings', 'quiet')}</div>
        ${settingsSummary(state.settings)}
        ${ended ? '' : '<p class="field-note">진행 중 바꾼 설정은 다음 선택부터 적용돼요.</p>'}
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
      <span class="medal rank-${row.rank}">${row.rank}</span>${avatar(row.avatar)}
      <strong>${h(row.name)}${row.id === state.me?.id ? ' <small>나</small>' : ''}</strong><span class="rank-generation">${row.generation}대 기록</span>
      <b>${numeral(row.value)} <small>${data.unit ?? '점'}</small></b>
    </button>`).join('')}</div>
  </section>`;
}

export function roomView(session, state, { pane, rank, offline }) {
  const teacher = session.role === 'host';
  return `<div class="shell room">
    ${offline ? '<div class="notice" role="status">연결을 다시 확인하고 있어요. 연결되면 방의 진행 상황을 불러와요.</div>' : ''}
    ${roomHero(session, state)}
    ${state.phase === 'lobby' ? lobbyView(session, state) : `${navigation(session, pane, state)}
      ${pane === 'rank' ? rankView(state, rank) : pane === 'friends' ? `<section class="panel section-panel sheet">
        <div class="eyebrow">${icon('users')} 마을 사람들</div>
        <h2>친구들의 인생 기록</h2><p class="subtle">한 사람을 고르면 어떤 선택을 하며 살아왔는지 볼 수 있어요.</p>
        ${roster(state.players, { meId: state.me?.id })}</section>` : teacher ? teacherView(state) : playerView(session, state, rank)}`}
  </div>`;
}

export function profileView(profile, index) {
  const life = profile.lives[index];
  const badges = lifeBadges(life);
  const notes = pathNotes(life);
  const visits = index === profile.lives.length - 1 ? profile.visits : [];
  const entries = [...life.history, ...visits].sort((left, right) => right.year - left.year);
  return `
    <div class="profile-title">${avatar(profile.avatar, profile.mode)}<div><strong>${h(profile.name)}</strong><span>${[life.generation + '대', life.age + '살', ...badges].map(h).join(' · ')}</span></div></div>
    ${profile.lives.length > 1 ? `<div class="rank-filters" aria-label="세대 고르기">${profile.lives.map((record, recordIndex) =>
      `<button type="button" class="filter mint" data-action="generation" data-index="${recordIndex}" aria-pressed="${index === recordIndex}">${record.generation}대</button>`).join('')}</div>` : ''}
    ${life.end ? `<p class="fork-note">${icon('flag')} ${h(life.end.note)}</p>` : ''}
    ${statGrid(life.stats)}
    ${notes.length ? `<h3>지나온 길</h3><div class="life-chips">${notes.map((note) => `<span>${h(note)}</span>`).join('')}</div>` : ''}
    <h3>인생 연대기</h3>
    ${entries.length ? `<ol class="timeline">${entries.map((entry) => `<li>
      <span class="timeline-year" title="마을 ${entry.year}년차">${entry.decisionAge === undefined ? `${entry.year}년차` : `${entry.decisionAge}살`}</span><div><strong>${h(entry.title)}</strong>
        ${entry.text ? `<p>${h(entry.text)}</p>` : ''}<div class="delta-list">${changes(entry.changes)}</div></div>
    </li>`).join('')}</ol>` : '<p class="subtle">첫 선택을 기다리고 있어요.</p>'}
  `;
}
