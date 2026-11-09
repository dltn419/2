import { CAREER_CREDENTIALS, CAREER_GROWTH, CAREERS, HABITS, pick } from './content.mjs';
import { finishCare, illnessCare } from './health.mjs';

export const SEXES = { male: '남자', female: '여자' };
export const SCHOOLS = { general: '일반고', science: '과학고', gifted: '영재학교', vocational: '직업계고', arts: '예술고', outside: '학교 밖 진로' };
export const DREAMS = {
  science: { label: '과학과 연구', title: '궁금한 것을 알아봐요.', mark: 'book' },
  biology: { label: '생명과학', title: '동물, 식물, 우리 몸을 연구해요.', mark: 'leaf' },
  art: { label: '그림과 음악', title: '작품을 만들고 보여 줘요.', mark: 'spark' },
  media: { label: '영상과 방송', title: '재미있는 영상을 만들어 나눠요.', mark: 'play' },
  sports: { label: '운동과 스포츠', title: '훈련하고 경기에 나가요.', mark: 'flag' },
  tech: { label: '기술과 만들기', title: '손으로 고치고 만들어요.', mark: 'settings' },
  people: { label: '돌봄과 봉사', title: '도움이 필요한 이웃과 함께해요.', mark: 'link' },
  medical: { label: '보건과 의료', title: '아픈 사람의 몸을 살피고 도와요.', mark: 'heart' },
  education: { label: '학교와 교육', title: '아이들이 배우도록 가르쳐요.', mark: 'board' },
  office: { label: '회사와 사무', title: '문서와 일정을 정리해요.', mark: 'book' },
  public: { label: '주민을 돕는 일', title: '동네를 더 살기 좋게 만들어요.', mark: 'house' },
  sales: { label: '판매와 서비스', title: '사람을 만나 물건을 소개해요.', mark: 'link' },
  food: { label: '음식과 조리', title: '사람들에게 맛있는 음식을 만들어요.', mark: 'sun' },
  farm: { label: '농사와 자연', title: '작물을 심고 돌봐요.', mark: 'sprout' },
  business: { label: '가게 운영', title: '내 가게를 꾸려요.', mark: 'coin' },
  explore: { label: '아직 모르겠어요', title: '더 알아본 뒤에 정해요.', mark: 'leaf' },
};

// 장래희망은 관심 분야만 넓게 기록하고, 대학 전공과 직업 자격은 별도로 결정합니다.
// 이전 버전의 세부 장래희망(DREAMS)은 기존 기록을 위해 그대로 유지합니다.
export const DREAM_OPTIONS = {
  stem: { label: '과학·기술·자연', title: '연구, 기술, 생명과 자연이 궁금해요.', mark: 'book',
    fields: ['science', 'biology', 'tech', 'medical', 'farm'] },
  society: { label: '사람·사회·경제', title: '사람을 돕거나 사회와 경제를 움직이고 싶어요.', mark: 'link',
    fields: ['people', 'medical', 'education', 'office', 'public', 'sales', 'business'] },
  creative: { label: '예술·체육·창작', title: '예술, 방송, 운동, 요리로 나를 표현하고 싶어요.', mark: 'spark',
    fields: ['art', 'media', 'sports', 'food'] },
  explore: { label: '아직 모르겠어요', title: '다양한 일을 알아보고 나중에 정해요.', mark: 'leaf', fields: [] },
};

const SERVICE_LIMIT = 28;
const COMMUNITY_HEALTH = 40;
const CAREER_BY_TITLE = new Map(Object.entries(CAREERS).map(([id, job]) => [job.title, id]));

const PROGRAMS = {
  college: { label: '전문대', years: 2, familyCopay: 1 },
  university: { label: '대학', years: 4, familyCopay: 2 },
  graduate: { label: '대학원', years: 2, cost: 9 },
  medicine: { label: '의대', years: 6, familyCopay: 4 },
  nursing: { label: '간호학과', years: 4, familyCopay: 2 },
  teaching: { label: '교육대', years: 4, familyCopay: 3 },
  training: { label: '직업훈련', years: 1, cost: 3 },
  caregiving: { label: '돌봄 교육', years: 1, cost: 4 },
};

const LICENSES = {
  medicine: { title: '의사', choice: 'doctor-license', record: 'licenseAge', learning: 92 },
  nursing: { title: '간호사', choice: 'nurse-license', record: 'nursingLicenseAge', learning: 53 },
};

const PARTNER_NAMES = {
  male: ['철수', '민수', '영수', '준호', '지훈'],
  female: ['영희', '지영', '수진', '민지', '지은'],
};
const PARTNER_CAREERS = [
  'crew', 'staff', 'factory', 'care', 'farmer', 'studio', 'cook', 'caregiver', 'sales',
  'marketing', 'tech', 'creator', 'civil', 'teacher', 'nurse', 'lab', 'developer', 'shop', 'restaurant',
];
const RETIREMENT_YEARS = 10;
const SAVINGS_RATE = 0.04;
const LUMP_TAX = 0.25;
const PENSION_TAX = 0.05;
const roundCoins = (value) => Math.round(value * 100) / 100;
export const retirementAge = (career) => {
  const job = CAREERS[career];
  return job?.retireAt ?? (job?.promotionFrom ? retirementAge(job.promotionFrom) : 65);
};
export const careerGrowth = (career) => CAREER_GROWTH[CAREERS[career]?.growth ?? 'stable'];

export function newPath(sex = null) {
  return { sex, dreams: [], school: null, diploma: false, program: null, degree: null, training: false,
    service: null, partner: null, romance: null, romanceSeed: 0, married: null, children: [],
    retired: null, savings: null, savingsReview: null, workYears: {}, home: null, illness: null, recoveredAt: null, habit: null };
}

const EMPTY_PATH = newPath();
export const pathOf = (life) => life.path ?? EMPTY_PATH;
const mostRecentDream = (path) => path.dreams.at(-1)?.field ?? 'explore';
const dreamFields = (field) => DREAM_OPTIONS[field]?.fields ?? [field];
const dreamIncludes = (dream, field) => dreamFields(dream).includes(field);
const studyFieldFor = (dream) => ({ stem: 'science', society: 'people', creative: 'art' })[dream] ?? dream;
const fieldLabel = (field) => DREAM_OPTIONS[field]?.label ?? DREAMS[field]?.label ?? DREAMS.explore.label;
const isStem = (field) => ['science', 'tech', 'stem'].includes(field);
const degreesOf = (path) => [...(path.previousDegrees ?? []), ...(path.degree ? [path.degree] : [])];
const undergraduate = (degrees) => degrees.findLast(({ kind }) => kind !== 'college' && kind !== 'graduate');
const jobFields = (job) => [job?.field, ...(job?.related ?? [])].filter(Boolean);
const promotionTenure = (path, career) => {
  const parent = CAREERS[career]?.promotionFrom;
  return (path.workYears?.[career] ?? 0) + (parent ? promotionTenure(path, parent) : 0);
};

function encounter(life) {
  const path = pathOf(life);
  const seed = ((path.romanceSeed ?? 0) ^ Math.imul(life.age, 2654435761)) >>> 0;
  const sex = path.sex === 'female' ? 'male' : 'female';
  const names = PARTNER_NAMES[sex];
  const age = Math.max(19, life.age + (seed % 7) - 3);
  const career = PARTNER_CAREERS[Math.floor(seed / 7) % PARTNER_CAREERS.length];
  return { name: names[Math.floor(seed / 31) % names.length], career,
    ageOffset: age - life.age, metAge: life.age, affection: 55 };
}

export const partnerAge = (life) => life.age + (pathOf(life).romance?.ageOffset ?? 0);

function spouseContribution(life) {
  const person = pathOf(life).romance;
  if (!person) return 0;
  const age = partnerAge(life);
  if (age >= 65) return 1;
  const base = CAREERS[person.career]?.wage ?? 3;
  const growth = Math.min(2, Math.floor(Math.max(0, age - (person.metAge + person.ageOffset)) / 10));
  return Math.max(1, Math.floor(base * 0.7) + growth);
}

// 게임 속 세금 규칙: 일시금 25%, 10년 연금 5%. 연금은 소수 첫째 자리까지 지급합니다.
const savingsBalance = (savings) => Math.floor(Math.max(0, savings?.balance ?? 0));
export const retirementLumpSum = (savings) =>
  Math.floor(savingsBalance(savings) * (1 - LUMP_TAX));
export const retirementNetPension = (savings) =>
  Math.floor(savingsBalance(savings) * (1 - PENSION_TAX));
// 소수 코인을 쓰지 않도록, 연금의 나머지 코인을 앞쪽 지급 연도에 1코인씩 배분합니다.
export const retirementPayout = (savings, yearIndex = 0) => {
  const net = retirementNetPension(savings);
  return Math.floor(net / RETIREMENT_YEARS) + (yearIndex < net % RETIREMENT_YEARS ? 1 : 0);
};
export const retirementTax = (savings, mode = savings?.payoutMode === 'lump' ? 'lump' : 'pension') =>
  savingsBalance(savings) - (mode === 'lump' ? retirementLumpSum(savings) : retirementNetPension(savings));
const scene = (title, detail, choices, after = '') => ({ title, detail, choices, after });
const rest = (title = '쉬어 가기', detail = '잠시 숨을 고르고 쉬어요.', effect = { health: 3, joy: 1 }) => pick('rest', title, detail, 'leaf', effect);
const option = (id, title, detail, mark, effect, kind, value, after, extra = {}) =>
  pick(id, title, detail, mark, effect, { action: { kind, value }, after, ...extra });

