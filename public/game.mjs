import {
  AVATARS, CAREERS, IDLE, LIFE_EVENTS, OPPORTUNITIES, SPIRIT_SCENES, STAGES, STATS, STORIES, pick, spiritChoices,
} from './content.mjs';
import { SEXES, advancePath, annualScene, applyPath, bonusScene, chanceDiscount, familyDream, farewell, newPath, pathOf, updateLifePath } from './life.mjs';
import { fallIll } from './health.mjs';

export const CAPACITY = 20;
export const RULE_VERSION = 3;
export const DEFAULTS = { years: 1, seconds: 30, maxAge: 100, pace: 'auto' };
const EXTRA_SECONDS = 12;
export const PASS = { id: 'pass', title: '이번에는 기다리기', effect: {} };
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
  if (pace !== 'auto' && pace !== 'manual') throw new GameError('진행 방식을 골라 주세요.', 400);
  return {
    years: 1,
    seconds: seconds === 0 ? 0 : number(seconds, 10, 180, '선택 시간'),
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

function newLife(generation, sex, parent) {
  const stats = { ...INITIAL_STATS };
  if (parent) {
    stats.money = 12 + Math.min(30, Math.floor(parent.stats.money * 0.15));
    stats.bond += Math.min(8, Math.floor(parent.stats.bond / 12));
  }
  return { generation, age: parent ? 19 : 0, stats, career: null, path: newPath(sex), history: [], end: null };
}

export function newRoom({ code, seed, name, hostKey, settings, now = Date.now() }) {
  return {
    code, seed, name: nickname(name, 30), hostKey, settings: getSettings(settings), rules: RULE_VERSION, revision: 1, updated: now,
    phase: 'lobby', year: 0, turn: null, paused: false, players: [], endReason: null,
  };
}

export function addPlayer(room, { id, key, name, avatar, sex = null }) {
  if (room.phase !== 'lobby') throw new GameError('이미 시작한 방이에요. 이전에 참가했다면 같은 기기에서 이어 할 수 있어요.');
  if (room.players.length >= CAPACITY) throw new GameError('이 방에 20명이 모두 들어왔어요.');
  const normalized = nickname(name);
  if (room.players.some((player) => player.name.toLowerCase() === normalized.toLowerCase())) {
    throw new GameError('같은 별명이 있어요. 다른 별명으로 참가해 주세요.');
  }
  number(avatar, 0, AVATARS.length - 1, '캐릭터 번호');
  if (sex !== null && (typeof sex !== 'string' || !Object.hasOwn(SEXES, sex))) throw new GameError('캐릭터의 성별을 골라 주세요.', 400);
  const player = { id, key, name: normalized, avatar, mode: 'alive', choice: null, bonuses: [], life: newLife(1, sex), archives: [], visits: [], latest: null };
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

function choicesFor(room, player) {
  const { mode, life } = player;
  if (mode === 'fork') {
    const next = pathOf(life).children.length ? '자녀로 이어 살기' : '다음 세대로 이어 살기';
    const successors = Object.entries(SEXES).map(([sex, label]) => pick(`child-${sex}`, `${next} · ${label}`,
      '다음 세대의 19살부터 시작해요.', 'sprout', {}, { successor: sex }));
    return { key: 'year', title: '다음 이야기를 골라요', detail: '한 삶의 기록이 남았어요. 이제 어디로 갈까요?',
      choices: [
        ...successors,
        pick('spirit', '영혼으로 둘러보기', '살던 곳에 들르고 친구들을 지켜봐요.', 'ghost', {}),
        pick('family-dream', '가족의 꿈에 나오기', '꿈에서 만나 못다 한 인사를 해요.', 'spark', {}),
      ] };
  }
  if (mode === 'spirit') {
    return {
      key: 'year',
      title: '다시 걷는 마을',
      detail: '기억이 남은 곳에 들러요.',
      choices: spiritChoices(life, player.visits),
    };
  }

  const extra = bonusScene(life, player.bonuses);
  const entry = extra ?? { key: 'year', ...(annualScene(life) ?? everydayScene(room, life)) };
  const base = extra ? {} : yearlyEffects(life);
  return {
    ...entry, bonus: Boolean(extra), base,
    choices: entry.choices.map((option) => {
      const need = Object.fromEntries(Object.entries(option.need ?? {}).map(([stat, minimum]) =>
        [stat, Math.max(1, minimum - chanceDiscount(life, option.career, stat))]));
      for (const [stat, delta] of Object.entries(option.effect)) {
        if (delta < 0) need[stat] = Math.max(need[stat] ?? 1, 1 - delta - Math.min(0, base[stat] ?? 0));
      }
      const locked = option.locked || Object.entries(need).filter(([stat, minimum]) => life.stats[stat] < minimum)
        .map(([stat, minimum]) => `${STATS[stat].label} ${minimum}${STATS[stat].unit ?? '점'} 필요`).join(' · ');
      return { ...option, locked };
    }),
  };
}

function everydayScene(room, life) {
  const stage = stageAt(life.age) - 2;
  const deck = STORIES[stage];
  const offset = hash(`${room.seed}:${stage}`);
  const entry = deck[(life.age + offset) % deck.length];
  const retired = pathOf(life).retired !== null;
  const available = OPPORTUNITIES[stage].filter((option) => !option.career || (!retired && option.career !== life.career));
  const offer = available[(life.age + hash(`${room.seed}:offer:${stage}`)) % available.length];
  return { ...entry, choices: offer ? [...entry.choices, { ...offer, opportunity: true }] : entry.choices };
}

function yearlyEffects(life) {
  const { age } = life;
  const path = pathOf(life);
  const serving = path.service?.status === 'serving';
  const wage = CAREERS[life.career]?.wage ?? 0;
  const income = serving ? 1 : path.retired !== null ? 1 : wage;
  const rent = path.home?.kind === 'rent' ? 2 : 0;
  const aging = age >= 82 ? -3 : age >= 70 ? -2 : age >= 55 || (age >= 42 && age % 2 === 0) ? -1 : 0;
  return { health: aging - (path.illness?.serious ? 2 : 0), money: income - rent };
}

function applyEffects(life, effects) {
  const changes = {};
  for (const [stat, delta] of Object.entries(effects)) {
    const before = life.stats[stat];
    life.stats[stat] = Math.max(1, before + delta);
    if (life.stats[stat] !== before) changes[stat] = life.stats[stat] - before;
  }
  return changes;
}

function applyDecision(life, age, option) {
  const career = option.career ?? (option.employment && !life.career ? 'staff' : null);
  if (career) {
    if (!life.career) life.path.firstJobAge = age;
    life.career = career;
  }
  return applyPath(life, age, option);
}

function recordChoice(room, player, option, age, changes, text, type) {
  const result = { year: room.turn.to, age: player.life.age, decisionAge: age, title: option.title, changes, text, type };
  player.life.history.push(result);
  player.latest = result;
}

function addBonus(room, player, entry, option) {
  const { life } = player;
  const changes = applyEffects(life, option.effect);
  const text = applyDecision(life, life.age, option);
  player.bonuses.push(entry.key);
  recordChoice(room, player, option, life.age, changes, text, 'bonus');
}

function oldAgeEnding(age, maxAge, roll) {
  const start = Math.max(80, maxAge - 12);
  return age >= maxAge || (age >= start && roll < 3 + (age - start) * 2);
}

function changeLife(room, player, option, after) {
  const { life } = player;
  const age = life.age;
  const randomKey = `${room.seed}:${player.id}:${life.generation}:${age}`;
  const chance = hash(`${randomKey}:event`);
  const event = !option.action && age >= 7 && chance % 7 === 0 ? LIFE_EVENTS[(chance >>> 8) % LIFE_EVENTS.length] : null;
  const effects = { ...option.effect };
  for (const source of [yearlyEffects(life), event?.effect ?? {}]) {
    for (const [stat, delta] of Object.entries(source)) effects[stat] = (effects[stat] ?? 0) + delta;
  }
  const changes = applyEffects(life, effects);
  const decision = applyDecision(life, age, option);
  life.age += 1;
  const memories = [decision, after, event?.text, advancePath(life)];
  if (oldAgeEnding(life.age, room.settings.maxAge, hash(`${randomKey}:ending`) % 100)) {
    const note = `${life.age}살에 삶의 마지막 장을 덮었어요. ${farewell(life)}`;
    life.end = { year: room.turn.to, reason: 'age', note };
    player.mode = 'fork';
    memories.push(note);
  } else {
    memories.push(fallIll(life, life.path, hash(`${randomKey}:illness`) % 100, hash(`${randomKey}:severity`) % 100));
  }
  recordChoice(room, player, option, age, changes, memories.filter(Boolean).join(' '), 'life');
}

function branch(room, player, option) {
  const { life } = player;
  if (option.successor) {
    player.archives.push(life);
    player.life = newLife(life.generation + 1, option.successor, life);
    player.mode = 'alive';
    player.visits = [];
    player.latest = {
      year: room.turn.to, age: player.life.age, title: option.title,
      text: `${player.life.generation}대의 첫날이에요. 앞 세대가 남긴 돈과 인연을 조금 이어받았어요.`, type: 'child',
    };
    player.life.history.push(player.latest);
  } else if (option.id === 'spirit' || option.id === 'family-dream') {
    player.mode = 'spirit';
    if (option.id === 'family-dream') {
      visit(room, player, option);
      return;
    }
    player.latest = {
      year: room.turn.to, age: life.age, title: option.title,
      text: '저녁이 되자 살던 집에 불이 켜졌어요.', type: 'spirit',
    };
  }
}

function visit(room, player, option) {
  const scenes = SPIRIT_SCENES[option.id];
  const text = option.id === 'family-dream' ? familyDream(player.life)
    : scenes && scenes[hash(`${room.seed}:${player.id}:${room.turn.number}`) % scenes.length];
  if (!text) return;
  const entry = { id: option.id, year: room.turn.to, age: player.life.age, title: option.title, text, type: 'spirit' };
  player.visits.push(entry);
  player.latest = entry;
}

function openTurn(room, now) {
  const { seconds, pace } = room.settings;
  for (const player of room.players) {
    player.choice = null;
    player.bonuses = [];
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
  for (const player of room.players) {
    player.latest = null;
    let entry = choicesFor(room, player);
    while (entry.bonus) {
      addBonus(room, player, entry, entry.choices.find((item) => item.id === entry.fallback));
      entry = choicesFor(room, player);
    }
    const option = entry.choices.find((item) => item.id === player.choice && !item.locked);
    if (player.mode === 'alive') changeLife(room, player, option ?? IDLE, entry.after);
    else if (option && player.mode === 'fork') branch(room, player, option);
    else if (option) visit(room, player, option);
  }
  room.year = room.turn.to;
  openTurn(room, now);
}

export function updateRoomRules(room, now) {
  if (room.rules === RULE_VERSION) return false;
  room.rules = RULE_VERSION;
  room.settings.years = 1;
  for (const player of room.players) {
    for (const life of [...player.archives, player.life]) updateLifePath(life);
    player.bonuses = [];
  }
  if (room.phase === 'play' || room.phase === 'review') openTurn(room, now);
  return true;
}

export function selectChoice(room, playerId, { round, scene, choice }, now) {
  if (room.phase !== 'play' || room.turn.number !== round) throw new GameError('이미 다음 선택이 열렸어요.');
  if (room.paused) throw new GameError('선생님이 게임을 잠시 멈췄어요.');
  const player = room.players.find((item) => item.id === playerId);
  if (!player) throw new GameError('다시 방에 참가해 주세요.', 403);

  const entry = choicesFor(room, player);
  if (scene !== entry.key && (scene !== undefined || entry.bonus || player.bonuses.length)) {
    throw new GameError('새 선택이 열렸어요. 화면을 다시 확인해 주세요.');
  }
  const option = choice === PASS.id && player.mode !== 'alive'
    ? PASS : entry.choices.find((item) => item.id === choice);
  if (!option || option.locked) throw new GameError('지금은 이 선택을 할 수 없어요.');
  if (entry.bonus) {
    addBonus(room, player, entry, option);
    return true;
  }
  if (player.choice === choice) return false;
  player.choice = choice;
  if (room.turn.auto && room.players.every((item) => item.choice)) closeTurn(room, now);
  return true;
}

export function tick(room, now) {
  if (room.phase !== 'play' || room.paused || !room.turn.deadline || room.turn.deadline > now) return false;
  closeTurn(room, now);
  return true;
}

export function teacherAction(room, action, body, now) {
  if (action === 'settings' && room.phase !== 'ended') {
    const settings = getSettings(body.settings, room.settings);
    if (room.phase !== 'lobby') settings.maxAge = room.settings.maxAge;
    room.settings = settings;
  } else if (action === 'kick' && room.phase === 'lobby') {
    room.players = room.players.filter((player) => player.id !== body.playerId);
  } else if (action === 'start' && room.phase === 'lobby') {
    if (!room.players.length) throw new GameError('한 명 이상 참가하면 시작할 수 있어요.');
    openTurn(room, now);
  } else if (action === 'advance' && !room.paused && room.phase === 'play') {
    if (body.round !== room.turn.number || body.phase !== room.phase) throw new GameError('이미 화면의 단계가 바뀌었어요.');
    closeTurn(room, now);
  } else if (action === 'pause' && !room.paused && room.phase === 'play') {
    room.turn.remaining = room.turn.deadline ? Math.max(0, room.turn.deadline - now) : null;
    room.turn.deadline = null;
    room.paused = true;
  } else if (action === 'resume' && room.paused) {
    room.turn.deadline = room.turn.remaining === null ? null : now + room.turn.remaining;
    room.turn.remaining = null;
    room.paused = false;
  } else if (action === 'finish' && room.phase === 'play') {
    room.phase = 'ended';
    room.paused = false;
    room.turn.deadline = null;
    room.turn.remaining = null;
    room.endReason = '교사가 우리 반의 인생 기록을 마감했어요.';
  } else {
    throw new GameError('지금은 할 수 없는 작업이에요.');
  }
  return true;
}

function summary(player) {
  const { id, name, avatar, mode, life, choice, latest } = player;
  return {
    id, name, avatar, mode, age: life.age, generation: life.generation, career: life.career,
    submitted: Boolean(choice), latest: latest?.title ?? null,
  };
}

function lifeView(life, history = life.history) {
  const { age, generation, career, stats, end } = life;
  return { age, generation, career, stats, end, history, path: pathOf(life) };
}

function rankings(players) {
  return Object.fromEntries(RANKS.map((stat) => {
    const rows = players.map((player) => {
      let best = { value: -1, generation: 1 };
      for (const life of [...player.archives, player.life]) {
        const value = stat === 'age' ? life.age : life.stats[stat];
        if (value >= best.value) best = { value, generation: life.generation };
      }
      return { id: player.id, name: player.name, avatar: player.avatar, ...best };
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
  return {
    code: room.code, name: room.name, revision: room.revision, phase: room.phase, year: room.year, settings: room.settings,
    turn: room.turn, paused: room.paused, endReason: room.endReason, serverNow: now,
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
