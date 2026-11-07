import { CAREERS, pick } from './content.mjs';

export const SEXES = { male: '남자', female: '여자' };
export const SCHOOLS = { general: '일반고', science: '과학고·영재학교', vocational: '직업계고', arts: '예술고', outside: '학교 밖 진로' };
export const DREAMS = {
  science: { label: '연구·과학', title: '궁금한 것을 연구하는 사람', mark: 'book', career: 'lab', need: { learning: 32 }, effect: { learning: 4 } },
  art: { label: '그림·음악·창작', title: '만들고 표현하는 사람', mark: 'spark', career: 'studio', need: { art: 24 }, effect: { art: 4 } },
  tech: { label: '기술·제작', title: '손으로 고치고 만드는 사람', mark: 'settings', career: 'tech', need: { learning: 21 }, effect: { learning: 3, art: 2 } },
  people: { label: '교육·돌봄', title: '사람을 돕고 가르치는 사람', mark: 'link', career: 'care', need: { bond: 24 }, effect: { bond: 4 } },
  business: { label: '가게·경영', title: '작은 가게를 꾸리는 사람', mark: 'coin', career: 'shop', need: { money: 22 }, effect: { money: 3, bond: 1 } },
  explore: { label: '진로 탐색', title: '조금 더 알아보고 싶어요', mark: 'leaf', effect: { joy: 3, learning: 1 } },
};

const PROGRAMS = {
  college: { label: '전문대', degree: '전문학사', years: 2 },
  university: { label: '대학', degree: '학사', years: 4 },
  graduate: { label: '대학원', degree: '석사', years: 2 },
  training: { label: '직업훈련', degree: '직업훈련 수료', years: 1 },
};

export function newPath(sex = null) {
  return { sex, dreams: [], school: null, diploma: false, program: null, degree: null, training: false,
    service: null, partner: null, married: null, children: [], retired: null };
}

const EMPTY_PATH = newPath();
export const pathOf = (life) => life.path ?? EMPTY_PATH;
const mostRecentDream = (path) => path.dreams.at(-1)?.field ?? 'explore';
const fieldLabel = (field) => DREAMS[field]?.label ?? DREAMS.explore.label;
const scene = (title, detail, choices, after = '') => ({ title, detail, choices, after });
const rest = (title = '쉬어 가기', detail = '한 박자 느리게 지내며 내 마음과 몸을 살핀다.', effect = { health: 3, joy: 2 }) => pick('rest', title, detail, 'leaf', effect);
const option = (id, title, detail, mark, effect, kind, value, after, extra = {}) =>
  pick(id, title, detail, mark, effect, { action: { kind, value }, after, ...extra });

