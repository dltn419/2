export const STATS = {
  health: { label: '체력', mark: 'heart', color: 'rose' },
  learning: { label: '배움', mark: 'book', color: 'blue' },
  money: { label: '자금', mark: 'coin', color: 'amber', unit: '코인' },
  joy: { label: '행복', mark: 'sun', color: 'lime' },
  art: { label: '예술', mark: 'spark', color: 'plum' },
  bond: { label: '관계', mark: 'link', color: 'mint' },
};

export const STAGES = [
  { min: 0, label: '어린 날', cue: '처음 만나는 세상', color: 'mint' },
  { min: 7, label: '학창 시절', cue: '배우고 어울리는 날들', color: 'blue' },
  { min: 19, label: '청년기', cue: '세상에 내 자리를 찾다', color: 'amber' },
  { min: 35, label: '장년기', cue: '일과 가족', color: 'rose' },
  { min: 60, label: '노년기', cue: '천천히 지내는 날들', color: 'lime' },
  { min: 75, label: '오랜 세월', cue: '추억을 나누는 날들', color: 'plum' },
];

export const CAREERS = {
  staff: { title: '회사원', place: '전에 다니던 일터', wage: 2 },
  lab: { title: '연구원', place: '동네 연구소', wage: 3 },
  studio: { title: '창작자', place: '햇살 공방', wage: 2 },
  tech: { title: '현장 기술자', place: '동네 기술 작업장', wage: 3, fatigue: 1 },
  shop: { title: '가게 주인', place: '골목의 내 가게', wage: 4, fatigue: 1 },
  care: { title: '마을 활동가', place: '마을 배움터', wage: 2 },
};

export const HABITS = {
  exercise: { label: '꾸준한 운동', years: 3, effect: { health: 2 } },
  overtime: { label: '바쁜 일', years: 3, effect: { money: 3, health: -2 } },
  lessons: { label: '계속 배우기', years: 3, effect: { learning: 2 } },
  teaching: { label: '이웃을 가르치기', years: 3, effect: { bond: 2 } },
  garden: { label: '텃밭 돌보기', years: 3, effect: { health: 1, joy: 1 } },
};

export const AVATARS = [
  { name: '단풍', shirt: '#d96949', hair: '#4d3730', skin: '#efb889' },
  { name: '풀잎', shirt: '#61974b', hair: '#523d31', skin: '#b97f5a' },
  { name: '파도', shirt: '#508cc4', hair: '#2d3b46', skin: '#edb88b' },
  { name: '자두', shirt: '#9b70a9', hair: '#594342', skin: '#d99a71' },
  { name: '햇살', shirt: '#dbaa3d', hair: '#7c4d31', skin: '#f0c49f' },
  { name: '구름', shirt: '#5eaba0', hair: '#45413a', skin: '#cf9167' },
];

export function pick(id, title, detail, mark, effect, extra = {}) {
  return { id, title, detail, mark, effect, ...extra };
}

const rest = pick('rest', '쉬어 가기', '일을 줄이고 몸을 돌봐요.', 'leaf', { health: 3, joy: 1 });
export const IDLE = pick('idle', '평소대로 지내기', '익숙한 일상을 보냈어요.', 'leaf', { health: 1 });

function story(title, detail, first, second) {
  return { title, detail, choices: [first, second, rest] };
}

