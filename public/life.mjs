import { CAREERS, pick } from './content.mjs';
import { finishCare, illnessCare } from './health.mjs';

export const SEXES = { male: '남자', female: '여자' };
export const SCHOOLS = { general: '일반고', science: '과학고·영재학교', vocational: '직업계고', arts: '예술고', outside: '학교 밖 진로' };
export const DREAMS = {
  science: { label: '과학과 연구', title: '궁금한 것을 알아봐요.', mark: 'book', career: 'lab', need: { learning: 32 } },
  art: { label: '그림과 음악', title: '작품을 만들고 보여 줘요.', mark: 'spark', career: 'studio', need: { art: 25 } },
  tech: { label: '기술과 만들기', title: '손으로 고치고 만들어요.', mark: 'settings', career: 'tech', need: { learning: 23 } },
  people: { label: '가르치고 돕기', title: '사람을 돌보고 가르쳐요.', mark: 'link', career: 'care', need: { bond: 24 } },
  business: { label: '가게 운영', title: '내 가게를 꾸려요.', mark: 'coin', career: 'shop', need: { money: 24 } },
  explore: { label: '아직 모르겠어요', title: '더 알아본 뒤에 정해요.', mark: 'leaf' },
};

const PROGRAMS = {
  college: { label: '전문대', years: 2 },
  university: { label: '대학', years: 4 },
  graduate: { label: '대학원', years: 2 },
  training: { label: '직업훈련', years: 1 },
};

export function newPath(sex = null) {
  return { sex, dreams: [], school: null, diploma: false, program: null, degree: null, training: false,
    service: null, partner: null, married: null, children: [], retired: null, home: null, illness: null, recoveredAt: null };
}

const EMPTY_PATH = newPath();
export const pathOf = (life) => life.path ?? EMPTY_PATH;
const mostRecentDream = (path) => path.dreams.at(-1)?.field ?? 'explore';
const fieldLabel = (field) => DREAMS[field]?.label ?? DREAMS.explore.label;
const scene = (title, detail, choices, after = '') => ({ title, detail, choices, after });
const rest = (title = '쉬어 가기', detail = '몸과 마음을 쉬게 해요.', effect = { health: 3, joy: 1 }) => pick('rest', title, detail, 'leaf', effect);
const option = (id, title, detail, mark, effect, kind, value, after, extra = {}) =>
  pick(id, title, detail, mark, effect, { action: { kind, value }, after, ...extra });

