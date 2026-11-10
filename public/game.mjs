import {
  AVATARS, IDLE, LIFE_EVENTS, OPPORTUNITIES, SPIRIT_SCENES, STAGES, STATS, STORIES, pick, spiritChoices,
} from './content.mjs';
import {
  SEXES, advancePath, annualScene, applyPath, bonusScene, careerPay, chanceDiscount, creditWorkYear,
  familyDream, farewell, newPath, pathOf, restoreWorkYears, updateLifePath, upgradeLifePath, yearlySources,
} from './life.mjs';
import { fallIll, illnessDeathRisk, settleHealth } from './health.mjs';

export const CAPACITY = 20;
export const RULE_VERSION = 10;
export const DEFAULTS = { years: 1, seconds: 0, maxAge: 100, pace: 'personal' };
const EXTRA_SECONDS = 12;
export const PASS = { id: 'pass', title: '이번에는 기다리기', detail: '잠시 쉬며 친구들의 이야기를 지켜봐요.', effect: {} };
export const MODES = { alive: '살아가는 중', fork: '다음 길 고르기', spirit: '영혼으로 관전' };
export const RANKS = [...Object.keys(STATS), 'age'];
const INITIAL_STATS = { health: 62, learning: 8, money: 12, joy: 48, art: 7, bond: 10 };

export class GameError extends Error {
  constructor(message, status = 409) {
    super(message);
    this.status = status;
  }
}

function number(value, min, max, label) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new GameError(`${label}은(는) ${min}~${max} 사이의 정수로 입력해 주세요.`, 400);
  }
  return value;
}

export function getSettings(input, base = DEFAULTS) {
  const { seconds, maxAge, pace } = { ...base, ...input };
  if (!['personal', 'auto', 'manual'].includes(pace)) throw new GameError('진행 방식을 골라 주세요.', 400);
  return {
    years: 1,
    seconds: pace === 'personal' || seconds === 0 ? 0 : number(seconds, 10, 180, '선택 시간'),
    maxAge: number(maxAge, 80, 110, '한 삶의 최대 나이'),
    pace,
  };
}

export function nickname(value, maximum = 14) {
  const name = typeof value === 'string' ? value.normalize('NFC').trim().replace(/\s+/gu, ' ') : '';
  if (!name || [...name].length > maximum || /[\p{Cc}\p{Cf}]/u.test(name)) {
    throw new GameError(`이름을 1~${maximum}글자로 입력해 주세요.`, 400);
  }
  return name;
}

function newLife(generation, sex, parent, seed = 0) {
  const stats = { ...INITIAL_STATS };
  if (parent) {
    stats.money += Math.min(30, Math.floor(Math.max(0, parent.stats.money ?? 0) * 0.15));
    stats.bond += Math.min(8, Math.floor(Math.max(0, parent.stats.bond ?? 0) / 12));
  }
  const path = newPath(sex);
  path.romanceSeed = seed;
  return { generation, age: 0, stats, career: null, path, history: [], end: null };
}

export function newRoom({ code, seed, name, hostKey, settings, now = Date.now() }) {
  return {
    code, seed, name: nickname(name, 30), hostKey, settings: getSettings(settings), rules: RULE_VERSION, revision: 1, updated: now,
    phase: 'lobby', year: 0, turn: null, paused: false, players: [], endReason: null,
  };
}

export function addPlayer(room, { id, key, name, avatar, sex = null }) {
  if (!['lobby', 'play'].includes(room.phase)) {
    throw new GameError('이미 마감된 방이에요. 선생님이 방을 초기화한 뒤 참가해 주세요.');
  }
  if (room.players.length >= CAPACITY) throw new GameError('이 방에 20명이 모두 들어왔어요.');
  const normalized = nickname(name);
  if (room.players.some((player) => player.name.toLowerCase() === normalized.toLowerCase())) {
    throw new GameError('같은 별명이 있어요. 다른 별명으로 참가해 주세요.');
  }
  number(avatar, 0, AVATARS.length - 1, '캐릭터 번호');
  if (sex !== null && (typeof sex !== 'string' || !Object.hasOwn(SEXES, sex))) throw new GameError('캐릭터의 성별을 골라 주세요.', 400);
  const player = { id, key, name: normalized, avatar, mode: 'alive', choice: null, bonuses: [], life: newLife(1, sex, null, hash(`${room.seed}:${id}:1`)), archives: [], visits: [], latest: null };
  room.players.push(player);
  return player;
}