export const STORIES = [
  [
    story('새 일을 배우는 해', '한 해를 어디에 써 볼까요?',
      pick('shift', '일하며 돈 모으기', '현장에서 일을 배워요.', 'coin', { money: 8, health: -3, learning: 2 }, { employment: true }),
      pick('course', '새 기술 배우기', '돈을 내고 배우고 싶던 수업을 들어요.', 'book', { learning: 6, money: -5 })),
    story('돈을 어디에 쓸까?', '모은 돈이 조금 생겼어요.',
      pick('save', '일을 더 해서 저축하기', '나중에 쓸 돈을 모아 둬요.', 'coin', { money: 7, health: -2 }),
      pick('trip', '가까운 곳으로 여행 가기', '친구와 가고 싶던 곳에 가요.', 'sun', { money: -6, joy: 7, bond: 2 })),
    story('새 이웃', '비어 있던 옆집에 사람이 이사 왔어요.',
      pick('welcome', '저녁 나누기', '반찬을 조금 만들어 인사하러 가요.', 'link', { money: -3, bond: 5, joy: 3 }),
      pick('portfolio', '작품 모아 보기', '그동안 만든 것을 정리해요.', 'spark', { art: 6, learning: 2, health: -1 })),
    story('바쁜 일정', '하고 싶은 일과 해야 할 일이 겹쳐요.',
      pick('deadline', '새 일 맡기', '바쁘지만 일을 익히고 돈을 벌어요.', 'coin', { money: 10, learning: 2, health: -5 }, { employment: true }),
      pick('routine', '운동 습관 만들기', '매일 조금씩 움직여요.', 'heart', { health: 2, joy: 1, money: -2 }, { habit: 'exercise' })),
  ],
  [
    story('꽉 찬 달력', '이번 해에는 어디에 시간을 낼까요?',
      pick('lead', '큰 일 맡기', '한동안 바쁘지만 돈을 더 벌어요.', 'coin', { money: 8, health: -4, joy: -1 }, { employment: true, habit: 'overtime' }),
      pick('together', '소중한 사람과 쉬기', '주말에 시간을 내서 만나요.', 'link', { bond: 5, joy: 4, money: -4 })),
    story('우리 동네', '이웃과 함께할 일이 생겼어요.',
      pick('teach', '배운 것 알려 주기', '이웃과 만나서 기술을 나눠요.', 'book', { learning: 2, bond: 3, health: -1 }, { habit: 'teaching' }),
      pick('mural', '골목에 그림 그리기', '빈 벽에 우리 동네 이야기를 그려요.', 'spark', { art: 7, bond: 2, money: -4 })),
    story('새로운 기회', '계속해 온 일과 새로 해 보고 싶은 일이 있어요.',
      pick('relearn', '다른 일 배우기', '낯선 분야를 처음부터 배워요.', 'book', { learning: 4, money: -5, joy: 2 }, { habit: 'lessons' }),
      pick('steady', '하던 일에 힘쓰기', '쌓은 경험을 써서 돈을 벌어요.', 'coin', { money: 9, health: -3, bond: 2 }, { employment: true })),
    story('오랜 친구의 연락', '한동안 못 만난 친구가 연락했어요.',
      pick('walk', '함께 산책하기', '걸으며 그동안의 이야기를 해요.', 'heart', { health: 3, bond: 5 }),
      pick('letter', '이야기 글로 남기기', '마음에 담아 둔 말을 써요.', 'spark', { art: 5, joy: 3 })),
  ],
  [
    story('천천히 맞는 아침', '오늘은 무엇을 할까요?',
      pick('garden', '텃밭 가꾸기', '키운 채소를 이웃과 나눠요.', 'heart', { health: 2, joy: 2, bond: 1 }, { habit: 'garden' }),
      pick('craft', '손으로 물건 만들기', '오래 익힌 솜씨를 써요.', 'spark', { art: 6, money: 3, health: -2 })),
    story('동네 모임', '동네에 새 모임이 열려요.',
      pick('mentor', '후배에게 경험 들려주기', '나도 처음엔 어려웠다고 말해요.', 'link', { bond: 5, learning: 2, joy: 2 }),
      pick('lecture', '새 수업 듣기', '배운 적 없는 걸 알아봐요.', 'book', { learning: 6, money: -4, joy: 2 })),
    story('오래된 지도', '서랍에서 전에 쓰던 지도가 나왔어요.',
      pick('rail', '기차 타고 옛 동네 가기', '기억에 남은 곳을 다시 가 봐요.', 'sun', { joy: 6, bond: 2, money: -7, health: -2 }),
      pick('photo', '옛 사진 정리하기', '사진 아래에 그날 일을 한 줄 써요.', 'spark', { art: 5, learning: 2, joy: 2 })),
    story('할 수 있는 작은 일', '지금 내 속도에 맞는 일을 찾아요.',
      pick('market', '동네 장터에서 일하기', '물건을 내놓고 조금 일해요.', 'coin', { money: 7, health: -4, bond: 2 }),
      pick('clinic', '건강 챙기기', '든든히 먹고 가볍게 움직여요.', 'heart', { health: 6, money: -4 })),
  ],
  [
    story('별이 뜨는 마당', '마당에 의자를 꺼내 놓았어요.',
      pick('memoir', '옛날 이야기 들려주기', '잊기 전에 기억에 남은 일을 전해요.', 'spark', { art: 5, bond: 3, health: -1 }),
      pick('breathe', '천천히 걷기', '숨이 편할 만큼만 걸어요.', 'heart', { health: 4, joy: 2 })),
    story('책 속 편지', '오래전에 받은 편지를 다시 읽어요.',
      pick('visit', '고마운 사람 만나기', '못 했던 인사를 전해요.', 'link', { bond: 5, joy: 3, health: -2, money: -2 }),
      pick('sort', '추억 정리하기', '오래 가진 물건에 이야기를 붙여요.', 'spark', { art: 5, learning: 2, joy: 2 })),
    story('창가의 햇빛', '해가 지기 전에 하고 싶은 일이 있어요.',
      pick('care', '몸을 돌보는 하루 보내기', '잘 먹고 편한 만큼 움직여요.', 'heart', { health: 6, money: -4, joy: 1 }),
      pick('give', '아이들에게 책 선물하기', '내가 좋아한 책을 골라요.', 'book', { bond: 5, learning: 2, money: -5, joy: 2 })),
    story('작은 전시회', '동네에 내가 만든 것을 보여 줄 자리가 생겼어요.',
      pick('legacy', '내 작품 걸기', '누군가 보고 웃었으면 해요.', 'spark', { art: 6, joy: 3, health: -2 }),
      pick('listen', '이웃 이야기 듣기', '다른 사람은 어떤 삶을 살았는지 들어요.', 'link', { bond: 4, learning: 3, joy: 2 })),
  ],
];