const CHILDHOOD = [
  scene('세상에 온 첫해', '누군가 나를 꼭 안아 줘요.', [
    pick('birth-voice', '목소리 듣기', '내 이름을 불러 줘요.', 'link', { bond: 1, joy: 1 }, { after: '그날 가족이 가장 많이 한 말은 내 이름이었대요.' }),
    pick('birth-light', '햇빛 바라보기', '벽에 비친 빛을 봐요.', 'sun', { learning: 1, art: 1 }),
    rest('품에서 잠들기', '따뜻한 품에서 잠이 와요.', { health: 2 }),
  ]),
  scene('첫걸음', '누군가 두 팔을 벌리고 기다려요.', [
    pick('first-steps', '한 발 내딛기', '소파를 잡은 손을 놓아요.', 'heart', { health: 2, joy: 1 }),
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
    pick('small-drawing', '크레파스로 그리기', '내가 사는 집을 그려요.', 'spark', { art: 2, learning: 1 }),
    rest('손잡고 들어가기', '마음의 준비를 하고 들어가요.', { health: 1, joy: 1 }),
  ]),
  scene('가게 놀이', '종이돈과 빈 상자로 가게를 만들어요.', [
    pick('play-store', '가게 주인 되기', '손님에게 무엇이 필요한지 물어요.', 'coin', { learning: 2, bond: 1 }),
    pick('play-stage', '가게 간판 그리기', '상자에 그림을 그려요.', 'spark', { art: 2, joy: 1 }),
    rest('친구와 놀이터 가기', '함께 미끄럼틀을 타요.', { health: 2, bond: 1 }),
  ]),
  scene('새 가방', '내년에는 초등학교에 가요.', [
    pick('name-tag', '이름표 쓰기', '공책에 내 이름을 써요.', 'book', { learning: 2, joy: 1 }),
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
    pick('primary-letter', '친구에게 편지 쓰기', '같이 웃었던 날을 한 줄 적어요.', 'link', { bond: 4, joy: 2 }, { after: '친구는 나중에도 그 편지를 필통에 넣어 뒀대요.' }),
    pick('primary-drawing', '교실 그림 그리기', '잊기 전에 창가와 내 자리를 그려요.', 'spark', { art: 4, learning: 1 }),
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
    rest('천천히 생각하기', '내가 좋아하는 일부터 떠올려요.'),
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
  if (age < 16 || path.school !== 'outside') return SCHOOL_YEARS[age];
  return scene(['학교 밖의 첫해', '나만의 공부 계획', '다음 길을 준비하는 해'][age - 16], '관심 있는 일을 찾아 하나씩 배워요.', [
    pick('outside-portfolio', '만든 것 모아 보기', '혼자 해 본 일을 사진과 글로 남겨요.', 'settings', { learning: 3, art: 3 }),
    pick('outside-learn', '관심 있는 것 배우기', '도서관이나 배움터에서 공부해요.', 'book', { learning: 4, bond: 1 }),
    rest('쉬면서 길 찾아보기', '지금 할 수 있는 것부터 해요.'),
  ]);
}

function dreamSurvey(life) {
  const path = pathOf(life);
  const label = life.age === 10 ? '초등학교' : life.age === 14 ? '중학교' : path.school === 'outside' ? '학교 밖' : '고등학교';
  const old = mostRecentDream(path);
  const detail = old === 'explore' ? '어떤 일이 궁금해요? 나중에 전공과 일자리를 고를 때 기억해요.'
    : `지난번에는 ‘${fieldLabel(old)}’를 골랐어요. 지금은 어때요?`;
  return scene(`${label} 장래희망`, detail, Object.entries(DREAMS).map(([field, dream]) =>
    option(field === 'explore' ? 'rest' : `dream-${field}`, dream.label, dream.title, dream.mark, {}, 'dream', field,
      field === 'explore' ? '천천히 찾아보기로 했어요.' : '오늘 고른 꿈을 기록장에 적었어요.')));
}

function highSchool(life) {
  const dream = mostRecentDream(pathOf(life));
  return scene('고등학교 고르기', '어디에서 무엇을 배우고 싶어요?', [
    option('high-general', '일반고 가기', '여러 과목을 배우고 진로를 찾아요.', 'book', {}, 'school', 'general', '새 교복을 입고 거울 앞에 한참 서 있었어요.'),
    option('high-science', '과학고나 영재학교 가기', '실험과 연구를 많이 해요.', 'book', {}, 'school', 'science', '궁금한 걸 새 공책에 적었어요.', { need: { learning: dream === 'science' ? 21 : 25 } }),
    option('high-vocational', '직업계고 가기', '직접 만들고 고치는 기술을 배워요.', 'settings', {}, 'school', 'vocational', '처음으로 내 손으로 기계를 움직였어요.'),
    option('high-arts', '예술고 가기', '그림이나 음악을 깊이 배워요.', 'spark', {}, 'school', 'arts', '좋아하던 일을 학교에서도 하게 됐어요.', { need: { art: dream === 'art' ? 17 : 21 } }),
    option('rest', '학교 밖에서 배우기', '나만의 길을 찾아봐요. 나중에 검정고시도 볼 수 있어요.', 'leaf', {}, 'school', 'outside', '친구들과 다른 곳에서 새 학년을 맞았어요.'),
  ]);
}

function examChoice() {
  return option('equivalency', '고졸 검정고시 보기', '시험을 보고 고등학교를 마친 것과 같은 자격을 얻어요.', 'book', { learning: 2 },
    'diploma', true, '혼자 공부해 온 시간이 새 길을 열어 줬어요.', { need: { learning: 16 } });
}

function universityChoice(kind, life) {
  const field = mostRecentDream(pathOf(life));
  const data = PROGRAMS[kind];
  const label = kind === 'university' ? '4년제 대학' : data.label;
  const cost = { university: 6, college: 4, graduate: 8, training: 3 }[kind];
  const detail = field !== 'explore' && kind !== 'training' ? `${data.years}년 동안 ‘${fieldLabel(field)}’를 배워요.`
    : `${data.years}년 동안 새로 배우고 싶은 것을 공부해요.`;
  const extra = kind === 'university' ? { need: { learning: field === 'explore' ? 22 : 19 } } : {};
  return option(`study-${kind}`, kind === 'training' ? '일할 기술 배우기' : `${label} 가기`, detail,
    kind === 'training' ? 'settings' : 'book', { money: -cost }, 'study', kind,
    field === 'explore' ? '처음 보는 시간표를 받아 들었어요.' : `예전에 적은 ‘${fieldLabel(field)}’가 새 시간표에 있었어요.`, extra);
}

function workChoices(life) {
  const path = pathOf(life);
  const schoolField = { science: 'science', vocational: 'tech', arts: 'art' }[path.school];
  const field = [path.degree?.field, mostRecentDream(path), path.training && 'tech', schoolField]
    .find((item) => item && item !== 'explore') ?? 'explore';
  const dream = DREAMS[field];
  const work = [
    pick('work-staff', '회사에 취업하기', path.school === 'vocational' ? '학교에서 실습한 기술을 써요.' : '첫 일터에서 일을 배워요.', 'coin',
      {}, { employment: true, after: '첫 출근에 입을 옷을 전날 꺼내 놨어요.' }),
  ];
  if (dream.career) {
    const first = path.dreams.find((entry) => entry.field === field);
    work.unshift(pick('work-dream', `${CAREERS[dream.career].title} 되기`,
      first ? `${first.age}살에 고른 꿈과 이어지는 일이에요.` : `‘${dream.label}’에서 배운 것을 써요.`, dream.mark,
      dream.career === 'shop' ? { money: -15 } : {},
      { career: dream.career, need: dream.need, opportunity: true, after: first
        ? `${first.age}살 때 꿈을 적던 글씨가 떠올랐어요.` : '내가 고른 일터에서 첫날을 보냈어요.' }));
  }
  return work;
}

function educationPlan(life, path) {
  const eligible = path.school !== 'outside' || path.diploma;
  const options = [];
  if (eligible && !path.degree) options.push(universityChoice('university', life), universityChoice('college', life));
  else if (!eligible) options.push(examChoice());
  if (path.degree?.kind === 'university') options.push(universityChoice('graduate', life));
  if (!path.training) options.push(universityChoice('training', life));
  if (!life.career) options.push(...workChoices(life));
  if (!options.length) return null;
  const title = life.age === 19 ? '학교 다음에는?' : path.service?.endedAt === life.age ? '복무를 마친 뒤' :
    path.degree?.age === life.age ? '졸업했어요' : '일할까, 더 배울까?';
  const detail = life.age === 19 && path.sex === 'male' ? '학교나 일을 골라요. 군대는 스무 살부터 정해요.'
    : '배울지, 일을 할지, 지금의 생활을 이어갈지 골라요.';
  options.push(rest('조금 더 생각하기', '이번에는 지금 생활을 이어가요.', {}));
  return scene(title, detail, options);
}

function militaryPlan(life, path) {
  const detail = path.program ? '학교는 잠시 쉬고 2년 복무해요.' : life.career ? '일은 잠시 쉬고 2년 복무해요.' : '군대에서 2년을 보내요.';
  const choices = [option('enlist', '군대에 가기', detail, 'flag', {},
    'service', 'start', '짐을 싸며 돌아와서 할 일을 적었어요.')];
  if (!path.service && path.program) {
    choices.push(option('service-after-study', '졸업하고 군대 가기', '지금 다니는 학교를 마치고 복무해요.', 'book', {},
      'service', life.age + path.program.remaining, '졸업할 때까지 지금의 시간표를 이어가요.'));
  }
  if (!path.service) {
    choices.push(option('rest', '내년에 군대 가기', '올해는 학교나 일터를 다녀요.', 'leaf', {},
      'service', life.age + 1, '입영할 해를 달력에 표시했어요.'));
  }
  return scene('군대 갈 때 정하기', '학교나 일과 복무 일정을 맞춰요.', choices);
}

function serving(life, path) {
  const last = path.service.until === life.age + 1;
  return scene(last ? '복무 마지막 해' : '복무 첫해', last ? '곧 집으로 돌아가요. 무엇을 준비할까요?' : '새로운 생활에 익숙해지는 중이에요.', [
    pick('service-letter', '가족에게 편지 쓰기', '기다려 줘서 고맙다고 써요.', 'link', { bond: 4, joy: 2 }),
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
  if (path.partner === null && [24, 27, 30, 35, 41, 52].includes(age)) {
    return scene('또 만나고 싶은 사람', '함께 있으면 시간이 금세 가요.', [
      option('date', '연애 시작하기', '서로 마음이 같은지 물어요.', 'link', { bond: 4, joy: 5 },
        'partner', 'start', '돌아가는 길에 이미 했던 이야기를 두어 번 떠올렸어요.'),
      pick('stay-friends', '친구로 지내기', '편하게 만나 이야기를 나눠요.', 'link', { bond: 5, joy: 2 }),
      rest('혼자만의 시간 보내기', '좋아하는 일을 하면서 쉬어요.'),
    ]);
  }
  if (path.partner !== null && path.married === null && age - path.partner >= 2 && [29, 32, 36, 43, 55].includes(age)) {
    return scene('함께 살까?', '어디에 살고 어떻게 지낼지 이야기해요.', [
      option('marry', '결혼하기', '가까운 사람을 불러 작은 결혼식을 열어요.', 'link', { bond: 6, joy: 6, money: -12 },
        'marry', true, '식이 끝나고 둘이 나란히 앉아 한참 쉬었어요.'),
      pick('keep-dating', '지금처럼 만나기', '서로의 마음을 천천히 알아가요.', 'heart', { bond: 4, joy: 3 }),
      option('part', '헤어지기', '함께한 시간을 기억하고 각자의 길을 가요.', 'leaf', { health: 2, joy: -2 },
        'partner', 'end', '헤어지고도 그 사람이 집에 잘 닿았으면 했어요.'),
    ]);
  }
  if (path.partner !== null && path.children.length < 2 && age - (path.children.at(-1) ?? path.partner) >= 2 && [31, 34, 37, 40].includes(age)) {
    return scene('새 식구를 맞이할까?', '아이를 키운다면 돌봄을 어떻게 나눌지 생각해요.', [
      option('have-child', '아이를 맞이하기', '태어날 아이를 위해 시간과 돈을 준비해요.', 'sprout', { money: -9, health: -3, bond: 6, joy: 5 },
        'child', true, '작은 손에 내 손가락을 쥐여 줬어요. 누군가도 처음에 내게 그랬겠지요.'),
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
  const move = (id, title, detail, cost, kind, effect, after) =>
    option(id, title, detail, 'house', { money: refund - cost, ...effect }, 'move', kind, after);
  const choices = home?.kind === 'own' ? [
    move('move-home', '다른 집으로 옮기기', '집을 바꿔 편한 곳으로 이사해요.', 16, 'own', { joy: 6, health: 3 }, '새 집에서 창문을 열었어요. 골목 소리가 예전과 달랐어요.'),
    pick('fix-home', '지금 집 고치기', '오래 산 집을 더 편하게 만들어요.', 'house', { money: -9, joy: 4, health: 2 }),
  ] : [
    move('rent-room', home ? '월세집으로 이사하기' : '월세집 구하기',
      refund ? '전세금을 돌려받아요. 해마다 집세 2코인을 내요.' : '먼저 이사비를 내고 해마다 집세 2코인을 내요.', 8, 'rent', { joy: 3, health: 2 },
      '새 집의 첫날 밤엔 커튼을 달아야겠다는 생각이 났어요.'),
    move('lease-home', home?.kind === 'lease' ? '다른 전셋집으로 옮기기' : '전셋집 구하기',
      '맡겨 둔 돈은 이사할 때 돌려받아요.', LEASE_DEPOSIT + 4, 'lease', { joy: 5, health: 2 },
      '처음 내 열쇠로 문을 열었어요.'),
  ];
  if (buying || (moving && home?.kind !== 'own')) {
    choices.unshift(move('buy-home', '내 집 사기', refund ? '돌려받는 전세금을 집값에 보태요.' : '오래 모은 돈으로 집을 사요.', 80, 'own', { joy: 9, bond: 3 },
      '처음으로 벽에 못을 박고, 오래 간직한 사진을 걸었어요.'));
  }
  choices.push(rest('지금 집에서 지내기', '살던 곳에서 지내며 몸과 마음을 쉬게 해요.'));
  return scene(first ? '처음 집 구하기' : moving ? '어디에서 지낼까?' : '내 집을 살까?',
    first ? '내가 살 곳을 골라요.' : moving ? '일터나 가족 가까이 갈지 생각해요.' : '집값과 모아 둔 돈을 살펴봐요.', choices);
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
  if ([60, 65].includes(age) && life.career && path.retired === null) {
    return scene('일을 그만둘 때가 올까?', '처음 일을 배운 곳에서 이제는 내가 후배를 가르쳐요.', [
      option('retire', '은퇴하기', '일을 그만두고 쉬는 시간을 늘려요.', 'leaf', { health: 4, joy: 4 },
        'retire', true, '마지막 날 문을 평소처럼 닫았어요. 돌아보니 불이 아직 환했어요.'),
      pick('mentor-work', '일하면서 후배 돕기', '처음 일을 배울 때 듣고 싶던 말을 해 줘요.', 'book', { learning: 3, bond: 5, health: -2 }),
      rest('조금 천천히 일하기', '무리하지 않고 지금 일을 해요.'),
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

export function bonusScene(life, done) {
  const age = life.age;
  const path = pathOf(life);
  if (path.illness && !done.includes('illness')) return { ...illnessCare(path), key: 'illness', fallback: 'rest' };
  if ([10, 14, 17].includes(age) && !path.dreams.some((entry) => entry.age === age)) {
    return { ...dreamSurvey(life), key: 'dream', fallback: 'rest' };
  }
  if (age === 16 && !path.school) return { ...highSchool(life), key: 'school', fallback: 'high-general' };
  if (age === 18 && path.school === 'outside' && !path.diploma && !done.includes('education')) {
    return { ...scene('검정고시를 볼까?', '이 시험을 통과하면 대학에도 지원할 수 있어요.', [
      examChoice(), rest('조금 더 공부하기', '시험은 나중에 볼 수 있어요.', {}),
    ]), key: 'education', fallback: 'rest' };
  }
  if (path.sex === 'male' && age >= 20 && age <= 28 && !done.includes('military') &&
    (!path.service || (path.service.status === 'planned' && age >= path.service.at))) {
    const entry = militaryPlan(life, path);
    const fallback = entry.choices.find((choice) => choice.id === 'service-after-study')?.id ?? entry.choices.at(-1).id;
    return { ...entry, key: 'military', fallback };
  }
  const continuing = path.program || path.service?.status === 'serving';
  const planning = [19, 22, 26, 38, 50].includes(age) || path.degree?.age === age ||
    path.diplomaAge === age - 1 || (!life.career && path.trainingAge === age) ||
    (path.service?.endedAt === age && (!life.career || path.degree));
  if (!continuing && planning && !done.includes('education')) {
    const entry = educationPlan(life, path);
    if (entry) return { ...entry, key: 'education', fallback: 'rest' };
  }
  return null;
}

export function annualScene(life) {
  const age = life.age;
  const path = pathOf(life);
  if (age < CHILDHOOD.length) return CHILDHOOD[age];
  if (age < 19) return schoolYear(life, path);
  if (path.service?.status === 'serving') return serving(life, path);
  if (path.program && (age === 19 || path.service?.endedAt === age)) return studying(life, path);
  if (path.firstJobAge === age) {
    return scene('일터에서 보낸 첫해', '새 일터에서 내 자리를 찾아요.', [
      pick('work-learn', '일을 배우기', '모르는 것을 동료에게 물어요.', 'book', { learning: 5, bond: 2 }),
      pick('work-more', '일을 더 맡아 저축하기', '바쁘지만 돈을 더 모아요.', 'coin', { money: 8, health: -3 }),
      rest('퇴근 뒤 시간 챙기기', '일이 끝나면 몸과 마음을 쉬게 해요.'),
    ]);
  }
  return relationships(life) ?? housing(life, path) ?? (path.program ? studying(life, path) : laterLife(life, path));
}

export function applyPath(life, age, choice) {
  const path = life.path ??= newPath();
  const action = choice.action;
  switch (action?.kind) {
    case 'dream': path.dreams.push({ age, field: action.value }); break;
    case 'school': path.school = action.value; break;
    case 'diploma':
      path.diploma = true;
      path.diplomaAge = age;
      break;
    case 'study':
      path.program = { kind: action.value, field: mostRecentDream(path), remaining: PROGRAMS[action.value].years };
      break;
    case 'service':
      path.service = action.value === 'start' ? { status: 'serving', until: age + 2 } : { status: 'planned', at: action.value };
      break;
    case 'partner': path.partner = action.value === 'start' ? age : null; break;
    case 'marry': path.married = age; break;
    case 'child': path.children.push(age); break;
    case 'retire': path.retired = age; break;
    case 'move':
      path.home = { kind: action.value, at: age, deposit: action.value === 'lease' ? LEASE_DEPOSIT : 0 };
      break;
    case 'care': return [choice.after, finishCare(path, age, action.value)].filter(Boolean).join(' ');
  }
  return choice.after ?? '';
}

export function advancePath(life) {
  const path = life.path;
  if (path.service?.status === 'serving') {
    if (life.age < path.service.until) return '';
    path.service = { status: 'complete', endedAt: life.age };
    return path.program ? '복무를 마쳤어요. 다니던 학교로 돌아가요.' : '복무를 마치고 집으로 돌아와요.';
  }
  if (!path.program) return '';
  path.program.remaining -= 1;
  if (path.program.remaining > 0) return '';
  const { kind, field } = path.program;
  if (kind === 'training') {
    path.training = true;
    path.trainingAge = life.age;
  } else path.degree = { kind, field, age: life.age };
  path.program = null;
  return kind === 'training' ? '기술을 배우는 과정을 마쳤어요.' : `${PROGRAMS[kind].label}을 마쳤어요. 처음 메던 가방이 많이 해졌어요.`;
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

export function chanceDiscount(life, career, stat) {
  if (!career || stat === 'money') return 0;
  const path = pathOf(life);
  const field = Object.keys(DREAMS).find((key) => DREAMS[key].career === career);
  if (!field) return 0;
  return (path.dreams.some((entry) => entry.field === field) ? 5 : 0)
    + (path.degree?.field === field ? 6 : 0)
    + (career === 'tech' && (path.training || path.school === 'vocational') ? 7 : 0);
}

export function lifeBadges(life) {
  const path = pathOf(life);
  return [
    SEXES[path.sex],
    life.age < 19 && SCHOOLS[path.school],
    path.program && `${PROGRAMS[path.program.kind].label} · ${path.program.remaining}년 남음`,
    path.service?.status === 'serving' && '복무 중',
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
    path.degree && `${path.degree.age}살에 ${PROGRAMS[path.degree.kind].label} 마침`,
    path.training && '직업훈련 수료',
    path.service?.status === 'complete' && `${path.service.endedAt}살에 복무 마침`,
    path.home && `${path.home.at}살에 ${HOME_NAMES[path.home.kind]}`,
    path.married !== null && `${path.married}살에 결혼`,
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