const CHILDHOOD = [
  scene('세상에 온 첫해', '누군가 나를 꼭 안아 줘요.', [
    pick('birth-voice', '목소리 듣기', '내 이름을 불러 줘요.', 'link', { bond: 1, joy: 1 }, {
      narration: '가족이 처음 이름을 불러 주자 작은 눈을 떴어요.',
      after: '그날 가족이 가장 많이 한 말은 내 이름이었대요.',
    }),
    pick('birth-light', '햇빛 바라보기', '벽에 비친 빛을 봐요.', 'sun', { learning: 1, art: 1 },
      { narration: '벽을 따라 움직이는 햇빛을 눈으로 좇았어요.' }),
    rest('품에서 잠들기', '따뜻한 품에서 스르르 잠들어요.', { health: 2 }),
  ]),
  scene('첫걸음', '누군가 두 팔을 벌리고 기다려요.', [
    pick('first-steps', '한 발 내딛기', '소파를 잡은 손을 놓아요.', 'heart', { health: 2, joy: 1 },
      { narration: '소파에서 손을 떼고 처음으로 혼자 한 걸음을 내디뎠어요.' }),
    pick('first-reach', '손잡고 걷기', '한 발씩 함께 걸어요.', 'link', { bond: 2, health: 1 }),
    rest('공 굴리기', '공을 따라 손을 뻗어요.', { art: 1, learning: 1 }),
  ], '처음 걷던 날 이야기를 집에서는 몇 번이나 다시 했어요.'),
  scene('말을 배우는 날', '아는 말이 하나씩 늘어요.', [
    pick('first-word', '이름 따라 말하기', '컵, 문, 우산을 말해요.', 'book', { learning: 2, bond: 1 }),
    pick('little-song', '노래 따라 부르기', '좋아하는 부분을 불러요.', 'spark', { art: 2, joy: 1 }),
    rest('그림책 보기', '좋아하는 그림을 다시 봐요.', { art: 1, learning: 1 }),
  ]),
  scene('혼자 해 볼래', '이제는 내가 해 보고 싶은 게 생겨요.', [
    pick('try-socks', '양말 신어 보기', '뒤집어 신어도 다시 해요.', 'heart', { health: 1, learning: 2 }),
    pick('try-together', '블록 집 만들기', '무너지면 함께 쌓아요.', 'spark', { art: 2, bond: 1 }),
    rest('도움받기', '어려운 건 손을 빌려요.', { joy: 1, bond: 1 }),
  ]),
  scene('새로운 신발장', '작은 신발장에 내 이름이 있어요.', [
    pick('new-room', '친구에게 인사하기', '친구 옆에서 같이 놀아요.', 'link', { bond: 2, joy: 1 }),
    pick('small-drawing', '크레파스로 그리기', '살고 있는 집을 그려요.', 'spark', { art: 2, learning: 1 },
      { narration: '크레파스로 집을 그리고 창문마다 좋아하는 색을 칠했어요.' }),
    rest('손잡고 들어가기', '마음의 준비를 하고 들어가요.', { health: 1, joy: 1 }),
  ]),
  scene('가게 놀이', '종이돈과 빈 상자로 가게를 만들어요.', [
    pick('play-store', '가게 주인 되기', '손님에게 무엇이 필요한지 물어요.', 'coin', { learning: 2, bond: 1 }),
    pick('play-stage', '가게 간판 그리기', '상자에 그림을 그려요.', 'spark', { art: 2, joy: 1 }),
    rest('친구와 놀이터 가기', '함께 미끄럼틀을 타요.', { health: 2, bond: 1 }),
  ]),
  scene('새 가방', '내년에는 초등학교에 가요.', [
    pick('name-tag', '이름표 쓰기', '공책에 이름을 써요.', 'book', { learning: 2, joy: 1 }),
    pick('school-route', '학교 가는 길 걷기', '학교까지 함께 걸어 봐요.', 'heart', { health: 2, bond: 1 }),
    rest('친구와 한 번 더 놀기', '저녁까지 신나게 놀아요.', { health: 1, joy: 2 }),
  ], '가방이 내 등보다 커 보이던 때는 금세 지나갔어요.'),
];

const SCHOOL_YEARS = {
  7: scene('초등학교 첫날', '새 교실에 내 자리가 생겼어요.', [
    pick('first-desk', '짝에게 인사하기', '짝의 이름을 물어봐요.', 'link', { bond: 3, joy: 1 }),
    pick('first-class', '교실 살펴보기', '책과 색연필이 어디 있는지 봐요.', 'book', { learning: 3, art: 1 }),
    rest('학교에 익숙해지기', '하루씩 천천히 적응해요.'),
  ]),
  8: scene('쉬는 시간', '종이 치자 친구들이 달려 나가요.', [
    pick('playground-team', '운동장에서 뛰기', '친구와 공놀이를 해요.', 'heart', { health: 3, bond: 2 }),
    pick('school-library', '책 한 권 빌리기', '도서실에서 마음에 드는 책을 골라요.', 'book', { learning: 3, art: 1 }),
    rest('친구 옆에서 쉬기', '같이 앉아 이야기를 해요.'),
  ]),
  9: scene('우리 반 첫 발표', '친구들에게 좋아하는 것을 소개해요.', [
    pick('class-talk', '앞에서 말하기', '떨려도 천천히 말해요.', 'book', { learning: 3, bond: 2 }),
    pick('class-picture', '발표 그림 그리기', '말로 어려운 부분은 그림으로 보여 줘요.', 'spark', { art: 3, joy: 2 }),
    rest('친구 발표 듣기', '다음에 소개할 것을 생각해요.'),
  ]),
  10: scene('우리 반 작은 전시', '교실 벽에 친구들의 작품을 걸어요.', [
    pick('class-display', '작품 만들기', '올해 기억하고 싶은 일을 그려요.', 'spark', { art: 4, joy: 1 }),
    pick('class-guide', '작품 소개하기', '친구들에게 작품 이야기를 들려줘요.', 'book', { learning: 3, bond: 2 }),
    rest('친구 작품 보기', '마음에 드는 작품에 쪽지를 남겨요.'),
  ]),
  11: scene('내가 잘하는 일', '친구가 어떻게 하는지 물어봐요.', [
    pick('class-share', '친구에게 알려 주기', '먼저 배운 방법을 보여 줘요.', 'link', { bond: 3, learning: 2 }),
    pick('class-practice', '좋아하는 것 연습하기', '방과 후에 조금 더 해 봐요.', 'spark', { art: 4, health: -1 }),
    rest('하루 쉬기', '집에 일찍 가서 쉬어요.'),
  ]),
  12: scene('초등학교 졸업', '사물함 바닥에 내 이름을 쓴 지우개가 남았어요.', [
    pick('primary-letter', '친구에게 편지 쓰기', '같이 웃었던 날을 한 줄 적어요.', 'link', { bond: 4, joy: 2 }, {
      narration: '친구에게 함께 웃었던 날을 적어 졸업 편지를 건넸어요.',
      after: '친구는 나중에도 그 편지를 필통에 넣어 뒀대요.',
    }),
    pick('primary-drawing', '교실 그림 그리기', '잊기 전에 창가와 책상을 그려요.', 'spark', { art: 4, learning: 1 }),
    rest('교실 한 바퀴 돌기', '내 자리에서 보던 풍경을 다시 봐요.'),
  ]),
  13: scene('중학교 첫날', '수업마다 다른 선생님이 들어와요.', [
    pick('middle-club', '동아리 구경하기', '새 친구를 만나요.', 'link', { bond: 3, joy: 2 }),
    pick('middle-notes', '공부 방법 찾기', '친구가 필기한 노트를 보고 배워요.', 'book', { learning: 4, health: -1 }),
    rest('새 시간표 익히기', '다음 수업을 차근차근 준비해요.'),
  ]),
  14: scene('동아리 발표회', '올해 함께 배운 걸 보여 줄 시간이에요.', [
    pick('club-show', '무대에 오르기', '친구와 연습한 걸 보여 줘요.', 'spark', { art: 4, bond: 2 }),
    pick('club-plan', '발표 준비 돕기', '해야 할 일과 순서를 정해요.', 'book', { learning: 4, bond: 2 }),
    rest('객석에서 응원하기', '친구들에게 박수를 보내요.'),
  ]),
  15: scene('고등학교 알아보기', '학교마다 어떤 걸 배우는지 살펴봐요.', [
    pick('high-explore', '학교 설명회 가기', '수업과 동아리가 궁금해요.', 'book', { learning: 4, bond: 1 }),
    pick('high-workshop', '직업 체험하기', '관심 있는 일을 직접 해 봐요.', 'settings', { learning: 2, art: 3 }),
    rest('천천히 생각하기', '좋아하는 일부터 하나씩 떠올려요.'),
  ]),
  16: scene('고등학교 첫해', '새 학교에서 내게 맞는 일을 찾아봐요.', [
    pick('high-first', '새 과목에 도전하기', '모르는 것은 질문해요.', 'book', { learning: 4, health: -1 }),
    pick('high-friends', '친구와 동아리 하기', '같이 하고 싶은 활동을 골라요.', 'link', { bond: 4, art: 2 }),
    rest('새 생활에 적응하기', '무리하지 않고 하루씩 지내요.'),
  ]),
  17: scene('내가 좋아하는 과목', '이제는 더 배우고 싶은 것이 있어요.', [
    pick('high-project', '탐구 주제 정하기', '궁금한 걸 자료에서 찾아봐요.', 'book', { learning: 5, health: -1 }),
    pick('high-team', '친구와 작품 만들기', '할 일을 나누고 하나씩 완성해요.', 'spark', { art: 4, bond: 2 }),
    rest('운동하며 쉬기', '친구와 가볍게 몸을 움직여요.'),
  ]),
  18: scene('고등학교 마지막 해', '졸업 뒤에 할 일을 하나씩 준비해요.', [
    pick('high-applications', '대학과 전공 알아보기', '무엇을 배우고 싶은지 찾아봐요.', 'book', { learning: 5, health: -1 }),
    pick('high-portfolio', '내가 만든 것 모으기', '일터나 학교에 보여 줄 작품을 골라요.', 'settings', { learning: 3, art: 4 }),
    rest('졸업 사진 남기기', '늘 보던 친구들과 사진을 찍어요.'),
  ]),
};

