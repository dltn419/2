import { CAREER_GROUPS, NEW_CAREERS, EXTRA_ROUTES, SPECIAL_BRANCHES } from './career-expansion.mjs';
export { CAREER_GROUPS };


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

export const CAREER_CREDENTIALS = {
  school: '고등학교 졸업 또는 검정고시',
  skill: '직업계고·직업훈련·전문대 이상 중 하나',
  bachelor: '4년제 대학 졸업 이상',
  stem: '과학·기술 계열 4년제 대학 졸업 이상',
  biology: '생명과학 또는 과학 계열 4년제 졸업',
  teaching: '교육대 졸업',
  doctor: '의대 졸업과 의사 면허',
  nursing: '간호학과 졸업과 간호사 면허',
  caregiving: '돌봄 교육과 자격 시험',
  sports: '운동부나 운동팀 훈련 2회 이상',
  pharmacy: '약학과 졸업 및 약사 면허',
  dentistry: '치의학과 졸업 및 치과의사 면허',
};

export const CAREER_GROWTH = {
  early: { label: '초기 성장', steps: [2, 5, 10], raise: 1 },
  stable: { label: '안정 성장', steps: [4, 9, 16], raise: 1 },
  skilled: { label: '숙련 성장', steps: [3, 7, 12, 18], raise: 1 },
  professional: { label: '전문 성장', steps: [4, 9, 15], raise: 1 },
  performance: { label: '성과 성장', steps: [3, 7, 12], raise: 1 },
  athlete: { label: '선수 성장', steps: [2, 4, 7], raise: 2 },
};

