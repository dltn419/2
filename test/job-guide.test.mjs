import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CAREERS, CAREER_PROMOTIONS } from '../public/content.mjs';
import { gameMenuView } from '../public/views.mjs';

const guide = () => gameMenuView('jobs', null);
const baseCareers = Object.entries(CAREERS).filter(([, job]) => !job.promotionFrom && !job.legacyPromotion);

test('직업 안내 기본 목록에는 초기 직업만 표시하고 요약은 접혀 있다', () => {
  const html = guide();
  assert.equal([...html.matchAll(/class="job-guide-entry"/g)].length, baseCareers.length);
  assert.equal([...html.matchAll(/<details class="job-guide-card">/g)].length, baseCareers.length);
  assert.equal([...html.matchAll(/<summary class="job-guide-trigger">/g)].length, baseCareers.length);
  assert.match(html, /초기 연봉/);
  assert.match(html, /성장/);
  assert.match(html, /필요 조건/);
  assert.match(html, /직업을 누르면 설명과 승진 조건/);
  assert.doesNotMatch(html, /<details class="job-guide-card" open/);
});

test('교사를 누르면 교감·교장 승진 단계와 조건을 순서대로 보여준다', () => {
  const html = guide();
  const part = html.slice(html.indexOf('class="job-guide-title">초등교사'), html.indexOf('</details>', html.indexOf('class="job-guide-title">초등교사')));
  assert.ok(part);
  const a = part.indexOf('class="job-guide-title">초등교사');
  const b = part.indexOf('<strong>교감</strong>');
  const c = part.indexOf('<strong>교장</strong>');
  assert.ok(a >= 0 && b > a && c > b);
  assert.match(part, /교육대 졸업/);
  assert.match(part, /초등교사 경력 12년 이상/);
  assert.match(part, /배움 74점/);
  assert.match(part, /관계 60점/);
  assert.match(part, /교감 경력 6년 이상/);
  assert.match(part, /기본 연봉 9코인/);
  assert.equal(CAREERS.principal.promotionFrom, 'vicePrincipal');
});

test('의사 경로는 대학원 수료 조건과 높은 연봉까지 설명한다', () => {
  const html = guide();
  const start = html.indexOf('class="job-guide-title">의사');
  const part = html.slice(start, html.indexOf('</details>', start));
  assert.ok(start >= 0);
  assert.match(part, /의대 졸업과 의사 면허/);
  assert.match(part, /임상교수/);
  assert.match(part, /의사 경력 8년 이상/);
  assert.match(part, /관련 대학원 수료/);
  assert.match(part, /병원장/);
  assert.match(part, /임상교수 경력 7년 이상/);
});

test('성과형 직업은 보너스 정보가 나오되 불필요한 승진 경로가 없다', () => {
  const html = guide();
  for (const [title, bonus] of [['농부', '농작물 수확'], ['가게 주인', '가게 매출'],
    ['영상 크리에이터', '콘텐츠 광고·후원']]) {
    const start = html.indexOf(`class="job-guide-title">${title}`);
    const part = html.slice(start, html.indexOf('</details>', start));
    assert.ok(start >= 0);
    assert.match(part, /별도 승진 단계 없음/);
    assert.match(part, /성과 수입: 매년 0~/);
    assert.match(part, new RegExp(bonus));
  }
});

test('운동선수는 성과형이지만 운동 지도자·감독 전직 경로는 보인다', () => {
  const html = guide();
  const start = html.indexOf('class="job-guide-title">운동선수');
  const part = html.slice(start, html.indexOf('</details>', start));
  assert.ok(start >= 0);
  assert.match(part, /대회 성적 상금/);
  assert.match(part, /운동 지도자/);
  assert.match(part, /운동선수 경력 3년 이상/);
  assert.match(part, /운동팀 감독/);
  assert.match(part, /운동 지도자 경력 6년 이상/);
});

test('직업명과 필요 조건만 보여주는 기본 목록에서 옛 승진직은 숨긴다', () => {
  const html = guide();
  assert.doesNotMatch(html, /class="job-guide-title">농업법인 대표/);
  assert.doesNotMatch(html, /class="job-guide-title">프랜차이즈 대표/);
  for (const [id, position] of Object.entries(CAREER_PROMOTIONS)) {
    assert.ok(CAREERS[position.from] && CAREERS[id]);
  }
  assert.match(html, /id="job-search"/);
  assert.match(html, /id="job-no-match"/);
});
