import { AVATARS, CAREER_CREDENTIALS, CAREERS, STAGES, STATS } from './content.mjs';
import { CAPACITY, MODES, PASS, RANKS, stageAt } from './game.mjs';
import { SEXES, careerGrowth, careerPay, chanceDiscount, lifeBadges, pathNotes, pathOf,
  retirementAge, retirementLumpSum, retirementPayout, retirementTax } from './life.mjs';
import { avatar, changes, escapeHtml as h, icon, numeral, statGrid } from './ui.mjs';

const rankInfo = { ...STATS, age: { label: '장수', mark: 'clock', color: 'mint', unit: '살' } };
const stageNames = STAGES.map((stage) => `<li>${stage.label}</li>`).join('');
const lifeCaption = (player) => `${player.age}살 · ${CAREERS[player.career]?.title ?? '직업 없음'}`;
const button = (action, label, mark, type = 'secondary', extra = '') =>
  `<button type="button" class="button ${type}" data-action="${action}" ${extra}>${mark ? icon(mark) : ''}<span>${label}</span></button>`;

export function topView(session, state) {
  const teacher = session?.role === 'host';
  const playing = state && state.phase !== 'lobby';
  const tag = session?.role === 'demo' ? '혼자 체험' : teacher ? '교사 진행실' : '교실 인생 게임';
  return `<div class="shell topbar">
    <button class="brand" type="button" data-action="home" aria-label="100년 홈"><img src="/art/icon.svg" alt="" width="36" height="36"><span>100년<small>우리들의 인생 기록장</small></span></button>
    <div class="top-actions">
      <span class="top-tag"><i></i>${tag}</span>
      ${session && session.role !== 'demo' && state ? button('share', teacher ? '초대 QR' : '초대 링크', teacher ? 'qr' : 'link', 'quiet') : ''}
      ${button('help', playing ? '메뉴' : '게임 안내', playing ? 'settings' : 'book', 'quiet')}
    </div>
  </div>`;
}

function jobGuide(life) {
  const path = life && pathOf(life);
  const current = path?.retired === null && !life.end && path.service?.status !== 'serving' ? careerPay(life) : null;
  const payParts = current && [
    `경력 ${current.years}년`, `기본 ${current.base}`, `성장: ${current.track}`,
    current.transfer && `관련 경력 ${current.transfer}년 인정`,
    current.experience && `경력 +${current.experience}`, current.skill && `${STATS[current.stat].label} +${current.skill}`,
    current.education && `대학원 +${current.education}`,
  ].filter(Boolean).join(' · ');
  return `
    ${current ? `<section class="current-pay"><strong>${h(CAREERS[life.career].title)} · 연봉 ${current.total}코인</strong>
      <p class="field-note">${h(payParts)}</p></section>` : ''}
    <label class="job-search-label">직업 찾기<input id="job-search" type="search" placeholder="직업 이름이나 조건" autocomplete="off"></label>
    <p class="field-note" id="job-no-match" role="status" hidden>찾는 직업이 없어요.</p>
    <ul class="job-guide-list">${Object.entries(CAREERS).map(([id, job]) => {
      const requirements = [
        CAREER_CREDENTIALS[job.education],
        ...Object.entries(job.need ?? {}).map(([stat, minimum]) => {
          const need = life ? Math.max(1, minimum - chanceDiscount(life, id, stat)) : minimum;
          return `${STATS[stat].label} ${need}${STATS[stat].unit ?? '점'}`;
        }),
        job.latestStart && `${job.latestStart}살까지 지원`,
        job.startup && `시작 비용 ${job.startup}코인`,
        `정년 ${retirementAge(id)}세`,
      ].filter(Boolean);
      const growth = careerGrowth(id);
      const growthLine = `${growth.label} · ${growth.steps.join('·')}년차 이후 +${growth.raise}코인씩`;
      return `<li class="job-guide-entry">
        <div class="job-guide-heading"><h3>${h(job.title)}</h3><span>기본 연봉 ${job.wage}코인</span></div>
        <p>${h(job.detail)}</p>
        <p class="job-requirements"><b>연봉 성장</b> ${h(growthLine)}</p>
        <p class="job-requirements"><b>조건</b> ${h(requirements.join(' · ') || '취업 기회가 오면 바로 지원')}</p>
      </li>`;
    }).join('')}</ul>`;
}