const CHILDHOOD = [
  scene('세상에 온 첫해', '어른이 되면 이 해를 기억하지 못할 거예요. 누군가는 아주 오래 기억할 날이에요.', [
    pick('birth-voice', '익숙한 목소리를 듣는다', '울음이 잦아들 때까지 누군가 낮은 목소리로 말을 걸어 준다.', 'link', { bond: 3, joy: 2 }, { after: '나중에 들어 보니, 그날 가장 많이 불린 말은 내 이름이었대요.' }),
    pick('birth-light', '창가의 빛을 바라본다', '햇빛이 벽을 천천히 옮겨 가는 모습을 가만히 본다.', 'sun', { learning: 2, art: 2 }, { after: '처음 본 세상은 생각보다 밝았어요.' }),
    rest('품에 안겨 잠든다', '따뜻한 품에서 하루 중 가장 길고 편안한 잠을 잔다.', { health: 4, joy: 2 }),
  ]),
  scene('두 걸음', '방 건너편에서 누군가 두 팔을 벌리고 기다려요. 소파를 잡은 손을 떼 볼까요?', [
    pick('first-steps', '손을 떼고 한 발 내딛는다', '바닥에 주저앉아도 다시 일어나 본다.', 'heart', { health: 4, joy: 2 }),
    pick('first-reach', '손을 내민다', '함께 잡고 걸으니 방 한쪽이 조금 가까워진다.', 'link', { bond: 4, learning: 1 }),
    rest('앉아서 장난감을 만진다', '굴러가는 공을 따라 눈과 손을 움직인다.'),
  ], '처음 걷던 날 이야기를 집에서는 몇 번이나 다시 했어요.'),
  scene('하루 종일 같은 말', '어제까지는 가리키기만 하던 것에, 오늘은 이름을 붙일 수 있어요.', [
    pick('first-word', '물건 이름을 하나씩 따라 한다', '컵, 문, 우산. 말할 수 있는 것이 자꾸 늘어난다.', 'book', { learning: 4, bond: 2 }),
    pick('little-song', '들었던 노래를 흥얼거린다', '가사를 몰라도 후렴만큼은 비슷하게 부른다.', 'spark', { art: 4, joy: 3 }),
    rest('그림책을 가져온다', '가장 마음에 드는 페이지를 다시 읽어 달라고 한다.'),
  ]),
  scene('양말 한 짝', '하고 싶은 말이 하나 생겼어요. “내가 해 볼래.”', [
    pick('try-socks', '양말을 혼자 신어 본다', '발뒤꿈치가 앞에 와도 이번엔 끝까지 해 본다.', 'heart', { health: 3, learning: 2 }),
    pick('try-together', '함께 블록 집을 만든다', '무너지면 같이 쌓는다. 이번엔 문도 만든다.', 'spark', { art: 3, bond: 3 }),
    rest('오늘은 손을 빌린다', '내가 할 수 있는 것부터 천천히 한다.'),
  ]),
  scene('새로운 신발장', '어린이집이나 유치원 신발장에 내 이름이 있어요. 작은 가방을 멘 채 문 앞에 서 있어요.', [
    pick('new-room', '먼저 와 있던 아이에게 인사한다', '같은 장난감을 고른 아이 옆에 앉는다.', 'link', { bond: 4, joy: 2 }),
    pick('small-drawing', '앉아서 내 자리의 그림을 그린다', '크레파스로 익숙한 집 모양을 그린다.', 'spark', { art: 4, learning: 1 }),
    rest('문 앞에서 잠깐 기다린다', '준비가 되면 손을 잡고 들어간다.'),
  ]),
  scene('오늘은 내가 빵집 주인', '친구들과 역할놀이를 해요. 종이돈과 빈 상자가 제법 그럴듯해요.', [
    pick('play-store', '친구들과 가게 놀이를 한다', '손님이 와서 무엇을 좋아하는지 물어본다.', 'coin', { learning: 3, bond: 3 }),
    pick('play-stage', '상자에 그림을 그려 무대를 꾸민다', '모두가 무슨 이야기를 할지 같이 정한다.', 'spark', { art: 4, joy: 3 }),
    rest('놀이터에서 친구를 기다린다', '친구가 오면 함께 미끄럼틀을 탄다.'),
  ]),
  scene('가방을 메 보는 날', '내년에는 초등학교에 가요. 집에서 가방을 메 보니 등이 반쯤 가려져요.', [
    pick('name-tag', '공책에 이름을 써 본다', '내 글씨로 이름표를 만들어 붙인다.', 'book', { learning: 4, joy: 2 }),
    pick('school-route', '보호자와 학교 가는 길을 걸어 본다', '횡단보도와 놀이터가 어디 있는지 기억해 둔다.', 'heart', { health: 3, bond: 3 }),
    rest('친구와 한 번 더 신나게 논다', '저녁이 올 때까지 놀다가 집에 돌아온다.'),
  ], '가방이 내 등보다 커 보이던 때는 생각보다 금세 지나갔어요.'),
];

