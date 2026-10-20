import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRank,
  calculateStreakMultiplier,
  calculateQuestionScore,
  calculateStageStars,
  getFiftyFiftyHiddenIndices,
  getTowerGuaranteedPrize,
  simulateRadarPercentages,
  isWorldUnlocked,
  isLevelUnlocked,
  calculateLevelRewards,
  deductHeartOnMistake,
} from './rules.ts';


test('calculateRank returns appropriate levels and titles based on XP', () => {
  const rank1 = calculateRank(100);
  assert.equal(rank1.level, 1);
  assert.equal(rank1.title, 'مستكشف المعرفة');

  const rank3 = calculateRank(1500);
  assert.equal(rank3.level, 3);
  assert.equal(rank3.title, 'رحّالة العصور');

  const maxRank = calculateRank(999999);
  assert.equal(maxRank.level, 10);
  assert.equal(maxRank.title, 'إمبراطور المعرفة الخالد');
});

test('calculateStreakMultiplier scales with consecutive correct answers', () => {
  assert.equal(calculateStreakMultiplier(0), 1.0);
  assert.equal(calculateStreakMultiplier(2), 1.0);
  assert.equal(calculateStreakMultiplier(3), 1.5);
  assert.equal(calculateStreakMultiplier(5), 2.0);
  assert.equal(calculateStreakMultiplier(9), 3.0);
});

test('calculateQuestionScore includes difficulty bonus and speed bonus', () => {
  const result = calculateQuestionScore(100, 'easy', 10, 20, 0);
  // base: 100 * 1.0 = 100
  // speed: 100 * 0.5 * (10/20) = 25
  // total: 125 * 1.0 = 125
  assert.equal(result.finalScore, 125);
  assert.equal(result.speedBonus, 25);
  assert.equal(result.streakMultiplier, 1.0);

  const streakResult = calculateQuestionScore(100, 'expert', 20, 20, 5);
  // base: 100 * 2.0 = 200
  // speed: 100 * 0.5 * (20/20) = 50
  // streakMultiplier: 2.0
  // final: (200 + 50) * 2 = 500
  assert.equal(streakResult.finalScore, 500);
  assert.equal(streakResult.speedBonus, 50);
  assert.equal(streakResult.streakMultiplier, 2.0);
});

test('calculateStageStars assigns 3, 2, 1 or 0 stars accurately', () => {
  assert.equal(calculateStageStars(1000, 1000, 95), 3);
  assert.equal(calculateStageStars(800, 1000, 75), 2);
  assert.equal(calculateStageStars(450, 1000, 50), 1);
  assert.equal(calculateStageStars(100, 1000, 30), 0);
});

test('getFiftyFiftyHiddenIndices eliminates 2 wrong answers and never the correct one', () => {
  const correctIndex = 2;
  const hidden = getFiftyFiftyHiddenIndices(correctIndex, 4);
  assert.equal(hidden.length, 2);
  assert.ok(!hidden.includes(correctIndex), 'Correct answer must never be hidden');
  assert.ok(hidden[0] !== hidden[1], 'Hidden indices must be distinct');
});

test('simulateRadarPercentages sums up to 100', () => {
  const percentages = simulateRadarPercentages(1, 'medium');
  assert.equal(percentages.length, 4);
  const sum = percentages.reduce((a, b) => a + b, 0);
  assert.equal(sum, 100);
  assert.ok(percentages[1] > 0, 'Target percentage must be positive');
});

test('getTowerGuaranteedPrize enforces safety net milestones', () => {
  assert.equal(getTowerGuaranteedPrize(2), 0);
  assert.equal(getTowerGuaranteedPrize(5), 25000);
  assert.equal(getTowerGuaranteedPrize(8), 25000);
  assert.equal(getTowerGuaranteedPrize(10), 250000);
  assert.equal(getTowerGuaranteedPrize(14), 250000);
  assert.equal(getTowerGuaranteedPrize(15), 1000000);
});

test('isWorldUnlocked enforces that all levels of previous world must be completed', () => {
  const dummyWorlds = [
    { id: 'w1', levels: [{ id: 'w1_l1' }, { id: 'w1_l2' }] },
    { id: 'w2', levels: [{ id: 'w2_l1' }] },
  ];

  // World 0 is always unlocked
  assert.equal(isWorldUnlocked(0, {}, dummyWorlds), true);

  // World 1 is locked if only 1 level of World 0 is completed
  assert.equal(isWorldUnlocked(1, { w1_l1: { stars: 3, score: 300 } }, dummyWorlds), false);

  // World 1 unlocks when both levels of World 0 are completed
  assert.equal(
    isWorldUnlocked(
      1,
      {
        w1_l1: { stars: 3, score: 300 },
        w1_l2: { stars: 2, score: 250 },
      },
      dummyWorlds
    ),
    true
  );
});

test('isLevelUnlocked unlocks next level only when previous level is done', () => {
  const dummyWorlds = [
    { id: 'w1', levels: [{ id: 'w1_l1' }, { id: 'w1_l2' }] },
  ];

  // First level is unlocked
  assert.equal(isLevelUnlocked(0, 0, {}, dummyWorlds), true);

  // Second level is locked initially
  assert.equal(isLevelUnlocked(0, 1, {}, dummyWorlds), false);

  // Second level unlocks when first level is completed
  assert.equal(isLevelUnlocked(0, 1, { w1_l1: { stars: 3, score: 300 } }, dummyWorlds), true);
});

test('calculateLevelRewards awards bonus coins for 3 stars and zero mistakes', () => {
  const perfectReward = calculateLevelRewards(3, 0);
  assert.equal(perfectReward.coins, 45); // 30 base + 15 perfect
  assert.equal(perfectReward.isPerfect, true);

  const normalReward = calculateLevelRewards(2, 1);
  assert.equal(normalReward.coins, 20);
  assert.equal(normalReward.isPerfect, false);
});

test('deductHeartOnMistake never drops below zero', () => {
  assert.equal(deductHeartOnMistake(5), 4);
  assert.equal(deductHeartOnMistake(1), 0);
  assert.equal(deductHeartOnMistake(0), 0);
});