export const CAREERS = {
  crew: { growth: 'early', title: '매장 직원', detail: '물건을 정리하고 손님을 도와요.', place: '전에 일하던 매장', mark: 'coin', wage: 2, payStat: 'bond' },
  cleaner: { growth: 'early', retireAt: 60, title: '청소원', detail: '건물을 깨끗하게 돌보고 안전한지 살펴요.', place: '전에 일하던 건물', mark: 'spark', wage: 3, fatigue: 1,
    payStat: 'health', need: { health: 22 } },
  restaurant: { growth: 'early', retireAt: 60, title: '식당 직원', detail: '손님을 맞고 음식을 나르며 식당을 돌봐요.', place: '전에 일하던 식당', mark: 'sun', wage: 3, fatigue: 1,
    field: 'food', related: ['sales'], payStat: 'bond', need: { bond: 19 } },
  delivery: { growth: 'early', retireAt: 60, title: '배송 기사', detail: '물건을 실어 여러 곳에 가져다줘요.', place: '전에 일하던 물류 센터', mark: 'house', wage: 3, fatigue: 1,
    field: 'tech', payStat: 'health', need: { health: 26 } },
  staff: { growth: 'stable', title: '회사원', detail: '회사에서 문서와 일정 등을 맡아요.', place: '전에 다니던 회사', mark: 'book', wage: 3,
    field: 'office', education: 'school', need: { learning: 22 } },
  factory: { growth: 'skilled', retireAt: 60, title: '생산직 직원', detail: '공장에서 물건을 만들고 잘 만들어졌는지 확인해요.', place: '전에 일하던 공장', mark: 'settings', wage: 4, fatigue: 1,
    field: 'tech', need: { health: 32, learning: 18 } },
  care: { growth: 'stable', title: '마을 활동가', detail: '이웃이 함께 배우고 지내도록 도와요.', place: '마을 배움터', mark: 'link', wage: 3,
    field: 'people', payStat: 'bond', need: { bond: 28, learning: 17 } },
  farmer: { growth: 'performance', retireAt: 65, title: '농부', detail: '씨앗과 도구를 마련해 농작물을 키워요.', place: '오래 돌보던 밭', mark: 'sprout', wage: 4, fatigue: 1,
    field: 'farm', payStat: 'health', need: { money: 22, health: 34 }, startup: 12 },
  studio: { growth: 'performance', retireAt: 68, title: '창작자', detail: '도구를 마련해 그림과 작품을 만들어요.', place: '햇살 공방', mark: 'spark', wage: 4,
    field: 'art', payStat: 'art', need: { art: 38 }, startup: 7 },
  cook: { growth: 'skilled', retireAt: 60, title: '조리사', detail: '여러 사람을 위한 음식을 만들어요.', place: '전에 일하던 식당', mark: 'sun', wage: 4, fatigue: 1,
    field: 'food', education: 'skill', payStat: 'art', need: { learning: 28, art: 20 } },
  caregiver: { growth: 'professional', retireAt: 60, title: '요양보호사', detail: '일상에 도움이 필요한 어르신을 돌봐요.', place: '전에 일하던 돌봄 센터', mark: 'heart', wage: 4, fatigue: 1,
    field: 'people', related: ['medical'], education: 'caregiving', specialty: true, payStat: 'bond', need: { bond: 29, health: 30 } },
  sales: { growth: 'performance', title: '방문판매원', detail: '사람들을 찾아가 물건을 설명하고 팔아요.', place: '전에 일하던 판매점', mark: 'link', wage: 5, fatigue: 1,
    field: 'sales', related: ['people'], payStat: 'bond', need: { bond: 37 } },
  marketing: { growth: 'skilled', title: '홍보 기획자', detail: '상품이나 행사를 알릴 방법을 생각해요.', place: '전에 다니던 회사', mark: 'link', wage: 5, fatigue: 1,
    field: 'office', related: ['sales', 'media'], education: 'school', payStat: 'bond', need: { learning: 40, bond: 33, art: 24 } },
  tech: { growth: 'skilled', retireAt: 65, title: '현장 기술자', detail: '기계가 잘 움직이도록 살피고 고쳐요.', place: '동네 기술 작업장', mark: 'settings', wage: 5, fatigue: 1,
    field: 'tech', education: 'skill', need: { learning: 35 } },
  creator: { growth: 'performance', title: '영상 크리에이터', detail: '촬영 도구를 준비해 영상을 만들고 사람들과 나눠요.', place: '전에 쓰던 촬영방', mark: 'spark', wage: 5, fatigue: 1,
    field: 'media', related: ['art'], specialty: true, payStat: 'art', need: { art: 35, bond: 24, money: 10 }, startup: 8 },
  civil: { growth: 'stable', title: '공무원', detail: '시험을 보고 주민을 돕는 일을 시작해요.', place: '전에 일하던 주민센터', mark: 'house', wage: 4,
    field: 'public', related: ['office'], education: 'school', need: { learning: 53, bond: 24 } },
  teacher: { growth: 'stable', title: '교사', detail: '학교에서 학생들을 만나고 가르쳐요.', place: '전에 일하던 초등학교', mark: 'board', wage: 5,
    field: 'education', related: ['people'], education: 'teaching', specialty: true, need: { learning: 59, bond: 29 } },
  athlete: { growth: 'athlete', retireAt: 38, title: '운동선수', detail: '팀에서 훈련하고 경기에 나가요.', place: '전에 뛰던 경기장', mark: 'flag', wage: 6, fatigue: 2,
    field: 'sports', education: 'sports', specialty: true, latestStart: 30, payStat: 'health', need: { health: 77 } },
  nurse: { growth: 'professional', retireAt: 60, title: '간호사', detail: '환자를 돌보고 몸 상태를 살펴요.', place: '전에 일하던 병동', mark: 'heart', wage: 6, fatigue: 1,
    field: 'medical', related: ['people'], education: 'nursing', specialty: true, need: { learning: 56, bond: 26 } },
  lab: { growth: 'professional', title: '연구원', detail: '연구소에서 실험하고 결과를 살펴요.', place: '동네 연구소', mark: 'book', wage: 6, fatigue: 1,
    field: 'science', related: ['tech'], education: 'bachelor', specialty: true, need: { learning: 59 } },
  bio: { growth: 'professional', title: '생명과학 연구원', detail: '실험을 하며 생물이 어떻게 살아가는지 알아봐요.', place: '생명과학 연구소', mark: 'book', wage: 7, fatigue: 1,
    field: 'biology', related: ['science'], education: 'biology', specialty: true, need: { learning: 76 } },
  developer: { growth: 'skilled', title: '소프트웨어 개발자', detail: '앱이나 컴퓨터 프로그램을 만들어요.', place: '전에 일하던 개발실', mark: 'settings', wage: 7, fatigue: 1,
    field: 'tech', education: 'skill', need: { learning: 58 } },
  shop: { growth: 'performance', retireAt: 68, title: '가게 주인', detail: '모아 둔 돈으로 가게를 열고 운영해요.', place: '골목의 내 가게', mark: 'house', wage: 7, fatigue: 2,
    field: 'business', payStat: 'bond', need: { money: 42, bond: 24 }, startup: 24 },
  chip: { growth: 'professional', title: '반도체 연구원', detail: '전자 기기에 들어가는 작은 칩을 연구해요.', place: '반도체 연구소', mark: 'book', wage: 8, fatigue: 1,
    field: 'science', related: ['tech'], education: 'stem', specialty: true, need: { learning: 82 } },
  doctor: { growth: 'professional', retireAt: 68, title: '의사', detail: '병원에서 환자의 몸 상태를 살피고 치료해요.', place: '전에 일하던 병원', mark: 'heart', wage: 11, fatigue: 2,
    field: 'medical', education: 'doctor', specialty: true, need: { learning: 96 } },
  coach: { growth: 'stable', title: '운동 지도자', detail: '운동 경험을 살려 선수와 학생을 지도해요.', place: '지역 스포츠센터', mark: 'flag', wage: 5,
    field: 'sports', related: ['education'], payStat: 'bond', need: { health: 45, bond: 28 }, specialty: true },
};

 
// 기존 직업 ID는 유지하고, 새 직업 34개와 입직 경로를 추가합니다.
Object.assign(CAREERS, NEW_CAREERS);
// 직업군인은 한 계열로 안내하지만 실제 취업은 부사관/장교 중 고릅니다.
// 여성과 남성 모두 동일한 자격 조건으로 진입할 수 있습니다.
CAREERS.soldierNco = {
  ...CAREERS.soldier, title: '직업군인 · 하사', wage: 5,
  entryVariant: true, entryFamily: 'soldier', education: 'school',
  need: { health: 55, learning: 35, bond: 30 },
};
CAREERS.soldierOfficer = {
  ...CAREERS.soldier, title: '직업군인 · 소위', wage: 7,
  entryVariant: true, entryFamily: 'soldier', education: 'bachelor',
  need: { health: 55, learning: 65, bond: 40 },
};
for (const [category, info] of Object.entries(CAREER_GROUPS)) {
  for (const id of info.ids) {
    if (!CAREERS[id]) throw new Error(`직업군 미등록 직업: ${category}/${id}`);
    CAREERS[id].category = category;
  }
}
for (const variant of ['soldierNco', 'soldierOfficer']) CAREERS[variant].category = 'public';