const SCHOOL_YEARS = {
  7: scene('초등학교 첫날', '교실 앞에서 안녕이라고 말하고 나니, 내 자리에도 아침 햇빛이 들어왔어요.', [
    pick('first-desk', '짝에게 먼저 인사하기', '같은 책상에 앉은 아이 이름을 배운다.', 'link', { bond: 5, joy: 2 }),
    pick('first-class', '교실 구석구석 살펴보기', '어디에 책과 색연필이 있는지 살핀다.', 'book', { learning: 5, art: 1 }),
    rest('하루씩 학교에 익숙해지기', '교실 문을 열기 전 깊게 숨을 들이쉰다.'),
  ]),
  8: scene('쉬는 시간 십 분', '종이 치면 운동장까지 뛰어갔다 와도 시간이 조금 남아요.', [
    pick('playground-team', '친구들과 운동장 뛰기', '처음 해 보는 팀 놀이에 끼어 본다.', 'heart', { health: 4, bond: 4 }),
    pick('school-library', '도서실에서 책 한 권 빌리기', '내 이름으로 처음 대출증을 쓴다.', 'book', { learning: 5, art: 2 }),
    rest('친구 옆에서 천천히 쉬기', '같은 창밖을 보며 종이 칠 때까지 앉아 있는다.'),
  ]),
  9: scene('우리 반의 첫 발표', '종이에 쓴 문장을 읽다 보니, 내 목소리가 내가 생각한 것보다 컸어요.', [
    pick('class-talk', '좋아하는 것을 앞에서 소개하기', '친구들이 물어보면 한 마디씩 더 이야기한다.', 'book', { learning: 4, bond: 4 }),
    pick('class-picture', '발표에 쓸 그림 만들기', '말로 하기 어려운 장면을 그림에 담는다.', 'spark', { art: 5, joy: 3 }),
    rest('다른 친구의 발표 듣기', '다음에 내가 써 볼 이야기 한 줄을 생각한다.'),
  ]),
  11: scene('반에서 내가 잘하는 일', '요즘 친구들이 가끔 내게 무언가를 부탁해요. 내가 잘하는 게 있었나 봐요.', [
    pick('class-share', '친구에게 방법을 알려 주기', '먼저 알게 된 것을 혼자 들고 있지 않는다.', 'link', { bond: 5, learning: 3 }),
    pick('class-practice', '관심 있는 일을 더 연습하기', '잘하고 싶은 일에 방과 후 시간을 써 본다.', 'spark', { art: 5, learning: 3, health: -2 }),
    rest('하루쯤 약속을 비워 두기', '늘 하던 길을 조금 느리게 걸어간다.'),
  ]),
  12: scene('교실을 비우는 날', '졸업을 앞두고 사물함을 비워요. 바닥에 이름을 쓴 지우개 하나가 남았어요.', [
    pick('primary-letter', '친구에게 짧은 편지 쓰기', '쉬는 시간마다 같이 하던 일을 한 줄로 적는다.', 'link', { bond: 6, joy: 3 }, { after: '친구는 나중에도 그 편지를 필통에 넣어 두었다고 했어요.' }),
    pick('primary-drawing', '교실을 그림으로 남기기', '없어지기 전에 창가와 책상 자리를 그린다.', 'spark', { art: 5, learning: 2 }),
    rest('교실을 천천히 한 바퀴 돌기', '내 자리에서 보이던 풍경을 잠깐 더 바라본다.'),
  ]),
  13: scene('중학교 첫 시간표', '교과마다 다른 선생님이 들어와요. 쉬는 시간에는 반에서 아직 낯선 목소리가 들려요.', [
    pick('middle-club', '동아리 체험해 보기', '교실 밖에서 만난 사람들과 시간을 보낸다.', 'link', { bond: 5, joy: 3 }),
    pick('middle-notes', '수업마다 공부 방법 찾아보기', '친구가 보여 준 노트에서 한 가지를 배운다.', 'book', { learning: 6, health: -1 }),
    rest('시간표에 적응하기', '다음 시간 교실부터 천천히 익힌다.'),
  ]),
  15: scene('교실에 붙은 고등학교 안내', '안내문을 읽다 보니 고등학교마다 수업이 꽤 달라요. 한 곳을 정하기 전에 무엇을 해 볼까요?', [
    pick('high-explore', '학교 설명회에 가 보기', '수업과 동아리, 졸업 뒤의 길을 물어본다.', 'book', { learning: 5, bond: 2 }),
    pick('high-workshop', '직업 체험에 참여하기', '일이 생각했던 것과 어디가 다른지 살펴본다.', 'settings', { learning: 3, art: 4 }),
    rest('내 속도로 생각 정리하기', '친구들이 정한 속도와 내 속도를 구분해 본다.'),
  ]),
};

function dreamSurvey(life) {
  const path = pathOf(life);
  const label = life.age === 10 ? '초등학교' : life.age === 14 ? '중학교' : path.school === 'outside' ? '진로 상담' : '고등학교';
  const old = mostRecentDream(path);
  const detail = old === 'explore' ? '진로 희망란에 지금 관심 있는 일을 적어요. 이 기록은 훗날 전공과 일자리를 고를 때 다시 만나요.'
    : `지난번엔 ‘${fieldLabel(old)}’를 적었어요. 지금 마음에 드는 답을 적어 봐요.`;
  return scene(`${label} 장래희망 조사`, detail, Object.entries(DREAMS).map(([field, dream]) =>
    option(field === 'explore' ? 'rest' : `dream-${field}`, dream.title, field === 'explore' ? '정답을 쓰는 칸은 아니니까, 아직 궁금한 게 많다고 적는다.' : `지금 마음이 가는 ‘${dream.label}’를 적어 둔다.`,
      dream.mark, dream.effect, 'dream', field, field === 'explore' ? '종이에 빈칸을 남겨 두는 것도 내 답이었어요.' : '그날 적은 글씨는 삐뚤었지만, 종이를 접어 오래 간직했어요.')));
}