function schoolYear(life, path) {
  const age = life.age;
  const entry = SCHOOL_YEARS[age];
  if (age < 16) return entry;
  if (path.school === 'outside') {
    return scene(['학교 밖의 첫해', '나만의 공부 계획', '다음 길을 준비하는 해'][age - 16], '관심 있는 일을 찾아 하나씩 배워요.', [
      pick('outside-portfolio', '만든 것 모아 보기', '혼자 해 본 일을 사진과 글로 남겨요.', 'settings', { learning: 3, art: 3 }),
      pick('outside-learn', '관심 있는 것 배우기', '도서관이나 배움터에서 공부해요.', 'book', { learning: 4, bond: 1 }),
      rest('쉬면서 길 찾아보기', '지금 할 수 있는 것부터 해요.'),
    ]);
  }
  const [first, ...others] = entry.choices;
  if (path.school === 'science' || path.school === 'gifted') {
    return { ...entry, choices: [
      pick(first.id, path.school === 'gifted' ? '깊이 있는 연구 해 보기' : '과학 실험과 탐구하기',
        '어려운 문제를 풀고 실험 결과를 정리해요.', 'book', { learning: path.school === 'gifted' ? 7 : 6, health: -2 }),
      ...others,
    ] };
  }
  if (path.school === 'vocational') {
    const [activity, breakChoice] = others;
    return { ...entry, choices: [
      pick(first.id, '현장에서 쓰는 기술 익히기', '공구나 장비를 써 보고 만든 것을 기록해요.', 'settings', { learning: 3, art: 3 }),
      age === 18 ? { ...activity, effect: { learning: 1, art: 5 } } : activity,
      breakChoice,
    ] };
  }
  if (path.school === 'arts') {
    return { ...entry, choices: [
      pick(first.id, '내 작품을 깊이 다듬기', '연습하고 고쳐서 새로운 작품을 완성해요.', 'spark', { art: 6, health: -2 }),
      ...others,
    ] };
  }
  return entry;
}

function dreamSurvey(life) {
  const path = pathOf(life);
  const label = life.age === 10 ? '초등학교' : life.age === 14 ? '중학교' : path.school === 'outside' ? '학교 밖' : '고등학교';
  const old = mostRecentDream(path);
  const detail = old === 'explore' ? '어떤 일이 궁금해요? 나중에 전공과 일자리를 고를 때 기억해요.'
    : `지난번에는 ‘${fieldLabel(old)}’를 골랐어요. 지금은 어때요?`;
  return scene(`${label} 장래희망`, detail, Object.entries(DREAM_OPTIONS).map(([field, dream]) =>
    option(field === 'explore' ? 'rest' : `dream-${field}`, dream.label, dream.title, dream.mark, {}, 'dream', field,
      field === 'explore' ? '천천히 찾아보기로 했어요.' : '오늘 고른 꿈을 기록장에 적었어요.',
      { narration: field === 'explore' ? '어떤 일이 마음에 드는지 조금 더 알아보기로 했어요.'
        : `장래희망 칸에 ‘${dream.label}’라고 또박또박 적었어요.` })));
}

function highSchool(life) {
  const dream = mostRecentDream(pathOf(life));
  const scienceInterest = isStem(dream) || ['medical', 'biology'].some((field) => dreamIncludes(dream, field));
  return scene('고등학교 고르기', '어디에서 무엇을 배우고 싶어요?', [
    option('high-general', '일반고 가기', '여러 과목을 배우고 진로를 찾아요.', 'book', {}, 'school', 'general',
      '새 교복을 입고 거울 앞에 한참 서 있었어요.', { narration: '새 교복을 입고 일반고의 첫 수업을 맞았어요.' }),
    option('high-science', '과학고 가기', '수학과 과학 실험을 깊이 배워요.', 'book', {}, 'school', 'science',
      '궁금한 걸 새 공책에 적었어요.', {
        need: { learning: scienceInterest ? 34 : 38 }, conditions: [], narration: '과학고 실험실에서 새 실험 노트를 펼쳤어요.',
      }),
    option('high-gifted', '영재학교 가기', '어려운 연구 과제를 해요. 배움 조건이 가장 높아요.', 'spark', {}, 'school', 'gifted',
      '몇 번씩 고친 실험 노트를 새 가방에 넣었어요.', {
        need: { learning: scienceInterest ? 45 : 50 }, conditions: [], narration: '영재학교에서 오래 품었던 질문을 첫 연구 주제로 적었어요.',
      }),
    option('high-vocational', '직업계고 가기', '직접 만들고 고치는 기술을 배워요.', 'settings', {}, 'school', 'vocational',
      '처음으로 내 손으로 기계를 움직였어요.', { narration: '직업계고 실습실에서 처음 장갑을 끼고 공구를 잡았어요.' }),
    option('high-arts', '예술고 가기', '그림이나 음악을 깊이 배워요.', 'spark', {}, 'school', 'arts',
      '좋아하던 일을 학교에서도 하게 됐어요.', {
        need: { art: dreamIncludes(dream, 'art') ? 23 : 28 }, conditions: [], narration: '예술고에 들어가 첫 작품을 준비하기 시작했어요.',
      }),
    option('rest', '학교 밖에서 배우기', '나만의 길을 찾아봐요. 나중에 검정고시도 볼 수 있어요.', 'leaf', {}, 'school', 'outside',
      '친구들과 다른 곳에서 새 학년을 맞았어요.', { narration: '학교 밖에서 배우고 싶은 일을 하나씩 찾아보기로 했어요.' }),
  ]);
}

function examChoice() {
  return option('equivalency', '고졸 검정고시 보기', '시험을 보고 고등학교를 마친 것과 같은 자격을 얻어요.', 'book', { learning: 2 },
    'diploma', true, '혼자 공부해 온 시간이 새 길을 열어 줬어요.', {
      need: { learning: 16 }, narration: '검정고시를 통과하고 오래 쓰던 공부 노트를 덮었어요.',
    });
}

function universityChoice(kind, life, engineering = false) {
  const path = pathOf(life);
  const dream = mostRecentDream(path);
  let field = { medicine: 'medical', nursing: 'medical', teaching: 'education', caregiving: 'people' }[kind]
    ?? (engineering ? 'tech' : studyFieldFor(dream));
  if (kind === 'graduate') {
    const major = undergraduate(degreesOf(path))?.field;
    field = major && major !== 'explore' ? major : CAREERS[life.career]?.field ?? studyFieldFor(dream);
  }
  const data = PROGRAMS[kind];
  const title = { university: engineering ? '이공계 대학 가기' : '4년제 대학 가기', nursing: '간호학과 가기',
    training: '일할 기술 배우기', caregiving: '돌봄 교육과 시험 준비하기' }[kind] ?? `${data.label} 가기`;
  const scienceSchool = path.school === 'gifted' ? 6 : path.school === 'science' ? 3 : 0;
  const need = {
    university: { learning: engineering ? 33 - scienceSchool : field === 'explore' ? 22 : 19 },
    medicine: { learning: 63 - scienceSchool - (dreamIncludes(dream, 'medical') ? 4 : 0) },
    nursing: { learning: dreamIncludes(dream, 'medical') ? 33 : 38, bond: 20 },
    teaching: { learning: dreamIncludes(dream, 'education') ? 42 : 47, bond: 22 },
  }[kind];
  const scholarship = kind === 'medicine' && life.stats.learning >= need.learning + 5;
  const familySupported = data.familyCopay !== undefined;
  const cost = familySupported
    ? Math.min(scholarship ? 2 : data.familyCopay, Math.max(0, life.stats.money - 1))
    : data.cost;
  const detail = kind === 'medicine' ? `6년을 배우고 의사 시험에 도전해요.${scholarship ? ' 장학금을 받아요.' : ''}`
    : { nursing: '4년 동안 간호를 배우고 간호사 시험을 준비해요.', teaching: '4년 동안 아이들을 가르치는 법을 배워요.',
      caregiving: '1년 동안 어르신을 돌보는 법을 배우고 시험을 봐요.' }[kind]
      ?? (field !== 'explore' && kind !== 'training' ? `${data.years}년 동안 ‘${fieldLabel(field)}’를 배워요.`
        : `${data.years}년 동안 새로 배우고 싶은 것을 공부해요.`);
  const narration = {
    university: engineering ? '두근거리는 마음으로 이공계 대학의 첫 실험 수업에 갔어요.'
      : '설레는 마음으로 대학교의 첫 강의실에 들어갔어요.',
    college: '전문대에 들어가 그동안 궁금했던 기술을 직접 배워 보기로 했어요.',
    graduate: '대학원에 들어가 더 오래 붙들고 싶던 질문을 연구 노트에 적었어요.',
    medicine: '의대에 들어가 사람의 몸을 배우는 첫 수업을 들었어요.',
    nursing: '간호학과에 들어가 아픈 사람을 돌보는 법을 배우기 시작했어요.',
    teaching: '교육대에 들어가 아이들에게 어떤 선생님이 될지 생각했어요.',
    training: '직업훈련을 시작하며 처음 쓸 도구를 하나씩 익혔어요.',
    caregiving: '돌봄 수업에 들어가 어르신의 하루를 돕는 법부터 배웠어요.',
  }[kind];
  return option(engineering ? 'study-engineering' : `study-${kind}`, title, detail,
    kind === 'training' ? 'settings' : field === 'medical' || kind === 'caregiving' ? 'heart' : 'book', cost ? { money: -cost } : {}, 'study', kind,
    field === 'explore' ? '처음 보는 시간표를 받아 들었어요.' : `시간표에서 ‘${fieldLabel(field)}’와 이어지는 수업을 찾았어요.`,
    { studyField: field, need, narration, educationGroup: familySupported ? 'college' : 'further', ...(need ? { conditions: [] } : {}) });
}

function licensePlan(kind) {
  const { title, choice, learning } = LICENSES[kind];
  return scene(`${title} 시험에 도전할까요?`, '공부를 마쳤어요. 시험을 통과하면 일할 면허를 얻어요.', [
    option(choice, `${title} 시험 보기`, '공부한 내용을 시험 보고 면허를 받아요.', 'book', { money: -2 },
      'license', kind, '결과를 확인하고 곁에 있던 사람에게 먼저 소식을 전했어요.', {
        need: { learning }, conditions: [], narration: `${title} 면허를 받고 기다려 준 사람에게 먼저 소식을 전했어요.`,
      }),
    rest('조금 더 준비하기', '배움을 더 쌓아 나중에 다시 도전해요.', {}),
  ]);
}