function hash(value) {
  let result = 2166136261;
  for (const char of value) result = Math.imul(result ^ char.charCodeAt(0), 16777619);
  return result >>> 0;
}

export function stageAt(age) {
  return STAGES.findLastIndex((stage) => age >= stage.min);
}

const YEARLY_ACTIONS = new Set(['study', 'service', 'move', 'marry', 'child', 'retire', 'care', 'saving', 'savings-payout']);

function projectedSources(life, option, bonus) {
  const next = { ...life, path: structuredClone(pathOf(life)) };
  if (option) applyDecision(next, life.age, option);
  if (!bonus) {
    next.age += 1;
    advancePath(next);
  }
  return yearlySources(next);
}

function choiceSources(life, option, bonus, before) {
  const after = projectedSources(life, option, bonus);
  const starts = after.filter((source) => !before.some((previous) => previous.id === source.id && previous.years === source.years));
  const stops = before.filter((source) => !after.some((next) => next.id === source.id)).map((source) => source.label);
  return starts.length || stops.length ? { starts, stops } : null;
}

function sumEffects(...effects) {
  const total = {};
  for (const effect of effects) {
    for (const [stat, delta] of Object.entries(effect)) total[stat] = (total[stat] ?? 0) + delta;
  }
  return total;
}

function choicesFor(room, player) {
  const { mode, life } = player;
  if (player.afterlifeDone) return { key: 'year', waiting: true, title: '선택을 마쳤어요', detail: '다음 해에 이야기가 이어져요.', choices: [] };
  if (mode === 'fork') {
    const next = pathOf(life).children.length ? '자녀로 이어 살기' : '다음 세대로 이어 살기';
    return { key: 'year', title: '다음 이야기를 골라요', detail: '한 삶의 기록이 남았어요. 이제 어디로 갈까요?',
      choices: [
        pick('successor', next, '다음 세대의 캐릭터를 골라 0살부터 시작해요.', 'sprout', {}),
        pick('spirit', '영혼으로 머물기', '가족의 꿈과 기억에 남은 곳에 들러요.', 'ghost', {}),
      ] };
  }
  if (mode === 'spirit') {
    const choices = spiritChoices(life, player.visits);
    return {
      key: 'year',
      title: '다시 걷는 마을',
      detail: choices.length ? '기억이 남은 곳에 한 번씩 들러요.' : '가고 싶던 곳에 모두 들렀어요. 친구들의 이야기를 지켜봐요.',
      choices,
    };
  }

  const extra = bonusScene(life, player.bonuses);
  const entry = extra ?? { key: 'year', ...(annualScene(life) ?? everydayScene(room, life)) };
  const yearly = yearlySources(life);
  const base = sumEffects(...yearly.map((source) => source.effect));
  let before = extra ? yearly : null;
  let choices = entry.choices.map((option) => {
    const need = Object.fromEntries(Object.entries(option.need ?? {}).map(([stat, minimum]) =>
      [stat, Math.max(1, minimum - (option.strictNeed ? 0 : chanceDiscount(life, option.career, stat)))]));
    for (const [stat, delta] of Object.entries(option.effect)) {
      if (delta < 0) {
        const yearlyLoss = extra ? 0 : Math.min(0, base[stat] ?? 0);
        need[stat] = Math.max(need[stat] ?? 1, 1 - delta - yearlyLoss);
      }
    }
    const conditions = [...(option.conditions ?? []), ...Object.entries(need).map(([stat, minimum]) => ({
      label: `${STATS[stat].label} ${minimum}${STATS[stat].unit ?? '점'}`,
      met: life.stats[stat] >= minimum,
    }))];
    const locked = [option.locked, ...conditions.filter((condition) => !condition.met).map((condition) => `${condition.label} 필요`)]
      .filter(Boolean).join(' · ');
    const card = { ...option, locked, ...(option.conditions ? { conditions } : {}) };
    const changesYearly = option.habit || option.career || YEARLY_ACTIONS.has(option.action?.kind);
    if (!changesYearly) return card;
    before ??= projectedSources(life, null, false);
    return { ...card, recurring: choiceSources(life, option, Boolean(extra), before) };
  });
  if (entry.key === 'career') {
    const [keep, ...jobs] = choices;
    jobs.sort((left, right) =>
      Number(right.careerGroup === 'advancement') - Number(left.careerGroup === 'advancement') ||
      Number(Boolean(left.locked)) - Number(Boolean(right.locked)) ||
      Number(right.opportunity) - Number(left.opportunity));
    choices = [keep, ...jobs];
  }
  return {
    ...entry, bonus: Boolean(extra), base, yearly, healthWarning: !extra && illnessDeathRisk(life) > 0, choices,
  };
}