/*
 * 경력 승진 경로. 실제 채용·승진 요건을 복제한 것이 아니라 교실 게임용 간략 조건입니다.
 * from: 직전 직위, minYears: 그 직위에서 요구하는 근무연수.
 * 직전 직위로 일한 상태에서만 승진 지원이 가능합니다.
 */
export const PERFORMANCE_BONUSES = {
  farmer: { label: '농작물 수확 보너스', stat: 'health', threshold: 55, max: 5,
    description: '건강한 농사와 작황에 따라 수확 소득이 달라져요.' },
  studio: { label: '작품 판매 보너스', stat: 'art', threshold: 60, max: 5,
    description: '그림과 작품 판매 성과로 추가 수입을 얻어요.' },
  sales: { label: '판매 실적 수당', stat: 'bond', threshold: 55, max: 5,
    description: '거래 성사와 고객 관계에 따라 실적 수당을 받아요.' },
  creator: { label: '콘텐츠 광고·후원 수입', stat: 'art', threshold: 60, max: 6,
    description: '콘텐츠의 조회수와 인기도에 따라 광고·후원 수입이 생겨요.' },
  shop: { label: '가게 매출 보너스', stat: 'bond', threshold: 55, max: 6,
    description: '손님이 늘고 매출이 좋은 해에 순이익 보너스를 받아요.' },
  athlete: { label: '대회 성적 상금', stat: 'health', threshold: 80, max: 5,
    description: '경기 성적과 대회 결과에 따라 상금이 달라져요.' },
  idol: { label: '공연·활동 보너스', stat: 'art', threshold: 66, max: 5,
    description: '무대 활동에 따라 보너스 수입을 얻어요.' },
  actor: { label: '출연 보너스', stat: 'art', threshold: 63, max: 5,
    description: '출연 활동과 성과로 추가 수입을 얻어요.' },
  singer: { label: '음원·공연 보너스', stat: 'art', threshold: 68, max: 5,
    description: '음악 활동이 활발한 해에는 보너스가 생겨요.' },
  webtoon: { label: '연재 성과 보너스', stat: 'art', threshold: 68, max: 5,
    description: '웹툰 연재 성과에 따라 추가 수입을 얻어요.' },
  photographer: { label: '촬영 의뢰 보너스', stat: 'art', threshold: 61, max: 4,
    description: '촬영 의뢰가 많을 때 추가 수입이 생겨요.' },
};