function highSchool(life) {
  const dream = mostRecentDream(pathOf(life));
  return scene('고등학교를 고르는 해', '같은 나이의 친구들이 저마다 다른 학교와 배움의 길을 알아보고 있어요.', [
    option('high-general', '일반고에 진학하기', '여러 과목을 배우며 대학과 취업을 함께 알아본다.', 'book', { learning: 5, bond: 2 }, 'school', 'general', '교복이 아직 몸에 맞지 않았지만 거울 앞에 한참 서 있었어요.'),
    option('high-science', '과학고·영재학교에 진학하기', '실험하고 연구하는 수업이 많은 학교를 택한다.', 'book', { learning: 8, health: -3 }, 'school', 'science', '모르는 것을 적는 노트가 조금씩 두꺼워졌어요.', { need: { learning: dream === 'science' ? 24 : 30 } }),
    option('high-vocational', '직업계고에 진학하기', '특성화고나 마이스터고에서 실습하며 기술을 익힌다.', 'settings', { learning: 5, art: 3 }, 'school', 'vocational', '실습복에 처음 묻은 자국을 그날은 왠지 지우고 싶지 않았어요.'),
    option('high-arts', '예술고에 진학하기', '연습과 작품 활동에 더 많은 시간을 써 본다.', 'spark', { art: 8, health: -2 }, 'school', 'arts', '누가 시키지 않아도 계속하고 싶었던 일이 하루의 가운데로 왔어요.', { need: { art: dream === 'art' ? 18 : 23 } }),
    option('rest', '고교 진학을 미루기', '학교 밖에서 관심사를 찾고, 필요하면 검정고시를 준비한다.', 'leaf', { joy: 3, learning: 2 }, 'school', 'outside', '친구들과 다른 달력을 펼쳤어요. 그해 내 시간이 그렇게 시작됐어요.'),
  ]);
}

function examChoice() {
  return option('equivalency', '고졸 검정고시 준비하기', '공부를 다시 시작해 고등학교 졸업과 동등한 자격을 얻는다.', 'book', { learning: 6, health: -2 },
    'diploma', true, '자리에 앉는 시간부터 다시 배웠어요. 결과를 기다리던 날엔 어린 시절의 내가 떠올랐어요.');
}

function universityChoice(kind, life) {
  const field = mostRecentDream(pathOf(life));
  const data = PROGRAMS[kind];
  const track = field === 'explore' ? '' : ` · ${fieldLabel(field)}`;
  const label = kind === 'university' ? '4년제 대학' : data.label;
  const need = kind === 'graduate' && pathOf(life).degree?.kind !== 'university' && pathOf(life).degree?.kind !== 'graduate'
    ? { locked: '학사 학위 필요' } : {};
  return option(`study-${kind}`, `${label}${kind === 'training' ? ' 시작하기' : ' 진학하기'}${track}`,
    field === 'explore' ? '새로 만나게 될 과목과 사람들 사이에서 내 관심을 더 찾아본다.' : `예전에 적어 둔 ‘${fieldLabel(field)}’에 시간을 더 써 본다.`,
    kind === 'training' ? 'settings' : 'book', { learning: kind === 'university' ? 7 : 5, money: kind === 'university' ? -4 : -2, health: -2 },
    'study', kind, field === 'explore' ? '처음 들어간 강의실에 내가 모르는 이야기가 가득했어요.' : `오래전에 종이에 적은 ‘${fieldLabel(field)}’가 이번엔 내 시간표에 적혀 있었어요.`, need);
}

function workChoices(life) {
  const path = pathOf(life);
  const schoolField = { science: 'science', vocational: 'tech', arts: 'art' }[path.school];
  const field = [path.degree?.field, mostRecentDream(path), path.training && 'tech', schoolField]
    .find((item) => item && item !== 'explore') ?? 'explore';
  const dream = DREAMS[field];
  const work = [
    pick('work-staff', path.school === 'vocational' ? '현장실습을 살려 취업하기' : '첫 일자리에서 일 시작하기', '현장에서 일을 배우고 내 손으로 첫 월급을 받는다.', 'coin',
      { money: 8, learning: 2, health: -3 }, { employment: true, after: '월급이 들어온 날엔 집에 가는 길에 무엇을 사 갈지 먼저 생각했어요.' }),
  ];
  if (dream.career) {
    const first = path.dreams.find((entry) => entry.field === field);
    work.unshift(pick('work-dream', `${CAREERS[dream.career].title}로 첫발 내딛기`,
      first ? `${first.age}살에 적은 희망과 연결되는 자리예요.` : `‘${dream.label}’에서 익힌 것을 일로 이어 간다.`, dream.mark,
      { money: dream.career === 'shop' ? -8 : 6, learning: 3, joy: 3, health: -3 },
      { career: dream.career, need: dream.need, opportunity: true, after: first
        ? `${first.age}살에 적던 그 글씨가 떠올랐어요. 일터에서 가장 먼저 배운 건 여전히 물어봐도 된다는 거였어요.`
        : '오랜만에 스스로 고른 자리에서 하루를 시작했어요.' }));
  }
  return work;
}

