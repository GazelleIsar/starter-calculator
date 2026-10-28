import {
  compileCardSelection,
  compileCombos,
  compileSpecialEffects,
  countSuccessfulCombos,
  customCardKind,
  resolveSpecialEffects,
  takeCardSelection,
} from "./core.mjs";

function tagDeck(deck, goingFirstCards, goingSecondCards, floatingCards = []) {
  const goingFirst = compileCardSelection(goingFirstCards);
  const goingSecond = compileCardSelection(goingSecondCards);
  const floating = compileCardSelection(floatingCards);
  let flexIndex = 0;
  return deck.map((code) => {
    const isFloating = takeCardSelection(floating, code);
    return {
      code,
      goingFirst: takeCardSelection(goingFirst, code),
      goingSecond: takeCardSelection(goingSecond, code),
      flexIndex: isFloating ? flexIndex++ : -1,
    };
  });
}

function shuffleDeck(taggedDeck, random) {
  const pool = taggedDeck.slice();
  for (let index = 0; index < pool.length; index += 1) {
    const choice = index + Math.floor(random() * (pool.length - index));
    [pool[index], pool[choice]] = [pool[choice], pool[index]];
  }
  return pool;
}

function emptyMatrix() {
  return { tt: 0, tf: 0, ft: 0, ff: 0 };
}

function recordOutcome(matrix, firstWin, secondWin) {
  if (firstWin && secondWin) matrix.tt += 1;
  else if (firstWin) matrix.tf += 1;
  else if (secondWin) matrix.ft += 1;
  else matrix.ff += 1;
}

function resultFromCounts(firstWins, secondWins, trials, matrix) {
  return {
    trials,
    firstWins,
    secondWins,
    firstRate: firstWins / trials,
    secondRate: secondWins / trials,
    combinedRate: (firstWins + secondWins) / (trials * 2),
    matrix,
  };
}

export function runGameSimulation({
  deck,
  combos,
  customCards = [],
  activeEffects,
  handSize,
  trials,
  goingFirstCards = [],
  goingSecondCards = [],
  firstStarterMin = 1,
  firstRoleMin = 1,
  secondStarterMin = 1,
  secondRoleMin = 1,
  random = Math.random,
  onProgress,
}) {
  const compiled = compileCombos(combos);
  const effects = compileSpecialEffects(activeEffects ?? customCards);
  const taggedDeck = tagDeck(deck, goingFirstCards, goingSecondCards);
  const progressEvery = Math.max(1000, Math.floor(trials / 100));
  let firstWins = 0;
  let secondWins = 0;
  const matrix = emptyMatrix();

  for (let trial = 0; trial < trials; trial += 1) {
    const shuffled = shuffleDeck(taggedDeck, random);
    const firstZones = resolveSpecialEffects(shuffled, handSize, effects, "first");
    const secondZones = resolveSpecialEffects(shuffled, handSize + 1, effects, "second");
    const firstHand = firstZones.hand.map((card) => card.code);
    const secondHand = secondZones.hand.map((card) => card.code);
    const firstGrave = firstZones.grave.map((card) => card.code);
    const secondGrave = secondZones.grave.map((card) => card.code);
    const firstComboCount = countSuccessfulCombos(firstHand, compiled, true, firstGrave);
    const secondComboCount = countSuccessfulCombos(secondHand, compiled, true, secondGrave);
    const firstRoleCount = firstZones.hand.reduce((total, card) => total + Number(card.goingFirst), 0);
    const secondRoleCount = secondZones.hand.reduce((total, card) => total + Number(card.goingSecond), 0);
    const firstWin = firstComboCount >= firstStarterMin && firstRoleCount >= firstRoleMin;
    const secondWin = secondComboCount >= secondStarterMin && secondRoleCount >= secondRoleMin;
    if (firstWin) firstWins += 1;
    if (secondWin) secondWins += 1;
    recordOutcome(matrix, firstWin, secondWin);
    if (onProgress && (trial + 1) % progressEvery === 0) onProgress((trial + 1) / trials);
  }

  return resultFromCounts(firstWins, secondWins, trials, matrix);
}

function tokenWithoutCodes(token, excludedCodes) {
  if (typeof token === "string") return excludedCodes.has(token) ? null : token;
  const members = token.members.map((member) => tokenWithoutCodes(member, excludedCodes));
  if (customCardKind(token) === "and" && members.some((member) => member === null)) return null;
  const remainingMembers = members.filter(Boolean);
  if (remainingMembers.length === 0) return null;
  if (remainingMembers.length === token.members.length) return token;
  return { ...token, members: remainingMembers };
}