export const CAREER_PROMOTIONS = {
  storeLead: { from: 'crew', title: '매장 매니저', wage: 4, minYears: 4, need: { bond: 40, learning: 30 } },
  storeManager: { from: 'storeLead', title: '매장 점장', wage: 6, minYears: 5, need: { bond: 55, learning: 42 } },
  cleaningLead: { from: 'cleaner', title: '청소 반장', wage: 4, minYears: 5, need: { health: 40, bond: 30 } },
  facilityManager: { from: 'cleaningLead', title: '시설관리소장', wage: 6, minYears: 6, need: { learning: 52, bond: 48 } },
  hallLead: { from: 'restaurant', title: '홀 매니저', wage: 5, minYears: 4, need: { bond: 42, learning: 32 } },
  restaurantManager: { from: 'hallLead', title: '식당 지점장', wage: 7, minYears: 6, need: { bond: 60, learning: 47 } },
  deliveryLead: { from: 'delivery', title: '배송 팀장', wage: 5, minYears: 5, need: { health: 52, bond: 40 } },
  logisticsDirector: { from: 'deliveryLead', title: '물류센터장', wage: 7, minYears: 7, need: { learning: 58, bond: 58 } },
  officeSenior: { from: 'staff', title: '회사 대리', wage: 5, minYears: 5, need: { learning: 42, bond: 32 } },
  officeLead: { from: 'officeSenior', title: '회사 팀장', wage: 7, minYears: 6, need: { learning: 60, bond: 54 } },
  officeDirector: { from: 'officeLead', title: '회사 부장', wage: 9, minYears: 6, need: { learning: 72, bond: 72 } },
  factoryLead: { from: 'factory', title: '생산 반장', wage: 6, minYears: 5, need: { health: 47, learning: 40 } },
  factoryDirector: { from: 'factoryLead', title: '공장장', wage: 9, minYears: 8, need: { learning: 65, bond: 55 } },
  communityLead: { from: 'care', title: '마을 사업팀장', wage: 5, minYears: 5, need: { bond: 48, learning: 41 } },
  communityDirector: { from: 'communityLead', title: '마을센터장', wage: 7, minYears: 7, need: { bond: 65, learning: 55 } },
  headChef: { from: 'cook', title: '주방장', wage: 6, minYears: 5, need: { art: 49, learning: 42 } },
  executiveChef: { from: 'headChef', title: '총주방장', wage: 9, minYears: 7, need: { art: 68, learning: 58 } },
  careTeamLead: { from: 'caregiver', title: '요양팀장', wage: 6, minYears: 5, need: { bond: 50, learning: 39 } },
  nursingHomeDirector: { from: 'careTeamLead', title: '요양시설장', wage: 8, minYears: 7, need: { bond: 68, learning: 56 } },
  marketingLead: { from: 'marketing', title: '홍보팀장', wage: 7, minYears: 5, need: { art: 49, bond: 56 } },
  marketingDirector: { from: 'marketingLead', title: '마케팅 본부장', wage: 10, minYears: 7, need: { learning: 68, bond: 71 } },
  technicalLead: { from: 'tech', title: '기술팀장', wage: 7, minYears: 6, need: { learning: 56, bond: 45 } },
  technicalDirector: { from: 'technicalLead', title: '기술총괄', wage: 10, minYears: 8, need: { learning: 77, bond: 64 } },
  civilLead: { from: 'civil', title: '행정팀장', wage: 6, minYears: 8, need: { learning: 67, bond: 50 } },
  civilDirector: { from: 'civilLead', title: '행정 과장', wage: 8, minYears: 7, need: { learning: 78, bond: 66 } },
  vicePrincipal: { from: 'teacher', title: '교감', wage: 7, minYears: 12, need: { learning: 74, bond: 60 } },
  principal: { from: 'vicePrincipal', title: '교장', wage: 9, minYears: 6, need: { learning: 85, bond: 77 } },
  headCoach: { from: 'coach', title: '운동팀 감독', wage: 7, minYears: 6, need: { learning: 55, bond: 58 } },
  chargeNurse: { from: 'nurse', title: '책임간호사', wage: 8, minYears: 6, need: { learning: 68, bond: 47 } },
  headNurse: { from: 'chargeNurse', title: '수간호사', wage: 10, minYears: 7, need: { learning: 80, bond: 64 } },
  nursingDirector: { from: 'headNurse', title: '간호부장', wage: 12, minYears: 8, need: { learning: 91, bond: 81 } },
  seniorResearcher: { from: 'lab', title: '선임연구원', wage: 8, minYears: 6, need: { learning: 76 } },
  laboratoryDirector: { from: 'seniorResearcher', title: '연구소장', wage: 11, minYears: 9, need: { learning: 92, bond: 57 } },
  seniorBiologist: { from: 'bio', title: '선임 생명과학연구원', wage: 9, minYears: 6, need: { learning: 88 } },
  biologyDirector: { from: 'seniorBiologist', title: '생명과학 연구실장', wage: 12, minYears: 8, need: { learning: 103, bond: 57 } },
  seniorDeveloper: { from: 'developer', title: '시니어 개발자', wage: 9, minYears: 5, need: { learning: 76 } },
  engineeringLead: { from: 'seniorDeveloper', title: '개발팀장', wage: 12, minYears: 8, need: { learning: 91, bond: 62 } },
  principalChipResearcher: { from: 'chip', title: '반도체 책임연구원', wage: 10, minYears: 6, need: { learning: 98 } },
  chipDirector: { from: 'principalChipResearcher', title: '반도체 연구소장', wage: 13, minYears: 8, need: { learning: 110, bond: 67 } },
  clinicalProfessor: { from: 'doctor', title: '임상교수', wage: 13, minYears: 8, need: { learning: 103, bond: 50 }, requiresGraduate: true },
  hospitalDirector: { from: 'clinicalProfessor', title: '병원장', wage: 16, minYears: 7, need: { learning: 114, bond: 82 } },
};