function afterSchool(life, afterService = false) {
  const path = pathOf(life);
  const eligible = path.school !== 'outside' || path.diploma;
  const study = eligible ? [universityChoice('university', life), universityChoice('college', life)] : [examChoice()];
  const service = life.age === 19 && path.sex === 'male' ? ' 병역판정검사를 받는 시기이기도 해서 입영 계획은 다음 해에 함께 정해요.' : '';
  return scene(afterService ? '다시 내 시간표로' : '진학과 첫 일자리', `교실에서 보낸 시간이 이제 여러 길로 이어져요. 먼저 열어 볼 문을 골라요.${service}`,
    [...study, ...workChoices(life), universityChoice('training', life), rest('한 해 동안 방향 알아보기')]);
}

function militaryScene(life) {
  const path = pathOf(life);
  if (path.service?.status === 'serving') {
    return scene('복무를 마무리하는 해', '전역 날이 적힌 달력 아래에 제대하면 하고 싶은 일을 몇 가지 적었어요.', [
      pick('service-letter', '곁에 있던 사람에게 편지 쓰기', '큰말 대신 기다려 줘서 고마웠다고 쓴다.', 'link', { bond: 6, joy: 3 }),
      pick('service-study', '돌아갈 준비를 하며 틈틈이 공부하기', '복학하거나 일터로 돌아가는 날을 준비한다.', 'book', { learning: 5, health: -1 }),
      rest('동료들과 마지막 시간을 보내기', '고생 많았다는 말을 서로에게 건넨다.'),
    ]);
  }
  const choices = [option('enlist', '입영해 복무 시작하기', '학교나 일터를 잠시 떠나 복무를 시작한다.', 'flag', { health: -2, bond: 2, money: 3 },
    'service', 'start', '짐을 챙기며 다음에 돌아올 때도 내 자리가 남아 있기를 바랐어요.')];
  if (!path.service && path.program?.until > life.age) {
    choices.push(option('service-after-study', '학업을 이어가며 입영 시기 조정하기', '재학 중인 과정이 끝나는 해에 입영을 다시 준비한다.', 'book', { learning: 4, joy: 1 },
      'service', path.program.until, '계속 배울 시간을 얻었어요. 달력 끝에 다음에 정할 일도 적어 뒀어요.'));
  }
  choices.push(path.service
    ? option('rest', '복무를 시작하고 가까운 사람에게 소식 전하기', '새로운 일과에 적응하며 돌아갈 때를 생각한다.', 'link', { health: -2, bond: 4, money: 2 },
      'service', 'start', '잘 도착했다는 짧은 소식부터 전했어요.')
    : option('rest', '입영 준비에 시간을 쓰기', '건강과 일정, 돌아갈 학교나 일터의 일을 정리한다.', 'leaf', { health: 2, learning: 1 },
      'service', life.age + 1, '내년을 앞두고 남아 있는 약속부터 하나씩 챙겼어요.'));
  return scene('입영을 앞두고', '병역판정 뒤 안내받은 복무 일정을 학업이나 일과 어떻게 맞출지 생각해요.', choices);
}

function studying(life) {
  const program = pathOf(life).program;
  const label = PROGRAMS[program.kind].label;
  const finalYear = program.until === life.age + 1;
  return scene(finalYear ? `${label} 마지막 해` : `${label}에서 보내는 해`, finalYear
    ? '처음 이곳에 왔을 때 알아듣지 못하던 말들이, 이제는 내가 쓰는 말이 됐어요.'
    : '이번 해의 시간표에는 배우고 싶은 과목과 익숙해지고 싶은 일이 함께 있어요.', [
    pick('study-project', finalYear ? '졸업 과제에 마음을 쓰기' : '전공 과제에 몰두하기', '어려운 부분을 붙들고 한 줄씩 풀어 본다.', 'book', { learning: 7, health: -3, art: 2 }),
    pick('study-experience', '현장 경험과 사람을 만나기', '실습이나 모임에 나가 배운 것을 직접 써 본다.', 'link', { learning: 3, bond: 5, joy: 2 }),
    rest('배움과 생활의 균형 지키기', '한 번에 잘해 내기 어려운 날에는 친구와 밥을 먹는다.'),
  ]);
}