function selectionWithoutCodes(cards, excludedCodes) {
  return cards.map((token) => tokenWithoutCodes(token, excludedCodes)).filter(Boolean);
}

function maskFloatingAssignments(combos, goingFirstCards, goingSecondCards, fullyFloatingCodes) {
  return {
    combos: combos
      .map((combo) => {
        if (combo.kind === "grave") {
          const graveRequired = combo.graveRequired.map((token) =>
            tokenWithoutCodes(token, fullyFloatingCodes),
          );
          if (graveRequired.some((token) => token === null)) return null;
          return { ...combo, graveRequired };
        }
        const required = combo.required.map((token) => tokenWithoutCodes(token, fullyFloatingCodes));
        // A missing required token invalidates the whole AND combination. Forbidden
        // tokens can be removed because a fully floating code no longer exists in the core deck.
        if (required.some((token) => token === null)) return null;
        return {
          required,
          forbidden: combo.forbidden
            .map((token) => tokenWithoutCodes(token, fullyFloatingCodes))
            .filter(Boolean),
        };
      })
      .filter(Boolean),
    goingFirstCards: selectionWithoutCodes(goingFirstCards, fullyFloatingCodes),
    goingSecondCards: selectionWithoutCodes(goingSecondCards, fullyFloatingCodes),
  };
}

function cardCounts(cards) {
  const counts = new Map();
  for (const code of cards) counts.set(code, (counts.get(code) || 0) + 1);
  return counts;
}

const ALLOCATION_METHODS = {
  starter: 1,
  first: 2,
  second: 4,
  starterFirst: 3,
  starterSecond: 5,
  firstSecond: 6,
};

function allocationVectors(total, partCount, prefix = []) {
  if (partCount === 1) return [[...prefix, total]];
  const vectors = [];
  for (let count = 0; count <= total; count += 1) {
    vectors.push(...allocationVectors(total - count, partCount - 1, [...prefix, count]));
  }
  return vectors;
}

