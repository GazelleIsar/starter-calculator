export function parseYdk(source) {
  const lines = String(source).replace(/^\uFEFF/, "").split(/\r?\n/);
  const mainIndex = lines.findIndex((line) => line.trim().toLowerCase() === "#main");
  const extraIndex = lines.findIndex(
    (line, index) => index > mainIndex && line.trim().toLowerCase() === "#extra",
  );

  if (mainIndex < 0 || extraIndex < 0) {
    throw new Error("找不到完整的 #main 與 #extra 區段。");
  }

  const cards = lines
    .slice(mainIndex + 1, extraIndex)
    .map((line) => line.trim())
    .filter((line) => /^\d+$/.test(line));

  if (cards.length === 0) {
    throw new Error("#main 區段中沒有可讀取的卡片密碼。");
  }
  return cards;
}

export function countUnique(cards) {
  return new Set(cards).size;
}

export function simpleDeckHash(cards) {
  let hash = 2166136261;
  for (const character of cards.join(",")) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function isCustomCardToken(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      value.type === "custom" &&
      typeof value.id === "string" &&
      Array.isArray(value.members),
  );
}

export function cardTokenMembers(value) {
  if (typeof value === "string" && /^\d+$/.test(value)) return [value];
  if (!isCustomCardToken(value)) return [];
  return [...new Set(value.members.filter((code) => typeof code === "string" && /^\d+$/.test(code)))];
}

function compileCardToken(value) {
  const members = cardTokenMembers(value);
  return members.length ? { members: new Set(members) } : null;
}

export function compileCombos(combos) {
  return combos.map((combo) => ({
    required: combo.required.map(compileCardToken).filter(Boolean),
    forbidden: combo.forbidden.map(compileCardToken).filter(Boolean),
  }));
}

export function isSuccessfulHand(hand, combos, alreadyCompiled = false) {
  return countSuccessfulCombos(hand, combos, alreadyCompiled) > 0;
}

export function countSuccessfulCombos(hand, combos, alreadyCompiled = false) {
  const compiled = alreadyCompiled ? combos : compileCombos(combos);

  let matched = 0;
  for (const combo of compiled) {
    let successful = combo.required.length > 0 && requiredTokensMatchDistinctCards(hand, combo.required);
    if (successful && combo.forbidden.some((token) => hand.some((code) => token.members.has(code)))) {
      successful = false;
    }
    if (successful) matched += 1;
  }
  return matched;
}

function requiredTokensMatchDistinctCards(hand, required) {
  if (required.length > hand.length) return false;
  const ordered = required.slice().sort((left, right) => left.members.size - right.members.size);
  const requirementForHandIndex = new Int16Array(hand.length);
  requirementForHandIndex.fill(-1);

  function findMatch(requirementIndex, seen) {
    const requirement = ordered[requirementIndex];
    for (let handIndex = 0; handIndex < hand.length; handIndex += 1) {
      if (seen[handIndex] || !requirement.members.has(hand[handIndex])) continue;
      seen[handIndex] = 1;
      const previous = requirementForHandIndex[handIndex];
      if (previous < 0 || findMatch(previous, seen)) {
        requirementForHandIndex[handIndex] = requirementIndex;
        return true;
      }
    }
    return false;
  }

  for (let requirementIndex = 0; requirementIndex < ordered.length; requirementIndex += 1) {
    if (!findMatch(requirementIndex, new Uint8Array(hand.length))) return false;
  }
  return true;
}

export function compileCardSelection(cards) {
  const exactRemaining = new Map();
  const customMembers = new Set();
  for (const card of cards) {
    if (typeof card === "string" && /^\d+$/.test(card)) {
      exactRemaining.set(card, (exactRemaining.get(card) || 0) + 1);
      continue;
    }
    for (const code of cardTokenMembers(card)) customMembers.add(code);
  }
  return { exactRemaining, customMembers };
}

export function takeCardSelection(selection, code) {
  if (selection.customMembers.has(code)) return true;
  const remaining = selection.exactRemaining.get(code) || 0;
  if (remaining <= 0) return false;
  selection.exactRemaining.set(code, remaining - 1);
  return true;
}

function tagDeckRoles(deck, goingFirstCards, goingSecondCards, brickCards) {
  const goingFirstSelection = compileCardSelection(goingFirstCards);
  const goingSecondSelection = compileCardSelection(goingSecondCards);
  const brickSelection = compileCardSelection(brickCards);
  return deck.map((code) => {
    const goingFirst = takeCardSelection(goingFirstSelection, code);
    const goingSecond = takeCardSelection(goingSecondSelection, code);
    const brick = takeCardSelection(brickSelection, code);
    return { code, goingFirst, goingSecond, brick };
  });
}

export function runMonteCarlo({
  deck,
  combos,
  handSize,
  trials,
  goingFirstCards = [],
  goingSecondCards = [],
  brickCards = [],
  random = Math.random,
  onProgress,
}) {
  const compiled = compileCombos(combos);
  const taggedDeck = tagDeckRoles(deck, goingFirstCards, goingSecondCards, brickCards);
  const progressEvery = Math.max(1000, Math.floor(trials / 100));
  let success = 0;
  let goingFirstDrawnTotal = 0;
  let goingSecondDrawnTotal = 0;
  let goingFirstHands = 0;
  let goingSecondHands = 0;
  let brickHands = 0;

  for (let trial = 0; trial < trials; trial += 1) {
    const pool = taggedDeck.slice();
    const hand = [];
    let goingFirstDrawn = 0;
    let goingSecondDrawn = 0;
    let brickDrawn = 0;
    for (let index = 0; index < handSize; index += 1) {
      const choice = index + Math.floor(random() * (pool.length - index));
      [pool[index], pool[choice]] = [pool[choice], pool[index]];
      const drawnCard = pool[index];
      hand.push(drawnCard.code);
      if (drawnCard.goingFirst) goingFirstDrawn += 1;
      if (drawnCard.goingSecond) goingSecondDrawn += 1;
      if (drawnCard.brick) brickDrawn += 1;
    }
    if (isSuccessfulHand(hand, compiled, true)) success += 1;
    goingFirstDrawnTotal += goingFirstDrawn;
    goingSecondDrawnTotal += goingSecondDrawn;
    if (goingFirstDrawn > 0) goingFirstHands += 1;
    if (goingSecondDrawn > 0) goingSecondHands += 1;
    if (brickDrawn > 0) brickHands += 1;
    if (onProgress && (trial + 1) % progressEvery === 0) {
      onProgress((trial + 1) / trials);
    }
  }

  const rate = success / trials;
  const standardError = Math.sqrt((rate * (1 - rate)) / trials);
  const brickHitRate = brickHands / trials;
  return {
    success,
    failure: trials - success,
    trials,
    rate,
    intervalLow: Math.max(0, rate - 1.96 * standardError),
    intervalHigh: Math.min(1, rate + 1.96 * standardError),
    goingFirstExpected: goingFirstDrawnTotal / trials,
    goingSecondExpected: goingSecondDrawnTotal / trials,
    goingFirstHitRate: goingFirstHands / trials,
    goingSecondHitRate: goingSecondHands / trials,
    brickHitRate,
    brickGamesPerHit: brickHitRate > 0 ? 1 / brickHitRate : null,
  };
}