function retrain(life, afterService = false) {
  const path = pathOf(life);
  const options = path.degree?.kind === 'university' ? [universityChoice('graduate', life)] : [];
  if (path.school !== 'outside' || path.diploma) options.push(universityChoice('university', life));
  else options.push(examChoice());
  options.push(universityChoice('training', life));
  if (!life.career) options.push(...workChoices(life));
  options.push(rest(life.career ? '지금의 일과 일상을 이어가기' : '다음 기회를 살피며 쉬어 가기'));
  const title = afterService ? '다시 내 시간표로' : path.degree?.age === life.age ? '배운 것을 어디에 쓸까요' : '다시 배우러 가는 길';
  return scene(title,
    '일을 하거나 쉬던 중에도 새로 궁금해지는 일이 생겨요. 지금의 나에게 필요한 방향을 골라 봐요.', options);
}

function relationships(life) {
  const age = life.age;
  const path = pathOf(life);
  if (path.partner === null && [24, 27, 30, 35, 41, 52].includes(age)) {
    return scene('다음 약속을 잡는 날', '같이 걷다 보니 어느새 집 앞이에요. 조금 더 알아가고 싶은 사람이 생겼어요.', [
      option('date', '서로의 마음을 묻고 연애 시작하기', '다음에 만나고 싶은 날을 먼저 물어본다.', 'link', { bond: 5, joy: 4 },
        'partner', 'start', '돌아가는 길에 이미 했던 이야기를 두어 번 떠올렸어요.'),
      pick('stay-friends', '친구로 만나기', '편하게 연락할 수 있는 사람으로 곁에 남는다.', 'link', { bond: 5, joy: 3 }),
      rest('지금의 내 시간을 지키기', '지금 꼭 정해야 할 일은 아니어서 오늘은 혼자 걸어 돌아온다.'),
    ]);
  }
  if (path.partner !== null && path.married === null && age - path.partner >= 2 && [29, 32, 36, 43, 55].includes(age)) {
    return scene('둘이서 써 보는 달력', '살고 싶은 곳과 서로의 일, 주말을 보내는 방법을 이야기하다 보니 결혼에 대한 이야기도 나왔어요.', [
      option('marry', '결혼하고 생활을 함께 꾸리기', '작게 인사하는 자리를 만들고 함께 살 일들을 정한다.', 'link', { bond: 7, joy: 5, money: -5 },
        'marry', true, '식이 끝나고 집에 왔을 때 둘이 가장 먼저 한 건 의자에 나란히 앉는 일이었어요.'),
      pick('keep-dating', '지금의 관계를 천천히 이어가기', '서로 필요한 시간과 거리를 이야기한다.', 'heart', { bond: 5, joy: 4 }),
      option('part', '서로 다른 길을 걷기로 하기', '함께 지낸 날을 고맙게 기억하며 앞으로의 시간을 고른다.', 'leaf', { health: 2, joy: 2 },
        'partner', 'end', '마지막 인사를 하고도 그 사람이 무사히 집에 닿았으면 했어요.'),
    ]);
  }
  if (path.partner !== null && path.children.length < 2 && age - (path.children.at(-1) ?? path.partner) >= 2 && [31, 34, 37, 40].includes(age)) {
    return scene('한 사람이 더 오는 일', '아이를 맞이할지, 맞이한다면 일과 돌봄을 어떻게 나눌지 오래 이야기했어요.', [
      option('have-child', '출산을 준비하고 아이를 맞이하기', '일정을 조정하고 돌봄을 함께 맡으며 새 식구를 기다린다.', 'sprout', { money: -4, health: -3, bond: 6, joy: 5 },
        'child', true, '그 작은 손에 손가락 하나를 쥐여 주었어요. 오래전 누군가도 내게 이렇게 했을 거예요.'),
      pick('later-family', '아직 준비할 시간을 갖기', '생활과 마음을 함께 살피며 생각을 더 나눈다.', 'clock', { learning: 2, health: 3, bond: 3 }),
      rest('지금의 가족과 일상 지키기', '지금 곁에 있는 사람과 오래 가고 싶은 생활을 돌본다.'),
    ]);
  }
  const childAge = path.children.length ? age - path.children[0] : 0;
  if ([7, 19].includes(childAge)) {
    const school = childAge === 7;
    return scene(school ? '이번엔 내가 교문 앞에' : '현관에 놓인 아이의 가방',
      school ? '가방이 아이 등을 반쯤 덮었어요. 내가 처음 학교에 가던 날의 가방도 저만했을 거예요.' : '다른 집에서 처음 자게 된 아이가 가방을 다시 한번 확인해요.', [
      pick('child-sendoff', '나란히 조금 더 걸어가기', '내가 기억하는 처음을 말해 주고, 아이의 이야기를 듣는다.', 'link', { bond: 6, joy: 3 }),
      pick('child-note', '가방 속에 짧은 메모 남기기', '힘들면 돌아올 자리가 있다고 한 줄 쓴다.', 'spark', { art: 4, bond: 4 }),
      rest('손을 흔들고 집으로 돌아오기', '문이 닫히기 전까지 그 자리에 서 있는다.'),
    ]);
  }
  return null;
}