function optimizeFixedFloatingCount({
  taggedBaseDeck,
  compiled,
  compiledEffects,
  flexLabels,
  selectedMethods,
  methodMasks,
  handSize,
  trials,
  firstStarterMin,
  firstRoleMin,
  secondStarterMin,
  secondRoleMin,
  random,
  onProgress,
}) {
  const flexCount = flexLabels.length;
  const taggedDeck = taggedBaseDeck.concat(
    flexLabels.map((_, flexIndex) => ({
      code: `@floating-slot-${flexIndex}`,
      goingFirst: false,
      goingSecond: false,
      flexIndex,
    })),
  );
  const stride = flexCount + 1;
  const firstPrefix = new Uint8Array(trials * stride);
  const secondPrefix = new Uint8Array(trials * stride);
  const firstBaseCombos = new Uint16Array(trials);
  const secondBaseCombos = new Uint16Array(trials);
  const firstBaseRoles = new Uint8Array(trials);
  const secondBaseRoles = new Uint8Array(trials);
  const firstFlags = new Uint8Array(flexCount);
  const secondFlags = new Uint8Array(flexCount);
  const sampleProgressEvery = Math.max(100, Math.floor(trials / 100));

  for (let trial = 0; trial < trials; trial += 1) {
    firstFlags.fill(0);
    secondFlags.fill(0);
    const shuffled = shuffleDeck(taggedDeck, random);
    const firstZones = resolveSpecialEffects(shuffled, handSize, compiledEffects, "first");
    const secondZones = resolveSpecialEffects(shuffled, handSize + 1, compiledEffects, "second");
    const firstHand = firstZones.hand.map((card) => card.code);
    const secondHand = secondZones.hand.map((card) => card.code);
    firstBaseCombos[trial] = countSuccessfulCombos(
      firstHand,
      compiled,
      true,
      firstZones.grave.map((card) => card.code),
    );
    secondBaseCombos[trial] = countSuccessfulCombos(
      secondHand,
      compiled,
      true,
      secondZones.grave.map((card) => card.code),
    );
    firstBaseRoles[trial] = firstZones.hand.reduce(
      (total, card) => total + Number(card.goingFirst),
      0,
    );
    secondBaseRoles[trial] = secondZones.hand.reduce(
      (total, card) => total + Number(card.goingSecond),
      0,
    );
    for (const card of firstZones.hand) {
      const flexIndex = card.flexIndex;
      if (flexIndex < 0) continue;
      firstFlags[flexIndex] = 1;
    }
    for (const card of secondZones.hand) {
      const flexIndex = card.flexIndex;
      if (flexIndex < 0) continue;
      secondFlags[flexIndex] = 1;
    }
    const offset = trial * stride;
    for (let slot = 0; slot < flexCount; slot += 1) {
      firstPrefix[offset + slot + 1] = firstPrefix[offset + slot] + firstFlags[slot];
      secondPrefix[offset + slot + 1] = secondPrefix[offset + slot] + secondFlags[slot];
    }
    if (onProgress && ((trial + 1) % sampleProgressEvery === 0 || trial + 1 === trials)) {
      onProgress(((trial + 1) / trials) * 0.35);
    }
  }

  const candidates = allocationVectors(flexCount, selectedMethods.length);
  let best = null;
  for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex += 1) {
    const counts = candidates[candidateIndex];
    const boundary0 = counts[0];
    const boundary1 = selectedMethods.length > 1 ? boundary0 + counts[1] : flexCount;
    const mask0 = methodMasks[0];
    const mask1 = methodMasks[1] || 0;
    const mask2 = methodMasks[2] || 0;
    let firstWins = 0;
    let secondWins = 0;
    const matrix = emptyMatrix();
    for (let trial = 0; trial < trials; trial += 1) {
      const offset = trial * stride;
      const firstTotalFlex = firstPrefix[offset + flexCount];
      const secondTotalFlex = secondPrefix[offset + flexCount];
      const firstDraw0 = firstPrefix[offset + boundary0];
      const firstDraw1 = firstPrefix[offset + boundary1] - firstDraw0;
      const firstDraw2 = firstTotalFlex - firstDraw0 - firstDraw1;
      const secondDraw0 = secondPrefix[offset + boundary0];
      const secondDraw1 = secondPrefix[offset + boundary1] - secondDraw0;
      const secondDraw2 = secondTotalFlex - secondDraw0 - secondDraw1;
      const firstStarterFlex =
        (mask0 & 1 ? firstDraw0 : 0) + (mask1 & 1 ? firstDraw1 : 0) + (mask2 & 1 ? firstDraw2 : 0);
      const secondStarterFlex =
        (mask0 & 1 ? secondDraw0 : 0) + (mask1 & 1 ? secondDraw1 : 0) + (mask2 & 1 ? secondDraw2 : 0);
      const firstRoleFlex =
        (mask0 & 2 ? firstDraw0 : 0) + (mask1 & 2 ? firstDraw1 : 0) + (mask2 & 2 ? firstDraw2 : 0);
      const secondRoleFlex =
        (mask0 & 4 ? secondDraw0 : 0) + (mask1 & 4 ? secondDraw1 : 0) + (mask2 & 4 ? secondDraw2 : 0);
      const firstWin =
        firstBaseCombos[trial] + firstStarterFlex >= firstStarterMin &&
        firstBaseRoles[trial] + firstRoleFlex >= firstRoleMin;
      const secondWin =
        secondBaseCombos[trial] + secondStarterFlex >= secondStarterMin &&
        secondBaseRoles[trial] + secondRoleFlex >= secondRoleMin;
      if (firstWin) firstWins += 1;
      if (secondWin) secondWins += 1;
      recordOutcome(matrix, firstWin, secondWin);
    }
    const score = firstWins + secondWins;
    const balance = Math.min(firstWins, secondWins);
    if (!best || score > best.score || (score === best.score && balance > best.balance)) {
      best = { counts: counts.slice(), firstWins, secondWins, matrix, score, balance };
    }
    if (onProgress && ((candidateIndex + 1) % 5 === 0 || candidateIndex + 1 === candidates.length)) {
      onProgress(0.35 + ((candidateIndex + 1) / candidates.length) * 0.65);
    }
  }

  return {
    ...best,
    allocation: selectedMethods.map((method, index) => {
      const start = best.counts.slice(0, index).reduce((sum, count) => sum + count, 0);
      return { method, cards: flexLabels.slice(start, start + best.counts[index]) };
    }),
  };
}