// 기존 승진·전직 단계와 함께 새 직업들의 2단계 성장 경로를 생성합니다.
// 직업별 역할에 맞게 원래의 관련 능력치만 요구하며 무관한 예술 능력은 추가하지 않습니다.
for (const [startingCareer, route] of Object.entries(EXTRA_ROUTES)) {
  // 운동 지도자는 기존 '운동팀 감독' 뒤에 한 단계 더 성장합니다.
  let from = startingCareer === 'coach' ? 'headCoach' : startingCareer;
  const base = CAREERS[startingCareer];
  if (!base) throw new Error(`성장 출발 직업 미등록: ${startingCareer}`);
  for (const [i, [id, title]] of route.entries()) {
    const level = i + 1;
    if (CAREER_PROMOTIONS[id]) throw new Error(`중복 성장 직위: ${id}`);
    const primary = Object.entries(base.need ?? {});
    const stats = primary.length ? primary : [[base.payStat ?? 'learning', 25]];
    const need = Object.fromEntries(stats.map(([stat, threshold]) =>
      [stat, threshold + (level === 1 ? 12 : 25)]));
    CAREER_PROMOTIONS[id] = {
      from, title, wage: startingCareer === 'coach' ? 9 : base.wage + level * 2,
      minYears: startingCareer === 'coach' ? 6 : (level === 1 ? 4 : 6),
      need: startingCareer === 'coach' ? { learning: 70, bond: 75 } : need,
      type: ['farmer', 'shop', 'livestock'].includes(startingCareer) ? '사업 성장'
        : ['studio', 'creator', 'sales', 'athlete', 'idol', 'actor', 'singer', 'webtoon', 'photographer'].includes(startingCareer)
          ? '활동 성장' : '경력 성장',
    };
    from = id;
  }
}
Object.assign(CAREER_PROMOTIONS, SPECIAL_BRANCHES);

