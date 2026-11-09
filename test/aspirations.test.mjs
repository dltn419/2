import test from 'node:test';
import assert from 'node:assert/strict';
import { DREAM_OPTIONS, newPath, bonusScene, applyPath, chanceDiscount, pathNotes } from '../public/life.mjs';

function life(age, field = null) {
  const path = newPath('female');
  path.school = 'general';
  if (field) path.dreams.push({ age: 10, field });
  return {
    age, career: null, path,
    stats: { money: 60, health: 80, learning: 95, art: 65, bond: 60, joy: 60 },
  };
}

test('장래희망은 넓은 분야 3개와 미정 1개만 보여 준다', () => {
  assert.equal(Object.keys(DREAM_OPTIONS).length, 4);
  const result = bonusScene(life(10), []);
  assert.equal(result.key, 'dream');
  assert.deepEqual(result.choices.map(({ title }) => title), [
    '과학·기술·자연', '사람·사회·경제', '예술·체육·창작', '아직 모르겠어요',
  ]);
  assert.deepEqual(result.choices.map(({ action }) => action.value), [
    'stem', 'society', 'creative', 'explore',
  ]);
});

test('넓은 장래희망을 저장해도 대학 전공은 기존 세부 분야로 연결된다', () => {
  for (const [dream, expectedField] of [
    ['stem', 'science'], ['society', 'people'], ['creative', 'art'], ['explore', 'explore'],
  ]) {
    const person = life(19, dream);
    const education = bonusScene(person, []);
    assert.equal(education.key, 'education');
    const university = education.choices.find(({ id }) => id === 'study-university');
    assert.ok(university);
    assert.equal(university.studyField, expectedField);
  }
});

test('장래희망을 기록하고 새 분야의 취업 우대를 적용한다', () => {
  const person = life(10);
  const choice = bonusScene(person, []).choices[0];
  applyPath(person, 10, choice);
  assert.deepEqual(person.path.dreams, [{ age: 10, field: 'stem' }]);
  assert.match(pathNotes(person).join(' '), /과학·기술·자연/);
  assert.equal(chanceDiscount(person, 'lab', 'learning'), 3);
  assert.equal(chanceDiscount(person, 'teacher', 'learning'), 0);
  person.path.degree = { kind: 'university', field: 'science', age: 24 };
  assert.equal(chanceDiscount(person, 'lab', 'learning'), 9);
});

test('이전 버전의 구체적인 장래희망도 계속 읽고 우대를 유지한다', () => {
  const person = life(25, 'biology');
  assert.match(pathNotes(person).join(' '), /생명과학/);
  assert.equal(chanceDiscount(person, 'bio', 'learning'), 5);
});