function finishedSchool(path) {
  return path.school !== 'outside' || path.diploma;
}

function careerWindow(life, path) {
  const age = life.age;
  return path.retired === null && ([19, 26, 34, 42, 50, 56].includes(age) ||
    (!life.career && [21, 23, 27, 30, 38, 46, 54, 59].includes(age)) ||
    path.degree?.age === age || Object.values(LICENSES).some(({ record }) => path[record] === age) ||
    path.trainingAge === age || path.caregivingAge === age || path.service?.endedAt === age);
}

function careerPlan(life, path) {
  const degrees = degreesOf(path);
  const bachelor = degrees.some(({ kind }) => kind !== 'college');
  const credentials = {
    school: finishedSchool(path),
    skill: path.school === 'vocational' || path.training || degrees.length > 0,
    bachelor,
    stem: degrees.some(({ kind, field }) => kind !== 'college' && isStem(field)),
    biology: degrees.some(({ kind, field }) => kind !== 'college' && ['biology', 'science'].includes(field)),
    teaching: degrees.some(({ kind }) => kind === 'teaching'),
    doctor: Number.isInteger(path.licenseAge),
    nursing: Number.isInteger(path.nursingLicenseAge),
    caregiving: Number.isInteger(path.caregivingAge),
    sports: (path.sportYears ?? 0) >= 2,
  };
  const schoolField = { science: 'science', gifted: 'science', vocational: 'tech', arts: 'art' }[path.school];
  const interests = [schoolField, ...path.dreams.flatMap(({ field }) => dreamFields(field)), ...degrees.map(({ field }) => field)];
  const current = CAREERS[life.career];
  const choices = [rest(current ? '지금 일 계속하기' : '이번에는 건너뛰기',
    current ? `지금의 직업인 ${current.title} 일을 이어가요.` : '나중에 일자리를 다시 살펴볼 수 있어요.', {})];
  const dream = mostRecentDream(path);
  for (const [career, job] of Object.entries(CAREERS)) {
    if (career === life.career || life.age > (job.latestStart ?? Infinity) ||
      life.age >= retirementAge(career) ||
      (job.promotionFrom && job.promotionFrom !== life.career) ||
      (career === 'coach' && life.career !== 'athlete')) continue;
    const fields = jobFields(job);
    const credential = job.education && { label: CAREER_CREDENTIALS[job.education], met: credentials[job.education] };
    const explored = interests.some((field) => fields.includes(field)) || (career === 'athlete' && path.sportYears > 0);
    const readyWithoutDegree = !credential && Object.entries(job.need ?? {}).every(([stat, minimum]) => life.stats[stat] >= minimum);
    const advancement = Boolean(job.promotionFrom) || (career === 'coach' && life.career === 'athlete');
    if (job.specialty && !advancement && !credential?.met && !explored && !readyWithoutDegree) continue;
    const followsDream = fields.some((field) => dreamIncludes(dream, field));
    const prerequisiteYears = job.minYears ?? (career === 'coach' ? 3 : 0);
    const conditions = [
      ...(credential ? [credential] : []),
      ...(advancement ? [{ label: `${current.title} 경력 ${prerequisiteYears}년 이상`,
        met: (path.workYears?.[life.career] ?? 0) >= prerequisiteYears }] : []),
      ...(job.requiresGraduate ? [{
        label: '관련 대학원 수료',
        met: degreesOf(path).some(({ kind, field }) => kind === 'graduate' && fields.includes(field)),
      }] : []),
    ];
    choices.push(pick(`work-${career}`, job.title, job.detail, job.mark, job.startup ? { money: -job.startup } : {}, {
      career, need: job.need, opportunity: Boolean(followsDream), careerGroup: advancement ? 'advancement' : 'other',
      strictNeed: advancement, conditions,
      narration: advancement ? `그동안의 경력을 인정받아 ${job.title}(으)로 승진했어요.`
        : followsDream ? `어릴 적 꿈을 떠올리며 ${job.title} 일을 시작했어요.`
        : `${job.title} 일을 시작하고 새 일터에서 첫날을 보냈어요.`,
      after: advancement ? `이전 일터에서 쌓은 경력을 살려 ${job.title}(으)로 승진했어요.`
        : followsDream ? `어릴 때 고른 꿈을 떠올리며 ${job.title} 일을 시작했어요.`
        : `${job.title} 일을 시작했어요. 첫날은 누구나 떨려요.`,
    }));
  }
  return scene(current ? '승진하거나 다른 직업을 찾을까요?' : '어떤 일을 할까요?',
    current ? '승진·전직 기회를 먼저 살펴보고, 다른 직업은 아래에서 펼쳐 볼 수 있어요.'
      : '지원 조건과 해마다 버는 돈을 보고 골라요. 꿈이나 전공과 맞으면 지원하기 쉬워요.', choices);
}

function educationPlan(life, path) {
  const eligible = finishedSchool(path);
  const options = [];
  const degrees = degreesOf(path);
  const dream = mostRecentDream(path);
  const completed = (kind) => degrees.some((degree) => degree.kind === kind);
  if (eligible && !degrees.some(({ kind }) => kind !== 'college')) {
    options.push(universityChoice('university', life));
    if (!completed('college')) options.push(universityChoice('college', life));
    if (!isStem(dream)) options.push(universityChoice('university', life, true));
  } else if (!eligible) options.push(examChoice());
  if (eligible && life.age <= 38 && !completed('medicine') &&
    (dreamIncludes(dream, 'medical') || path.school === 'science' || path.school === 'gifted' || life.stats.learning >= 50)) {
    options.push(universityChoice('medicine', life));
  }
  if (eligible && life.age <= 50 && !completed('nursing') &&
    (['medical', 'people'].some((field) => dreamIncludes(dream, field)) || (life.stats.learning >= 38 && life.stats.bond >= 20))) {
    options.push(universityChoice('nursing', life));
  }
  if (eligible && life.age <= 38 && !completed('teaching') &&
    (['people', 'education'].some((field) => dreamIncludes(dream, field)) || (life.stats.learning >= 42 && life.stats.bond >= 20))) {
    options.push(universityChoice('teaching', life));
  }
  if (undergraduate(degrees) && !completed('graduate')) options.push(universityChoice('graduate', life));
  if (!path.training) options.push(universityChoice('training', life));
  if (!Number.isInteger(path.caregivingAge) && (['people', 'medical'].some((field) => dreamIncludes(dream, field)) || life.stats.bond >= 28)) {
    options.push(universityChoice('caregiving', life));
  }
  if (!options.length) return null;
  const title = life.age === 19 ? '학교 다음에는?' : path.service?.endedAt === life.age ? '복무를 마친 뒤' :
    path.degree?.age === life.age ? '졸업했어요' : '더 배울까요?';
  const lookForWork = careerWindow(life, path);
  const detail = life.age === 19 && path.sex === 'male' ? '계속 배울지, 일할지 골라요. 복무 시기는 스무 살부터 정해요.'
    : '배울지, 지금의 생활을 이어갈지 골라요.';
  options.unshift(rest(lookForWork ? '일자리 살펴보기' : '지금 생활 이어가기',
    lookForWork ? '어떤 직업이 있는지 보고 골라요.' : '해 오던 일상을 이어가요.', {}));
  return scene(title, detail, options);
}

function militaryPlan(life, path) {
  const age = life.age;
  const detail = path.program ? '학교는 잠시 쉬고 2년 복무해요.' : life.career ? '일은 잠시 쉬고 2년 복무해요.' : '군대에서 2년을 보내요.';
  const choices = [option('enlist', '올해 입영하기', detail, 'flag', {},
    'service', 'start', '짐을 싸며 돌아와서 할 일을 적었어요.', { narration: '작은 짐을 챙겨 복무를 시작했어요.' })];
  choices.push(option('service-community', '마을에서 복무하기', '몸 상태에 맞춰 2년 동안 마을 일을 도와요.', 'house', {},
    'service', 'community', '마을에서 할 수 있는 일을 한 가지씩 배웠어요.',
    { conditions: [{ label: `체력 ${COMMUNITY_HEALTH}점 이하`, met: life.stats.health <= COMMUNITY_HEALTH }],
      narration: '몸에 맞는 마을 일을 도우며 복무를 시작했어요.' }));
  choices.push(option('service-exempt', '몸 상태로 복무 면제 받기', '몸이 많이 약해서 치료와 일상을 이어가요.', 'heart', {},
    'service', 'exempt', '몸을 돌보며 지금의 생활을 이어가기로 했어요.',
    { conditions: [{ label: '체력 20점 이하', met: life.stats.health <= 20 }],
      narration: '몸을 돌보며 익숙한 일상을 이어가기로 했어요.' }));
  const graduation = age + (path.program?.remaining ?? 0);
  if (graduation > age + 1 && graduation <= SERVICE_LIMIT) {
    choices.push(option('service-after-study', '졸업하고 복무하기', '지금 다니는 학교를 마치고 복무해요.', 'book', {},
      'service', graduation, '졸업할 때까지 지금의 시간표를 이어가요.',
      { narration: '졸업한 뒤에 복무하기로 하고 이번 학기 책을 챙겼어요.' }));
  }
  if (age < SERVICE_LIMIT) {
    choices.push(option('rest', '내년에 다시 정하기', `학교나 일을 이어가요. 게임에서는 ${SERVICE_LIMIT}살에 복무를 시작해요.`, 'leaf', {},
      'service', age + 1, '내년 달력에 복무 일정을 적었어요.',
      { narration: '복무를 한 해 미루고 지금 하던 일을 이어가기로 했어요.' }));
  }
  const prompt = age < SERVICE_LIMIT ? '지금 갈지, 학교나 일을 더 이어갈지 정해요.' : '게임에서 복무를 시작할 마지막 해예요.';
  const fallback = choices.find((choice) => choice.id === 'service-after-study')?.id ??
    (age < SERVICE_LIMIT ? 'rest' : life.stats.health <= 20 ? 'service-exempt' : life.stats.health <= COMMUNITY_HEALTH ? 'service-community' : 'enlist');
  return { ...scene('복무 시기 정하기', prompt, choices), fallback };
}