function findChoice(entry, choice) {
  const sex = /^child-(male|female)$/.exec(choice)?.[1];
  if (sex) {
    const next = entry.choices.find((option) => option.id === 'successor');
    return next && { ...next, successor: sex };
  }
  return entry.choices.find((option) => option.id === choice && choice !== 'successor');
}

function everydayScene(room, life) {
  const stage = stageAt(life.age) - 2;
  const deck = STORIES[stage];
  const offset = hash(`${room.seed}:${stage}`);
  const entry = deck[(life.age + offset) % deck.length];
  const available = OPPORTUNITIES[stage];
  if (!available.length) return entry;
  const offer = available[(life.age + hash(`${room.seed}:offer:${stage}`)) % available.length];
  return { ...entry, choices: [...entry.choices, { ...offer, opportunity: true }] };
}

function applyEffects(life, effects) {
  const changes = {};
  for (const [stat, delta] of Object.entries(effects)) {
    const before = life.stats[stat];
    life.stats[stat] = stat === 'money' ? Math.round(Math.max(1, before + delta) * 100) / 100 :
      Math.max(1, before + delta);
    if (life.stats[stat] !== before) changes[stat] = stat === 'money'
      ? Math.round((life.stats[stat] - before) * 100) / 100 : life.stats[stat] - before;
  }
  return changes;
}

function applyDecision(life, age, option) {
  if (option.career) {
    const previousSalary = life.career && life.path.retired === null ? careerPay(life)?.total : 0;
    if (!life.career) life.path.firstJobAge = age;
    life.career = option.career;
    // 남녀 모두 동일한 직업군인 채용 경로를 이용합니다. 남성의 의무복무 이벤트가
    // 직업군인 근무와 중복되지 않도록 게임에서는 군 간부 복무로 인정합니다.
    if (life.path.sex === 'male' && CAREERS[option.career]?.militaryProfessional &&
      life.path.service?.status !== 'complete') {
      life.path.service = { status: 'complete', kind: 'professional', endedAt: age };
    }
    const newSalary = careerPay(life)?.total ?? 0;
    if (previousSalary > 0 && newSalary > previousSalary && life.path.retired === null) {
      life.path.savingsReview = { at: age + 1, from: previousSalary, to: newSalary };
    }
  }
  return applyPath(life, age, option);
}

function recordChoice(player, year, option, age, changes, text, type, raise) {
  const result = {
    year, age: player.life.age, decisionAge: age, title: option.title,
    line: option.narration ?? option.detail, changes, text, type,
  };
  if (raise) result.raise = raise;
  player.life.history.push(result);
  player.latest = result;
}

function addBonus(player, year, entry, option) {
  const { life } = player;
  const changes = applyEffects(life, option.effect);
  const affectionBefore = pathOf(life).romance?.affection;
  const text = applyDecision(life, life.age, option);
  const affectionAfter = pathOf(life).romance?.affection;
  if (affectionAfter !== undefined && affectionAfter !== affectionBefore) {
    changes.affection = affectionAfter - (affectionBefore ?? 0);
  }
  player.bonuses.push(entry.key);
  recordChoice(player, year, option, life.age, changes, text, 'bonus');
}

function oldAgeEnding(age, maxAge, roll) {
  const start = Math.max(80, maxAge - 18);
  return age >= maxAge || (age >= start && roll < 3 + (age - start) * 2);
}