// 이전 버전에서 이미 진급한 캐릭터의 기록을 보존하기 위한 직위입니다.
// 새 게임에서는 해당 직위로 승진할 수 없으며, 직업 메뉴에도 보이지 않습니다.
export const LEGACY_PERFORMANCE_PROMOTIONS = {
  farmManager: { from: 'farmer', title: '농장 운영자', wage: 6, minYears: 6, need: { health: 46, money: 32 } },
  farmDirector: { from: 'farmManager', title: '농업법인 대표', wage: 8, minYears: 7, need: { bond: 58, money: 53 } },
  creativeDirector: { from: 'studio', title: '창작 감독', wage: 6, minYears: 5, need: { art: 60, bond: 38 } },
  studioDirector: { from: 'creativeDirector', title: '창작 스튜디오 대표', wage: 9, minYears: 7, need: { art: 77, bond: 58 } },
  salesLead: { from: 'sales', title: '영업팀장', wage: 7, minYears: 5, need: { bond: 58, learning: 43 } },
  salesDirector: { from: 'salesLead', title: '영업본부장', wage: 9, minYears: 7, need: { bond: 75, learning: 59 } },
  contentProducer: { from: 'creator', title: '콘텐츠 PD', wage: 7, minYears: 5, need: { art: 59, bond: 46 } },
  contentDirector: { from: 'contentProducer', title: '콘텐츠 제작사 대표', wage: 10, minYears: 8, need: { art: 74, money: 44 } },
  multiStoreOwner: { from: 'shop', title: '다점포 운영자', wage: 10, minYears: 8, need: { money: 44, bond: 57 } },
  franchiseDirector: { from: 'multiStoreOwner', title: '프랜차이즈 대표', wage: 13, minYears: 8, need: { money: 70, bond: 78 } },
};


// 상위 직위는 독립적인 신규 취업 자리가 아니라 직전 직위에서의 승진으로만 열립니다.
for (const [id, position] of Object.entries({ ...CAREER_PROMOTIONS, ...LEGACY_PERFORMANCE_PROMOTIONS })) {
  const parent = CAREERS[position.from];
  if (!parent) throw new Error(`승진 경로가 올바르지 않음: ${position.from} → ${id}`);
  CAREERS[id] = {
    title: position.title,
    detail: `${parent.title} 경험을 살려 책임이 더 큰 일을 맡아요.`,
    place: parent.place,
    mark: parent.mark,
    wage: position.wage,
    growth: parent.growth,
    payStat: parent.payStat,
    fatigue: Math.max(0, (parent.fatigue ?? 0) - 1),
    field: parent.field,
    related: parent.related,
    promotionFrom: position.from,
    category: parent.category,
    legacyPromotion: Object.hasOwn(LEGACY_PERFORMANCE_PROMOTIONS, id),
    minYears: position.minYears,
    requiresGraduate: position.requiresGraduate ?? false,
    requiresNursingTrack: position.requiresNursingTrack ?? false,
    requiresSchoolNurseExam: position.requiresSchoolNurseExam ?? false,
    branchType: position.type ?? '승진',
    need: position.need,
  };
}

