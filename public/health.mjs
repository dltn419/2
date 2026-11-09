import { pick } from './content.mjs';

export function illnessRisk(age, health) {
  if (age < 7) return 0;
  const ageRisk = age >= 80 ? 10 : age >= 65 ? 7 : age >= 40 ? 4 : 2;
  return ageRisk + Math.floor(Math.max(0, 70 - health) * 0.45);
}

export function fallIll(life, path, roll, severityRoll) {
  const { age, stats: { health } } = life;
  if (path.illness || age - (path.recoveredAt ?? -10) <= 2 || roll >= illnessRisk(age, health)) return '';
  const weakness = Math.max(0, 65 - health);
  const seriousChance = age >= 65 ? 22 + weakness / 2 :
    age >= 50 ? 9 + weakness / 2 : age >= 35 && health < 35 ? 6 + (35 - health) * 0.8 : 0;
  const serious = severityRoll < seriousChance;
  const critical = age >= 72 && serious && severityRoll < seriousChance * 0.65;
  path.illness = { serious, critical, steps: critical ? 4 : serious ? 3 : 1 };
  if (critical) return '큰 병이 깊어졌어요. 이번 해에 집중 치료가 필요해요.';
  return serious ? '검사를 받고 치료가 필요한 병을 알게 됐어요.' : '몸이 아파서 쉴 시간이 필요해요.';
}

function healthBurden(life) {
  const { path, age, stats: { health } } = life;
  const previous = path?.healthBurden ?? 0;
  if (path?.illness?.serious && path.illness.treatedAt !== age) {
    return Math.min(12, previous + (path.illness.critical ? 2 : 1));
  }
  if (!path?.illness && health >= 45) return Math.max(0, previous - 1);
  return previous;
}

export function settleHealth(life) {
  const burden = healthBurden(life);
  if (burden || life.path.healthBurden) life.path.healthBurden = burden;
}

export function illnessDeathRisk(life) {
  const { age, stats: { health } } = life;
  const illness = life.path?.illness;
  if (!illness?.serious) return 0;
  const treated = illness.treatedAt === age;
  const burden = healthBurden(life);
  const weakness = Math.max(0, 35 - health);
  if (illness.critical) {
    return treated ? Math.min(28, 6 + Math.floor(weakness / 4) + burden) :
      Math.min(96, 64 + Math.floor(weakness / 4) + burden * 6);
  }
  if (!weakness && !burden) return 0;
  const ageRisk = age >= 80 ? 8 : age >= 65 ? 5 : age >= 50 ? 2 : 0;
  const risk = Math.min(62, Math.ceil(weakness * (illness.steps > 1 ? 1.1 : 0.55)) + burden * 3 + ageRisk);
  return treated ? Math.ceil(risk / 3) : risk;
}

function care(id, title, detail, effect, steps, after, extra = {}) {
  return pick(id, title, detail, 'heart', effect, { action: { kind: 'care', value: steps }, narration: after, after, ...extra });
}

export function illnessCare(path) {
  const { serious, critical, steps } = path.illness;
  if (critical) {
    return {
      title: '집중 치료가 필요한 큰 병',
      detail: '올해 큰 치료를 받기 어려우면 삶을 마칠 위험이 높아요.',
      choices: [
        care('operation', '수술받기', '이번 병을 한 번에 치료해요.', { money: -40, health: 12 }, 4, '수술을 마치고 익숙한 목소리를 들었어요.'),
        care('clinic-care', '집중 치료받기', '병원에서 두 단계 회복해요. 올해 위험이 크게 줄어요.', { money: -22, health: 8 }, 2, '병실 창가에서 한 해의 계절이 바뀌는 걸 봤어요.'),
        ...(!path.illness.aidUsed ? [care('assisted-care', '도움을 받아 집중 치료하기', '가까운 사람들이 치료비와 돌봄을 보태요.',
          { health: 7 }, 2, '도와준 사람과 함께 병원에 들어서니 마음이 조금 놓였어요.', { need: { bond: 46 } })] : []),
        care('rest', '집에서 돌봄받기', '곁에서 돌봐 줘요. 큰 치료가 늦어져 위험이 쌓여요.', { health: 2 }, 0, '오래 기억하고 싶어서 창밖 풍경을 바라봤어요.'),
      ],
    };
  }
  return {
    title: serious ? '큰 병을 치료할 때' : '몸이 아픈 날',
    detail: serious ? '몸이 약할 때 큰 병이 오래가면 삶을 마칠 수도 있어요. 치료 방법을 골라요.' : '몸을 쉬게 하고 기운을 되찾아요.',
    choices: serious ? [
      care('operation', '수술받기', '이번 병을 한 번에 치료해요.', { money: -40, health: 12 }, 3, '수술을 마쳤어요. 병실 창가에 오후 햇살이 들었어요.'),
      care('clinic-care', '병원에 다니며 치료하기', '두 단계 회복하고 올해 위험이 줄어요.', { money: -10, health: 6 }, 2, '다음 진료 날짜를 달력에 적었어요.'),
      ...(steps > 1 && !path.illness.aidUsed ? [care('assisted-care', '도움을 받아 병원 가기', '친한 사람의 도움으로 치료받아요. 두 단계 회복해요.',
        { health: 5 }, 2, '곁에 와 준 사람과 함께 진료를 받았어요.', { need: { bond: 34 } })] : []),
      care('rest', '집에서 돌봄받기', steps === 1 ? '한 단계 더 쉬면 회복해요.' : '한 단계 회복해요. 체력이 낮으면 올해 병이 심해질 수 있어요.',
        { health: 3 }, 1, '집에서 따뜻한 밥을 먹으며 천천히 몸을 돌봤어요.'),
    ] : [
      care('clinic-care', '병원에 다녀오기', '진료를 받고 몸을 돌봐요.', { money: -4, health: 5 }, 1, '진료를 받고 한결 편해졌어요.'),
      care('rest', '집에서 쉬기', '일찍 잠들고 천천히 기운을 내요.', { health: 2 }, 1, '푹 자고 나니 조금 편해졌어요.'),
    ],
  };
}

export function finishCare(path, age, steps, method) {
  const hospital = ['operation', 'clinic-care', 'assisted-care'].includes(method);
  if (hospital) path.healthBurden = Math.max(0, (path.healthBurden ?? 0) - (method === 'operation' ? 4 : 2));
  path.illness.steps -= steps;
  if (path.illness.steps > 0) {
    if (hospital) path.illness.treatedAt = age;
    if (method === 'assisted-care') path.illness.aidUsed = true;
    return `회복까지 ${path.illness.steps}단계 남았어요.`;
  }
  path.illness = null;
  path.recoveredAt = age;
  return '몸이 한결 나아졌어요.';
}