function changeLife(room, player, year, option, after) {
  const { life } = player;
  const age = life.age;
  const randomKey = `${room.seed}:${player.id}:${life.generation}:${age}`;
  const chance = hash(`${randomKey}:event`);
  const event = !option.action && age >= 7 && chance % 7 === 0 ? LIFE_EVENTS[(chance >>> 8) % LIFE_EVENTS.length] : null;
  const sources = yearlySources(life);
  const salary = sources.find(({ id }) => id === `job-${life.career}`)?.effect.money ?? 0;
  const savings = sources.find(({ id }) => id === 'retirement-saving');
  const ordinaryEffects = sumEffects(option.effect, event?.effect ?? {},
    ...sources.filter(({ id }) => id !== 'retirement-saving').map((source) => source.effect));
  // 실제로 낼 수 있는 자금만 적립해 부족한 해에 공짜 저축이 생기지 않게 합니다.
  const deposit = savings ? Math.min(-savings.effect.money,
    Math.floor(Math.max(0, life.stats.money + (ordinaryEffects.money ?? 0) - 1))) : 0;
  const effects = deposit ? { ...ordinaryEffects, money: (ordinaryEffects.money ?? 0) - deposit } : ordinaryEffects;
  const changes = applyEffects(life, effects);
  // 올해 만기 지급은 매년 정산 과정에서 단 한 번만 반영합니다.
  for (const investment of life.path.investments ?? []) {
    if (!investment.settledAt && age >= investment.maturityAge) investment.settledAt = age;
  }
  if (life.path.savings && life.path.retired === null) {
    const account = life.path.savings;
    const balance = Math.floor(Math.max(0, account.balance ?? 0));
    const rate = account.interestRate ?? 0.04;
    account.balance = Math.floor(balance * (1 + rate) + 1e-9) + deposit;
  }
  if (salary) creditWorkYear(life);
  const affectionBefore = pathOf(life).romance?.affection;
  const decision = applyDecision(life, age, option);
  const affectionAfter = pathOf(life).romance?.affection;
  if (affectionAfter !== undefined && affectionAfter !== affectionBefore) {
    changes.affection = affectionAfter - (affectionBefore ?? 0);
  }
  const diedFromIllness = hash(`${randomKey}:illness-ending`) % 100 < illnessDeathRisk(life);
  settleHealth(life);
  life.age += 1;
  const memories = [decision, after, event?.text, advancePath(life)];
  if (diedFromIllness || oldAgeEnding(life.age, room.settings.maxAge, hash(`${randomKey}:ending`) % 100)) {
    const ending = diedFromIllness ? '큰 병으로 삶을 마쳤어요.' : '삶의 마지막 장을 덮었어요.';
    const note = `${life.age}살에 ${ending} ${farewell(life)}`;
    life.end = { year, reason: diedFromIllness ? 'illness' : 'age', note };
    player.mode = 'fork';
    memories.push(note);
  } else {
    memories.push(fallIll(life, life.path, hash(`${randomKey}:illness`) % 100, hash(`${randomKey}:severity`) % 100));
  }
  const nextSalary = salary && !life.end && life.path.retired === null ? careerPay(life).total : 0;
  const raise = nextSalary > salary ? { from: salary, to: nextSalary } : undefined;
  if (raise && salary > 0 && !life.end) {
    life.path.savingsReview = { at: life.age, from: salary, to: nextSalary };
  }
  recordChoice(player, year, option, age, changes, memories.filter(Boolean).join(' '), 'life', raise);
}

function branch(player, year, option) {
  const { life } = player;
  if (option.successor) {
    player.archives.push(life);
    player.life = newLife(life.generation + 1, option.successor, life,
      hash(`${player.id}:${life.generation + 1}:${year}`));
    player.mode = 'alive';
    player.visits = [];
    player.latest = {
      year, age: player.life.age, title: option.title,
      line: '앞 세대의 마음을 이어받아 새로운 첫날을 맞았어요.',
      text: `${player.life.generation}대가 0살로 태어났어요. 기본 능력치를 받고 앞 세대의 돈과 인연 일부를 더 받을 수 있어요.`, type: 'child',
    };
    player.life.history.push(player.latest);
  } else if (option.id === 'spirit') {
    player.mode = 'spirit';
    player.latest = {
      year, age: life.age, title: option.title,
      line: '영혼이 되어 불이 켜진 옛집 앞을 다시 걸었어요.',
      text: '저녁이 되자 살던 집에 불이 켜졌어요.', type: 'spirit',
    };
  }
}