export const HABITS = {
  exercise: { label: '꾸준한 운동', years: 3, effect: { health: 2 } },
  overtime: { label: '바쁜 일', years: 3, effect: { money: 2, health: -2 } },
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

const rest = pick('rest', '쉬어 가기', '일을 줄이고 몸을 돌봐요.', 'leaf', { health: 4, joy: 1 },
  { narration: '일을 잠시 내려놓고 느긋하게 하루를 보냈어요.' });
export const IDLE = pick('idle', '평소대로 지내기', '익숙한 일상을 보냈어요.', 'leaf', { health: 1 });

function story(title, detail, first, second) {
  return { title, detail, choices: [first, second, rest] };
}

export const STORIES = [
  [
    story('새 일을 배우는 해', '한 해를 어디에 써 볼까요?',
      pick('shift', '잠깐 일해 돈 모으기', '며칠 일하며 새로운 일을 배워요.', 'coin', { money: 3, health: -2, learning: 2 }),
      pick('course', '새 기술 배우기', '돈을 내고 배우고 싶던 수업을 들어요.', 'book', { learning: 6, money: -5 })),
    story('돈을 어디에 쓸까?', '모은 돈이 조금 생겼어요.',
      pick('save', '아르바이트로 저축하기', '나중에 쓸 돈을 조금 모아 둬요.', 'coin', { money: 3, health: -2 }),
      pick('trip', '가까운 곳으로 여행 가기', '친구와 가고 싶던 곳에 가요.', 'sun', { money: -6, joy: 7, bond: 2 },
        { narration: '친구와 기차에 올라 미뤄 둔 여행을 떠났어요.' })),
    story('새 이웃', '비어 있던 옆집에 사람이 이사 왔어요.',
      pick('welcome', '저녁 나누기', '반찬을 조금 만들어 인사하러 가요.', 'link', { money: -3, bond: 5, joy: 3 },
        { narration: '따뜻한 반찬을 들고 새 이웃의 문을 두드렸어요.' }),
      pick('portfolio', '작품 모아 보기', '그동안 만든 것을 정리해요.', 'spark', { art: 6, learning: 2, health: -1 })),
    story('바쁜 일정', '하고 싶은 일과 해야 할 일이 겹쳐요.',
      pick('deadline', '짧은 일 맡기', '한동안 바쁘지만 일을 익히고 돈을 벌어요.', 'coin', { money: 4, learning: 2, health: -3 }),
      pick('routine', '운동 습관 만들기', '매일 조금씩 움직여요.', 'heart', { health: 2, joy: 1, money: -2 },
        { habit: 'exercise', narration: '운동화 끈을 묶고 오늘도 마을을 한 바퀴 돌았어요.' })),
  ],
  [
    story('꽉 찬 달력', '이번 해에는 어디에 시간을 낼까요?',
      pick('lead', '큰 일 맡기', '한동안 바쁘지만 돈을 더 벌어요.', 'coin', { money: 5, health: -3, joy: -1 },
        { habit: 'overtime', narration: '큰 일을 맡아 달력을 채우고 조금 더 저축했어요.' }),
      pick('together', '소중한 사람과 쉬기', '주말에 시간을 내서 만나요.', 'link', { bond: 5, joy: 4, money: -4 })),
    story('우리 동네', '이웃과 함께할 일이 생겼어요.',
      pick('teach', '배운 것 알려 주기', '이웃과 만나서 기술을 나눠요.', 'book', { learning: 2, bond: 3, health: -1 }, { habit: 'teaching' }),
      pick('mural', '골목에 그림 그리기', '빈 벽에 우리 동네 이야기를 그려요.', 'spark', { art: 7, bond: 2, money: -4 },
        { narration: '텅 빈 골목 벽에 이웃들의 이야기를 하나씩 그렸어요.' })),
    story('새로운 기회', '계속해 온 일과 새로 해 보고 싶은 일이 있어요.',
      pick('relearn', '다른 일 배우기', '낯선 분야를 처음부터 배워요.', 'book', { learning: 4, money: -5, joy: 2 }, { habit: 'lessons' }),
      pick('steady', '익숙한 일로 돈 모으기', '쌓은 경험을 써서 조금 더 벌어요.', 'coin', { money: 4, health: -2, bond: 2 })),
    story('오랜 친구의 연락', '한동안 못 만난 친구가 연락했어요.',
      pick('walk', '함께 산책하기', '걸으며 그동안의 이야기를 해요.', 'heart', { health: 3, bond: 5 }),
      pick('letter', '이야기 글로 남기기', '마음에 담아 둔 말을 써요.', 'spark', { art: 5, joy: 3 })),
  ],
  [
    story('천천히 맞는 아침', '오늘은 무엇을 할까요?',
      pick('garden', '텃밭 가꾸기', '키운 채소를 이웃과 나눠요.', 'heart', { health: 2, joy: 2, bond: 1 },
        { habit: 'garden', narration: '텃밭에서 처음 딴 채소를 이웃에게 한 줌 건넸어요.' }),
      pick('craft', '손으로 물건 만들기', '오래 익힌 솜씨를 써요.', 'spark', { art: 6, money: 3, health: -2 })),
    story('동네 모임', '동네에 새 모임이 열려요.',
      pick('mentor', '후배에게 경험 들려주기', '처음엔 누구나 어렵다고 말해요.', 'link', { bond: 5, learning: 2, joy: 2 }),
      pick('lecture', '새 수업 듣기', '배운 적 없는 걸 알아봐요.', 'book', { learning: 6, money: -4, joy: 2 })),
    story('오래된 지도', '서랍에서 전에 쓰던 지도가 나왔어요.',
      pick('rail', '기차 타고 옛 동네 가기', '기억에 남은 곳을 다시 가 봐요.', 'sun', { joy: 6, bond: 2, money: -7, health: -2 }),
      pick('photo', '옛 사진 정리하기', '사진 아래에 그날 일을 한 줄 써요.', 'spark', { art: 5, learning: 2, joy: 2 })),
    story('할 수 있는 작은 일', '지금 내 속도에 맞는 일을 찾아요.',
      pick('market', '동네 장터에서 일하기', '물건을 내놓고 조금 일해요.', 'coin', { money: 3, health: -2, bond: 2 }),
      pick('clinic', '건강 챙기기', '든든히 먹고 가볍게 움직여요.', 'heart', { health: 6, money: -4 })),
  ],
  [
    story('별이 뜨는 마당', '마당에 의자를 꺼내 놓았어요.',
      pick('memoir', '옛날 이야기 들려주기', '잊기 전에 기억에 남은 일을 전해요.', 'spark', { art: 5, bond: 3, health: -1 }),
      pick('breathe', '천천히 걷기', '바깥 풍경을 보며 기분을 풀어요.', 'sun', { health: 2, joy: 3 })),
    story('책 속 편지', '오래전에 받은 편지를 다시 읽어요.',
      pick('visit', '고마운 사람 만나기', '못 했던 인사를 전해요.', 'link', { bond: 5, joy: 3, health: -2, money: -2 }),
      pick('sort', '추억 정리하기', '오래 가진 물건에 이야기를 붙여요.', 'spark', { art: 5, learning: 2, joy: 2 })),
    story('창가의 햇빛', '해가 지기 전에 하고 싶은 일이 있어요.',
      pick('care', '몸을 돌보는 하루 보내기', '잘 먹고 편한 만큼 움직여요.', 'heart', { health: 6, money: -4, joy: 1 }),
      pick('give', '아이들에게 책 선물하기', '오래 좋아했던 책을 골라요.', 'book', { bond: 5, learning: 2, money: -5, joy: 2 })),
    story('작은 전시회', '동네에 내가 만든 것을 보여 줄 자리가 생겼어요.',
      pick('legacy', '내 작품 걸기', '누군가 보고 웃었으면 해요.', 'spark', { art: 6, joy: 3, health: -2 }),
      pick('listen', '이웃 이야기 듣기', '다른 사람은 어떤 삶을 살았는지 들어요.', 'link', { bond: 4, learning: 3, joy: 2 })),
  ],
];

export const OPPORTUNITIES = [
  [],
  [],
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
  return [
    pick('funeral', '내 장례식장 방문하기', '찾아온 사람들의 마지막 인사를 들어요.', 'flower', {}),
    pick('family-dream', '가족의 꿈에 나오기', '꿈에 찾아가 안부를 물어요.', 'spark', {}),
    ...(career ? [pick('workplace', '예전 직장 둘러보기', `${career.place}에 들러요.`, 'house', {},
      { narration: '오래 일하던 곳에 들러 익숙한 목소리를 다시 들었어요.' })] : []),
    pick('neighborhood', '살던 동네 걷기', '익숙한 골목을 다시 걸어요.', 'leaf', {}),
  ].filter((option) => !visits.some((visit) => visit.id === option.id));
}

export const SPIRIT_SCENES = {
  funeral: [
    '장례식장에 누군가 꽃 한 송이를 두고 갔어요. “함께 걷던 날을 기억해요.”',
    '창가에 놓인 사진을 사람들이 한참 바라봤어요. “그때 같이 웃었지.”',
  ],
  workplace: [
    '일터는 오늘도 바빴어요. 잠시 쉬던 동료가 예전에 함께 웃었던 날을 떠올렸어요.',
    '쓰던 자리에는 새 사람이 앉아 있었어요. 건너편 동료가 당신에게 배운 일부터 알려 주었어요.',
  ],
  neighborhood: [
    '골목 모퉁이에는 여전히 따뜻한 불이 켜져 있어요. 익숙한 바람에 옛날이 떠올랐어요.',
    '자주 걷던 길의 나무가 한 뼘 더 자랐어요. 아이들이 그 아래에서 웃고 있어요.',
  ],
};

export const LIFE_EVENTS = [
  { text: '오랜만에 이웃과 이야기를 나눴어요.', effect: { bond: 2, joy: 1 } },
  { text: '쓰고 남은 동전 몇 개를 저금했어요.', effect: { money: 2 } },
  { text: '푹 쉬고 나니 몸이 가벼워졌어요.', effect: { health: 2 } },
  { text: '고장 난 물건을 고치느라 돈을 조금 썼어요.', effect: { money: -2 } },
  { text: '익숙한 길을 걷다 새 생각이 났어요.', effect: { art: 2, joy: 1 } },
];