export const OPPORTUNITIES = [
  [
    pick('lab', '연구소에서 일하기', '배운 것으로 궁금한 것을 연구해요.', 'book', { money: 7, learning: 4, health: -3 }, { need: { learning: 31 }, career: 'lab' }),
    pick('studio', '내 공방 열기', '작품을 만드는 일을 해요.', 'spark', { art: 7, joy: 4, money: -12 }, { need: { art: 30 }, career: 'studio' }),
    pick('shop', '가게 열기', '모은 돈으로 작은 가게를 열어요.', 'coin', { money: -24, learning: 4, health: -3 }, { need: { money: 35 }, career: 'shop' }),
    pick('care-work', '마을에서 가르치기', '가까운 곳에서 사람들이 배우도록 도와요.', 'link', { bond: 6, joy: 3, health: -2 }, { need: { bond: 29 }, career: 'care' }),
  ],
  [
    pick('shop', '내 가게 열기', '모은 돈으로 새 일터를 만들어요.', 'coin', { money: -24, learning: 4, health: -3 }, { need: { money: 45 }, career: 'shop' }),
    pick('lab', '연구소로 옮기기', '새로 배운 분야에서 일해요.', 'book', { money: 7, learning: 4, health: -3 }, { need: { learning: 43 }, career: 'lab' }),
    pick('studio', '공방에서 일하기', '오래 해 온 취미를 일로 이어가요.', 'spark', { art: 7, joy: 4, money: -12 }, { need: { art: 38 }, career: 'studio' }),
    pick('care-work', '마을 배움터 운영하기', '이웃이 함께 배우는 곳을 꾸려요.', 'link', { bond: 6, joy: 3, health: -2 }, { need: { bond: 38 }, career: 'care' }),
  ],
  [
    pick('master', '작은 전시회 열기', '살면서 만든 작품에 이웃을 초대해요.', 'spark', { art: 7, joy: 6, money: -6 }, { need: { art: 47 } }),
    pick('fund', '배움에 쓸 돈 나누기', '모은 돈으로 어린 세대가 배우도록 도와요.', 'link', { money: -22, bond: 8, joy: 6 }, { need: { money: 55 } }),
  ],
  [
    pick('wisdom', '내가 배운 것 가르치기', '살면서 알게 된 일을 나눠요.', 'book', { learning: 4, bond: 7, health: -2 }, { need: { learning: 52 } }),
    pick('gather', '고마운 사람 초대하기', '오래 곁에 있던 사람들과 밥을 먹어요.', 'link', { bond: 6, joy: 7, money: -9 }, { need: { bond: 48 } }),
  ],
];

