import { pick } from './content.mjs';

export function illnessRisk(age, health) {
  if (age < 7) return 0;
  const ageRisk = age >= 80 ? 10 : age >= 65 ? 7 : age >= 40 ? 4 : 2;
  return ageRisk + Math.floor(Math.max(0, 70 - health) * 0.45);
}

export function fallIll(life, path, roll, severityRoll) {
  if (path.illness || life.age - (path.recoveredAt ?? -10) <= 2 || roll >= illnessRisk(life.age, life.stats.health)) return '';
  const serious = life.age >= 65 && severityRoll < 16 + Math.floor(Math.max(0, 65 - life.stats.health) / 2);
  path.illness = { serious, steps: serious ? 3 : 1 };
  return serious ? '검사를 받고 치료가 필요한 병을 알게 됐어요.' : '몸이 아파서 쉴 시간이 필요해요.';
}

function care(id, title, detail, effect, steps, after) {
  return pick(id, title, detail, 'heart', effect, { action: { kind: 'care', value: steps }, after });
}

export function illnessCare(path) {
  const { serious } = path.illness;
  return {
    title: serious ? '큰 병을 치료할 때' : '몸이 아픈 날',
    detail: serious ? '어떻게 치료받을까요? 조금씩 나아질 수도 있어요.' : '몸을 쉬게 하고 기운을 되찾아요.',
    choices: serious ? [
      care('operation', '수술받기', '돈이 많이 들지만, 한 번에 치료해요.', { money: -40, health: 12 }, 3, '수술을 마쳤어요. 병실 창가에 오후 햇살이 들었어요.'),
      care('clinic-care', '병원에 다니며 치료하기', '검사를 받고 약을 먹어요. 두 단계 나아요.', { money: -10, health: 6 }, 2, '다음 진료 날짜를 달력에 적었어요.'),
      care('rest', '집에서 돌봄받기', '도움을 받으며 천천히 쉬어요. 한 단계 나아요.', { health: 3 }, 1, '누군가 따뜻한 밥을 두고 갔어요.'),
    ] : [
      care('clinic-care', '병원에 다녀오기', '진료를 받고 몸을 돌봐요.', { money: -4, health: 5 }, 1, '진료를 받고 한결 편해졌어요.'),
      care('rest', '집에서 쉬기', '일찍 잠들고 천천히 기운을 내요.', { health: 2 }, 1, '푹 자고 나니 조금 편해졌어요.'),
    ],
  };
}

export function finishCare(path, age, steps) {
  path.illness.steps -= steps;
  if (path.illness.steps > 0) return `회복까지 ${path.illness.steps}단계 남았어요.`;
  path.illness = null;
  path.recoveredAt = age;
  return '몸이 한결 나아졌어요.';
}