function visit(room, player, turn, option) {
  const scenes = SPIRIT_SCENES[option.id];
  const text = option.id === 'family-dream' ? familyDream(player.life)
    : scenes && scenes[hash(`${room.seed}:${player.id}:${turn.number}`) % scenes.length];
  if (!text) return;
  const entry = {
    id: option.id, year: turn.to, age: player.life.age, title: option.title,
    line: option.narration ?? option.detail, text, type: 'spirit',
  };
  player.visits.push(entry);
  player.latest = entry;
}

function turnFor(room, player) {
  if (room.settings.pace !== 'personal') return room.turn;
  if (!player || room.phase === 'lobby') return null;
  const from = player.year ?? 0;
  return { number: from + 1, from, to: from + 1, auto: true, seconds: 0, deadline: null };
}

function openTurn(room, now) {
  const { seconds, pace } = room.settings;
  for (const player of room.players) {
    player.choice = null;
    player.bonuses = [];
    delete player.afterlifeDone;
  }
  const extra = seconds && room.players.some((player) => player.mode === 'alive' && bonusScene(player.life, player.bonuses));
  const duration = pace === 'auto' && seconds ? (seconds + (extra ? EXTRA_SECONDS : 0)) * 1000 : null;
  room.turn = {
    number: (room.turn?.number ?? 0) + 1,
    from: room.year, to: room.year + 1,
    auto: pace === 'auto', seconds,
    deadline: room.paused || !duration ? null : now + duration, remaining: room.paused ? duration : null,
  };
  room.phase = 'play';
}

function closeTurn(room, now) {
  const turn = room.turn;
  for (const player of room.players) {
    if (player.afterlifeDone) continue;
    player.latest = null;
    let entry = choicesFor(room, player);
    while (entry.bonus) {
      addBonus(player, turn.to, entry, entry.choices.find((item) => item.id === entry.fallback));
      entry = choicesFor(room, player);
    }
    const selected = findChoice(entry, player.choice);
    const option = selected?.locked ? null : selected;
    if (player.mode === 'alive') changeLife(room, player, turn.to, option ?? IDLE, entry.after);
    else if (option && player.mode === 'fork') branch(player, turn.to, option);
    else if (option) visit(room, player, turn, option);
    else if (player.choice === PASS.id) {
      player.latest = { year: turn.to, age: player.life.age, title: PASS.title, line: PASS.detail, type: 'wait' };
    }
  }
  room.year = turn.to;
  openTurn(room, now);
}

export function updateRoomRules(room, now) {
  const previous = room.rules ?? 1;
  if (previous >= RULE_VERSION) return false;
  room.rules = RULE_VERSION;
  for (const player of room.players) {
    for (const life of [...player.archives, player.life]) {
      if (previous < 3) updateLifePath(life);
      restoreWorkYears(life);
      if (previous < 10) upgradeLifePath(life, hash(`${room.seed}:${player.id}:${life.generation}`));
    }
  }
  if (previous >= 3) {
    if (previous < 6 && room.phase === 'play') {
      for (const player of room.players) {
        if (!player.choice || player.choice === PASS.id || player.afterlifeDone) continue;
        // Keep an annual choice already submitted when a new extra scene is added.
        const newScenes = previous >= 5 ? ['career', 'education', 'saving', 'dating'] : ['career', 'saving', 'dating'];
        const skipped = newScenes.filter((key) => !player.bonuses.includes(key));
        player.bonuses.push(...skipped);
        const entry = choicesFor(room, player);
        const selected = findChoice(entry, player.choice);
        if (entry.bonus || !selected || selected.locked) {
          player.choice = null;
          player.bonuses.length -= skipped.length;
        }
      }
    }
    if (previous >= 6 && previous < 8 && room.phase === 'play') {
      for (const player of room.players) {
        if (!player.choice || player.choice === PASS.id || player.afterlifeDone || player.mode !== 'alive') continue;
        const skipped = ['saving', 'dating'].filter((key) => !player.bonuses.includes(key));
        player.bonuses.push(...skipped);
        const entry = choicesFor(room, player);
        const selected = findChoice(entry, player.choice);
        if (entry.bonus || !selected || selected.locked) {
          player.choice = null;
          player.bonuses.length -= skipped.length;
        }
      }
    }
    if (previous >= 8 && previous < 10 && room.phase === 'play') {
      for (const player of room.players) {
        if (!player.choice || player.afterlifeDone || player.mode !== 'alive') continue;
        const entry = choicesFor(room, player);
        const selected = findChoice(entry, player.choice);
        if (entry.bonus || !selected || selected.locked) player.choice = null;
      }
    }
    return true;
  }
  room.settings.years = 1;
  for (const player of room.players) {
    player.bonuses = [];
  }
  if (room.phase === 'play' || room.phase === 'review') openTurn(room, now);
  return true;
}