function serving(life, path) {
  const last = path.service.until === life.age + 1;
  const community = path.service.kind === 'community';
  const title = `${community ? '마을 복무' : '복무'} ${last ? '마지막 해' : '첫해'}`;
  return scene(title,
    last ? '복무를 마치고 다시 내 일상으로 돌아가요.' : '새로운 생활에 익숙해지는 중이에요.', [
      pick('service-letter', community ? '이웃과 이야기 나누기' : '가족에게 편지 쓰기',
        community ? '함께 일하는 사람의 이야기를 들어요.' : '기다려 줘서 고맙다고 써요.', 'link', { bond: 4, joy: 2 }),
      pick('service-study', '틈틈이 공부하기', '학교나 일터로 돌아갈 준비를 해요.', 'book', { learning: 4, health: -2 }),
      rest('동료와 시간 보내기', '같이 밥을 먹고 쉬어요.'),
    ]);
}

function studying(life, path) {
  const program = path.program;
  const data = PROGRAMS[program.kind];
  const year = data.years - program.remaining + 1;
  const finalYear = program.remaining === 1;
  const detail = finalYear ? '이번 해를 보내면 과정을 마쳐요.' : '배우고 싶은 것에 시간을 써요.';
  return scene(`${data.label} ${year}년차`, path.service?.endedAt === life.age ? `학교로 돌아왔어요. ${detail}` : detail, [
    pick('study-project', finalYear ? '마지막 과제 끝내기' : '수업과 과제에 힘쓰기', '모르는 곳을 끝까지 공부해요.', 'book', { learning: 6, health: -2 }),
    pick('study-experience', '배운 것 써 보기', '직접 만들거나 현장에서 해 봐요.', 'settings', { learning: 3, art: 3, bond: 1 }),
    rest('쉬는 시간 챙기기', '친구와 밥을 먹고 푹 쉬어요.'),
  ]);
}

function relationships(life) {
  const age = life.age;
  const path = pathOf(life);
  if (path.partner === null && path.married === null && [24, 27, 30, 35, 41, 52].includes(age)) {
    const candidate = encounter(life);
    const job = CAREERS[candidate.career]?.title ?? '회사원';
    return scene('또 만나고 싶은 사람',
      `소개로 ${candidate.name}(${age + candidate.ageOffset}세, ${job})을 만났어요. 다시 만나고 싶은 마음이 생겼어요.`, [
        option('date', '연애 시작하기', `${candidate.name}에게 마음을 전해요.`, 'heart', { bond: 4, joy: 5 },
          'partner', 'start', '돌아가는 길에 이미 했던 이야기를 두어 번 떠올렸어요.',
          { partnerInfo: candidate, narration: `${candidate.name}와 연애를 시작했어요.` }),
        pick('stay-friends', '친구로 지내기', '편하게 만나 이야기를 나눠요.', 'link', { bond: 5, joy: 2 }),
        rest('혼자만의 시간 보내기', '좋아하는 일을 하면서 쉬어요.'),
      ]);
  }
  if (path.partner !== null && path.married === null && (path.romance?.affection ?? 55) <= 20) {
    return scene('멀어진 마음', `${path.romance?.name ?? '연인'}와 요즘 대화가 줄었어요. 관계를 돌아볼 때예요.`, [
      pick('make-up', '솔직하게 대화하기', '마음에 담아 둔 이야기를 나눠요.', 'heart', { bond: 2, joy: 1 },
        { affection: 12, narration: '서운했던 일을 꺼내고 서로의 말을 들었어요.' }),
      option('part', '헤어지기', '각자의 길로 돌아가기로 해요.', 'leaf', { joy: -2 },
        'partner', 'end', '함께한 날들에 고마움을 전했어요.'),
    ]);
  }
  if (path.partner !== null && path.married === null && age - path.partner >= 2 && [29, 32, 36, 43, 55].includes(age)) {
    const loved = path.romance?.name ?? '연인';
    return scene('함께 살까?', `${loved}와 함께할 미래를 상상해요. 결혼에는 20코인이 필요해요.`, [
      option('marry', '결혼하기', '결혼식과 새 살림에 20코인을 써요. 결혼 후 맞벌이 가계를 꾸려요.', 'heart',
        { bond: 6, joy: 6, money: -20 }, 'marry', true,
        `${loved}와 함께 살아갈 약속을 했어요.`, {
          conditions: [{ label: '애정 65점 이상', met: (path.romance?.affection ?? 70) >= 65 }],
          affection: 5, narration: `${loved}와 결혼식을 열었어요.`,
        }),
      pick('keep-dating', '지금처럼 만나기', '서로를 더 알아가요.', 'heart', { bond: 4, joy: 3 },
        { affection: 4 }),
      option('part', '헤어지기', '함께한 시간을 기억하고 각자의 길을 가요.', 'leaf', { health: 2, joy: -2 },
        'partner', 'end', '헤어지고도 그 사람이 집에 잘 닿았으면 했어요.',
        { narration: '함께한 날들에 고마움을 전하고 각자의 길을 걷기로 했어요.' }),
    ]);
  }
  if (path.married !== null && path.children.length < 2 && [31, 34, 37, 40].includes(age) &&
    age - Math.max(path.married, path.children.at(-1) ?? path.married) >= 2) {
    return scene('새 식구를 맞이할까?', '배우자와 아이를 돌볼 시간과 돈을 생각해요.', [
      option('have-child', '아이를 맞이하기', '태어날 아이를 위해 시간과 돈을 준비해요.', 'sprout', { money: -9, health: -3, bond: 6, joy: 5 },
        'child', true, '작은 손에 내 손가락을 쥐여 줬어요. 누군가도 처음에 내게 그랬겠지요.',
        { narration: '처음 품에 안은 아이의 손을 조심스레 잡았어요.' }),
      pick('later-family', '조금 더 기다리기', '지금 필요한 준비를 이야기해요.', 'clock', { health: 2, bond: 3 }),
      rest('지금의 생활 이어가기', '곁에 있는 사람과 한 해를 보내요.'),
    ]);
  }
  const childAge = path.children.length ? age - path.children[0] : 0;
  if ([7, 19].includes(childAge)) {
    const school = childAge === 7;
    return scene(school ? '아이의 첫 등교' : '아이가 집을 떠나는 날',
      school ? '가방이 아이의 등을 다 덮었어요. 내 첫 가방도 저렇게 컸을까요?' : '현관에 아이가 챙긴 큰 가방이 놓여 있어요.', [
      pick('child-sendoff', '함께 걸어가기', '새로 시작할 이야기를 들어요.', 'link', { bond: 5, joy: 3 }),
      pick('child-note', '가방에 쪽지 넣기', '힘들면 언제든 돌아오라고 써요.', 'spark', { art: 4, bond: 3 }),
      rest('손 흔들어 주기', '모습이 멀어질 때까지 바라봐요.'),
    ]);
  }
  return null;
}

const HOME_NAMES = { rent: '월세집', lease: '전셋집', own: '내 집' };
const LEASE_DEPOSIT = 36;

function housing(life, path) {
  const age = life.age;
  const home = path.home;
  const first = !home && [23, 28].includes(age);
  const buying = home?.kind !== 'own' && [33, 39, 47].includes(age);
  const moving = [54, 68].includes(age);
  if (!first && !buying && !moving) return null;
  const refund = home?.deposit ?? 0;
  const move = (id, title, detail, cost, kind, effect, after, narration) =>
    option(id, title, detail, 'house', { money: refund - cost, ...effect }, 'move', kind, after, { narration });
  const choices = home?.kind === 'own' ? [
    move('move-home', '다른 집으로 옮기기', '집을 바꿔 편한 곳으로 이사해요.', 16, 'own', { joy: 6, health: 3 },
      '새 집에서 창문을 열었어요. 골목 소리가 예전과 달랐어요.', '이삿짐을 내려놓고 새 집의 창문부터 열었어요.'),
    pick('fix-home', '지금 집 고치기', '오래 산 집을 더 편하게 만들어요.', 'house', { money: -9, joy: 4, health: 2 }),
  ] : [
    move('rent-room', home ? '월세집으로 이사하기' : '월세집 구하기',
      home?.kind === 'rent' ? '이사 뒤에도 해마다 월세 2코인을 내요.' :
        refund ? '전세금을 돌려받고 월세집으로 옮겨요.' : '처음에 이사비를 내고 해마다 월세를 내요.', 8, 'rent', { joy: 3, health: 2 },
      '새 집의 첫날 밤엔 커튼을 달아야겠다는 생각이 났어요.', '월세집에 짐을 풀고 창에 달 커튼을 골랐어요.'),
    move('lease-home', home?.kind === 'lease' ? '다른 전셋집으로 옮기기' : '전셋집 구하기',
      '맡겨 둔 돈은 이사할 때 돌려받아요.', LEASE_DEPOSIT + 4, 'lease', { joy: 5, health: 2 },
      '처음 내 열쇠로 문을 열었어요.', '전셋집 열쇠를 받아 새 현관문을 열었어요.'),
  ];
  if (buying || (moving && home?.kind !== 'own')) {
    choices.unshift(move('buy-home', '내 집 사기', refund ? '돌려받는 전세금을 집값에 보태요.' : '오래 모은 돈으로 집을 사요.', 80, 'own', { joy: 9, bond: 3 },
      '처음으로 벽에 못을 박고, 오래 간직한 사진을 걸었어요.', '오래 모은 돈으로 집을 사고 벽에 아끼던 사진을 걸었어요.'));
  }
  choices.push(rest('지금 집에서 지내기', '살던 곳에서 지내며 몸과 마음을 쉬게 해요.'));
  return scene(first ? '처음 집 구하기' : moving ? '어디에서 지낼까?' : '내 집을 살까?',
    first ? '내가 살 곳을 골라요.' : moving ? '일터나 가족 가까이 갈지 생각해요.' : '집값과 모아 둔 돈을 살펴봐요.', choices);
}