export function spiritChoices(life, visits) {
  const career = CAREERS[life.career];
  const funeral = pick('funeral', '내 장례식장 방문하기', '찾아온 사람들이 하는 인사를 들어요.', 'flower', {});
  const workplace = pick('workplace', '예전 직장 둘러보기',
    career ? `${career.place}에 들러 동료들이 기억하는 이야기를 들어요.` : '전에 다니던 곳을 찾아가요.',
    'house', {}, { locked: career ? '' : '다녀온 일터가 없어요.' });
  return [
    ...(visits.some((visit) => visit.id === 'funeral') ? [] : [funeral]),
    pick('family-dream', '가족의 꿈에 나오기', '꿈에 찾아가 안부를 물어요.', 'spark', {}),
    workplace,
    pick('neighborhood', '살던 동네 걷기', '익숙한 골목을 다시 걸어요.', 'leaf', {}),
    pick('watch', '친구들의 삶 지켜보기', '기록장을 읽으며 친구들을 응원해요.', 'link', {}),
  ];
}

export const SPIRIT_SCENES = {
  funeral: [
    '장례식장에 누군가 꽃 한 송이를 두고 갔어요. “함께 걷던 날을 기억해요.”',
    '창가에 놓인 사진을 사람들이 한참 바라봤어요. “그때 같이 웃었지.”',
  ],
  workplace: [
    '예전에 함께 일하던 사람이 새로 온 동료에게 당신의 이야기를 들려줬어요.',
    '한때 당신이 쓰던 자리 위에 새 작업물이 놓여 있어요. 당신이 알려 준 방식이 이어지고 있어요.',
  ],
  neighborhood: [
    '골목 모퉁이에는 여전히 따뜻한 불이 켜져 있어요. 익숙한 바람에 옛날이 떠올랐어요.',
    '자주 걷던 길의 나무가 한 뼘 더 자랐어요. 아이들이 그 아래에서 웃고 있어요.',
  ],
  watch: [
    '친구들의 기록장을 펼쳤어요. 같은 해를 각자 다른 이야기로 채우고 있네요.',
    '누군가 새 선택을 준비하고 있어요. 곁에서 조용히 응원했어요.',
  ],
};

export const LIFE_EVENTS = [
  { text: '오랜만에 이웃과 이야기를 나눴어요.', effect: { bond: 2, joy: 1 } },
  { text: '쓰고 남은 동전 몇 개를 저금했어요.', effect: { money: 2 } },
  { text: '푹 쉬고 나니 몸이 가벼워졌어요.', effect: { health: 2 } },
  { text: '고장 난 물건을 고치느라 돈을 조금 썼어요.', effect: { money: -2 } },
  { text: '익숙한 길을 걷다 새 생각이 났어요.', effect: { art: 2, joy: 1 } },
];