export function selectChoice(room, playerId, { round, scene, choice }, now) {
  const player = room.players.find((item) => item.id === playerId);
  if (!player) throw new GameError('다시 방에 참가해 주세요.', 403);
  const turn = turnFor(room, player);
  if (room.phase !== 'play' || !turn || turn.number !== round) throw new GameError('이미 다음 선택이 열렸어요.');
  if (room.paused) throw new GameError('선생님이 게임을 잠시 멈췄어요.');
  if (player.afterlifeDone) {
    if (player.choice === choice) return false;
    throw new GameError('이번 해의 선택을 마쳤어요.');
  }

  const entry = choicesFor(room, player);
  if (scene !== entry.key && (scene !== undefined || entry.bonus || player.bonuses.length)) {
    throw new GameError('새 선택이 열렸어요. 화면을 다시 확인해 주세요.');
  }
  const personal = room.settings.pace === 'personal';
  const option = !personal && choice === PASS.id && player.mode !== 'alive'
    ? PASS : findChoice(entry, choice);
  if (!option || option.locked) throw new GameError('지금은 이 선택을 할 수 없어요.');
  if (entry.bonus) {
    addBonus(player, turn.to, entry, option);
    return true;
  }
  if (personal) {
    if (player.mode === 'alive') changeLife(room, player, turn.to, option, entry.after);
    else if (player.mode === 'fork') branch(player, turn.to, option);
    else visit(room, player, turn, option);
    player.year = turn.to;
    player.bonuses = [];
    return true;
  }
  if (player.choice === choice) return false;
  if (choice !== PASS.id && player.mode !== 'alive') {
    if (player.mode === 'fork') branch(player, turn.to, option);
    else visit(room, player, turn, option);
    player.afterlifeDone = true;
  }
  player.choice = choice;
  if (turn.auto && room.players.every((item) => item.choice)) closeTurn(room, now);
  return true;
}

export function tick(room, now) {
  if (room.phase !== 'play' || room.paused || !room.turn?.deadline || room.turn.deadline > now) return false;
  closeTurn(room, now);
  return true;
}