function retirementScene(life, mandatory) {
  const job = CAREERS[life.career];
  const age = retirementAge(life.career);
  const options = [
    option('retire', mandatory ? '정년 퇴직하기' : '조기 은퇴하기',
      '직장 수입이 끝나고 기본 은퇴 수입을 받아요. 모아 둔 노후 저축의 수령 방식은 은퇴 후 선택해요.',
      'leaf', { health: 4, joy: 4 }, 'retire', true,
      '오랫동안 일했던 곳에 마지막 인사를 건넸어요.',
      { narration: '마지막 일을 마치고 후배들에게 인사를 전했어요.' }),
  ];
  if (life.career === 'athlete' && (life.path.workYears?.athlete ?? 0) >= 3) {
    options.push(pick('coach-transition', '운동 지도자로 전직하기',
      '선수 경험을 살려 다른 사람을 가르쳐요. 운동 지도자는 65세까지 일할 수 있어요.',
      'flag', { bond: 3, joy: 4 },
      { career: 'coach', need: { health: 45, bond: 28 },
        narration: '선수로 뛰던 곳에서 이제는 후배들을 지도하기 시작했어요.' }));
  }
  if (!mandatory) {
    options.push(pick('mentor-work', '일을 계속하기',
      `${age}세에는 정년이 되어 퇴직하게 돼요. 지금은 일을 계속해요.`,
      'book', { learning: 2, bond: 3 }));
  }
  return scene(mandatory ? `${job.title} 정년의 날` : '일을 그만둘 때가 올까?',
    mandatory ? `${job.title}으로 일할 수 있는 정년인 ${age}세가 되었어요. 은퇴하거나 다른 일을 시작할 준비를 해요.`
      : '노후 자금과 체력을 살피고 앞으로의 일을 골라요.', options);
}

function laterLife(life, path) {
  const age = life.age;
  if (age === 45 || age === 53) {
    const title = age === 45 ? '오랜만에 온 전화' : '옛날 사진을 찾은 날';
    const detail = age === 45 ? '보고 싶었던 사람의 목소리가 들려요.' : '서랍에서 어릴 적 이름표와 사진을 찾았어요.';
    return scene(title, detail, [
      pick('care-visit', '찾아가서 안부 묻기', '함께 걷고 이야기를 나눠요.', 'link', { bond: 6, joy: 3, money: -2 }, { after: '별말 없이 나란히 앉았던 시간이 오래 남았어요.' }),
      pick('care-record', '이야기 글로 남기기', '지금 듣는 말을 공책에 적어요.', 'spark', { art: 5, learning: 2, bond: 2 }),
      rest('전화 한 통 더 하기', '어떻게 지내는지 물어요.'),
    ]);
  }
  if (life.career && path.retired === null &&
    ([55, 60, 65].includes(age) || (life.career === 'athlete' && age === 35))) {
    if (age < retirementAge(life.career)) return retirementScene(life, false);
  }
  if ([52, 62, 72, 80, 88].includes(age)) {
    const senior = age >= 72;
    const cost = age >= 80 ? 18 : age >= 62 ? 12 : 8;
    return scene(senior ? '노후를 더 편안하게 보내려면' : '앞으로의 생활에 투자할까?',
      '살기 편한 환경과 건강에 돈을 쓸 수도 있고 지금처럼 지낼 수도 있어요.', [
        pick('age-health', '건강 관리에 투자하기',
          '검진과 관리를 받으며 몸을 돌봐요.', 'heart', { money: -cost, health: senior ? 10 : 7, joy: 2 }),
        pick('age-comfort', senior ? '집을 안전하게 고치기' : '생활 공간 정비하기',
          '더 편안하게 살 수 있도록 환경을 바꿔요.', 'house', { money: -Math.max(5, cost - 4), joy: 7, health: 3 }),
        rest('지금 생활 유지하기', '큰돈을 쓰지 않고 무리하지 않아요.', { health: 2, joy: 1 }),
      ]);
  }
  if ([70, 82, 93].includes(age)) {
    const first = path.dreams.find((entry) => entry.field !== 'explore');
    const detail = first ? `공책에 ${first.age}살의 꿈 ‘${fieldLabel(first.field)}’이 적혀 있어요.`
      : '서랍에서 오래된 공책이 나왔어요.';
    return scene('옛 공책을 펼친 저녁', detail, [
      pick('memory-note', '어린 나에게 편지 쓰기', '좋았던 날과 힘들었던 날을 적어요.', 'spark', { art: 5, joy: 4 }, { after: '마지막엔 “생각보다 좋은 날이 많았어”라고 썼어요.' }),
      pick('memory-share', '가까운 사람에게 보여 주기', '공책에 적힌 이야기를 들려줘요.', 'link', { bond: 5, joy: 3 }),
      rest('공책 덮고 쉬기', '차가 식을 때까지 옛날을 생각해요.'),
    ]);
  }
  return null;
}

function dateActivities(life) {
  const name = pathOf(life).romance?.name ?? '연인';
  return scene(`${name}와 보내는 시간`, '올해는 어떤 추억을 만들까요? 쉬기만 하면 애정이 떨어질 수 있어요.', [
    pick('date-trip', '여행 가기', '함께 새로운 곳을 여행해요.', 'spark', { money: -5, joy: 5 },
      { affection: 12, narration: '길을 잘못 들었지만 함께 웃으며 새로운 풍경을 만났어요.' }),
    pick('date-dinner', '맛집 가기', '맛있는 음식을 먹으며 이야기를 나눠요.', 'sun', { money: -2, joy: 3 },
      { affection: 7, narration: '맛집에서 나눈 작은 이야기가 오래 기억에 남았어요.' }),
    pick('date-walk', '동네 산책하기', '돈을 들이지 않고 함께 시간을 보내요.', 'leaf', { joy: 2 },
      { affection: 4, narration: '익숙한 길을 천천히 걷다 서로의 이야기를 더 알게 되었어요.' }),
    pick('date-alone', '혼자 쉬기', '혼자서 편안히 쉬지만 함께할 시간은 줄어요.', 'heart', { joy: 3 },
      { affection: -5, narration: '하루 푹 쉬었지만 서로 만나지 못해 조금 서운했어요.' }),
  ]);
}

function savingsOffer(life) {
  const path = pathOf(life);
  const current = Math.max(0, Math.floor(path.savings?.annual ?? 0));
  const review = path.savingsReview;
  const increase = Boolean(review && life.age >= review.at);
  const amounts = current > 0 && increase ? [current, current + 1, current + 2, current + 4] : [0, 1, 2, 4];
  const title = increase ? `연봉이 ${review.from} → ${review.to}코인으로 올랐어요!`
    : '노후 저축을 시작할까요?';
  const detail = increase
    ? current ? `현재 매년 ${current}코인을 저축 중이에요. 유지하거나 증액할 수 있어요.`
      : '연봉이 올랐으니 이번에 노후 적금을 시작할 수 있어요.'
    : '일하는 동안 매년 저축하고 연 4% 복리 이자를 받아요. 이자는 매년 정수 코인으로 내림해요.';
  return scene(title, detail, amounts.map((amount) => {
    const label = amount === 0 ? '이번에는 저축하지 않기' :
      current > 0 && amount === current ? `현재 금액 유지 (${amount}코인)` :
      current > 0 ? `매년 ${amount}코인으로 증액` : `매년 ${amount}코인 저금`;
    const explanation = amount ? `매년 ${amount}코인을 적립해요. 기존 적금 잔액은 유지되고 4% 복리가 붙어요.`
      : '당장은 저축하지 않아도 다음에 연봉이 오르면 다시 선택할 수 있어요.';
    return option(amount ? `save-${amount}` : 'save-none', label, explanation, amount ? 'coin' : 'leaf',
      {}, 'saving', amount, amount ? `해마다 ${amount}코인씩 적금에 넣기로 했어요.` : '이번에는 저축을 하지 않기로 했어요.');
  }));
}

function retirementPaymentChoice(life) {
  const account = pathOf(life).savings;
  const lump = retirementLumpSum(account);
  const annuity = retirementPayout(account);
  const finalYear = retirementPayout(account, RETIREMENT_YEARS - 1);
  return scene('모아 둔 노후 저축을 어떻게 받을까?',
    `총 ${roundCoins(account.balance)}코인이 모였어요. 일시금은 세금 25%, 연금은 세금 5%가 적용돼요.`, [
      option('savings-lump', '한꺼번에 받기',
        `지금 ${lump}코인 수령 · 세금 등 ${retirementTax(account, 'lump')}코인 공제`,
        'coin', { money: lump }, 'savings-payout', 'lump', '모은 돈을 한 번에 찾아 앞으로의 생활을 준비했어요.'),
      option('savings-pension', '10년 동안 나눠 받기',
        `10년간 매년 ${annuity === finalYear ? annuity : `${finalYear}~${annuity}`}코인 · 세금 ${retirementTax(account, 'pension')}코인`,
        'coin', {}, 'savings-payout', 'pension', '노후 저축을 10년 동안 나누어 받기로 했어요.'),
    ]);
}