function laterLife(life) {
  const age = life.age;
  const path = pathOf(life);
  if (age === 28) {
    return scene('내가 살 자리를 고르는 날', '일터나 학교 가까이에 살지, 익숙한 집에서 오갈지 생각해 봐요. 집까지 가는 시간도 하루의 일부니까요.', [
      pick('rent-room', '작은 집을 얻어 독립하기', '월세와 생활비를 계산하고 내가 살 공간을 꾸린다.', 'house', { money: -7, joy: 5, learning: 3 },
        { after: '첫날에는 방이 생각보다 조용했어요. 늦은 밤에야 커튼을 사야 한다는 게 떠올랐어요.' }),
      pick('share-home', '가까운 사람과 집을 나눠 쓰기', '각자가 쉬는 시간과 함께 맡을 일을 정한다.', 'link', { money: -3, bond: 6, joy: 2 }),
      rest('지금 사는 곳에서 조금 더 지내기', '익숙한 집에서 하루를 보내며 다음에 쓸 자금을 모은다.', { money: 4, health: 2, joy: 2 }),
    ]);
  }
  if (age === 45 || age === 54) {
    const title = age === 45 ? '오랜만에 걸려 온 전화' : '오래 살던 집을 정리하는 날';
    const detail = age === 45 ? '나를 기다려 주던 사람의 목소리가 전화 너머에서 예전보다 작게 들려요.' : '서랍에서 어릴 적 이름표와 한동안 잊고 있던 사진을 발견했어요.';
    return scene(title, detail, [
      pick('care-visit', '시간을 내어 찾아가기', '먼저 안부를 묻고 가까운 곳을 천천히 걷는다.', 'link', { bond: 7, joy: 3, money: -2 }, { after: '별다른 얘기는 없었어요. 나란히 앉아 있다는 게 생각보다 오래 남았어요.' }),
      pick('care-record', '오래된 이야기를 글로 남기기', '다시 묻기 전에 지금 들을 수 있는 말을 적어 둔다.', 'spark', { art: 6, learning: 3, bond: 2 }),
      rest('내가 할 수 있는 만큼 연락하기', '하루가 끝나기 전에 한 번 더 안부를 묻는다.'),
    ]);
  }
  if ([60, 65].includes(age) && life.career && path.retired === null) {
    return scene('퇴근길에 바라본 일터', '누군가에게 처음 일을 배운 곳에서 이제 내가 누군가의 첫날을 보고 있어요.', [
      option('retire', '일터에서 물러나 새 일상 시작하기', '정해진 출근 시간을 내려놓고 하루를 다시 꾸린다.', 'leaf', { health: 5, joy: 4 },
        'retire', true, '마지막 날에는 문을 평소처럼 닫았어요. 돌아보니 켜진 불이 아직 환했어요.'),
      pick('mentor-work', '일을 이어가며 후배에게 알려 주기', '내가 처음 듣고 싶었던 말부터 전해 본다.', 'book', { learning: 4, bond: 6, health: -2 }),
      rest('근무와 쉼을 조정하기', '내가 잘할 수 있는 속도를 조금씩 찾는다.'),
    ]);
  }
  if ([70, 82, 93].includes(age)) {
    const first = path.dreams.find((entry) => entry.field !== 'explore');
    const detail = first ? `오래된 공책에 ${first.age}살 때 적은 ‘${fieldLabel(first.field)}’가 보여요. 그 글씨로 쓴 내 이름은 지금과 조금 달라요.`
      : '예전에 쓰던 서랍에서 오래된 종이가 나왔어요. 그때의 내가 무엇을 기다렸는지 조금은 알 것 같아요.';
    return scene('오래된 공책을 펼치는 저녁', detail, [
      pick('memory-note', '지금의 내가 그때의 나에게 쓰기', '괜찮았던 일도 어려웠던 일도 한 줄씩 적는다.', 'spark', { art: 6, joy: 5 }, { after: '마지막에는 걱정했던 것만큼 혼자는 아니었다고 썼어요.' }),
      pick('memory-share', '가까운 사람에게 보여 주기', '이미 알고 있다고 생각했던 이야기를 처음부터 들려준다.', 'link', { bond: 6, joy: 3 }),
      rest('공책을 덮고 조용히 쉬기', '차가 식을 때까지 옛날을 조금 더 생각한다.'),
    ]);
  }
  return null;
}