export function teacherAction(room, action, body, now) {
  if (action === 'settings' && room.phase !== 'ended') {
    const settings = getSettings(body.settings, room.settings);
    if (room.phase !== 'lobby') {
      settings.maxAge = room.settings.maxAge;
      if ((settings.pace === 'personal') !== (room.settings.pace === 'personal')) {
        throw new GameError('진행 방식은 시작 전에 정해 주세요.');
      }
    }
    room.settings = settings;
  } else if (action === 'kick' && (room.phase === 'lobby' || room.phase === 'play')) {
    const index = room.players.findIndex((player) => player.id === body.playerId);
    if (index < 0) throw new GameError('퇴장할 학생을 찾을 수 없어요.', 404);
    // 학생의 참가 토큰과 인생 기록이 함께 제거되어 예전 접속으로는 돌아올 수 없습니다.
    room.players.splice(index, 1);
    // 자동 진행에서 미제출자를 퇴장시켰다면 남은 학생들의 제출 상태로 마감을 다시 판단합니다.
    if (room.phase === 'play' && !room.paused && room.turn?.auto &&
      room.players.length > 0 && room.players.every((player) => player.choice)) closeTurn(room, now);
  } else if (action === 'start' && room.phase === 'lobby') {
    if (!room.players.length) throw new GameError('한 명 이상 참가하면 시작할 수 있어요.');
    if (room.settings.pace === 'personal') room.phase = 'play';
    else openTurn(room, now);
  } else if (action === 'advance' && room.turn && !room.paused && room.phase === 'play') {
    if (body.round !== room.turn.number || body.phase !== room.phase) throw new GameError('이미 화면의 단계가 바뀌었어요.');
    closeTurn(room, now);
  } else if (action === 'pause' && !room.paused && room.phase === 'play') {
    if (room.turn) {
      room.turn.remaining = room.turn.deadline ? Math.max(0, room.turn.deadline - now) : null;
      room.turn.deadline = null;
    }
    room.paused = true;
  } else if (action === 'resume' && room.paused) {
    if (room.turn) {
      room.turn.deadline = room.turn.remaining === null ? null : now + room.turn.remaining;
      room.turn.remaining = null;
    }
    room.paused = false;
  } else if (action === 'finish' && room.phase === 'play') {
    room.phase = 'ended';
    room.paused = false;
    if (room.turn) {
      room.turn.deadline = null;
      room.turn.remaining = null;
    }
    room.endReason = '교사가 우리 반의 인생 기록을 마감했어요.';
  } else if (action === 'reset' && room.phase === 'ended') {
    if (body.confirmCode !== room.code) {
      throw new GameError('초기화하려면 방 코드를 정확히 입력해 주세요.', 400);
    }
    // 방 코드, 교사 인증 정보, 이름과 진행 설정은 유지하고 게임 기록만 비웁니다.
    // 기존 학생 접속 토큰은 새 대기실에서 더 이상 유효하지 않습니다.
    room.players = [];
    room.phase = 'lobby';
    room.year = 0;
    room.turn = null;
    room.paused = false;
    room.endReason = null;
  } else {
    throw new GameError('지금은 할 수 없는 작업이에요.');
  }
  return true;
}

function summary(player) {
  const { id, name, avatar, mode, life, choice, latest } = player;
  return {
    id, name, avatar, mode, age: life.age, generation: life.generation, career: life.career, sex: pathOf(life).sex,
    submitted: Boolean(choice), latest: latest?.title ?? null,
  };
}

function lifeView(life, history = life.history) {
  const { age, generation, career, stats, end } = life;
  const { healthBurden, ...path } = pathOf(life);
  return { age, generation, career, stats: { ...stats }, end, history, path };
}

function rankings(players) {
  return Object.fromEntries(RANKS.map((stat) => {
    const rows = players.map((player) => {
      let best = { value: -1, generation: 1 };
      for (const life of [...player.archives, player.life]) {
        const value = stat === 'age' ? life.age : life.stats[stat];
        if (value >= best.value) best = { value, generation: life.generation };
      }
      const { id, name, avatar, age, career, sex, mode } = summary(player);
      return { id, name, avatar, age, career, sex, mode, ...best };
    }).sort((left, right) => right.value - left.value);
    let rank = 1;
    return [stat, rows.map((row, index) => {
      if (index > 0 && row.value < rows[index - 1].value) rank = index + 1;
      return { ...row, rank };
    })];
  }));
}

export function stateFor(room, playerId, now = Date.now()) {
  const player = room.players.find((item) => item.id === playerId);
  const turn = turnFor(room, player);
  return {
    code: room.code, name: room.name, revision: room.revision, phase: room.phase, year: turn?.from ?? room.year, settings: room.settings,
    turn, paused: room.paused, endReason: room.endReason, serverNow: now,
    players: room.players.map(summary), rankings: room.phase === 'lobby' ? {} : rankings(room.players),
    me: player ? {
      ...summary(player), life: lifeView(player.life, player.life.history.slice(-8)),
      choice: player.choice, latest: player.latest, visits: player.visits.slice(-8),
      scene: room.phase === 'play' ? choicesFor(room, player) : null,
    } : null,
  };
}

export function profileFor(room, playerId) {
  const player = room.players.find((item) => item.id === playerId);
  if (!player) throw new GameError('이 방에 해당 인생 기록이 없어요.', 404);
  return { ...summary(player), lives: [...player.archives, player.life].map((life) => lifeView(life)), visits: player.visits };
}