export function bonusScene(life, done) {
  const age = life.age;
  const path = pathOf(life);
  if (path.illness && !done.includes('illness')) return { ...illnessCare(path), key: 'illness', fallback: 'rest' };
  if (path.retired !== null && path.savings?.balance > 0 &&
    !path.savings.payoutMode && !done.includes('savings-payout')) {
    return { ...retirementPaymentChoice(life), key: 'savings-payout', fallback: 'savings-pension' };
  }
  if ([10, 14, 17].includes(age) && !path.dreams.some((entry) => entry.age === age)) {
    return { ...dreamSurvey(life), key: 'dream', fallback: 'rest' };
  }
  if (age === 16 && !path.school) return { ...highSchool(life), key: 'school', fallback: 'high-general' };
  if (age === 18 && path.school === 'outside' && !path.diploma && !done.includes('education')) {
    return { ...scene('검정고시를 볼까?', '이 시험을 통과하면 대학에도 지원할 수 있어요.', [
      examChoice(), rest('조금 더 공부하기', '시험은 나중에 볼 수 있어요.', {}),
    ]), key: 'education', fallback: 'rest' };
  }
  if (path.sex === 'male' && age >= 20 && age <= SERVICE_LIMIT && !done.includes('military') &&
    (!path.service || (path.service.status === 'planned' && age >= Math.min(path.service.at, SERVICE_LIMIT)))) {
    return { ...militaryPlan(life, path), key: 'military' };
  }
  const continuing = path.program || path.service?.status === 'serving';
  // 첫 취업 후 1~3년 또는 연봉 인상 다음 해에 적금 가입·증액 기회를 엽니다.
  const firstJob = path.firstJobAge;
  const offerAge = Number.isInteger(firstJob) ? firstJob + 1 + ((path.romanceSeed ?? 0) % 3) : Infinity;
  const firstOffer = path.savings === null &&
    age >= offerAge && age <= Math.max(offerAge, firstJob + 5);
  const raisedOffer = path.savingsReview && age >= path.savingsReview.at;
  if (!continuing && life.career && path.retired === null && (firstOffer || raisedOffer) &&
    !done.includes('saving')) {
    return { ...savingsOffer(life), key: 'saving',
      fallback: path.savings?.annual ? `save-${Math.floor(path.savings.annual)}` : 'save-none' };
  }
  if (path.partner !== null && path.married === null && !done.includes('dating')) {
    return { ...dateActivities(life), key: 'dating', fallback: 'date-alone' };
  }
  const license = degreesOf(path).findLast(({ kind, age: graduatedAt }) =>
    LICENSES[kind] && !Number.isInteger(path[LICENSES[kind].record]) &&
    (graduatedAt === age || path.service?.endedAt === age || [26, 30, 34, 38, 42, 50, 56].includes(age)));
  if (!continuing && license && !done.includes('license')) {
    return { ...licensePlan(license.kind), key: 'license', fallback: 'rest' };
  }
  const planning = [19, 22, 26, 38, 50].includes(age) || path.degree?.age === age ||
    path.diplomaAge === age - 1 || (!life.career && path.trainingAge === age) ||
    (path.service?.endedAt === age && (!life.career || path.degree));
  if (!continuing && planning && !done.includes('education')) {
    const entry = educationPlan(life, path);
    if (entry) return { ...entry, key: 'education', fallback: 'rest' };
  }
  if (!continuing && careerWindow(life, path) && !done.includes('career')) {
    return { ...careerPlan(life, path), key: 'career', fallback: 'rest' };
  }
  return null;
}

export function annualScene(life) {
  const age = life.age;
  const path = pathOf(life);
  if (life.career && path.retired === null && age >= retirementAge(life.career)) {
    return retirementScene(life, true);
  }
  if (age < CHILDHOOD.length) return CHILDHOOD[age];
  if (age < 19) {
    const school = schoolYear(life, path);
    if (![11, 13, 15, 17, 18].includes(age)) return school;
    const outside = path.school === 'outside';
    const sport = option('sports-team', outside ? '동네 운동팀에서 훈련하기' : '운동부에서 훈련하기',
      '운동선수에 도전할 때 필요한 경험을 쌓아요.', 'flag', { health: 5, learning: -1, bond: 1 },
      'sport', 1, '연습이 끝나고 친구들과 땀을 닦으며 웃었어요.');
    return { ...school, choices: [...school.choices, sport] };
  }
  if (path.service?.status === 'serving') return serving(life, path);
  if (path.program && (age === 19 || path.service?.endedAt === age)) return studying(life, path);
  const milestone = relationships(life) ?? housing(life, path);
  if (milestone) return milestone;
  if (path.firstJobAge === age) {
    return scene('일터에서 보낸 첫해', '새 일터에서 내 자리를 찾아요.', [
      pick('work-learn', '일을 배우기', '모르는 것을 동료에게 물어요.', 'book', { learning: 5, bond: 2 }),
      pick('work-more', '일을 더 맡아 저축하기', '바쁘지만 돈을 더 모아요.', 'coin', { money: 3, health: -2 }),
      rest('퇴근 뒤 시간 챙기기', '일이 끝나면 몸과 마음을 쉬게 해요.'),
    ]);
  }
  return path.program ? studying(life, path) : laterLife(life, path);
}

export function applyPath(life, age, choice) {
  const path = life.path ??= newPath();
  if (choice.habit) path.habit = { kind: choice.habit, until: age + 1 + HABITS[choice.habit].years };
  if (choice.affection && path.romance) {
    path.romance.affection = Math.max(0, Math.min(100, (path.romance.affection ?? 55) + choice.affection));
  }
  const action = choice.action;
  switch (action?.kind) {
    case 'dream': path.dreams.push({ age, field: action.value }); break;
    case 'school': path.school = action.value; break;
    case 'diploma':
      path.diploma = true;
      path.diplomaAge = age;
      break;
    case 'study':
      path.program = { kind: action.value, field: choice.studyField ?? mostRecentDream(path), remaining: PROGRAMS[action.value].years };
      break;
    case 'license': path[LICENSES[action.value].record] = age; break;
    case 'sport': path.sportYears = (path.sportYears ?? 0) + action.value; break;
    case 'service':
      if (typeof action.value === 'number') path.service = { status: 'planned', at: action.value };
      else if (action.value === 'exempt') path.service = { status: 'exempt', endedAt: age };
      else path.service = { status: 'serving', kind: action.value === 'community' ? 'community' : 'military', until: age + 2 };
      break;
    case 'partner':
      if (action.value === 'start') {
        path.partner = age;
        path.romance = { ...(choice.partnerInfo ?? encounter(life)), metAge: age, affection: 55 };
      } else {
        path.partner = null;
        path.romance = null;
      }
      break;
    case 'marry': path.married = age; break;
    case 'saving': {
      const annual = Math.max(0, Math.floor(action.value));
      path.savings = {
        ...(path.savings ?? { balance: 0, chosenAt: age }),
        annual, interestRate: SAVINGS_RATE,
      };
      path.savings.balance = savingsBalance(path.savings);
      path.savingsReview = null;
      break;
    }
    case 'savings-payout':
      if (path.savings && !path.savings.payoutMode) {
        path.savings.payoutMode = action.value;
        path.savings.payoutStart = age;
      }
      break;
    case 'child': path.children.push(age); break;
    case 'retire': path.retired = age; break;
    case 'move':
      path.home = { kind: action.value, at: age, deposit: action.value === 'lease' ? LEASE_DEPOSIT : 0 };
      break;
    case 'care': return [choice.after, finishCare(path, age, action.value, choice.id)].filter(Boolean).join(' ');
  }
  return choice.after ?? '';
}

export function advancePath(life) {
  const path = life.path;
  if (path.habit && life.age >= path.habit.until) path.habit = null;
  if (path.service?.status === 'serving') {
    if (life.age < path.service.until) return '';
    path.service = { status: 'complete', kind: path.service.kind ?? 'military', endedAt: life.age };
    return path.program ? '복무를 마쳤어요. 다니던 학교로 돌아가요.' : '복무를 마치고 집으로 돌아와요.';
  }
  if (!path.program) return '';
  path.program.remaining -= 1;
  if (path.program.remaining > 0) return '';
  const { kind, field } = path.program;
  if (kind === 'training') {
    path.training = true;
    path.trainingAge = life.age;
  } else if (kind === 'caregiving') {
    path.caregivingAge = life.age;
  } else {
    if (path.degree) (path.previousDegrees ??= []).push(path.degree);
    path.degree = { kind, field, age: life.age };
  }
  path.program = null;
  if (kind === 'training') return '기술을 배우는 과정을 마쳤어요.';
  if (kind === 'caregiving') return '돌봄 교육과 시험을 마치고 요양보호사 자격을 얻었어요.';
  return `${PROGRAMS[kind].label}을 마쳤어요. 처음 메던 가방이 많이 해졌어요.`;
}

export function careerPay(life) {
  const job = CAREERS[life?.career];
  if (!job) return null;
  const path = pathOf(life);
  const years = path.workYears?.[life.career] ?? 0;
  // 승진은 동일 경력 사다리 전체를 이어받습니다. 일반 이직은 최대 10년까지 절반 인정합니다.
  const fields = jobFields(job);
  const previous = Object.entries(path.workYears ?? {}).filter(([id]) =>
    id !== life.career && jobFields(CAREERS[id]).some((field) => fields.includes(field)));
  const transfer = job.promotionFrom
    ? promotionTenure(path, job.promotionFrom)
    : Math.min(10, Math.floor(Math.max(0, ...previous.map(([, value]) => value)) / 2));
  const effectiveYears = years + transfer;
  const track = careerGrowth(life.career);
  const experience = track.steps.filter((step) => effectiveYears >= step).length * track.raise;
  const stat = job.payStat ?? 'learning';
  const skillBase = Math.max(job.need?.[stat] ?? 0, stat === 'health' ? 60 : 30);
  const skill = Math.max(0, Math.min(2, Math.floor((life.stats[stat] - skillBase) / 20)));
  const education = degreesOf(path).some(({ kind, field }) => kind === 'graduate' && fields.includes(field)) ? 2 : 0;
  return { base: job.wage, years, transfer, track: track.label, experience, stat, skill, education,
    total: job.wage + experience + skill + education };
}

export function creditWorkYear(life) {
  const { workYears = {} } = life.path;
  life.path.workYears = { ...workYears, [life.career]: (workYears[life.career] ?? 0) + 1 };
}

export function restoreWorkYears(life) {
  const path = life.path ??= newPath();
  if (path.workYears) return;
  const workYears = {};
  let career = null;
  let serviceUntil = 0;
  for (const entry of life.history ?? []) {
    if (entry.type === 'bonus') {
      career = CAREER_BY_TITLE.get(entry.title) ?? career;
      if (entry.title === '올해 입영하기' || entry.title === '마을에서 복무하기') serviceUntil = entry.decisionAge + 2;
    }
    if (entry.type === 'life' && career && entry.decisionAge >= serviceUntil &&
      (path.retired === null || entry.decisionAge <= path.retired)) {
      workYears[career] = (workYears[career] ?? 0) + 1;
    }
  }
  path.workYears = workYears;
}

