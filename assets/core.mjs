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

export function customCardKind(value) {
  return ["and", "draw", "mill"].includes(value?.kind) ? value.kind : "or";
}

export function cardTokenMembers(value) {
  const codes = new Set();
  const path = new Set();

  function visit(token) {
    if (typeof token === "string" && /^\d+$/.test(token)) {
      codes.add(token);
      return;
    }
    if (!isCustomCardToken(token) || path.has(token.id)) return;
    path.add(token.id);
    if (["draw", "mill"].includes(customCardKind(token)) && typeof token.target === "string") {
      visit(token.target);
    }
    for (const member of token.members) visit(member);
    path.delete(token.id);
  }

  visit(value);
  return [...codes];
}

function compileCardToken(value, path = new Set()) {
  if (typeof value === "string" && /^\d+$/.test(value)) return { kind: "card", code: value };
  if (!isCustomCardToken(value) || path.has(value.id)) return null;
  const nextPath = new Set(path).add(value.id);
  const kind = customCardKind(value);
  const isEffect = ["draw", "mill"].includes(kind);
  const members = value.members.map((member) => compileCardToken(member, nextPath)).filter(Boolean);
  const target =
    isEffect && typeof value.target === "string" && /^\d+$/.test(value.target)
      ? { kind: "card", code: value.target }
      : null;
  if ((!isEffect && members.length === 0) || (isEffect && !target)) return null;
  return {
    kind,
    id: value.id,
    name: String(value.name || "自訂卡片"),
    members,
    target,
    triggerZone: value.triggerZone === "grave" ? "grave" : "hand",
    amount: Math.max(1, Number.isInteger(Number(value.amount)) ? Number(value.amount) : 1),
    scope: ["first", "second", "both"].includes(value.scope) ? value.scope : "both",
  };
}

function compileTokenList(tokens) {
  return Array.isArray(tokens) ? tokens.map((token) => compileCardToken(token)).filter(Boolean) : [];
}

export function compileCombos(combos) {
  return combos.map((combo) => {
    if (combo?.kind === "grave") {
      return {
        kind: "grave",
        graveRequired: compileTokenList(combo.graveRequired),
      };
    }
    return {
      kind: "hand",
      required: compileTokenList(combo?.required),
      forbidden: compileTokenList(combo?.forbidden),
    };
  });
}

function matchTokenList(cards, tokens, tokenIndex, used) {
  if (tokenIndex >= tokens.length) return true;
  return matchToken(cards, tokens[tokenIndex], used, () =>
    matchTokenList(cards, tokens, tokenIndex + 1, used),
  );
}

function matchToken(cards, token, used, onMatched) {
  if (token.kind === "card") {
    for (let index = 0; index < cards.length; index += 1) {
      if (used[index] || cards[index] !== token.code) continue;
      used[index] = 1;
      if (onMatched()) return true;
      used[index] = 0;
    }
    return false;
  }

  if (token.kind === "and") {
    return matchNestedAnd(cards, token.members, 0, used, onMatched);
  }

  if (["draw", "mill"].includes(token.kind)) {
    if (!token.target) return false;
    return matchNestedAnd(cards, [token.target, ...token.members], 0, used, onMatched);
  }

  for (const member of token.members) {
    if (matchToken(cards, member, used, onMatched)) return true;
  }
  return false;
}

function matchNestedAnd(cards, members, memberIndex, used, onMatched) {
  if (memberIndex >= members.length) return onMatched();
  return matchToken(cards, members[memberIndex], used, () =>
    matchNestedAnd(cards, members, memberIndex + 1, used, onMatched),
  );
}

function tokensMatchDistinctCards(cards, tokens) {
  if (tokens.length === 0) return false;
  return matchTokenList(cards, tokens, 0, new Uint8Array(cards.length));
}

function tokenMatches(cards, token) {
  return matchToken(cards, token, new Uint8Array(cards.length), () => true);
}

export function isSuccessfulHand(hand, combos, alreadyCompiled = false, grave = []) {
  return countSuccessfulCombos(hand, combos, alreadyCompiled, grave) > 0;
}

export function countSuccessfulCombos(hand, combos, alreadyCompiled = false, grave = []) {
  const compiled = alreadyCompiled ? combos : compileCombos(combos);
  let matched = 0;

  for (const combo of compiled) {
    if (combo.kind === "grave") {
      if (tokensMatchDistinctCards(grave, combo.graveRequired)) matched += 1;
      continue;
    }

    let successful = tokensMatchDistinctCards(hand, combo.required);
    if (successful && combo.forbidden.some((token) => tokenMatches(hand, token))) successful = false;
    if (successful) matched += 1;
  }
  return matched;
}