export function gameMenuView(page, life) {
  const jobs = page === 'jobs';
  return `<nav class="tabs menu-tabs" aria-label="게임 메뉴">
    ${button('help', '플레이 팁', 'book', 'quiet', `data-id="tips" aria-pressed="${!jobs}"`)}
    ${button('help', '직업 안내', 'settings', 'quiet', `data-id="jobs" aria-pressed="${jobs}"`)}
  </nav>
  ${jobs ? jobGuide(life) : `<ul class="help-list">
    <li><b>한 해 보내기</b><p>일상 선택 한 번에 한 살 자라요. 장래희망, 진학, 치료는 같은 나이에 고르는 추가 선택이에요.</p></li>
    <li><b>하고 싶은 일 준비하기</b><p>19살부터 취업할 기회가 와요. 꿈이나 전공이 직업과 맞으면 일부 조건이 낮아져요.</p></li>
    <li><b>연봉 올리기</b><p>직업마다 경력 상승 속도가 달라요. 관련 분야로 이직하면 이전 경력의 절반을 최대 10년까지 인정받아요. 직무 능력치와 관련 대학원 수료도 반영돼요.</p></li>
    <li><b>은퇴와 노후 저축</b><p>직업별로 정년이 달라요. 저축에는 연 4% 복리가 붙고, 은퇴하면 일시금(세금 25%) 또는 10년 연금(세금 5%)을 선택해요.</p></li>
    <li><b>돈과 체력 챙기기</b><p>‘올해 변화’를 펼치면 수입, 집세, 돌봄을 확인할 수 있어요. 체력이 낮을수록 병에 걸리기 쉬워요.</p></li>
    <li><b>인생을 마친 뒤</b><p>다음 세대로 이어 살거나 영혼이 되어 기억이 남은 곳에 들를 수 있어요.</p></li>
  </ul>`}`;
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
        <div class="eyebrow">${icon('sprout')} <span>교실 인생 게임</span></div>
        <h1>같은 마을,<br>다른 <em>인생.</em></h1>
        <p>태어나고, 배우고, 살아가며 한 권의 기록을 써요.<br class="wide-only"> 친구들과 한 마을에서 각자의 이야기를 만들어 보세요.</p>
        <div class="hero-actions">
          <a class="button primary" href="#join">${icon('down')} 학생 참가</a>
          ${button('practice', '혼자 체험', 'play')}
        </div>
      </div>
      <figure class="world-card">
        <div class="world-top"><span><i></i> 100년 마을</span></div>
        <img src="/art/village.svg" alt="오렌지색 지붕의 집과 친구들이 있는 햇살 밝은 도트 마을" width="384" height="218" fetchpriority="high">
        <figcaption><span>${icon('sun')} 오늘도 맑음</span></figcaption>
      </figure>
    </section>
    <div class="chapter-road"><span>인생의 여정</span><ol>${stageNames}<li>그다음 이야기</li></ol></div>
    <section class="entry-grid" aria-label="게임 시작">
      <article id="join" class="panel entry-panel">
        <div class="entry-top"><span class="tile-icon mint">${icon('users')}</span><span class="eyebrow">학생</span></div>
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
        <div class="entry-top"><span class="tile-icon amber">${icon('board')}</span><span class="eyebrow">교사</span></div>
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
  if (path.married !== null) family.push(member(path.romance?.name ?? '배우자',
    avatar((me.avatar + 3) % AVATARS.length, 'alive', spouse), 'village-spouse'));
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
      <div class="eyebrow"><i class="status-dot"></i> ${session.role === 'demo' ? '혼자 체험' : `방 ${state.code}`} <span class="sep">/</span> ${phaseLabel(state)}</div>
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
    <summary data-focus="year-effects"><strong>올해 변화</strong><span class="delta-list">${changes(scene.base) || '<span>합계 변화 없음</span>'}</span></summary>
    <div class="year-effect-rows">${scene.yearly.map(sourceLine).join('')}</div>
  </details>`;
}

function conditionView(option) {
  if (!option.locked) return '';
  const missing = option.conditions?.filter(({ met }) => !met).map(({ label }) => label);
  return `<span class="requirement">${h(missing?.length ? `${missing.join(' · ')} 필요` : option.locked)}</span>`;
}

function choiceCard(option, me, bonus) {
  const locked = Boolean(option.locked);
  const picked = me.choice === option.id;
  const tone = ({ heart: 'rose', book: 'blue', coin: 'amber', sun: 'lime', spark: 'plum', ghost: 'plum', flower: 'plum', house: 'amber' })[option.mark] ?? 'mint';
  const effect = changes({ ...option.effect, ...(option.affection ? { affection: option.affection } : {}) });
  return `<button type="button" class="choice${picked ? ' picked' : ''}${locked ? ' locked' : ''}" data-action="${option.id === 'successor' ? 'successor' : 'choose'}" data-id="${option.id}" data-focus="choice-${option.id}"
    aria-pressed="${picked}" ${locked ? 'disabled' : ''}>
    <span class="choice-top"><span class="tile-icon ${tone}">${icon(option.mark)}</span>
      <strong>${h(option.title)}</strong>
      <span class="choice-tag" aria-hidden="true">${icon(locked ? 'lock' : picked ? 'check' : option.opportunity ? 'spark' : 'arrow')}</span></span>
    <span class="choice-detail">${h(option.detail)}</span>
    ${effect ? `<span class="choice-bottom">${option.recurring ? '<span class="effect-once">한 번</span>' : ''}${effect}</span>` : ''}
    ${option.career && option.opportunity ? '<small class="choice-dream">꿈과 이어져요</small>' : ''}
    ${recurringView(option, bonus)}
    ${conditionView(option)}
  </button>`;
}

function choiceSection(key, title, options, me, bonus, note = '') {
  if (!options.length) return '';
  return `<details class="choice-section" data-choice-section="${key}">
    <summary data-focus="section-${key}">${h(title)} <span>${options.length}개</span></summary>
    ${note ? `<p class="field-note">${h(note)}</p>` : ''}
    <div class="choice-grid">${options.map((item) => choiceCard(item, me, bonus)).join('')}</div>
  </details>`;
}

function latestView(latest) {
  if (!latest?.text || latest.text === latest.line) return '';
  return `<details class="latest" data-result="${h(latest.year + '-' + latest.type + '-' + latest.title)}">
    <summary data-focus="latest">이야기 더 보기</summary><p>${h(latest.text)}</p>
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
  const raise = !pending && result.raise;
  return `<div class="choice-feedback-note" data-choice-result="${h(key)}">
    <span class="choice-feedback-icon">${icon('book')}</span>
    <div><p><strong>${h(subject)}</strong> ${h(line)}</p>
      ${deltas || raise ? `<div class="delta-list">${deltas}
        ${raise ? `<span class="delta amber">다음 해 연봉 ${raise.from} → ${raise.to}코인</span>` : ''}</div>` : ''}</div>
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

function relationshipDetails(life) {
  const path = pathOf(life);
  const person = path.romance;
  if (!person) return '';
  const mood = person.affection >= 85 ? '아주 다정함' : person.affection >= 65 ? '다정함' :
    person.affection >= 40 ? '평범함' : person.affection >= 21 ? '서먹함' : '소원함';
  const age = Math.max(19, life.age + (person.ageOffset ?? 0));
  return `<p class="life-extra">${icon('heart')} <strong>${path.married !== null ? '배우자' : '연인'} · ${h(person.name)}</strong>
    <span>${age}세 · ${h(CAREERS[person.career]?.title ?? '회사원')} · ${mood}</span></p>`;
}

function retirementDetails(life) {
  const path = pathOf(life);
  const account = path.savings;
  if (!account?.annual) return '';
  const details = path.retired === null
    ? `매년 ${account.annual}코인 적립 · 연 4% 복리`
    : account.payoutMode === 'lump'
      ? `일시금 ${numeral(retirementLumpSum(account))}코인 수령 · 세금 ${numeral(retirementTax(account, 'lump'))}코인`
      : account.payoutMode === 'pension'
        ? `10년간 매년 ${numeral(retirementPayout(account))}코인 · 세금 ${numeral(retirementTax(account))}코인`
        : '은퇴 저축 수령 방식을 선택할 수 있어요';
  const totalLabel = path.retired === null ? '노후 저축' : '노후 적립 총액';
  return `<p class="life-extra">${icon('coin')} <strong>${totalLabel} · ${numeral(account.balance)}코인</strong>
    <span>${details}</span></p>`;
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
    const lockedJobs = scene.key === 'career' ? scene.choices.filter(({ locked }) => locked) : [];
    const college = scene.key === 'education' ? scene.choices.filter(({ educationGroup }) => educationGroup === 'college') : [];
    const further = scene.key === 'education' ? scene.choices.filter(({ educationGroup }) => educationGroup === 'further') : [];
    const choices = scene.choices.filter((item) => !item.educationGroup && (scene.key !== 'career' || !item.locked));
    const hint = scene.waiting || me.choice ? waiting : !choices.length ? '친구들 메뉴에서 다른 이야기를 볼 수 있어요.' : '';
    const canPass = !personal && me.mode !== 'alive' && !scene.waiting;
    body = `${roundMeta(state)}
      ${scene.bonus ? '<p class="extra-label">추가 선택 · 나이 그대로</p>' : ''}
      <h2 tabindex="-1">${h(scene.title)}</h2><p class="subtle scene-detail">${h(scene.detail)}</p>
      ${scene.healthWarning ? `<p class="health-warning">${icon('heart')} 큰 병을 치료 중이에요. 올해는 체력을 아껴요.</p>` : ''}
      ${me.mode === 'fork' && me.life.end ? `<p class="fork-note">${icon('book')} ${h(me.life.end.note)}</p>` : ''}
      <div class="choice-grid">${choices.map((item) => choiceCard(item, me, scene.bonus)).join('')}</div>
      ${choiceSection('college', '대학 진학', college, me, scene.bonus, '가족 지원을 뺀 본인 부담만 표시해요.')}
      ${choiceSection('further', '대학원·직업훈련', further, me, scene.bonus)}
      ${choiceSection('career-locked', '조건이 필요한 직업', lockedJobs, me, scene.bonus)}
      ${hint || canPass ? `<div class="choice-footer">${hint ? `<span>${hint}</span>` : ''}
        ${canPass ? button('choose', me.choice === 'pass' ? '기다리기를 골랐어요' : '이번엔 기다리기', 'clock', 'quiet', 'data-id="pass"') : ''}</div>` : ''}
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
          ${statGrid(me.life.stats, pathOf(me.life).romance)}
          ${relationshipDetails(me.life)}
          ${retirementDetails(me.life)}
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
    ${statGrid(life.stats, pathOf(life).romance)}
    ${relationshipDetails(life)}
    ${retirementDetails(life)}
    ${notes.length ? `<h3>지나온 길</h3><div class="life-chips">${notes.map((note) => `<span>${h(note)}</span>`).join('')}</div>` : ''}
    <h3>인생 연대기</h3>
    ${entries.length ? `<ol class="timeline">${entries.map((entry) => `<li>
      <span class="timeline-year">${entry.type === 'spirit' ? '영혼' : `${entry.decisionAge ?? entry.age}살`}${entry.type === 'bonus' ? '<small>추가 선택</small>' : ''}</span><div><strong>${h(entry.title)}</strong>
        ${entry.text || entry.line ? `<p>${h(entry.text || entry.line)}</p>` : ''}<div class="delta-list">${changes(entry.changes)}</div></div>
    </li>`).join('')}</ol>` : '<p class="subtle">첫 선택을 기다리고 있어요.</p>'}
  `;
}
