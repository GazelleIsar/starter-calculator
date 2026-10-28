import test from "node:test";
import assert from "node:assert/strict";

import {
  countSuccessfulCombos,
  countUnique,
  isSuccessfulHand,
  parseYdk,
  runMonteCarlo,
  simpleDeckHash,
} from "../assets/core.mjs";
import { optimizeFloatingAllocation, runGameSimulation } from "../assets/game-simulation.mjs";

test("parseYdk only returns numeric lines between #main and #extra", () => {
  const ydk = [
    "#created by test",
    "#main",
    "111",
    "111",
    "not-a-card",
    "222",
    "#extra",
    "999",
    "!side",
    "888",
  ].join("\r\n");
  assert.deepEqual(parseYdk(ydk), ["111", "111", "222"]);
});

test("parseYdk rejects files without the required boundaries", () => {
  assert.throws(() => parseYdk("#main\n123"), /#main.*#extra/);
  assert.throws(() => parseYdk("#main\n#extra"), /沒有可讀取/);
});

test("deck helpers retain duplicate semantics", () => {
  assert.equal(countUnique(["1", "1", "2"]), 2);
  assert.equal(simpleDeckHash(["1", "1", "2"]), simpleDeckHash(["1", "1", "2"]));
  assert.notEqual(simpleDeckHash(["1", "1", "2"]), simpleDeckHash(["1", "2", "1"]));
});

test("required cards are a multiset, so two copies require two copies in hand", () => {
  const combo = [{ required: ["1", "1"], forbidden: [] }];
  assert.equal(isSuccessfulHand(["1", "2", "3"], combo), false);
  assert.equal(isSuccessfulHand(["1", "1", "3"], combo), true);
});

test("a custom card uses OR semantics across its formal deck members", () => {
  const custom = { type: "custom", id: "starter", name: "任一初動", members: ["1", "2", "3"] };
  const combo = [{ required: [custom], forbidden: [] }];
  assert.equal(isSuccessfulHand(["2", "9"], combo), true);
  assert.equal(isSuccessfulHand(["4", "9"], combo), false);
});

test("two custom requirements still need two distinct physical cards", () => {
  const custom = { type: "custom", id: "starter", name: "任一初動", members: ["1", "2", "3"] };
  const combo = [{ required: [custom, custom], forbidden: [] }];
  assert.equal(isSuccessfulHand(["1", "9"], combo), false);
  assert.equal(isSuccessfulHand(["1", "2"], combo), true);
});

test("a custom forbidden card rejects a hand containing any member", () => {
  const custom = { type: "custom", id: "brick-set", name: "任一廢件", members: ["8", "9"] };
  const combo = [{ required: ["1"], forbidden: [custom] }];
  assert.equal(isSuccessfulHand(["1", "7"], combo), true);
  assert.equal(isSuccessfulHand(["1", "8"], combo), false);
});

test("any forbidden card makes that combination fail", () => {
  const combo = [{ required: ["1"], forbidden: ["9", "8"] }];
  assert.equal(isSuccessfulHand(["1", "2", "3"], combo), true);
  assert.equal(isSuccessfulHand(["1", "9", "3"], combo), false);
});

test("multiple combinations use OR semantics", () => {
  const combos = [
    { required: ["1", "2"], forbidden: [] },
    { required: ["7"], forbidden: ["8"] },
  ];
  assert.equal(isSuccessfulHand(["7", "3"], combos), true);
  assert.equal(isSuccessfulHand(["7", "8"], combos), false);
});

test("successful combination counter reports how many starter combos are simultaneously live", () => {
  const combos = [
    { required: ["1"], forbidden: [] },
    { required: ["1", "2"], forbidden: [] },
    { required: ["3"], forbidden: [] },
  ];
  assert.equal(countSuccessfulCombos(["1", "2"], combos), 2);
});

test("Monte Carlo draws without replacement and returns true / total", () => {
  const result = runMonteCarlo({
    deck: ["1", "2"],
    combos: [{ required: ["1"], forbidden: [] }],
    handSize: 1,
    trials: 10,
    random: () => 0,
  });
  assert.equal(result.success, 10);
  assert.equal(result.failure, 0);
  assert.equal(result.rate, 1);
});

test("the same card can contribute to a starter combo and role reports", () => {
  const result = runMonteCarlo({
    deck: ["1", "2", "3"],
    combos: [{ required: ["1"], forbidden: [] }],
    handSize: 2,
    trials: 10,
    goingFirstCards: ["1", "2"],
    goingSecondCards: ["2"],
    brickCards: ["1"],
    random: () => 0,
  });
  assert.equal(result.goingFirstExpected, 2);
  assert.equal(result.goingSecondExpected, 1);
  assert.equal(result.goingFirstHitRate, 1);
  assert.equal(result.goingSecondHitRate, 1);
  assert.equal(result.brickHitRate, 1);
  assert.equal(result.brickGamesPerHit, 1);
});

test("role reports respect the number of copies assigned to a category", () => {
  const result = runMonteCarlo({
    deck: ["1", "1", "2"],
    combos: [{ required: ["1"], forbidden: [] }],
    handSize: 3,
    trials: 5,
    goingFirstCards: ["1"],
    random: () => 0,
  });
  assert.equal(result.goingFirstExpected, 1);
  assert.equal(result.goingFirstHitRate, 1);
  assert.equal(result.goingSecondExpected, 0);
});

test("a custom role card marks every physical copy of any member", () => {
  const custom = { type: "custom", id: "interaction", name: "任一阻抗", members: ["1", "2"] };
  const result = runMonteCarlo({
    deck: ["1", "1", "2", "3"],
    combos: [{ required: [custom], forbidden: [] }],
    handSize: 4,
    trials: 3,
    goingFirstCards: [custom],
    brickCards: [custom],
    random: () => 0,
  });
  assert.equal(result.success, 3);
  assert.equal(result.goingFirstExpected, 3);
  assert.equal(result.brickHitRate, 1);
});

test("brick report returns the expected games until a hand contains at least one brick", () => {
  const draws = [0, 0.75, 0, 0.75];
  const result = runMonteCarlo({
    deck: ["1", "2"],
    combos: [{ required: ["1"], forbidden: [] }],
    handSize: 1,
    trials: 4,
    brickCards: ["2"],
    random: () => draws.shift(),
  });
  assert.equal(result.brickHitRate, 0.5);
  assert.equal(result.brickGamesPerHit, 2);
});

test("brick report handles simulations with no brick draws", () => {
  const result = runMonteCarlo({
    deck: ["1", "2"],
    combos: [{ required: ["1"], forbidden: [] }],
    handSize: 1,
    trials: 4,
    brickCards: ["2"],
    random: () => 0,
  });
  assert.equal(result.brickHitRate, 0);
  assert.equal(result.brickGamesPerHit, null);
});

test("game simulation evaluates first and second from the same draw with one extra going-second card", () => {
  const result = runGameSimulation({
    deck: ["1", "2", "3"],
    combos: [
      { required: ["1"], forbidden: [] },
      { required: ["2"], forbidden: [] },
    ],
    handSize: 1,
    trials: 4,
    goingFirstCards: ["1"],
    goingSecondCards: ["2"],
    firstStarterMin: 1,
    firstRoleMin: 1,
    secondStarterMin: 2,
    secondRoleMin: 1,
    random: () => 0,
  });
  assert.equal(result.firstRate, 1);
  assert.equal(result.secondRate, 1);
  assert.equal(result.combinedRate, 1);
  assert.deepEqual(result.matrix, { tt: 4, tf: 0, ft: 0, ff: 0 });
});

test("game simulation accepts custom cards in starter and role conditions", () => {
  const custom = { type: "custom", id: "engine", name: "任一引擎", members: ["1", "2"] };
  const result = runGameSimulation({
    deck: ["1", "2", "3"],
    combos: [{ required: [custom], forbidden: [] }],
    handSize: 1,
    trials: 3,
    goingFirstCards: [custom],
    goingSecondCards: [custom],
    random: () => 0,
  });
  assert.equal(result.firstRate, 1);
  assert.equal(result.secondRate, 1);
});

test("a custom floating card expands to every matching physical deck card", () => {
  const custom = { type: "custom", id: "flex", name: "任一浮動位", members: ["1", "2"] };
  const result = optimizeFloatingAllocation({
    deck: ["1", "1", "2", "3"],
    combos: [{ required: ["3"], forbidden: [] }],
    handSize: 1,
    trials: 2,
    floatingCards: [custom],
    allocationMethods: ["starter"],
    firstStarterMin: 0,
    firstRoleMin: 0,
    secondStarterMin: 0,
    secondRoleMin: 0,
    random: () => 0,
  });
  assert.equal(result.allocation[0].cards.length, 3);
  assert.deepEqual(result.allocation[0].cards, ["1", "1", "2"]);
});

test("reverse optimizer compares floating slot bounds and can select a larger deck", () => {
  const draws = [0.6, 0];
  const result = optimizeFloatingAllocation({
    deck: ["9", "8", "1"],
    combos: [{ required: ["1"], forbidden: [] }],
    handSize: 1,
    trials: 1,
    floatingCards: ["1"],
    floatingMin: 1,
    floatingMax: 2,
    allocationMethods: ["starter"],
    firstStarterMin: 1,
    firstRoleMin: 0,
    secondStarterMin: 1,
    secondRoleMin: 0,
    random: () => draws.shift() ?? 0,
  });
  assert.equal(result.baseDeckSize, 2);
  assert.equal(result.deckSize, 4);
  assert.equal(result.floatingCount, 2);
  assert.equal(result.comparisons.length, 2);
  assert.deepEqual(result.allocation[0].cards, ["1", "新增浮動位 1"]);
});

test("reverse optimizer prefers the smaller deck when range results tie", () => {
  const result = optimizeFloatingAllocation({
    deck: ["9", "8", "1"],
    combos: [{ required: ["9"], forbidden: [] }],
    handSize: 1,
    trials: 1,
    floatingCards: ["1"],
    floatingMin: 0,
    floatingMax: 2,
    allocationMethods: ["starter"],
    firstStarterMin: 0,
    firstRoleMin: 0,
    secondStarterMin: 0,
    secondRoleMin: 0,
    random: () => 0,
  });
  assert.equal(result.deckSize, 2);
  assert.equal(result.floatingCount, 0);
});

test("reverse optimizer limits a floating slot range to twenty-one sizes", () => {
  assert.throws(
    () =>
      optimizeFloatingAllocation({
        deck: ["1", "2"],
        combos: [{ required: ["2"], forbidden: [] }],
        handSize: 1,
        trials: 1,
        floatingCards: ["1"],
        floatingMin: 0,
        floatingMax: 21,
        allocationMethods: ["starter"],
      }),
    /21 種/,
  );
});

test("reverse optimizer masks floating assignments and only uses selected allocation methods", () => {
  const result = optimizeFloatingAllocation({
    deck: ["1", "2"],
    combos: [{ required: ["1"], forbidden: [] }],
    handSize: 1,
    trials: 4,
    floatingCards: ["1"],
    allocationMethods: ["starterSecond"],
    firstStarterMin: 1,
    firstRoleMin: 1,
    secondStarterMin: 1,
    secondRoleMin: 1,
    random: () => 0,
  });
  assert.equal(result.maskedComboCount, 0);
  assert.equal(result.firstRate, 0);
  assert.equal(result.secondRate, 1);
  assert.equal(result.combinedRate, 0.5);
  assert.deepEqual(result.allocation, [{ method: "starterSecond", cards: ["1"] }]);
});

test("reverse optimizer drops whole starter combos when every custom OR member is fully floating", () => {
  const custom = { type: "custom", id: "engine", name: "任一引擎", members: ["1", "2"] };
  const result = optimizeFloatingAllocation({
    deck: ["3", "1", "2", "4"],
    combos: [
      { required: [custom, "3"], forbidden: [] },
      { required: [custom, "3"], forbidden: [] },
    ],
    handSize: 1,
    trials: 1,
    floatingCards: [custom],
    allocationMethods: ["second"],
    firstStarterMin: 2,
    firstRoleMin: 0,
    secondStarterMin: 2,
    secondRoleMin: 0,
    random: () => 0,
  });
  assert.equal(result.maskedComboCount, 0);
  assert.equal(result.firstRate, 0);
  assert.equal(result.secondRate, 0);
});

test("reverse optimizer keeps custom OR starter combos when a floating code has core copies left", () => {
  const custom = { type: "custom", id: "engine", name: "任一引擎", members: ["1", "2"] };
  const result = optimizeFloatingAllocation({
    deck: ["1", "1", "3"],
    combos: [{ required: [custom], forbidden: [] }],
    handSize: 1,
    trials: 1,
    floatingCards: ["1"],
    allocationMethods: ["second"],
    firstStarterMin: 1,
    firstRoleMin: 0,
    secondStarterMin: 1,
    secondRoleMin: 0,
    random: () => 0,
  });
  assert.equal(result.maskedComboCount, 1);
  assert.equal(result.firstRate, 1);
  assert.equal(result.secondRate, 1);
});

test("reverse optimizer removes fully floating forbidden cards without dropping the combo", () => {
  const result = optimizeFloatingAllocation({
    deck: ["3", "1", "2"],
    combos: [{ required: ["3"], forbidden: ["1"] }],
    handSize: 1,
    trials: 1,
    floatingCards: ["1"],
    allocationMethods: ["second"],
    firstStarterMin: 1,
    firstRoleMin: 0,
    secondStarterMin: 1,
    secondRoleMin: 0,
    random: () => 0,
  });
  assert.equal(result.maskedComboCount, 1);
  assert.equal(result.firstRate, 1);
  assert.equal(result.secondRate, 1);
});

test("reverse optimizer supports up to three choices across all six allocation methods", () => {
  const result = optimizeFloatingAllocation({
    deck: ["1", "2", "3"],
    combos: [{ required: ["3"], forbidden: [] }],
    handSize: 1,
    trials: 2,
    floatingCards: ["1", "2"],
    allocationMethods: ["starter", "first", "firstSecond"],
    firstStarterMin: 0,
    firstRoleMin: 1,
    secondStarterMin: 0,
    secondRoleMin: 1,
    random: () => 0,
  });
  assert.deepEqual(
    result.allocation.map(({ method }) => method),
    ["starter", "first", "firstSecond"],
  );
  assert.equal(result.allocation.reduce((total, item) => total + item.cards.length, 0), 2);
});

test("reverse optimizer rejects more than three allocation methods", () => {
  assert.throws(
    () =>
      optimizeFloatingAllocation({
        deck: ["1", "2"],
        combos: [{ required: ["2"], forbidden: [] }],
        handSize: 1,
        trials: 1,
        floatingCards: ["1"],
        allocationMethods: ["starter", "first", "second", "starterFirst"],
      }),
    /1～3/,
  );
});