export function optimizeFloatingAllocation({
  deck,
  combos,
  customCards = [],
  activeEffects,
  handSize,
  trials,
  goingFirstCards = [],
  goingSecondCards = [],
  floatingCards = [],
  floatingMin,
  floatingMax,
  allocationMethods = ["starter", "first", "second"],
  firstStarterMin = 1,
  firstRoleMin = 1,
  secondStarterMin = 1,
  secondRoleMin = 1,
  random = Math.random,
  onProgress,
  maxTrials = 100000,
}) {
  const originalTaggedDeck = tagDeck(deck, [], [], floatingCards);
  const originalFlexCards = originalTaggedDeck.filter((card) => card.flexIndex >= 0).map((card) => card.code);
  const originalFlexCount = originalFlexCards.length;
  if (originalFlexCount === 0) throw new Error("從目標反推前，請至少設定一張浮動卡位。");
  const minCount = floatingMin === undefined ? originalFlexCount : floatingMin;
  const maxCount = floatingMax === undefined ? originalFlexCount : floatingMax;
  if (!Number.isInteger(minCount) || !Number.isInteger(maxCount) || minCount < 0 || maxCount < minCount) {
    throw new Error("浮動卡位數範圍無效。");
  }
  if (maxCount - minCount > 20) throw new Error("浮動卡位數範圍一次最多比較 21 種張數。");

  const selectedMethods = [...new Set(allocationMethods)];
  if (selectedMethods.length < 1 || selectedMethods.length > 3) {
    throw new Error("請選擇 1～3 項浮動卡配置方式。");
  }
  if (selectedMethods.some((method) => !(method in ALLOCATION_METHODS))) {
    throw new Error("浮動卡配置方式無效。");
  }
  const methodMasks = selectedMethods.map((method) => ALLOCATION_METHODS[method]);
  const baseDeck = originalTaggedDeck.filter((card) => card.flexIndex < 0).map((card) => card.code);
  if (baseDeck.length + minCount < handSize + 1) {
    throw new Error(`浮動卡位下限會使牌組少於後手起手所需的 ${handSize + 1} 張。`);
  }

  const deckCounts = cardCounts(deck);
  const floatingCounts = cardCounts(originalFlexCards);
  const fullyFloatingCodes = new Set(
    [...floatingCounts].filter(([code, count]) => count === deckCounts.get(code)).map(([code]) => code),
  );
  const masked = maskFloatingAssignments(combos, goingFirstCards, goingSecondCards, fullyFloatingCodes);
  const compiled = compileCombos(masked.combos);
  const compiledEffects = compileSpecialEffects(activeEffects ?? customCards);
  const taggedBaseDeck = tagDeck(baseDeck, masked.goingFirstCards, masked.goingSecondCards);
  const rangeCount = maxCount - minCount + 1;
  const perSizeTrialCap = Math.max(1000, Math.floor(maxTrials / rangeCount));
  const usedTrials = Math.min(trials, perSizeTrialCap);
  const maximumDeckSize = baseDeck.length + maxCount;
  const sharedRandomValues = new Float32Array(usedTrials * maximumDeckSize);
  for (let index = 0; index < sharedRandomValues.length; index += 1) {
    sharedRandomValues[index] = random();
  }
  const comparisons = [];
  let overallBest = null;

  for (let rangeIndex = 0; rangeIndex < rangeCount; rangeIndex += 1) {
    const flexCount = minCount + rangeIndex;
    const addedCount = Math.max(0, flexCount - originalFlexCount);
    const flexLabels = originalFlexCards
      .slice(0, Math.min(flexCount, originalFlexCount))
      .concat(Array.from({ length: addedCount }, (_, index) => `新增浮動位 ${index + 1}`));
    let randomIndex = 0;
    const fixed = optimizeFixedFloatingCount({
      taggedBaseDeck,
      compiled,
      compiledEffects,
      flexLabels,
      selectedMethods,
      methodMasks,
      handSize,
      trials: usedTrials,
      firstStarterMin,
      firstRoleMin,
      secondStarterMin,
      secondRoleMin,
      random: () => sharedRandomValues[randomIndex++],
      onProgress: onProgress
        ? (progress) => onProgress((rangeIndex + progress) / rangeCount)
        : undefined,
    });
    const deckSize = baseDeck.length + flexCount;
    comparisons.push({
      floatingCount: flexCount,
      deckSize,
      firstRate: fixed.firstWins / usedTrials,
      secondRate: fixed.secondWins / usedTrials,
      combinedRate: fixed.score / (usedTrials * 2),
    });
    if (
      !overallBest ||
      fixed.score > overallBest.score ||
      (fixed.score === overallBest.score && fixed.balance > overallBest.balance) ||
      (fixed.score === overallBest.score && fixed.balance === overallBest.balance && deckSize < overallBest.deckSize)
    ) {
      overallBest = { ...fixed, flexCount, deckSize };
    }
  }

  return {
    ...resultFromCounts(overallBest.firstWins, overallBest.secondWins, usedTrials, overallBest.matrix),
    requestedTrials: trials,
    totalEvaluatedTrials: usedTrials * rangeCount,
    capped: usedTrials < trials,
    maskedComboCount: masked.combos.length,
    floatingCount: overallBest.flexCount,
    floatingMin: minCount,
    floatingMax: maxCount,
    baseDeckSize: baseDeck.length,
    deckSize: overallBest.deckSize,
    comparisons,
    allocation: overallBest.allocation,
  };
}