export function annualScene(life) {
  const age = life.age;
  const path = pathOf(life);
  if (age < CHILDHOOD.length) return CHILDHOOD[age];
  if (SCHOOL_YEARS[age]) return SCHOOL_YEARS[age];
  if ([10, 14, 17].includes(age)) return dreamSurvey(life);
  if (age === 16) return highSchool(life);
  if (age === 18) return path.school === 'outside'
    ? scene('학교 밖에서 만든 시간표', '그동안 학교 밖에서 배운 게 있어요. 다음 기회에 필요한 자격도 알아볼 수 있어요.', [
      examChoice(), pick('outside-portfolio', '작업과 기술을 기록하기', '그동안 혼자 해 본 일을 보여 줄 수 있게 정리한다.', 'settings', { learning: 4, art: 4 }), rest(),
    ])
    : scene('고교 마지막 해의 선택', '원서와 실습 기록, 친구들과의 약속이 한 책상 위에 있어요.', [
      pick('high-applications', '입시와 전공 알아보기', '어떤 학과에서 내가 궁금한 것을 배울 수 있을지 찾는다.', 'book', { learning: 7, health: -2 }),
      pick('high-portfolio', '실습과 포트폴리오에 집중하기', '일터나 학과에 보여 줄 내 손의 결과를 모은다.', 'settings', { learning: 4, art: 5 }),
      rest('졸업 전 친구들과 추억 남기기', '계속 볼 줄 알았던 교실과 친구들을 조금 더 오래 본다.'),
    ]);
  if (age === 19) return afterSchool(life);
  if (path.sex === 'male' && age >= 20 && (
    path.service?.status === 'serving'
    || (age <= 28 && (!path.service || (path.service.status === 'planned' && age >= path.service.at)))
  )) return militaryScene(life);
  if (path.service?.endedAt === age && !life.career && !path.program) return path.degree ? retrain(life, true) : afterSchool(life, true);
  if (path.degree?.age === age) return retrain(life);
  const relationship = relationships(life);
  if (relationship) return relationship;
  if (path.program) return studying(life);
  if ([22, 26, 38, 50].includes(age)) return retrain(life);
  return laterLife(life);
}

export function applyPath(life, previousAge, choice) {
  const path = life.path ??= newPath();
  const action = choice.action;
  const text = [choice.after];
  switch (action?.kind) {
    case 'dream': path.dreams.push({ age: previousAge, field: action.value }); break;
    case 'school': path.school = action.value; break;
    case 'diploma': path.diploma = true; break;
    case 'study':
      path.program = { kind: action.value, field: mostRecentDream(path), until: previousAge + PROGRAMS[action.value].years };
      break;
    case 'service':
      if (action.value === 'start') {
        path.service = { status: 'serving', until: previousAge + 2 };
        if (path.program) path.program.until += 2;
      } else path.service = { status: 'planned', at: action.value };
      break;
    case 'partner': path.partner = action.value === 'start' ? previousAge : null; break;
    case 'marry': path.married = previousAge; break;
    case 'child': path.children.push(previousAge); break;
    case 'retire': path.retired = previousAge; break;
  }
  if (path.service?.status === 'serving' && life.age >= path.service.until) {
    path.service = { status: 'complete', endedAt: life.age };
    text.push('복무를 마쳤어요. 문을 열고 나오니 바람이 여느 날과 같았고, 내 시간은 다시 내 것이었어요.');
  }
  if (path.program && life.age >= path.program.until) {
    const { kind, field } = path.program;
    if (kind === 'training') path.training = true;
    else path.degree = { kind, field, age: life.age };
    text.push(`${PROGRAMS[kind].degree} 과정을 마쳤어요. 처음 갈 때 맸던 가방은 이제 많이 해졌어요.`);
    path.program = null;
  }
  return text.filter(Boolean).join(' ');
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
    path.program && path.service?.status !== 'serving' && PROGRAMS[path.program.kind].label + '에서 배우는 중',
    path.service?.status === 'serving' && '복무 중',
    path.retired !== null ? '은퇴' : CAREERS[life.career]?.title,
  ].filter(Boolean);
}

export function pathNotes(life) {
  const path = pathOf(life);
  return [
    ...path.dreams.map(({ age, field }) => `${age}살 희망 · ${fieldLabel(field)}`),
    path.school && SCHOOLS[path.school],
    path.diploma && '고졸 검정고시',
    path.degree && PROGRAMS[path.degree.kind].degree,
    path.training && '직업훈련 수료',
    path.service?.status === 'complete' && '복무 마침',
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