export function compileSpecialEffects(customCards = []) {
  return customCards.flatMap((card) => {
    if (!isCustomCardToken(card) || !["draw", "mill"].includes(customCardKind(card))) return [];
    const compiled = compileCardToken(card);
    return compiled?.target ? [compiled] : [];
  });
}

function scopeAllows(scope, side) {
  return scope === "both" || scope === side;
}

function codeOf(card) {
  return typeof card === "string" ? card : card.code;
}

export function resolveSpecialEffects(deckOrder, baseHandSize, compiledEffects = [], side = "first") {
  const hand = deckOrder.slice(0, baseHandSize);
  const grave = [];
  const activated = new Set();
  let cursor = hand.length;
  let foundNewEffect = true;

  while (foundNewEffect) {
    foundNewEffect = false;
    for (let index = 0; index < compiledEffects.length; index += 1) {
      const effect = compiledEffects[index];
      const key = effect.id || `effect-${index}`;
      if (activated.has(key) || !scopeAllows(effect.scope, side)) continue;
      const triggerCards = effect.triggerZone === "grave" ? grave : hand;
      if (!tokenMatches(triggerCards.map(codeOf), effect)) continue;
      activated.add(key);
      foundNewEffect = true;
      const count = Math.min(effect.amount, deckOrder.length - cursor);
      const cards = deckOrder.slice(cursor, cursor + count);
      cursor += count;
      if (effect.kind === "draw") hand.push(...cards);
      else grave.push(...cards);
    }
  }

  return { hand, grave, consumed: cursor, activated: activated.size };
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
  return deck.map((code) => ({
    code,
    goingFirst: takeCardSelection(goingFirstSelection, code),
    goingSecond: takeCardSelection(goingSecondSelection, code),
    brick: takeCardSelection(brickSelection, code),
  }));
}

function lazyShuffledDeck(deck, minimumCount, random) {
  const pool = deck.slice();
  for (let index = 0; index < minimumCount && index < pool.length; index += 1) {
    const choice = index + Math.floor(random() * (pool.length - index));
    [pool[index], pool[choice]] = [pool[choice], pool[index]];
  }
  return {
    pool,
    ensure(count) {
      const target = Math.min(count, pool.length);
      for (let index = minimumCount; index < target; index += 1) {
        const choice = index + Math.floor(random() * (pool.length - index));
        [pool[index], pool[choice]] = [pool[choice], pool[index]];
      }
      minimumCount = Math.max(minimumCount, target);
      return pool;
    },
  };
}

export function runMonteCarlo({
  deck,
  combos,
  customCards = [],
  activeEffects,
  handSize,
  trials,
  goingFirstCards = [],
  goingSecondCards = [],
  brickCards = [],
  random = Math.random,
  onProgress,
}) {
  const compiled = compileCombos(combos);
  const effects = compileSpecialEffects(activeEffects ?? customCards);
  const taggedDeck = tagDeckRoles(deck, goingFirstCards, goingSecondCards, brickCards);
  const progressEvery = Math.max(1000, Math.floor(trials / 100));
  let success = 0;
  let goingFirstDrawnTotal = 0;
  let goingSecondDrawnTotal = 0;
  let goingFirstHands = 0;
  let goingSecondHands = 0;
  let brickHands = 0;

  for (let trial = 0; trial < trials; trial += 1) {
    const shuffled = lazyShuffledDeck(taggedDeck, handSize, random);
    // Effects can consume more cards than the opening hand. Simulations without
    // effects keep the original partial-shuffle RNG behavior.
    if (effects.length > 0) shuffled.ensure(taggedDeck.length);
    const zones = resolveSpecialEffects(shuffled.pool, handSize, effects, "first");
    const hand = zones.hand.map((card) => card.code);
    const grave = zones.grave.map((card) => card.code);
    const goingFirstDrawn = zones.hand.reduce((total, card) => total + Number(card.goingFirst), 0);
    const goingSecondDrawn = zones.hand.reduce((total, card) => total + Number(card.goingSecond), 0);
    const brickDrawn = zones.hand.reduce((total, card) => total + Number(card.brick), 0);
    if (isSuccessfulHand(hand, compiled, true, grave)) success += 1;
    goingFirstDrawnTotal += goingFirstDrawn;
    goingSecondDrawnTotal += goingSecondDrawn;
    if (goingFirstDrawn > 0) goingFirstHands += 1;
    if (goingSecondDrawn > 0) goingSecondHands += 1;
    if (brickDrawn > 0) brickHands += 1;
    if (onProgress && (trial + 1) % progressEvery === 0) onProgress((trial + 1) / trials);
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
