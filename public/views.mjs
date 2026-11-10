import { AVATARS, CAREER_CREDENTIALS, CAREER_GROUPS, CAREER_PROMOTIONS, CAREERS, STAGES, STATS } from './content.mjs';
import { CAPACITY, MODES, PASS, RANKS, stageAt } from './game.mjs';
import { SEXES, careerGoals, careerGrowth, careerPay, chanceDiscount, lifeBadges, pathNotes, pathOf,
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


function jobRequirementList(id, job, life) {
  const need = Object.entries(job.need ?? {}).map(([stat, minimum]) => {
    const threshold = life && !job.promotionFrom ? Math.max(1, minimum - chanceDiscount(life, id, stat)) : minimum;
    return `${STATS[stat].label} ${threshold}${STATS[stat].unit ?? '점'}`;
  });
  return [
    job.promotionFrom && `${CAREERS[job.promotionFrom].title} 경력 ${job.minYears}년 이상`,
    id === 'coach' && '운동선수 경력 3년 이상',
    CAREER_CREDENTIALS[job.education],
    ...need,
    job.requiresGraduate && '관련 대학원 수료',
    job.requiresNursingTeaching && '간호학과 재학 중 교직이수',
    job.requiresNurseLicense && '간호사 면허',
    job.latestStart && `${job.latestStart}살까지 지원`,
    job.startup && `시작 비용 ${job.startup}코인`,
  ].filter(Boolean);
}

function careerPromotionRoute(id) {
  const next = Object.entries(CAREER_PROMOTIONS).filter(([, position]) => position.from === id);
  return next.flatMap(([nextId]) => [nextId, ...careerPromotionRoute(nextId)]);
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
  const baseCareers = Object.entries(CAREERS).filter(([, job]) => !job.promotionFrom && !job.legacyPromotion);
  return `
    ${current ? `<section class="current-pay"><strong>${h(CAREERS[life.career].title)} · 연봉 ${current.total}코인</strong>
      <p class="field-note">${h(payParts)}</p></section>` : ''}
    <label class="job-search-label">직업 찾기<input id="job-search" type="search" placeholder="직업명이나 승진 직급 검색" autocomplete="off"></label>
    <p class="field-note job-guide-intro">${baseCareers.length}개 직업 · 누르면 승진 경로와 조건을 볼 수 있어요.</p>
    <p class="field-note" id="job-no-match" role="status" hidden>찾는 직업이 없어요.</p>
    <div class="job-guide-categories">${CAREER_GROUPS.map((group) => `<details class="job-guide-category" data-job-category="${group.id}">
      <summary>${h(group.title)} <span>${baseCareers.filter(([, job]) => job.group === group.id).length}개</span></summary>
      <ul class="job-guide-list">${baseCareers.filter(([, job]) => job.group === group.id).map(([id, job]) => {
      const growth = careerGrowth(id);
      const growthLine = `${growth.steps.join('·')}년차 이후 +${growth.raise}코인씩`;
      const requirements = jobRequirementList(id, job, life);
      const requirementText = requirements.join(' · ') || '별도 조건 없음';
      const summaryRequirements = requirements.length > 2
        ? `${requirements.slice(0, 2).join(' · ')} 외 ${requirements.length - 2}개`
        : requirementText;
      const routeIds = careerPromotionRoute(id);
      const route = id === 'athlete' ? [...routeIds, 'coach', ...careerPromotionRoute('coach')] : routeIds;
      let familyId = life?.career;
      while (familyId && CAREERS[familyId]?.promotionFrom) familyId = CAREERS[familyId].promotionFrom;
      const inFamily = familyId === id;
      const routeHtml = route.length ? `<ol class="job-promotion-route">
        <li class="job-promotion-step">
          <div><strong>${h(job.title)}</strong><span>초기 연봉 ${job.wage}코인</span></div>
          <p>시작 · ${h(requirementText)}</p>
        </li>
        ${route.map((positionId) => {
          const position = CAREERS[positionId];
          const info = jobRequirementList(positionId, position, null);
          const conditions = positionId === 'coach'
            ? ['운동선수 경력 3년 이상', ...Object.entries(position.need ?? {}).map(([stat, value]) => `${STATS[stat].label} ${value}${STATS[stat].unit ?? '점'}`)]
            : info;
          return `<li class="job-promotion-step">
            <div><strong>${h(position.title)}</strong><span>기본 연봉 ${position.wage}코인</span></div>
            <p>${positionId === 'coach' || position.routeType === '전직' ? '전직' : position.routeType === '성장' ? '성장' : '승진'} · ${h(conditions.join(' · ') || '별도 조건 없음')}</p>
          </li>`;
        }).join('')}
      </ol>` : `<div class="job-no-promotion">
        <strong>현재 직위의 다음 단계는 없어요</strong>
        <p>경력과 능력치를 쌓거나 다른 직업을 알아볼 수 있어요.</p>
      </div>`;
      return `<li class="job-guide-entry">
        <details class="job-guide-card">
          <summary class="job-guide-trigger">
            <span class="job-guide-heading">
              <strong class="job-guide-title">${h(job.title)}</strong>
              ${inFamily ? '<span class="job-current-indicator">현재 경력</span>' : ''}
              <span class="job-guide-expand" aria-hidden="true">⌄</span>
            </span>
            <span class="job-guide-facts">
              <span>초기 연봉 <b>${job.wage}코인</b></span>
              <span class="job-growth-tag">${h(growth.label)}</span>
            </span>
            <span class="job-guide-summary-req"><b>지원 조건</b> ${h(summaryRequirements)}</span>
          </summary>
          <div class="job-guide-detail">
            <p class="job-guide-description">${h(job.detail)}</p>
            <p class="job-guide-full-req"><strong>지원 조건</strong> ${h(requirementText)}</p>
            <div class="job-guide-details-meta">
              <span><b>연봉 성장</b> ${h(growthLine)}</span>
              <span><b>정년</b> ${retirementAge(id)}세</span>
              <span><b>체력 소모</b> ${job.fatigue ? `매년 -${job.fatigue}점` : '기본 소모 없음'}</span>
            </div>
            <section class="job-promotion-detail">
              <h4>${route.length ? '승진·전직 경로와 필요 조건' : '성장 방식'}</h4>
              ${routeHtml}
            </section>
            <p class="job-guide-footnote">표시된 조건은 게임용 기준이며, 실제 직업 자격이나 승진 규정과는 다를 수 있어요.</p>
          </div>
        </details>
      </li>`;
    }).join('')}</ul></details>`).join('')}</div>`;
}

export function gameMenuView(page, life) {
  const jobs = page === 'jobs';
  return `<nav class="tabs menu-tabs" aria-label="게임 메뉴">
    ${button('help', '플레이 팁', 'book', 'quiet', `data-id="tips" aria-pressed="${!jobs}"`)}
    ${button('help', '직업 안내', 'settings', 'quiet', `data-id="jobs" aria-pressed="${jobs}"`)}
  </nav>
  ${jobs ? jobGuide(life) : `<ul class="help-list">
    <li><b>한 해씩 성장</b><p>일상 선택으로 한 살 자라요. 진학·치료·저축은 같은 나이에 추가로 선택해요.</p></li>
    <li><b>직업과 성장</b><p>모든 직업에서 경력과 조건을 채워 다음 단계에 도전할 수 있어요.</p></li>
    <li><b>돈과 건강</b><p>‘올해 변화’에서 수입과 생활비를 확인해요. 체력이 낮으면 병에 걸릴 위험이 커져요.</p></li>
    <li><b>노후 준비</b><p>적금에는 연 4% 복리가 붙어요. 중·노년에는 국채·펀드·주식 투자도 선택할 수 있어요.</p></li>
    <li><b>다음 세대</b><p>삶을 마친 뒤 자녀나 다음 세대로 이어 살거나, 영혼이 되어 이야기를 남길 수 있어요.</p></li>
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
        <p>태어나고, 배우고, 선택하며 나만의 인생을 만들어 봐요.</p>
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
        <p class="subtle">${code ? '초대 코드가 입력돼 있어요. 별명을 골라 주세요.' : '선생님이 알려 준 방 코드로 참가해요.'} 게임이 이미 시작됐어도 참가할 수 있고, 0살부터 시작해요.</p>
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
        <p class="subtle">최대 20명 · 방을 만들고 QR로 초대하세요.</p>
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
    <p class="field-note">${personal ? '학생마다 자기 속도로 진행해요.' :
      '전원이 선택하거나 제한 시간이 끝나면 다음 해로 넘어가요. 0초는 시간 제한이 없어요.'}</p>
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

function roster(players, { teacher = false, lobby = false, kickable = false, meId } = {}) {
  if (!players.length) return `<div class="empty">${icon('users')}<strong>아직 참가자가 없어요</strong><span>참가 코드나 초대 링크를 친구들에게 알려 주세요.</span></div>`;
  return `<div class="roster">${players.map((player) => `<article class="person">
    <button type="button" class="person-main" data-action="profile" data-id="${player.id}" data-focus="profile-${player.id}">
      ${avatar(player.avatar, player.mode, player.sex)}
      <span><strong>${h(player.name)}${player.id === meId ? ' <small>나</small>' : ''}</strong>
      <span class="person-caption">${lobby ? '대기실에 있어요' : h(lifeCaption(player))}</span>
      ${!lobby && player.mode !== 'alive' ? `<span class="person-caption">${MODES[player.mode]}</span>` : ''}</span>
    </button>
    ${teacher && !lobby ? `<span class="small-badge ${player.submitted ? 'mint' : 'paper'}">${player.submitted ? '제출' : '대기'}</span>` : ''}
    ${kickable ? `<button type="button" class="person-kick" aria-label="${h(player.name)} 퇴장시키기" data-action="kick" data-id="${player.id}">퇴장</button>` : ''}
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
      <h2>${teacher ? '참가자' : '함께할 친구들'}</h2>
      <p class="subtle">${teacher ? '학생이 모이면 게임을 시작하세요.' : '선생님이 시작하면 첫 번째 인생 선택이 열려요.'}</p>
      ${roster(state.players, { teacher, kickable: teacher, lobby: true, meId: state.me?.id })}
    </section>
    <aside class="stack">
      <section class="panel section-panel code-panel">
        <div class="eyebrow">${icon('link')} 참가 코드</div>
        <strong class="room-code">${state.code}</strong>
        ${teacher ? button('share', '초대 QR 크게 보기', 'qr') : button('share', '초대 링크 열기', 'copy')}
      </section>
      <section class="panel section-panel">
        <div class="section-heading"><h2>방 설정</h2>${teacher ? button('settings', '변경', 'settings', 'quiet') : ''}</div>
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

function careerGoalsView(life) {
  const goals = careerGoals(life);
  if (!goals.length) return '';
  return `<section class="career-goals" aria-label="내 승진·전직 준비 현황">
    <div class="career-goals-head"><strong>승진·전직 준비</strong></div>
    ${goals.map((goal) => {
      const missing = goal.checks.filter(({ met }) => !met);
      const summary = goal.ready
        ? '모든 조건 충족 · 다음 직업 선택 때 도전할 수 있어요'
        : `남은 조건: ${missing.map(({ label }) => label).join(' · ')}`;
      return `<details class="career-goal-card" data-career-goal="${h(goal.career)}">
        <summary>
          <span class="career-goal-main"><b>${h(goal.type)} 목표 · ${h(goal.title)}</b>
            <span class="career-goal-progress${goal.ready ? ' complete' : ''}">${goal.met}/${goal.total} 충족</span></span>
          <small class="career-goal-teaser">${h(summary)}</small>
        </summary>
        <ul class="career-goal-checks">
          ${goal.checks.map((item) => `<li class="${item.met ? 'met' : 'unmet'}">
            <span class="career-goal-check-icon" aria-hidden="true">${item.met ? '✓' : '○'}</span>
            <span class="career-goal-check-name">${h(item.label)}</span>
            <span class="career-goal-check-current">${item.required === undefined
              ? (item.met ? '수료 완료' : '수료 필요')
              : `${item.current}/${item.required}${h(item.unit)}`}</span>
            <span class="career-goal-check-state">${item.met ? '충족' : '미충족'}</span>
          </li>`).join('')}
        </ul>
        <p class="career-goal-note">조건을 채운 뒤 직업 선택 기회에 지원할 수 있어요.</p>
      </details>`;
    }).join('')}
  </section>`;
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
  const back = `<button type="button" class="choice-back" data-action="choice-back"
    data-id="${key}" aria-label="${h(title)} 목록 닫고 이전 선택지로 돌아가기">← 이전 선택지로</button>`;
  return `<details class="choice-section" data-choice-section="${key}">
    <summary data-focus="section-${key}">${h(title)} <span>${options.length}개</span></summary>
    <div class="choice-section-navigation">${back}</div>
    ${note ? `<p class="field-note">${h(note)}</p>` : ''}
    <div class="choice-grid">${options.map((item) => choiceCard(item, me, bonus)).join('')}</div>
    ${options.length > 5 ? `<div class="choice-section-navigation bottom">${back}</div>` : ''}
  </details>`;
}

// 시작 직업 60개와 조건 부족 직업을 분야별 접이식 목록으로 탐색합니다.
function careerCategoryList(key, title, options, me, bonus) {
  if (!options.length) return '';
  return `<details class="choice-section career-category-list" data-choice-section="${key}">
    <summary data-focus="section-${key}">${h(title)} <span>${options.length}개</span></summary>
    <div class="choice-section-navigation"><button type="button" class="choice-back"
      data-action="choice-back" data-id="${key}" aria-label="${h(title)} 목록 닫고 이전 선택지로 돌아가기">← 이전 선택지로</button></div>
    <div class="career-category-grid">${CAREER_GROUPS.map((group) =>
      choiceSection(`${key}-${group.id}`, group.title,
        options.filter(({ career }) => CAREERS[career]?.group === group.id), me, bonus)).join('')}</div>
    <div class="choice-section-navigation bottom"><button type="button" class="choice-back"
      data-action="choice-back" data-id="${key}" aria-label="${h(title)} 목록 닫고 이전 선택지로 돌아가기">← 이전 선택지로</button></div>
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
  const first = retirementPayout(account, 0);
  const last = retirementPayout(account, 9);
  const pensionLabel = first === last ? `${first}코인` : `${last}~${first}코인`;
  const details = path.retired === null
    ? `매년 ${account.annual}코인 적립 · 연 4% 복리 (정수 내림)`
    : account.payoutMode === 'lump'
      ? `일시금 ${retirementLumpSum(account)}코인 수령 · 세금 ${retirementTax(account, 'lump')}코인`
      : account.payoutMode === 'pension'
        ? `10년간 매년 ${pensionLabel} · 세금 ${retirementTax(account)}코인`
        : '은퇴 저축 수령 방식을 선택할 수 있어요';
  const totalLabel = path.retired === null ? '노후 저축' : '노후 적립 총액';
  return `<p class="life-extra">${icon('coin')} <strong>${totalLabel} · ${Math.floor(account.balance ?? 0)}코인</strong>
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
    const careerScene = scene.key === 'career';
    const advancing = careerScene ? scene.choices.filter(({ careerGroup }) => careerGroup === 'advancement') : [];
    const currentJob = careerScene && me.life.career;
    const otherJobs = currentJob ? scene.choices.filter(({ careerGroup, locked }) =>
      careerGroup === 'other' && !locked) : [];
    const starterJobs = careerScene && !currentJob
      ? scene.choices.filter(({ careerGroup, locked }) => careerGroup === 'other' && !locked)
      : [];
    const lockedJobs = careerScene ? scene.choices.filter(({ locked, careerGroup }) =>
      locked && careerGroup !== 'advancement') : [];
    const college = scene.key === 'education' ? scene.choices.filter(({ educationGroup }) => educationGroup === 'college') : [];
    const further = scene.key === 'education' ? scene.choices.filter(({ educationGroup }) => educationGroup === 'further') : [];
    const choices = scene.choices.filter((item) => !item.educationGroup &&
      (!careerScene || (!item.locked && item.careerGroup !== 'advancement' &&
        (!currentJob || item.id === 'rest'))));
    const hint = scene.waiting || me.choice ? waiting : !choices.length ? '친구들 메뉴에서 다른 이야기를 볼 수 있어요.' : '';
    const canPass = !personal && me.mode !== 'alive' && !scene.waiting;
    body = `${roundMeta(state)}
      ${scene.bonus ? '<p class="extra-label">추가 선택 · 나이 그대로</p>' : ''}
      <h2 tabindex="-1">${h(scene.title)}</h2><p class="subtle scene-detail">${h(scene.detail)}</p>
      ${scene.healthWarning ? `<p class="health-warning">${icon('heart')} 큰 병을 치료 중이에요. 올해는 체력을 아껴요.</p>` : ''}
      ${me.mode === 'fork' && me.life.end ? `<p class="fork-note">${icon('book')} ${h(me.life.end.note)}</p>` : ''}
      ${yearlyView(scene)}
      ${me.mode === 'alive' ? careerGoalsView(me.life) : ''}
      <div class="choice-grid">${choices.map((item) => choiceCard(item, me, scene.bonus)).join('')}</div>
      ${advancing.length ? `<section class="career-advancements">
        <div class="section-heading"><h3>승진·전직 기회</h3><span class="small-badge mint">${advancing.length}개</span></div>
        <div class="choice-grid">${advancing.map((item) => choiceCard(item, me, scene.bonus)).join('')}</div>
      </section>` : ''}
      ${careerCategoryList('career-start', '직업 분야 고르기', starterJobs, me, scene.bonus)}
      ${careerCategoryList('career-other', '다른 직업 보기', otherJobs, me, scene.bonus)}
      ${choiceSection('college', '대학 진학', college, me, scene.bonus, '가족 지원을 뺀 본인 부담만 표시해요.')}
      ${choiceSection('further', '대학원·직업훈련', further, me, scene.bonus)}
      ${careerCategoryList('career-locked', '조건이 필요한 직업', lockedJobs, me, scene.bonus)}
      ${hint || canPass ? `<div class="choice-footer">${hint ? `<span>${hint}</span>` : ''}
        ${canPass ? button('choose', me.choice === 'pass' ? '기다리기를 골랐어요' : '이번엔 기다리기', 'clock', 'quiet', 'data-id="pass"') : ''}</div>` : ''}
      ${personal || session.role === 'demo' ? '' : `<div class="submission-note"><span>${icon('users')} ${progress}</span></div>`}
      ${latestView(me.latest)}`;
  }
  const storyKey = `${state.turn.number}-${me.scene?.key ?? phase}-${Boolean(me.scene?.waiting)}`;
  return `<div class="play-grid">
    <div class="play-sidebar">
      ${roomHero(session, state)}
      <aside class="stack play-stats">
        <section class="panel section-panel">
          <div class="section-heading"><h2>${me.mode === 'alive' ? '능력치' : '마지막 능력치'}</h2></div>
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
      <div class="section-heading teacher-roster-heading"><h2>${ended ? '우리 반 최종 기록' : personal ? '학생 현황' : '선택 현황'}</h2>
        <span class="roster-total">${players.length} / ${CAPACITY}명</span></div>
      ${ended ? '' : '<p class="field-note roster-hint">진행 중에도 QR이나 참가 코드로 입장 가능 · 새 학생은 0살부터 시작</p>'}
      ${phase === 'play' && !personal ? `<div class="progress-card"><span>선택 제출</span><strong>${submitted} / ${players.length}명</strong><span class="progress-bar"><i style="width:${(players.length ? submitted * 100 / players.length : 0)}%"></i></span></div>` : ''}
      ${roster(players, { teacher: phase === 'play' && !personal, kickable: phase === 'play' })}
    </section>
    <aside class="stack">
      <section class="panel section-panel control-panel">
        ${roundMeta(state)}
        <h2>${ended ? '수업 마감' : '진행 제어'}</h2>
        <p class="subtle">${ended ? h(state.endReason) : paused ? '학생의 선택을 잠시 멈췄어요.' : personal ? '학생마다 자기 속도로 한 해씩 진행해요.' :
          state.turn.auto ? '전원이 고르거나 시간이 끝나면 다음 해가 열려요.' : '학생들이 다 고르면 올해를 마감하세요.'}</p>
        ${ended ? `<div class="stack compact">
            ${button('pane', '최종 순위 보기', 'trophy', 'primary full', 'data-id="rank"')}
            ${button('reset-room', '방 초기화 · 새 게임 준비', 'settings', 'quiet danger full')}
            <p class="field-note">초기화하면 참가자와 인생 기록이 삭제돼요. 방 코드와 설정은 그대로예요.</p>
          </div>` :
          `<div class="stack compact">
            ${paused ? button('resume', '계속 진행', 'play', 'primary full', 'data-focus="teacher-next"') :
              personal ? '' : button('advance', '올해 마감', 'arrow', 'primary full', 'data-focus="teacher-next"')}
            ${paused ? '' : button('pause', '일시정지', 'pause', 'secondary full', 'data-focus="pause"')}
            ${button('finish', '전체 게임 마감', 'flag', 'quiet danger', 'data-focus="finish"')}
          </div>`}
      </section>
      <section class="panel section-panel">
        <details class="teacher-settings">
          <summary><strong>방 설정</strong><span>${state.settings.pace === 'personal' ? '각자 진행' : state.settings.pace === 'auto' ? '자동 진행' : '교사 마감'} · 최대 ${state.settings.maxAge}살</span></summary>
          ${settingsSummary(state.settings)}
          ${ended || personal ? '' : button('settings', '설정 변경', 'settings', 'quiet')}
        </details>
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
        <div class="eyebrow">${icon('users')} 친구들</div>
        <h2>친구들의 인생</h2><p class="subtle">친구를 누르면 인생 기록을 볼 수 있어요.</p>
        ${roster(state.players, { meId: state.me?.id, kickable: teacher && state.phase === 'play' })}</section>` : teacherView(state)}`}
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
    <p class="field-note timeline-hint">선택을 누르면 그해의 자세한 이야기를 볼 수 있어요.</p>
    ${entries.length ? `<ol class="timeline">${entries.map((entry) => `<li>
      <details class="timeline-entry">
        <summary>
          <span class="timeline-year">${entry.type === 'spirit' ? '영혼' : `${entry.decisionAge ?? entry.age}살`}${entry.type === 'bonus' ? '<small>추가 선택</small>' : ''}</span>
          <span class="timeline-main"><strong>${h(entry.title)}</strong>
            ${changes(entry.changes) ? `<span class="delta-list">${changes(entry.changes)}</span>` : ''}
          </span>
        </summary>
        ${entry.text || entry.line ? `<p class="timeline-description">${h(entry.text || entry.line)}</p>` : '<p class="timeline-description">이때의 선택을 기록했어요.</p>'}
      </details>
    </li>`).join('')}</ol>` : '<p class="subtle">첫 선택을 기다리고 있어요.</p>'}
  `;
}