export function yearlySources(life) {
  const { age } = life;
  const path = pathOf(life);
  const serving = path.service?.status === 'serving';
  const career = CAREERS[life.career];
  const sources = [];
  if (serving) {
    sources.push({ id: 'service', label: '복무 중 받는 돈', years: path.service.until - age, effect: { money: 1 } });
  } else if (path.retired !== null) {
    sources.push({ id: 'pension', label: '은퇴 뒤 받는 돈', effect: { money: 1 } });
  } else if (career) {
    const pay = careerPay(life);
    sources.push({ id: `job-${life.career}`, label: `${career.title} 수입${career.fatigue ? '과 피로' : ''}`, term: `경력 ${pay.years}년`,
      effect: { money: pay.total, ...(career.fatigue ? { health: -career.fatigue } : {}) } });
    if (path.savings?.annual > 0) {
      sources.push({ id: 'retirement-saving', label: '노후 저축', term: '은퇴할 때까지', effect: { money: -path.savings.annual } });
    }
  }
  if (path.retired !== null && path.savings?.payoutMode === 'pension') {
    const start = path.savings.payoutStart ?? path.retired + 1;
    if (age >= start && age < start + RETIREMENT_YEARS) {
      const payout = retirementPayout(path.savings, age - start);
      if (payout > 0) sources.push({ id: 'retirement-payout', label: '모아 둔 노후 저축 연금',
        term: `${age - start + 1}/10년차`, years: start + RETIREMENT_YEARS - age, effect: { money: payout } });
    }
  }
  if (!serving && path.program) {
    const { kind, remaining } = path.program;
    sources.push({ id: `study-${kind}`, label: `${PROGRAMS[kind].label}에서 배우기`, years: remaining,
      effect: { learning: kind === 'graduate' || kind === 'medicine' ? 2 : 1 } });
  }
  const livingCost = age >= 85 ? 4 : age >= 75 ? 3 : age >= 65 ? 2 : age >= 50 ? 1 : 0;
  if (livingCost) sources.push({ id: 'age-living', label: '나이가 들며 늘어나는 생활비',
    effect: { money: -livingCost } });
  if (path.home?.kind === 'rent') {
    sources.push({ id: 'rent', label: '월세', term: '이 집에 사는 동안', effect: { money: -2 } });
  } else if (path.home?.kind === 'own' && age >= 55) {
    sources.push({ id: 'home-maintenance', label: '오래된 집 관리비', term: '55세부터',
      effect: { money: age >= 75 ? -2 : -1 } });
  }
  if (path.married !== null) {
    sources.push({ id: 'married', label: '배우자와 지내기', effect: { bond: 1 } });
    const contribution = spouseContribution(life);
    if (contribution) sources.push({ id: 'spouse-income', label: `${path.romance?.name ?? '배우자'}의 가계 소득`,
      effect: { money: contribution } });
    sources.push({ id: 'household', label: '함께 쓰는 생활비', effect: { money: -2 } });
  }
  for (const [index, born] of path.children.entries()) {
    if (age - born >= 19) continue;
    sources.push({ id: `child-${index}`, label: index === 0 ? '첫째 돌봄' : '둘째 돌봄', term: '아이가 19살 되기 전까지',
      effect: { money: -2, bond: 1 } });
  }
  if (path.habit && age < path.habit.until) {
    const { kind, until } = path.habit;
    const { label, effect } = HABITS[kind];
    sources.push({ id: `habit-${kind}`, label, years: until - age, effect });
  }
  const aging = age >= 83 ? -3 : age >= 72 ? -2 : age >= 58 ? -1 : 0;
  if (aging) sources.push({ id: 'aging', label: '나이가 들며', effect: { health: aging } });
  if (path.illness?.serious) sources.push({ id: 'illness', label: '큰 병으로 지침', term: '치료하는 동안', effect: { health: -2 } });
  return sources;
}

export function updateLifePath(life) {
  const path = life.path ??= newPath();
  const program = path.program;
  if (program && !Number.isInteger(program.remaining)) {
    const leave = path.service?.status === 'serving' ? Math.max(0, path.service.until - life.age) : 0;
    program.remaining = Math.max(1, Math.min(PROGRAMS[program.kind].years, program.until - life.age - leave));
    delete program.until;
  }
  for (const stat of Object.keys(life.stats)) life.stats[stat] = Math.max(1, life.stats[stat]);
}

export function upgradeLifePath(life, seed = 0) {
  const path = life.path ??= newPath();
  if (!path.romanceSeed) path.romanceSeed = seed;
  path.savings ??= null;
  path.savingsReview ??= null;
  if (path.savings) {
    path.savings.balance = savingsBalance(path.savings);
    path.savings.annual = Math.floor(Math.max(0, path.savings.annual ?? 0));
    path.savings.interestRate = SAVINGS_RATE;
  }
  if ((path.partner !== null && path.partner !== undefined || path.married !== null && path.married !== undefined) && !path.romance) {
    const at = Number.isInteger(path.partner) ? path.partner : path.married;
    const candidate = encounter({ ...life, age: at, path });
    path.romance = { ...candidate, metAge: at };
  }
  if (!Number.isInteger(path.firstJobAge) && life.career && path.workYears) {
    const years = path.workYears[life.career] ?? 0;
    if (years > 0) path.firstJobAge = Math.max(19, life.age - years);
  }
}

export function chanceDiscount(life, career, stat) {
  if (!career || stat === 'money') return 0;
  const path = pathOf(life);
  const fields = jobFields(CAREERS[career]);
  if (!fields.length || stat === 'health') return 0;
  const dreamBoost = Math.max(0, ...path.dreams.map(({ field }) =>
    dreamFields(field).some((interest) => fields.includes(interest)) ? (DREAM_OPTIONS[field] ? 3 : 5) : 0));
  return dreamBoost
    + (degreesOf(path).some(({ field }) => fields.includes(field)) ? 6 : 0)
    + (career === 'tech' && (path.training || path.school === 'vocational') ? 7 : 0);
}

export function lifeBadges(life) {
  const path = pathOf(life);
  return [
    SEXES[path.sex],
    life.age < 19 && SCHOOLS[path.school],
    path.program && `${PROGRAMS[path.program.kind].label} · ${path.program.remaining}년 남음`,
    path.service?.status === 'serving' && (path.service.kind === 'community' ? '마을 복무 중' : '복무 중'),
    path.retired !== null ? '은퇴' : CAREERS[life.career]?.title,
    path.home && HOME_NAMES[path.home.kind],
    path.illness && '치료 중',
  ].filter(Boolean);
}

export function pathNotes(life) {
  const path = pathOf(life);
  return [
    ...path.dreams.map(({ age, field }) => `${age}살 희망 · ${fieldLabel(field)}`),
    path.school && SCHOOLS[path.school],
    path.diploma && '고졸 검정고시',
    ...degreesOf(path).map(({ age, kind }) => `${age}살에 ${PROGRAMS[kind].label} 마침`),
    ...Object.values(LICENSES).filter(({ record }) => Number.isInteger(path[record]))
      .map(({ record, title }) => `${path[record]}살에 ${title} 면허 취득`),
    path.training && '직업훈련 수료',
    Number.isInteger(path.caregivingAge) && `${path.caregivingAge}살에 요양보호사 자격 취득`,
    path.sportYears && `운동부·운동팀 훈련 ${path.sportYears}년`,
    path.service?.status === 'complete' && `${path.service.endedAt}살에 복무 마침`,
    path.service?.status === 'exempt' && '건강 사유로 복무 면제',
    path.home && `${path.home.at}살에 ${HOME_NAMES[path.home.kind]}`,
    path.partner !== null && path.romance && `${path.partner}살에 ${path.romance.name}와 연애 시작`,
    path.married !== null && `${path.married}살에 ${path.romance?.name ?? '배우자'}와 결혼`,
    path.savings && (path.savings.annual ? `노후 저축 · 연 4% 복리, 매년 ${path.savings.annual}코인, 누적 ${savingsBalance(path.savings)}코인` : '노후 저축 선택하지 않음'),
    path.savings?.payoutMode === 'lump' && `노후 저축 일시금 ${retirementLumpSum(path.savings)}코인 수령`,
    path.savings?.payoutMode === 'pension' && `노후 저축 연금 · 10년간 매년 ${retirementPayout(path.savings)}코인`,
    ...path.children.map((age) => `${age}살에 아이를 맞이함`),
  ].filter(Boolean);
}

export function farewell(life) {
  const path = pathOf(life);
  if (path.children.length) return '작은 손을 처음 잡던 날이 생각났어요. 그 손은 이제 나보다 큰 사람의 손이 되었어요.';
  if (path.married !== null) return '한 사람이 내게 늘 하던 인사를 떠올렸어요. 다시 들을 수 있다면 아주 평범한 그 말을 듣고 싶었어요.';
  const dream = path.dreams.find((entry) => entry.field !== 'explore');
  if (dream) return `${dream.age}살에 적었던 꿈을 한 번 더 떠올렸어요. 그때는 알 수 없었던 좋은 날들도 제법 많았어요.`;
  return '잊었다고 생각했던 작은 일들이 떠올랐어요. 누가 내 이름을 불렀고, 나는 돌아보았어요.';
}

export function familyDream(life) {
  const path = pathOf(life);
  if (path.children.length) return '꿈속 아이는 다 자란 모습으로 내 옆에 앉았어요. 밥은 잘 먹고 있다고, 그 말부터 해 주었어요.';
  if (path.married !== null) return '가족의 꿈에 오래 살던 집이 나왔어요. 우리는 여느 아침처럼 식탁에 앉아 식기 부딪히는 소리를 들었어요.';
  return '나를 가족으로 기억하는 사람의 꿈에 함께 걷던 길이 나타났어요. 이번에는 헤어지기 전에 한 번 더 인사했어요.';
}
