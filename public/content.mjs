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
  { min: 35, label: '장년기', cue: '쌓아 온 것, 새로 시작할 것', color: 'rose' },
  { min: 60, label: '은빛 시절', cue: '나만의 속도로 걷다', color: 'lime' },
  { min: 75, label: '황혼기', cue: '추억을 나누는 시간', color: 'plum' },
];

export const CAREERS = {
  staff: { title: '회사원', place: '전에 다니던 일터', wage: 2 },
  lab: { title: '연구원', place: '동네 연구소', wage: 3 },
  studio: { title: '창작자', place: '햇살 공방', wage: 2 },
  tech: { title: '현장 기술자', place: '동네 기술 작업장', wage: 3 },
  shop: { title: '가게 주인', place: '골목의 내 가게', wage: 4 },
  care: { title: '마을 활동가', place: '마을 배움터', wage: 2 },
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

const rest = pick('rest', '쉬어 가기', '일정을 가볍게 하고 마음과 몸을 돌본다.', 'leaf', { health: 4, joy: 2 });
export const IDLE = pick('idle', '평소대로 지내기', '정해진 선택 없이 평범한 한 해를 보냈어요.', 'leaf', { health: 1 });

function story(title, detail, first, second) {
  return { title, detail, choices: [first, second, rest] };
}

export const STORIES = [
  [
    story('세상으로 첫걸음', '해 보고 싶었던 일이 많아졌어요. 이번에는 무엇에 시간을 쓸까요?',
      pick('shift', '일을 배워 돈 모으기', '현장에서 일하며 다음 기회를 준비한다.', 'coin', { money: 10, health: -4, learning: 2 }, { employment: true }),
      pick('course', '새 기술 공부하기', '당장 가진 돈을 써서 배움의 폭을 넓힌다.', 'book', { learning: 8, money: -5, health: -2 })),
    story('첫 월급의 기억', '내 손으로 번 돈을 처음 받았을 때의 마음을 떠올려요.',
      pick('save', '비상금 만들기', '조금씩 모아 다음 선택을 위한 여유를 만든다.', 'coin', { money: 8, joy: -2, health: -1 }),
      pick('trip', '가까운 곳으로 여행', '쉬어 갈 곳을 찾아 친구와 하루를 보낸다.', 'sun', { money: -6, joy: 8, bond: 3, health: 2 })),
    story('새로운 이웃', '오래 비어 있던 옆집에 누군가 이사를 왔어요.',
      pick('welcome', '저녁 한 끼 나누기', '반찬을 조금 더 만들어 먼저 인사한다.', 'link', { money: -3, bond: 7, joy: 4 }),
      pick('portfolio', '내 작업 모아 보기', '작은 작업을 정리하고 사람들 앞에 내놓는다.', 'spark', { art: 7, learning: 2, health: -2 })),
    story('스스로 정한 약속', '하고 싶은 일과 해야 할 일이 달력 한 칸에 겹쳤어요.',
      pick('deadline', '새 프로젝트 맡기', '집중해서 일하며 실력과 자금을 모은다.', 'coin', { money: 12, learning: 2, health: -6, joy: -2 }, { employment: true }),
      pick('routine', '나만의 운동 습관 만들기', '짧은 산책부터 달력에 표시해 본다.', 'heart', { health: 6, joy: 2, money: -3 })),
  ],
  [
    story('바빠진 달력', '일정표에 빈칸이 거의 없어요. 어느 자리에 시간을 낼까요?',
      pick('lead', '큰 일 맡아 마무리하기', '책임은 늘지만 보람과 보수도 커진다.', 'coin', { money: 15, health: -6, joy: -2, learning: 2 }, { employment: true }),
      pick('together', '소중한 사람과 주말 보내기', '하루를 비워 가까운 사람과 느긋하게 보낸다.', 'link', { bond: 6, joy: 5, money: -4 })),
    story('마을에 남는 자리', '마을에서 모두가 사용할 작은 공간을 꾸미고 있어요.',
      pick('teach', '내가 배운 것 나누기', '이웃에게 아는 기술을 천천히 알려 준다.', 'book', { learning: 4, bond: 6, joy: 2, health: -2 }),
      pick('mural', '골목 벽화 만들기', '오래된 벽에 우리 동네 이야기를 그린다.', 'spark', { art: 8, bond: 3, money: -4 })),
    story('일상의 방향을 바꿀 때', '익숙해진 일상 속에서 새로운 길이 하나 보여요.',
      pick('relearn', '다른 분야 다시 배우기', '낯설어도 기초부터 다시 배워 본다.', 'book', { learning: 7, money: -4, joy: 1 }),
      pick('steady', '하던 일을 단단히 이어가기', '쌓아 둔 경험으로 한 걸음 더 나아간다.', 'coin', { money: 10, health: -4, bond: 2 }, { employment: true })),
    story('오랜 친구의 연락', '오랫동안 못 봤던 친구가 함께 걷자고 연락했어요.',
      pick('walk', '저녁 산책 약속 잡기', '걷고 이야기하며 서로의 시간을 듣는다.', 'heart', { health: 4, bond: 5, joy: 2 }),
      pick('letter', '이야기를 짧은 글로 남기기', '그동안 마음에 담아 둔 말을 글로 쓴다.', 'spark', { art: 6, joy: 3, bond: 2 })),
  ],
  [
    story('조금 느려진 아침', '아침의 시간이 한결 길게 느껴져요. 오늘은 어디로 향할까요?',
      pick('garden', '작은 텃밭 돌보기', '흙을 만지고 수확한 채소를 나눈다.', 'heart', { health: 4, joy: 3, bond: 2 }),
      pick('craft', '작은 공예품 만들기', '손이 기억하는 방식으로 무언가를 만든다.', 'spark', { art: 7, money: 4, health: -3 })),
    story('새로 시작한 모임', '동네 게시판에 이번 달 첫 모임 안내가 붙었어요.',
      pick('mentor', '후배에게 경험 들려주기', '실패와 성공을 함께 이야기한다.', 'link', { bond: 7, learning: 3, joy: 2 }),
      pick('lecture', '새로운 강좌 들어 보기', '한 번도 배운 적 없는 것을 골라 듣는다.', 'book', { learning: 7, money: -3, joy: 3 })),
    story('오래된 여행 지도', '서랍 깊은 곳에서 예전에 쓰던 지도를 발견했어요.',
      pick('rail', '기차 타고 옛 마을 가기', '정겨운 풍경을 다시 만나 본다.', 'sun', { joy: 7, bond: 3, money: -7, health: -2 }),
      pick('photo', '사진과 이야기를 정리하기', '누군가 읽을 수 있도록 기록을 엮는다.', 'spark', { art: 6, learning: 3, joy: 2 })),
    story('할 수 있는 작은 일', '예전보다 무리하기 어렵지만 지금 할 수 있는 일이 보여요.',
      pick('market', '이웃 장터에서 일하기', '필요한 물건을 내놓고 가볍게 일한다.', 'coin', { money: 9, health: -5, bond: 3 }),
      pick('clinic', '몸 돌보기', '건강을 살피고 매일 조금씩 움직인다.', 'heart', { health: 8, money: -5, joy: 1 })),
  ],
  [
    story('별이 뜨는 마당', '마당에 의자를 꺼내 놓으니 밤하늘이 더 가깝게 보여요.',
      pick('memoir', '내 이야기 들려주기', '잊히기 전에 마음에 남은 일을 전한다.', 'spark', { art: 6, bond: 4, joy: 2, health: -1 }),
      pick('breathe', '천천히 걷고 쉬기', '숨이 편한 속도로 하루를 보낸다.', 'heart', { health: 6, joy: 2 })),
    story('책장 속 편지', '오래된 편지 한 통에 그때의 기억이 고스란히 남아 있어요.',
      pick('visit', '고마운 사람 찾아가기', '말하지 못했던 감사 인사를 전한다.', 'link', { bond: 7, joy: 4, health: -2, money: -2 }),
      pick('sort', '추억을 전시하기', '오래 간직한 물건에 이야기를 붙인다.', 'spark', { art: 7, learning: 2, joy: 3 })),
    story('창가에 드는 빛', '햇빛이 기울기 전에 하고 싶은 일이 하나 있어요.',
      pick('care', '몸에 좋은 하루 보내기', '든든히 먹고 편한 만큼 움직인다.', 'heart', { health: 8, money: -4, joy: 2 }),
      pick('give', '아이들에게 책 선물하기', '내가 좋아했던 책을 골라 나눈다.', 'book', { bond: 5, learning: 4, money: -5, joy: 3 })),
    story('동네의 작은 전시회', '누구든 살면서 만든 것 하나를 전시해도 되는 날이에요.',
      pick('legacy', '내 작품을 걸어 두기', '누군가가 보고 미소 지을 장면을 상상한다.', 'spark', { art: 8, joy: 4, health: -3 }),
      pick('listen', '다른 사람의 이야기 듣기', '내가 살아 보지 못한 삶을 잠깐 엿본다.', 'link', { bond: 5, learning: 4, joy: 3 })),
  ],
];

export const OPPORTUNITIES = [
  [
    pick('lab', '연구소에 들어가기', '배운 것으로 일하며 꾸준한 소득을 얻는다.', 'book', { money: 8, learning: 5, health: -3 }, { need: { learning: 31 }, career: 'lab' }),
    pick('studio', '내 공방 열기', '만드는 일을 직업으로 삼아 작은 공방을 연다.', 'spark', { art: 8, joy: 5, money: -9 }, { need: { art: 30 }, career: 'studio' }),
    pick('shop', '작은 가게 시작하기', '모아 둔 자금을 투자하고 골목에 가게를 연다.', 'coin', { money: -18, learning: 4, health: -3 }, { need: { money: 35 }, career: 'shop' }),
    pick('care-work', '마을 배움터에서 일하기', '사람들을 연결하는 일을 직업으로 삼는다.', 'link', { bond: 7, joy: 4, money: 4 }, { need: { bond: 29 }, career: 'care' }),
  ],
  [
    pick('shop', '작은 가게 운영하기', '자금을 들여 다음 일터를 직접 꾸린다.', 'coin', { money: -18, learning: 4, health: -3 }, { need: { money: 45 }, career: 'shop' }),
    pick('lab', '연구소 새 일 맡기', '다시 공부한 분야에서 연구하는 일을 시작한다.', 'book', { money: 8, learning: 5, health: -3 }, { need: { learning: 43 }, career: 'lab' }),
    pick('studio', '내 공방으로 옮기기', '오래 가꿔 온 취미를 새로운 일로 만든다.', 'spark', { art: 8, joy: 5, money: -9 }, { need: { art: 38 }, career: 'studio' }),
    pick('care-work', '마을 배움터 운영하기', '도움을 주고받을 공간을 꾸려 나간다.', 'link', { bond: 7, joy: 4, money: 4 }, { need: { bond: 38 }, career: 'care' }),
  ],
  [
    pick('master', '작은 전시회 열기', '평생 모은 작품으로 동네 사람들을 초대한다.', 'spark', { art: 8, joy: 8, money: 5 }, { need: { art: 47 } }),
    pick('fund', '마을 배움 기금 만들기', '모아 온 돈 일부를 다음 세대의 기회로 바꾼다.', 'link', { money: -22, bond: 9, joy: 7 }, { need: { money: 55 } }),
  ],
  [
    pick('wisdom', '인생 수업 열기', '내 삶에서 배운 것을 어린 세대에게 들려준다.', 'book', { learning: 5, bond: 8, joy: 6 }, { need: { learning: 52 } }),
    pick('gather', '감사의 저녁 열기', '오래 곁에 있던 사람들을 한 자리에 초대한다.', 'link', { bond: 7, joy: 8, money: -9 }, { need: { bond: 48 } }),
  ],
];

export function spiritChoices(life, visits) {
  const career = CAREERS[life.career];
  const funeral = pick('funeral', '내 장례식장 방문하기', '모인 사람들이 내게 전하는 마지막 인사를 들어요.', 'flower', {});
  const workplace = pick('workplace', '예전 직장 둘러보기',
    career ? `${career.place}에 들러 동료들이 기억하는 이야기를 들어요.` : '생전에 다녔던 일터가 있어야 방문할 수 있어요.',
    'house', {}, { locked: career ? '' : '생전에 가진 직장이 없어요.' });
  return [
    ...(visits.some((visit) => visit.id === 'funeral') ? [] : [funeral]),
    pick('family-dream', '가족의 꿈에 나오기', '꿈속에서 만나 평소처럼 안부를 묻고, 못다 한 인사를 해요.', 'spark', {}),
    workplace,
    pick('neighborhood', '살던 동네 걷기', '익숙한 골목을 따라 내가 보냈던 날을 떠올려요.', 'leaf', {}),
    pick('watch', '친구들의 삶 지켜보기', '같은 방의 인생 기록을 펼치고 남은 시간을 응원해요.', 'link', {}),
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
  { title: '뜻밖의 만남', text: '오랜만에 만난 이웃과 마음을 나눴어요.', effect: { bond: 3, joy: 2 } },
  { title: '남은 용돈', text: '예상보다 적게 써 동전이 조금 남았어요.', effect: { money: 4 } },
  { title: '푹 쉬어 간 날', text: '미뤄 둔 쉼 덕분에 몸이 가벼워졌어요.', effect: { health: 3 } },
  { title: '감기에 걸린 날', text: '며칠 쉬어 가느라 체력이 조금 줄었어요.', effect: { health: -3 } },
  { title: '갑자기 든 비용', text: '고장 난 물건을 고치느라 자금을 조금 썼어요.', effect: { money: -4 } },
  { title: '좋은 영감', text: '익숙한 풍경에서 새로운 아이디어를 얻었어요.', effect: { art: 3, joy: 1 } },
];
