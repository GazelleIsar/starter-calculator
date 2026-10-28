import {
  cardTokenMembers,
  compileCardSelection,
  countUnique,
  customCardKind,
  isCustomCardToken,
  parseYdk,
  simpleDeckHash,
  takeCardSelection,
} from "/assets/core.mjs";

const elements = {
  workspace: document.querySelector("#workspace"),
  pathStatus: document.querySelector("#pathStatus"),
  pathStatusText: document.querySelector("#pathStatusText"),
  openSettingsButton: document.querySelector("#openSettingsButton"),
  settingsDialog: document.querySelector("#settingsDialog"),
  settingsForm: document.querySelector("#settingsForm"),
  rootPathInput: document.querySelector("#rootPathInput"),
  picsPathInput: document.querySelector("#picsPathInput"),
  rootFieldState: document.querySelector("#rootFieldState"),
  picsFieldState: document.querySelector("#picsFieldState"),
  pickRootButton: document.querySelector("#pickRootButton"),
  pickPicsButton: document.querySelector("#pickPicsButton"),
  settingsMessage: document.querySelector("#settingsMessage"),
  confirmSettingsButton: document.querySelector("#confirmSettingsButton"),
  cancelSettingsButton: document.querySelector("#cancelSettingsButton"),
  deckFileInput: document.querySelector("#deckFileInput"),
  uploadTarget: document.querySelector("#uploadTarget"),
  replaceDeckButton: document.querySelector("#replaceDeckButton"),
  emptyDeck: document.querySelector("#emptyDeck"),
  deckContent: document.querySelector("#deckContent"),
  deckMeta: document.querySelector("#deckMeta"),
  deckFileName: document.querySelector("#deckFileName"),
  deckCount: document.querySelector("#deckCount"),
  uniqueCount: document.querySelector("#uniqueCount"),
  cardGrid: document.querySelector("#cardGrid"),
  customCardStrip: document.querySelector("#customCardStrip"),
  customCardList: document.querySelector("#customCardList"),
  addCustomCardButton: document.querySelector("#addCustomCardButton"),
  customCardEditor: document.querySelector("#customCardEditor"),
  customCardNameInput: document.querySelector("#customCardNameInput"),
  customCardKindInput: document.querySelector("#customCardKindInput"),
  customEffectFields: document.querySelector("#customEffectFields"),
  customEffectTargetDropzone: document.querySelector("#customEffectTargetDropzone"),
  customEffectTarget: document.querySelector("#customEffectTarget"),
  customEffectAmountInput: document.querySelector("#customEffectAmountInput"),
  customEffectScopeInput: document.querySelector("#customEffectScopeInput"),
  customEffectTriggerZoneInput: document.querySelector("#customEffectTriggerZoneInput"),
  customDraftCount: document.querySelector("#customDraftCount"),
  customMemberHint: document.querySelector("#customMemberHint"),
  customMemberDropzone: document.querySelector("#customMemberDropzone"),
  customDraftMembers: document.querySelector("#customDraftMembers"),
  cancelCustomCardButton: document.querySelector("#cancelCustomCardButton"),
  saveCustomCardButton: document.querySelector("#saveCustomCardButton"),
  customCardDetailsDialog: document.querySelector("#customCardDetailsDialog"),
  customCardDetailsTitle: document.querySelector("#customCardDetailsTitle"),
  customCardDetailsKind: document.querySelector("#customCardDetailsKind"),
  customCardDetailsCount: document.querySelector("#customCardDetailsCount"),
  customCardDetailsGrid: document.querySelector("#customCardDetailsGrid"),
  closeCustomCardDetailsButton: document.querySelector("#closeCustomCardDetailsButton"),
  cardGroups: document.querySelector("#cardGroups"),
  addComboButton: document.querySelector("#addComboButton"),
  addGraveComboButton: document.querySelector("#addGraveComboButton"),
  combosList: document.querySelector("#combosList"),
  handSizeInput: document.querySelector("#handSizeInput"),
  trialCountInput: document.querySelector("#trialCountInput"),
  calculateButton: document.querySelector("#calculateButton"),
  progressWrap: document.querySelector("#progressWrap"),
  progressBar: document.querySelector("#progressBar"),
  progressText: document.querySelector("#progressText"),
  resultCard: document.querySelector("#resultCard"),
  resultRate: document.querySelector("#resultRate"),
  resultFraction: document.querySelector("#resultFraction"),
  resultSuccess: document.querySelector("#resultSuccess"),
  resultFailure: document.querySelector("#resultFailure"),
  resultInterval: document.querySelector("#resultInterval"),
  resultGoingFirstExpected: document.querySelector("#resultGoingFirstExpected"),
  resultGoingFirstDetail: document.querySelector("#resultGoingFirstDetail"),
  resultGoingSecondExpected: document.querySelector("#resultGoingSecondExpected"),
  resultGoingSecondDetail: document.querySelector("#resultGoingSecondDetail"),
  resultBrickGames: document.querySelector("#resultBrickGames"),
  resultBrickDetail: document.querySelector("#resultBrickDetail"),
  gameModeSwitch: document.querySelector("#gameModeSwitch"),
  reverseModeNote: document.querySelector("#reverseModeNote"),
  firstHandSizeLabel: document.querySelector("#firstHandSizeLabel"),
  secondHandSizeLabel: document.querySelector("#secondHandSizeLabel"),
  firstStarterMinInput: document.querySelector("#firstStarterMinInput"),
  firstRoleMinInput: document.querySelector("#firstRoleMinInput"),
  secondStarterMinInput: document.querySelector("#secondStarterMinInput"),
  secondRoleMinInput: document.querySelector("#secondRoleMinInput"),
  calculateGameButton: document.querySelector("#calculateGameButton"),
  gameProgressWrap: document.querySelector("#gameProgressWrap"),
  gameProgressBar: document.querySelector("#gameProgressBar"),
  gameProgressText: document.querySelector("#gameProgressText"),
  gameResultCard: document.querySelector("#gameResultCard"),
  gameResultCaption: document.querySelector("#gameResultCaption"),
  gameCombinedRate: document.querySelector("#gameCombinedRate"),
  gameTrialSummary: document.querySelector("#gameTrialSummary"),
  gameFirstRate: document.querySelector("#gameFirstRate"),
  gameFirstFraction: document.querySelector("#gameFirstFraction"),
  gameSecondRate: document.querySelector("#gameSecondRate"),
  gameSecondFraction: document.querySelector("#gameSecondFraction"),
  gameOutcomeTT: document.querySelector("#gameOutcomeTT"),
  gameOutcomeTF: document.querySelector("#gameOutcomeTF"),
  gameOutcomeFT: document.querySelector("#gameOutcomeFT"),
  gameOutcomeFF: document.querySelector("#gameOutcomeFF"),
  allocationResult: document.querySelector("#allocationResult"),
  floatingCountRange: document.querySelector("#floatingCountRange"),
  floatingMinInput: document.querySelector("#floatingMinInput"),
  floatingMaxInput: document.querySelector("#floatingMaxInput"),
  floatingDeckRangeSummary: document.querySelector("#floatingDeckRangeSummary"),
  allocationMethodSelector: document.querySelector("#allocationMethodSelector"),
  allocationMethodCount: document.querySelector("#allocationMethodCount"),
  allocationList: document.querySelector("#allocationList"),
  allocationNote: document.querySelector("#allocationNote"),
  bestDeckSize: document.querySelector("#bestDeckSize"),
  bestFloatingCount: document.querySelector("#bestFloatingCount"),
  deckRangeResult: document.querySelector("#deckRangeResult"),
  toastRegion: document.querySelector("#toastRegion"),
};

const state = {
  config: { root_path: "", pics_path: "", root_valid: false, pics_valid: false, ready: false },
  requiredSetup: true,
  deck: [],
  deckName: "",
  deckKey: "",
  customCards: [],
  customDraftMembers: [],
  customDraftTarget: null,
  combos: [],
  cardGroups: { judgment: [], floating: [], goingFirst: [], goingSecond: [], brick: [] },
  nextComboId: 1,
  worker: null,
  gameWorker: null,
  gameMode: "direct",
  selectedToken: null,
  customCardDragged: false,
};

const allocationMethodLabels = {
  starter: "啟動",
  first: "先手阻抗",
  second: "後手對策",
  starterFirst: "啟動＋先手阻抗",
  starterSecond: "啟動＋後手對策",
  firstSecond: "後手對策＋先手阻抗",
};

const storageResetMarker = "starter-draw-reset-complete:2026-10-28-a";

function clearStoredAppRecordsOnce() {
  try {
    if (localStorage.getItem(storageResetMarker) === "1") return;
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("starter-draw-")) localStorage.removeItem(key);
    }
    localStorage.setItem(storageResetMarker, "1");
  } catch {
    // Private browsing can block local storage; in-memory state still starts empty.
  }
}

clearStoredAppRecordsOnce();

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function customCardById(id) {
  return state.customCards.find((card) => card.id === id) || null;
}

const customKindMeta = {
  or: { short: "OR", label: "任一成立" },
  and: { short: "AND", label: "全部成立" },
  draw: { short: "DRAW", label: "特殊判定－抽牌" },
  mill: { short: "MILL", label: "特殊判定－堆墓或除外" },
};

function customScopeLabel(scope) {
  return { first: "僅先手", second: "僅後手", both: "先手及後手" }[scope] || "先手及後手";
}

function customTriggerZoneLabel(triggerZone) {
  return triggerZone === "grave" ? "墓地／除外觸發" : "手牌觸發";
}

function isSpecialEffectCard(token) {
  return isCustomCardToken(token) && ["draw", "mill"].includes(customCardKind(token));
}

function isConfiguredEffectCard(token) {
  return Boolean(
    isSpecialEffectCard(token) &&
      typeof token.target === "string" &&
      state.deck.includes(token.target),
  );
}

function cloneCardToken(token) {
  if (typeof token === "string") return token;
  const clone = {
    type: "custom",
    id: token.id,
    name: token.name,
    kind: customCardKind(token),
    members: token.members.map(cloneCardToken),
  };
  if (["draw", "mill"].includes(clone.kind)) {
    clone.target = typeof token.target === "string" ? token.target : "";
    clone.amount = Math.max(1, Number(token.amount) || 1);
    clone.scope = ["first", "second", "both"].includes(token.scope) ? token.scope : "both";
    clone.triggerZone = token.triggerZone === "grave" ? "grave" : "hand";
  }
  return clone;
}

function normalizeCardToken(token) {
  if (typeof token === "string") return /^\d+$/.test(token) && state.deck.includes(token) ? token : null;
  if (!isCustomCardToken(token)) return null;
  const current = customCardById(token.id);
  return current ? cloneCardToken(current) : null;
}

function cardTokenLabel(token) {
  return typeof token === "string" ? token : token.name || "自訂卡片";
}

function cardTokenKey(token) {
  return typeof token === "string" ? `card:${token}` : `custom:${token.id}`;
}

function draggedCardToken(dataTransfer) {
  if (!dataTransfer) return null;
  const raw = dataTransfer.getData("application/x-starter-card") || dataTransfer.getData("text/plain");
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return normalizeCardToken(raw);
  try {
    return normalizeCardToken(JSON.parse(raw));
  } catch {
    return null;
  }
}

function setDraggedCardToken(dataTransfer, token) {
  const serialized = typeof token === "string" ? token : JSON.stringify(token);
  dataTransfer.setData("application/x-starter-card", serialized);
  dataTransfer.setData("text/plain", serialized);
}

function api(path, options = {}) {
  return fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  }).then(async (response) => {
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "操作失敗，請稍後再試。");
    return body;
  });
}

function showToast(message, tone = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${tone}`;
  toast.textContent = message;
  elements.toastRegion.append(toast);
  requestAnimationFrame(() => toast.classList.add("toast-visible"));
  window.setTimeout(() => {
    toast.classList.remove("toast-visible");
    window.setTimeout(() => toast.remove(), 220);
  }, 3600);
}

function updateConfigUi(config) {
  state.config = config;
  elements.rootPathInput.value = config.root_path || "";
  elements.picsPathInput.value = config.pics_path || "";
  elements.rootFieldState.textContent = config.root_valid ? "已連線" : "未設定";
  elements.rootFieldState.classList.toggle("is-valid", config.root_valid);
  elements.picsFieldState.textContent = config.pics_valid ? "已連線" : "未設定";
  elements.picsFieldState.classList.toggle("is-valid", config.pics_valid);
  elements.confirmSettingsButton.disabled = !config.ready;
  elements.pathStatus.classList.toggle("is-ready", config.ready);
  elements.pathStatusText.textContent = config.ready ? "本機卡圖已連線" : "尚未綁定資料夾";
  elements.workspace.setAttribute("aria-busy", String(!config.ready));

  if (config.root_valid && !config.pics_valid) {
    elements.settingsMessage.textContent = "主目錄中找不到 pics，請另選卡圖目錄。";
    elements.settingsMessage.className = "dialog-message is-warning";
  } else if (config.ready) {
    elements.settingsMessage.textContent = "路徑設定完成，可以載入 .ydk 牌組。";
    elements.settingsMessage.className = "dialog-message is-success";
  } else {
    elements.settingsMessage.textContent = "必須完成兩項路徑設定後才能使用。";
    elements.settingsMessage.className = "dialog-message";
  }
}

async function loadConfig() {
  try {
    const config = await api("/api/config");
    updateConfigUi(config);
    state.requiredSetup = !config.ready;
    elements.cancelSettingsButton.hidden = state.requiredSetup;
    if (!config.ready && !elements.settingsDialog.open) elements.settingsDialog.showModal();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    elements.workspace.removeAttribute("aria-busy");
  }
}

async function pickDirectory(kind) {
  const button = kind === "root" ? elements.pickRootButton : elements.pickPicsButton;
  const original = button.textContent;
  button.disabled = true;
  button.textContent = "選擇中…";
  elements.settingsMessage.textContent = "請在已開啟的系統視窗中選擇資料夾。";
  elements.settingsMessage.className = "dialog-message";
  try {
    const config = await api("/api/pick-directory", {
      method: "POST",
      body: JSON.stringify({ kind }),
    });
    updateConfigUi(config);
    if (!config.cancelled && kind === "root" && !config.pics_valid) {
      showToast("找不到 pics，請手動指定卡圖目錄。", "warning");
    }
  } catch (error) {
    elements.settingsMessage.textContent = error.message;
    elements.settingsMessage.className = "dialog-message is-error";
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
}

function openSettings(required = false) {
  state.requiredSetup = required || !state.config.ready;
  elements.cancelSettingsButton.hidden = state.requiredSetup;
  if (!elements.settingsDialog.open) elements.settingsDialog.showModal();
}

function attachImageFallback(container) {
  container.addEventListener(
    "error",
    (event) => {
      if (!(event.target instanceof HTMLImageElement)) return;
      event.target.closest(".card-visual, .mini-card, .custom-card-stack")?.classList.add("image-missing");
      event.target.hidden = true;
    },
    true,
  );
}

function cardImageUrl(code) {
  return `/api/card/${encodeURIComponent(code)}`;
}

function invalidateResult() {
  if (state.worker) {
    state.worker.terminate();
    state.worker = null;
  }
  elements.progressWrap.hidden = true;
  elements.resultCard.hidden = true;
  elements.calculateButton.classList.remove("is-running");
  elements.calculateButton.querySelector(".calculate-label").textContent = "計算啟動率";
  invalidateGameResult(false);
  updateCalculateState();
}

function invalidateGameResult(updateState = true) {
  if (state.gameWorker) {
    state.gameWorker.terminate();
    state.gameWorker = null;
  }
  elements.gameProgressWrap.hidden = true;
  elements.gameResultCard.hidden = true;
  elements.calculateGameButton.classList.remove("is-running");
  elements.calculateGameButton.querySelector(".calculate-label").textContent =
    state.gameMode === "reverse" ? "尋找最佳分配" : "計算賽局勝率";
  if (updateState) updateCalculateState();
}

function comboStorageKey() {
  return state.deckKey ? `starter-draw-combos-v1:${state.deckKey}` : "";
}

function cardGroupStorageKey() {
  return state.deckKey ? `starter-draw-card-groups-v1:${state.deckKey}` : "";
}

function customCardStorageKey() {
  return state.deckKey ? `starter-draw-custom-cards-v1:${state.deckKey}` : "";
}

function saveCustomCards() {
  const key = customCardStorageKey();
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(state.customCards));
  } catch {
    // The app remains fully usable if private browsing blocks local storage.
  }
}

function restoreCustomCards() {
  state.customCards = [];
  state.customDraftMembers = [];
  state.customDraftTarget = null;
  const key = customCardStorageKey();
  if (!key) return;
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "[]");
    if (!Array.isArray(saved)) return;
    const ids = new Set();
    const restored = [];
    for (let index = 0; index < saved.length; index += 1) {
      const card = saved[index];
      if (!isCustomCardToken(card) || ids.has(card.id)) continue;
      const kind = customCardKind(card);
      const isEffect = ["draw", "mill"].includes(kind);
      if (isEffect && (typeof card.target !== "string" || !state.deck.includes(card.target))) continue;
      const seenMembers = new Set();
      const members = card.members.flatMap((member) => {
        let normalized = null;
        if (typeof member === "string" && /^\d+$/.test(member) && state.deck.includes(member)) {
          normalized = member;
        } else if (isCustomCardToken(member)) {
          const dependency = restored.find((item) => item.id === member.id);
          if (dependency && !isSpecialEffectCard(dependency)) normalized = cloneCardToken(dependency);
        }
        if (!normalized || seenMembers.has(cardTokenKey(normalized))) return [];
        seenMembers.add(cardTokenKey(normalized));
        return [normalized];
      });
      const minimum = isEffect ? 0 : 2;
      if (members.length < minimum) continue;
      ids.add(card.id);
      const restoredCard = {
        type: "custom",
        id: card.id,
        name: String(card.name || `自訂卡片 ${index + 1}`).trim().slice(0, 30) || `自訂卡片 ${index + 1}`,
        kind,
        members,
      };
      if (isEffect) {
        restoredCard.target = card.target;
        restoredCard.amount = Math.min(60, Math.max(1, Number(card.amount) || 1));
        restoredCard.scope = ["first", "second", "both"].includes(card.scope) ? card.scope : "both";
        restoredCard.triggerZone = card.triggerZone === "grave" ? "grave" : "hand";
      }
      restored.push(restoredCard);
    }
    state.customCards = restored;
  } catch {
    state.customCards = [];
  }
}

function saveCombos() {
  const key = comboStorageKey();
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(state.combos));
  } catch {
    // The app remains fully usable if private browsing blocks local storage.
  }
}

function restoreCombos() {
  state.combos = [];
  state.nextComboId = 1;
  const key = comboStorageKey();
  if (!key) return;
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "[]");
    if (!Array.isArray(saved)) return;
    state.combos = saved.flatMap((combo) => {
      if (combo?.kind === "grave") {
        if (!Array.isArray(combo.graveRequired)) return [];
        return [{
          id: state.nextComboId++,
          kind: "grave",
          graveRequired: combo.graveRequired.map(normalizeCardToken).filter(Boolean),
        }];
      }
      if (!combo || !Array.isArray(combo.required) || !Array.isArray(combo.forbidden)) return [];
      return [{
        id: state.nextComboId++,
        kind: "hand",
        required: combo.required.map(normalizeCardToken).filter(Boolean),
        forbidden: combo.forbidden.map(normalizeCardToken).filter(Boolean),
      }];
    });
  } catch {
    state.combos = [];
  }
}

function trimCardsToDeckCopies(cards) {
  const deckCounts = new Map();
  const usedCounts = new Map();
  const usedCustomCards = new Set();
  for (const code of state.deck) deckCounts.set(code, (deckCounts.get(code) || 0) + 1);
  return cards.flatMap((rawToken) => {
    const token = normalizeCardToken(rawToken);
    if (!token) return [];
    if (isCustomCardToken(token)) {
      if (isSpecialEffectCard(token)) return [];
      if (usedCustomCards.has(token.id)) return [];
      usedCustomCards.add(token.id);
      return [token];
    }
    const nextCount = (usedCounts.get(token) || 0) + 1;
    if (nextCount > deckCounts.get(token)) return [];
    usedCounts.set(token, nextCount);
    return [token];
  });
}

function saveCardGroups() {
  const key = cardGroupStorageKey();
  if (!key) return;
  try {
    localStorage.setItem(key, JSON.stringify(state.cardGroups));
  } catch {
    // The app remains fully usable if private browsing blocks local storage.
  }
}

function restoreCardGroups() {
  state.cardGroups = { judgment: [], floating: [], goingFirst: [], goingSecond: [], brick: [] };
  const key = cardGroupStorageKey();
  if (!key) return;
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "{}");
    for (const group of ["floating", "goingFirst", "goingSecond", "brick"]) {
      if (Array.isArray(saved[group])) state.cardGroups[group] = trimCardsToDeckCopies(saved[group]);
    }
    if (Array.isArray(saved.judgment)) {
      const seen = new Set();
      state.cardGroups.judgment = saved.judgment.flatMap((rawToken) => {
        const token = normalizeCardToken(rawToken);
        if (!isConfiguredEffectCard(token) || seen.has(token.id)) return [];
        seen.add(token.id);
        return [token];
      });
    }
  } catch {
    state.cardGroups = { judgment: [], floating: [], goingFirst: [], goingSecond: [], brick: [] };
  }
}

function clearSelectedCard() {
  state.selectedToken = null;
  elements.cardGrid.querySelectorAll(".deck-card.is-selected").forEach((card) => card.classList.remove("is-selected"));
  elements.customCardList
    .querySelectorAll(".custom-card-item.is-selected")
    .forEach((card) => card.classList.remove("is-selected"));
}

function applyFloatingDeckState() {
  const floatingCodes = new Set(state.cardGroups.floating.flatMap(cardTokenMembers));
  elements.cardGrid.querySelectorAll(".deck-card").forEach((card) => {
    const isFloating = floatingCodes.has(card.dataset.code);
    card.classList.toggle("is-floating", isFloating);
    card.setAttribute(
      "aria-label",
      isFloating
        ? `卡片 ${card.dataset.code}，已列為浮動卡位，仍可拖曳至所有分類或啟動組合`
        : `卡片 ${card.dataset.code}，可拖曳`,
    );
  });
}

function renderDeck() {
  const hasDeck = state.deck.length > 0;
  state.selectedToken = null;
  elements.emptyDeck.hidden = hasDeck;
  elements.deckContent.hidden = !hasDeck;
  elements.customCardStrip.hidden = !hasDeck;
  elements.deckMeta.hidden = !hasDeck;
  elements.addComboButton.disabled = !hasDeck;
  elements.addGraveComboButton.disabled = !hasDeck;
  elements.cardGrid.replaceChildren();

  if (!hasDeck) {
    updateCalculateState();
    return;
  }

  elements.deckFileName.textContent = state.deckName;
  elements.deckCount.textContent = `${state.deck.length} 張`;
  elements.uniqueCount.textContent = `${countUnique(state.deck)} 種`;
  elements.handSizeInput.max = String(state.deck.length);
  if (Number(elements.handSizeInput.value) > state.deck.length) {
    elements.handSizeInput.value = String(Math.min(5, state.deck.length));
  }

  const fragment = document.createDocumentFragment();
  state.deck.forEach((code, index) => {
    const card = document.createElement("article");
    card.className = "deck-card";
    card.draggable = true;
    card.dataset.code = code;
    card.tabIndex = 0;
    card.setAttribute("aria-label", `卡片 ${code}，可拖曳`);
    card.innerHTML = `
      <div class="card-visual">
        <img src="${cardImageUrl(code)}" alt="卡片 ${code}" draggable="false">
        <span class="missing-mark" aria-hidden="true">${code}</span>
        <span class="copy-number">${String(index + 1).padStart(2, "0")}</span>
        <span class="floating-badge">浮動</span>
      </div>
      <span class="card-code">${code}</span>
    `;
    fragment.append(card);
  });
  elements.cardGrid.append(fragment);
  applyFloatingDeckState();
  updateCalculateState();
}

function customStackMarkup(card) {
  const physicalCodes = cardTokenMembers(card);
  const images = physicalCodes
    .slice(0, 3)
    .map((code) => `<img src="${cardImageUrl(code)}" alt="卡片 ${code}" draggable="false">`)
    .join("");
  const kind = customCardKind(card);
  const badge = ["draw", "mill"].includes(kind)
    ? `${customKindMeta[kind].short} ${card.amount}`
    : `${customKindMeta[kind].short} ${card.members.length}`;
  return `${images}<span class="custom-or-badge">${badge}</span>`;
}

function customCardDescription(card) {
  const kind = customCardKind(card);
  if (["draw", "mill"].includes(kind)) {
    const action = kind === "draw" ? "抽牌" : "堆墓／除外";
    return `改寫 ${card.target || "未設定"} · ${customTriggerZoneLabel(card.triggerZone)} · ${card.members.length} 項附加條件 · ${action} ${card.amount} 張 · ${customScopeLabel(card.scope)}`;
  }
  return `${customKindMeta[kind].label} · ${card.members.length} 個條件`;
}

function draftTokenMarkup(token, index) {
  if (typeof token === "string") {
    return `
      <article class="custom-draft-card" title="${token}">
        <div class="card-visual">
          <img src="${cardImageUrl(token)}" alt="卡片 ${token}" draggable="false">
          <span class="missing-mark" aria-hidden="true">${token}</span>
        </div>
        <button type="button" data-draft-index="${index}" aria-label="移除 ${token}">×</button>
      </article>
    `;
  }
  const firstCode = cardTokenMembers(token)[0] || "";
  return `
    <article class="custom-draft-card" title="${escapeHtml(token.name)}">
      <div class="card-visual custom-draft-logic">
        ${firstCode ? `<img src="${cardImageUrl(firstCode)}" alt="${escapeHtml(token.name)}" draggable="false">` : ""}
        <span class="missing-mark" aria-hidden="true">${customKindMeta[customCardKind(token)].short}</span>
        <span class="custom-or-badge">${customKindMeta[customCardKind(token)].short}</span>
      </div>
      <button type="button" data-draft-index="${index}" aria-label="移除 ${escapeHtml(token.name)}">×</button>
    </article>
  `;
}

function renderCustomDraft() {
  elements.customDraftCount.textContent = String(state.customDraftMembers.length);
  if (!state.customDraftMembers.length) {
    elements.customDraftMembers.innerHTML = `<div class="custom-draft-empty">拖放正式卡或既有自訂卡片至此</div>`;
    return;
  }
  elements.customDraftMembers.innerHTML = state.customDraftMembers.map(draftTokenMarkup).join("");
}

function renderCustomEffectTarget() {
  if (!state.customDraftTarget) {
    elements.customEffectTarget.innerHTML = `<div class="custom-effect-target-empty"><span>＋</span><p>拖入一張牌組原卡</p></div>`;
    return;
  }
  elements.customEffectTarget.innerHTML = `
    <article class="custom-draft-card custom-effect-target-card" title="${state.customDraftTarget}">
      <div class="card-visual">
        <img src="${cardImageUrl(state.customDraftTarget)}" alt="卡片 ${state.customDraftTarget}" draggable="false">
        <span class="missing-mark" aria-hidden="true">${state.customDraftTarget}</span>
      </div>
      <button type="button" id="removeCustomEffectTarget" aria-label="移除改寫原卡 ${state.customDraftTarget}">×</button>
    </article>
  `;
}

function renderCustomCards() {
  elements.customCardList.innerHTML = state.customCards
    .map(
      (card) => `
        <article class="custom-card-item${isSpecialEffectCard(card) ? " is-effect-card" : ""}" draggable="true" tabindex="0" data-custom-id="${escapeHtml(card.id)}" aria-label="自訂卡片 ${escapeHtml(card.name)}，${escapeHtml(customCardDescription(card))}，${isSpecialEffectCard(card) ? "僅可拖曳至改變卡片判定欄" : "可拖曳至右側條件欄"}">
          <div class="custom-card-stack">${customStackMarkup(card)}</div>
          <div class="custom-card-copy">
            <strong>${escapeHtml(card.name)}</strong>
            <small>${escapeHtml(customCardDescription(card))}</small>
          </div>
          <button type="button" class="remove-custom-card" data-custom-id="${escapeHtml(card.id)}" aria-label="移除自訂卡片 ${escapeHtml(card.name)}">×</button>
        </article>
      `,
    )
    .join("");
}

function openCustomCardDetails(card) {
  if (!card) return;
  clearSelectedCard();
  const kind = customCardKind(card);
  elements.customCardDetailsTitle.textContent = card.name;
  elements.customCardDetailsKind.textContent = `CUSTOM CARD / ${customKindMeta[kind].short}`;
  elements.customCardDetailsCount.textContent = customCardDescription(card);
  const detailItems = isSpecialEffectCard(card)
    ? [
        { token: card.target, label: `改寫原卡（${customTriggerZoneLabel(card.triggerZone)}）` },
        ...card.members.map((token) => ({ token, label: "附加條件" })),
      ]
    : card.members.map((token) => ({ token, label: "判定成員" }));
  elements.customCardDetailsGrid.innerHTML = detailItems
    .map(
      ({ token, label }, index) => typeof token === "string" ? `
        <article class="custom-details-card">
          <div class="card-visual">
            <img src="${cardImageUrl(token)}" alt="卡片 ${token}" draggable="false">
            <span class="missing-mark" aria-hidden="true">${token}</span>
            <span class="copy-number">${String(index + 1).padStart(2, "0")}</span>
          </div>
          <small>${label}</small>
          <strong>${token}</strong>
        </article>
      ` : `
        <article class="custom-details-card">
          <div class="custom-card-stack">${customStackMarkup(token)}</div>
          <small>${label}</small>
          <strong>${escapeHtml(token.name)}</strong>
        </article>
      `,
    )
    .join("");
  if (!elements.customCardDetailsDialog.open) elements.customCardDetailsDialog.showModal();
}

function closeCustomCardDetails() {
  if (elements.customCardDetailsDialog.open) elements.customCardDetailsDialog.close();
}

function openCustomCardEditor() {
  state.customDraftMembers = [];
  state.customDraftTarget = null;
  elements.customCardNameInput.value = "";
  elements.customCardKindInput.value = "or";
  elements.customEffectAmountInput.value = "1";
  elements.customEffectScopeInput.value = "both";
  elements.customEffectTriggerZoneInput.value = "hand";
  elements.customCardEditor.hidden = false;
  elements.addCustomCardButton.disabled = true;
  updateCustomEditorKind();
  renderCustomDraft();
  renderCustomEffectTarget();
  elements.customCardNameInput.focus();
}

function closeCustomCardEditor() {
  state.customDraftMembers = [];
  state.customDraftTarget = null;
  elements.customCardEditor.hidden = true;
  elements.addCustomCardButton.disabled = false;
  elements.customMemberDropzone.classList.remove("is-over");
}

function updateCustomEditorKind() {
  const kind = elements.customCardKindInput.value;
  const isEffect = ["draw", "mill"].includes(kind);
  elements.customEffectFields.hidden = !isEffect;
  elements.customMemberHint.textContent = isEffect
    ? "原卡在所選位置公開時立即判定；附加條件可留空。若加入多項，則須在同一觸發位置全部成立；需要任一成立時可使用 OR 自訂卡。"
    : kind === "and"
      ? "拖入至少 2 個條件；所有條件同時於手牌成立才為 True。"
      : "拖入至少 2 個條件；任一條件於手牌成立即為 True。";
}

function addDraftMember(rawToken) {
  const token = normalizeCardToken(rawToken);
  if (!token) return;
  if (isSpecialEffectCard(token)) {
    showToast("特殊判定卡只能放入右側的「改變卡片判定」欄。", "warning");
    return;
  }
  if (state.customDraftMembers.some((member) => cardTokenKey(member) === cardTokenKey(token))) {
    showToast(`「${cardTokenLabel(token)}」已在這張自訂卡片中。`, "warning");
    return;
  }
  state.customDraftMembers.push(cloneCardToken(token));
  renderCustomDraft();
}

function setCustomEffectTarget(rawToken) {
  const token = normalizeCardToken(rawToken);
  if (typeof token !== "string") {
    showToast("改變處理方式的卡必須是牌組中的單一正式卡。", "warning");
    return;
  }
  state.customDraftTarget = token;
  renderCustomEffectTarget();
}

function saveCustomCard() {
  const kind = elements.customCardKindInput.value;
  const isEffect = ["draw", "mill"].includes(kind);
  const minimum = isEffect ? 0 : 2;
  if (state.customDraftMembers.length < minimum) {
    showToast(`此類型自訂卡片至少需要 ${minimum} 個條件。`, "warning");
    return;
  }
  if (isEffect && !state.customDraftTarget) {
    showToast("請先設定一張欲改變處理方式的牌組原卡。", "warning");
    return;
  }
  const amount = Number(elements.customEffectAmountInput.value);
  if (isEffect && (!Number.isInteger(amount) || amount < 1 || amount > 60)) {
    showToast("額外處理張數需介於 1 到 60。", "warning");
    return;
  }
  const fallbackName = `自訂卡片 ${state.customCards.length + 1}`;
  const name = elements.customCardNameInput.value.trim().slice(0, 30) || fallbackName;
  const card = {
    type: "custom",
    id: `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    kind,
    members: state.customDraftMembers.map(cloneCardToken),
  };
  if (isEffect) {
    card.target = state.customDraftTarget;
    card.amount = amount;
    card.scope = elements.customEffectScopeInput.value;
    card.triggerZone = elements.customEffectTriggerZoneInput.value === "grave" ? "grave" : "hand";
  }
  state.customCards.push(card);
  saveCustomCards();
  renderCustomCards();
  closeCustomCardEditor();
  showToast(
    isEffect
      ? `已建立「${name}」，拖入右側「改變卡片判定」欄後才會生效。`
      : `已建立「${name}」，可拖曳至右側條件欄位。`,
    "success",
  );
}

function removeCustomCard(customId) {
  const card = customCardById(customId);
  if (!card) return;
  if (state.customDraftMembers.some((member) => tokenContainsCustomId(member, customId))) {
    showToast(`「${card.name}」仍在目前編輯中的自訂卡片內，請先從編輯欄移除。`, "warning");
    return;
  }
  const dependents = state.customCards.filter(
    (item) => item.id !== customId && item.members.some((member) => tokenContainsCustomId(member, customId)),
  );
  if (dependents.length > 0) {
    showToast(`「${card.name}」仍被「${dependents.map((item) => item.name).join("、")}」使用，請先移除依賴它的自訂卡。`, "warning");
    return;
  }
  const changedFloating = state.cardGroups.floating.some(
    (token) => isCustomCardToken(token) && token.id === customId,
  );
  state.customCards = state.customCards.filter((item) => item.id !== customId);
  for (const combo of state.combos) {
    const fields = combo.kind === "grave" ? ["graveRequired"] : ["required", "forbidden"];
    for (const field of fields) {
      combo[field] = combo[field].filter((token) => !tokenContainsCustomId(token, customId));
    }
  }
  for (const group of Object.keys(state.cardGroups)) {
    state.cardGroups[group] = state.cardGroups[group].filter(
      (token) => !isCustomCardToken(token) || token.id !== customId,
    );
  }
  clearSelectedCard();
  saveCustomCards();
  saveCombos();
  saveCardGroups();
  renderCustomCards();
  renderCardGroups();
  if (changedFloating) resetFloatingCountRange();
  renderCombos();
  invalidateResult();
  showToast(`已移除「${card.name}」及其右側欄位引用。`);
}

function tokenContainsCustomId(token, customId, path = new Set()) {
  if (!isCustomCardToken(token)) return false;
  if (token.id === customId) return true;
  if (path.has(token.id)) return false;
  const nextPath = new Set(path).add(token.id);
  return token.members.some((member) => tokenContainsCustomId(member, customId, nextPath));
}

function groupCardsMarkup(cards, group) {
  if (cards.length === 0) {
    return `<div class="drop-empty"><span>＋</span><p>${group === "judgment" ? "拖放已設定的特殊判定卡" : "拖放卡片至此"}</p></div>`;
  }
  return cards
    .map(
      (token, index) => `
        <div class="mini-card${isCustomCardToken(token) ? " is-custom" : ""}" title="${escapeHtml(cardTokenLabel(token))}">
          ${miniCardVisualMarkup(token)}
          <button type="button" class="remove-group-card" data-group="${group}" data-index="${index}" aria-label="從此分類移除 ${escapeHtml(cardTokenLabel(token))}">×</button>
          <small>${escapeHtml(cardTokenLabel(token))}</small>
        </div>
      `,
    )
    .join("");
}

function miniCardVisualMarkup(token) {
  if (typeof token === "string") {
    return `
      <img src="${cardImageUrl(token)}" alt="卡片 ${token}" draggable="false">
      <span class="missing-mark" aria-hidden="true">${token}</span>
    `;
  }
  const firstMember = cardTokenMembers(token)[0] || "";
  const kind = customCardKind(token);
  const badge = ["draw", "mill"].includes(kind)
    ? `${customKindMeta[kind].short} ${token.amount}`
    : `${customKindMeta[kind].short} ${token.members.length}`;
  return `
    <div class="custom-mini-visual">
      ${firstMember ? `<img src="${cardImageUrl(firstMember)}" alt="自訂卡片 ${escapeHtml(token.name)}" draggable="false">` : ""}
      <span class="missing-mark" aria-hidden="true">${customKindMeta[kind].short}</span>
      <span class="custom-or-badge">${badge}</span>
    </div>
  `;
}

function effectiveCardSelectionCount(cards) {
  const selection = compileCardSelection(cards);
  return state.deck.reduce(
    (total, code) => total + Number(takeCardSelection(selection, code)),
    0,
  );
}

function updateFloatingDeckRangeSummary() {
  const currentFloatingCount = effectiveCardSelectionCount(state.cardGroups.floating);
  const baseDeckSize = Math.max(0, state.deck.length - currentFloatingCount);
  const minCount = Number(elements.floatingMinInput.value);
  const maxCount = Number(elements.floatingMaxInput.value);
  const inputMaximum = Math.max(currentFloatingCount, 60 - baseDeckSize);
  elements.floatingMinInput.max = String(inputMaximum);
  elements.floatingMaxInput.max = String(inputMaximum);
  if (!state.deck.length) {
    elements.floatingDeckRangeSummary.textContent = "載入牌組並設定浮動卡位後顯示總牌組範圍。";
    return;
  }
  if (!Number.isInteger(minCount) || !Number.isInteger(maxCount) || minCount < 0 || maxCount < minCount) {
    elements.floatingDeckRangeSummary.textContent = `固定核心 ${baseDeckSize} 張 · 請設定有效的浮動卡位上下限`;
    return;
  }
  const minDeckSize = baseDeckSize + minCount;
  const maxDeckSize = baseDeckSize + maxCount;
  elements.floatingDeckRangeSummary.textContent =
    `固定核心 ${baseDeckSize} 張 ＋ 浮動 ${minCount}～${maxCount} 張 ＝ 總牌組 ${minDeckSize}～${maxDeckSize} 張`;
}

function resetFloatingCountRange() {
  const currentFloatingCount = effectiveCardSelectionCount(state.cardGroups.floating);
  elements.floatingMinInput.value = String(currentFloatingCount);
  elements.floatingMaxInput.value = String(currentFloatingCount);
  updateFloatingDeckRangeSummary();
}

function renderCardGroups() {
  for (const group of ["judgment", "floating", "goingFirst", "goingSecond", "brick"]) {
    const cards = state.cardGroups[group];
    const cardsContainer = elements.cardGroups.querySelector(`[data-group-cards="${group}"]`);
    const count = elements.cardGroups.querySelector(`[data-group-count="${group}"]`);
    const zone = elements.cardGroups.querySelector(`.group-dropzone[data-group="${group}"]`);
    cardsContainer.innerHTML = groupCardsMarkup(cards, group);
    const effectiveCount = group === "judgment" ? cards.length : effectiveCardSelectionCount(cards);
    count.textContent = group === "judgment" ? `${effectiveCount} 項` : `${effectiveCount} 張`;
    count.title = group === "judgment"
      ? "只有此欄中的特殊判定會改變模擬抽牌或堆墓結果"
      : cards.some(isCustomCardToken)
        ? `${cards.length} 個設定項目，共代表 ${effectiveCount} 張正式卡`
        : "";
    zone.classList.toggle("is-disabled", state.deck.length === 0);
    zone.tabIndex = state.deck.length ? 0 : -1;
  }
  applyFloatingDeckState();
  updateFloatingDeckRangeSummary();
}

function miniCardsMarkup(cards, comboId, role) {
  if (cards.length === 0) {
    return `<div class="drop-empty"><span>＋</span><p>拖放卡片至此</p></div>`;
  }
  return cards
    .map(
      (token, index) => `
        <div class="mini-card${isCustomCardToken(token) ? " is-custom" : ""}" title="${escapeHtml(cardTokenLabel(token))}">
          ${miniCardVisualMarkup(token)}
          <button type="button" class="remove-card" data-combo-id="${comboId}" data-role="${role}" data-index="${index}" aria-label="移除 ${escapeHtml(cardTokenLabel(token))}">×</button>
          <small>${escapeHtml(cardTokenLabel(token))}</small>
        </div>
      `,
    )
    .join("");
}

function comboConditionMarkup(combo, index, field, label, className, description) {
  return `
    <div class="condition-block ${className}">
      <div class="condition-label">
        <span><i></i>${label}</span>
        <small>${combo[field].length} 項 · ${description}</small>
      </div>
      <div class="dropzone" data-combo-id="${combo.id}" data-role="${field}" role="button" tabindex="0" aria-label="啟動組合 ${index + 1} ${label}欄位">
        ${miniCardsMarkup(combo[field], combo.id, field)}
      </div>
    </div>
  `;
}

function renderCombos() {
  if (state.combos.length === 0) {
    elements.combosList.innerHTML = `
      <div class="no-combos">
        <span>◇</span>
        <p>尚未設定啟動條件</p>
        <small>載入牌組後，新增一組條件開始配置。</small>
      </div>
    `;
    updateCalculateState();
    return;
  }

  elements.combosList.innerHTML = state.combos
    .map(
      (combo, index) => {
        const isGrave = combo.kind === "grave";
        const conditions = isGrave
          ? comboConditionMarkup(combo, index, "graveRequired", "墓地／除外結果需求", "grave-block", "成立即為 True")
          : `${comboConditionMarkup(combo, index, "required", "手牌需求", "required-block", "必須全部成立")}
             ${comboConditionMarkup(combo, index, "forbidden", "不可上手", "forbidden-block", "任一成立即失敗")}`;
        return `
        <section class="combo-card${isGrave ? " grave-combo" : ""}" data-combo-id="${combo.id}">
          <header>
            <div><span class="combo-index">${String(index + 1).padStart(2, "0")}</span><h3>${isGrave ? "墓地／除外啟動" : "手牌啟動"} ${index + 1}</h3></div>
            <button type="button" class="remove-combo" data-combo-id="${combo.id}" aria-label="移除啟動組合 ${index + 1}">移除</button>
          </header>
          ${conditions}
        </section>
      `;
      },
    )
    .join("");
  updateCalculateState();
}

function addCombo(kind = "hand") {
  if (!state.deck.length) {
    showToast("請先載入 .ydk 牌組。", "warning");
    return;
  }
  state.combos.push(
    kind === "grave"
      ? { id: state.nextComboId++, kind: "grave", graveRequired: [] }
      : { id: state.nextComboId++, kind: "hand", required: [], forbidden: [] },
  );
  saveCombos();
  renderCombos();
  invalidateResult();
  elements.combosList.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function removeCombo(comboId) {
  state.combos = state.combos.filter((combo) => combo.id !== comboId);
  saveCombos();
  renderCombos();
  invalidateResult();
}

function addCardToCombo(comboId, role, rawToken) {
  const token = normalizeCardToken(rawToken);
  const combo = state.combos.find((item) => item.id === comboId);
  const allowedRoles = combo?.kind === "grave"
    ? ["graveRequired"]
    : ["required", "forbidden"];
  if (!token || !combo || !allowedRoles.includes(role)) return;
  if (isSpecialEffectCard(token)) {
    showToast("特殊判定卡只能放入「改變卡片判定」欄。", "warning");
    return;
  }
  combo[role].push(cloneCardToken(token));
  clearSelectedCard();
  saveCombos();
  renderCombos();
  invalidateResult();
}

function removeCardFromCombo(comboId, role, index) {
  const combo = state.combos.find((item) => item.id === comboId);
  if (!combo || !Array.isArray(combo[role])) return;
  combo[role].splice(index, 1);
  saveCombos();
  renderCombos();
  invalidateResult();
}

function addCardToGroup(group, rawToken) {
  const token = normalizeCardToken(rawToken);
  if (!token || !["judgment", "floating", "goingFirst", "goingSecond", "brick"].includes(group)) return;
  if (group === "judgment") {
    if (!isConfiguredEffectCard(token)) {
      showToast("只有已設定原卡與改變條件的特殊判定卡可放入此欄。", "warning");
      return;
    }
    if (state.cardGroups.judgment.some((item) => item.id === token.id)) {
      showToast(`「${token.name}」已啟用。`, "warning");
      return;
    }
    state.cardGroups.judgment.push(cloneCardToken(token));
    clearSelectedCard();
    saveCardGroups();
    renderCardGroups();
    invalidateResult();
    showToast(`已啟用「${token.name}」的卡片判定改寫。`, "success");
    return;
  }
  if (isSpecialEffectCard(token)) {
    showToast("特殊判定卡只能放入「改變卡片判定」欄。", "warning");
    return;
  }
  if (isCustomCardToken(token)) {
    if (state.cardGroups[group].some((item) => isCustomCardToken(item) && item.id === token.id)) {
      showToast(`「${token.name}」已加入該分類。`, "warning");
      return;
    }
  } else {
    const copiesInDeck = state.deck.filter((item) => item === token).length;
    const copiesInGroup = state.cardGroups[group].filter((item) => item === token).length;
    if (copiesInGroup >= copiesInDeck) {
      showToast(`此牌組中的 ${token} 已全部加入該分類。`, "warning");
      return;
    }
  }

  state.cardGroups[group].push(cloneCardToken(token));
  clearSelectedCard();
  saveCardGroups();
  renderCardGroups();
  if (group === "floating") resetFloatingCountRange();
  invalidateResult();
}

function removeCardFromGroup(group, index) {
  if (!Array.isArray(state.cardGroups[group])) return;
  state.cardGroups[group].splice(index, 1);
  saveCardGroups();
  renderCardGroups();
  if (group === "floating") resetFloatingCountRange();
  invalidateResult();
}

async function handleDeckFile(file) {
  if (!state.config.ready) {
    openSettings(true);
    return;
  }
  if (!file || !file.name.toLowerCase().endsWith(".ydk")) {
    showToast("請選擇副檔名為 .ydk 的牌組檔案。", "error");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showToast("這個 .ydk 檔案異常過大，請檢查檔案內容。", "error");
    return;
  }

  try {
    const cards = parseYdk(await file.text());
    state.deck = cards;
    state.deckName = file.name;
    state.deckKey = simpleDeckHash(cards);
    restoreCustomCards();
    restoreCombos();
    restoreCardGroups();
    renderDeck();
    renderCustomCards();
    closeCustomCardEditor();
    renderCardGroups();
    resetFloatingCountRange();
    renderCombos();
    invalidateResult();
    showToast(`已載入 ${cards.length} 張主牌組卡片。`, "success");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    elements.deckFileInput.value = "";
  }
}

function updateCalculateState() {
  const hasValidBasics = state.deck.length > 0 && state.combos.length > 0;
  const isBusy = Boolean(state.worker || state.gameWorker);
  elements.calculateButton.disabled = !hasValidBasics || isBusy;
  elements.calculateGameButton.disabled = !hasValidBasics || isBusy;
}

function validateSimulation() {
  if (!state.deck.length) return "請先載入牌組。";
  if (!state.combos.length) return "請至少添加一個啟動組合。";
  for (let index = 0; index < state.combos.length; index += 1) {
    const combo = state.combos[index];
    if (combo.kind === "grave") {
      if (combo.graveRequired.length === 0) {
        return `墓地／除外啟動 ${index + 1} 至少需要一項「墓地／除外結果需求」。`;
      }
    } else if (combo.required.length === 0) {
      return `手牌啟動 ${index + 1} 至少需要一項「手牌需求」。`;
    }
  }

  const handSize = Number(elements.handSizeInput.value);
  const trials = Number(elements.trialCountInput.value);
  if (!Number.isInteger(handSize) || handSize < 1 || handSize > state.deck.length) {
    return `起手張數需介於 1 到 ${state.deck.length}。`;
  }
  if (!Number.isInteger(trials) || trials < 1000 || trials > 2000000) {
    return "模擬次數需介於 1,000 到 2,000,000。";
  }
  return "";
}

function formatInteger(value) {
  return new Intl.NumberFormat("zh-TW").format(value);
}

function formatRate(value) {
  return `${(value * 100).toFixed(2)}%`;
}

function updateGameHandLabels() {
  const handSize = Number(elements.handSizeInput.value);
  elements.firstHandSizeLabel.textContent = Number.isInteger(handSize) ? String(handSize) : "—";
  elements.secondHandSizeLabel.textContent = Number.isInteger(handSize) ? String(handSize + 1) : "—";
}

function selectedAllocationMethods() {
  return [...elements.allocationMethodSelector.querySelectorAll('input[name="allocationMethod"]:checked')].map(
    (input) => input.value,
  );
}

function validateGameSimulation() {
  const baseError = validateSimulation();
  if (baseError) return baseError;
  const handSize = Number(elements.handSizeInput.value);
  if (state.gameMode !== "reverse" && handSize + 1 > state.deck.length) {
    return `後手需抽 ${handSize + 1} 張，因此起手張數最多可設為 ${state.deck.length - 1}。`;
  }
  const conditions = [
    [elements.firstStarterMinInput, "先手成立啟動組合數"],
    [elements.firstRoleMinInput, "先手阻抗卡張數"],
    [elements.secondStarterMinInput, "後手成立啟動組合數"],
    [elements.secondRoleMinInput, "後手對策卡張數"],
  ];
  for (const [input, label] of conditions) {
    const value = Number(input.value);
    if (!Number.isInteger(value) || value < 0) return `${label}必須是大於或等於 0 的整數。`;
  }
  if (state.gameMode === "reverse" && state.cardGroups.floating.length === 0) {
    return "從目標反推前，請至少設定一張浮動卡位。";
  }
  if (state.gameMode === "reverse") {
    const methodCount = selectedAllocationMethods().length;
    if (methodCount < 1 || methodCount > 3) return "請選擇 1～3 項浮動卡配置方式。";
    const floatingMin = Number(elements.floatingMinInput.value);
    const floatingMax = Number(elements.floatingMaxInput.value);
    if (!Number.isInteger(floatingMin) || !Number.isInteger(floatingMax) || floatingMin < 0) {
      return "浮動卡位數上下限必須是大於或等於 0 的整數。";
    }
    if (floatingMax < floatingMin) return "浮動卡位數上限不可小於下限。";
    if (floatingMax - floatingMin > 20) return "浮動卡位數範圍一次最多比較 21 種張數。";
    const currentFloatingCount = effectiveCardSelectionCount(state.cardGroups.floating);
    const baseDeckSize = state.deck.length - currentFloatingCount;
    if (baseDeckSize + floatingMin < handSize + 1) {
      return `浮動卡位下限會使牌組少於後手起手所需的 ${handSize + 1} 張。`;
    }
    if (baseDeckSize + floatingMax > 60) return "調整後的總牌組張數不可超過 60 張。";
  }
  return "";
}

function renderGameResult(result) {
  elements.gameResultCaption.textContent =
    state.gameMode === "reverse" ? "最佳分配綜合勝率" : "先後手平均綜合勝率";
  elements.gameCombinedRate.textContent = formatRate(result.combinedRate);
  elements.gameTrialSummary.textContent = state.gameMode === "reverse"
    ? `每種張數 ${formatInteger(result.trials)} 次 · 合計 ${formatInteger(result.totalEvaluatedTrials)} 次`
    : `${formatInteger(result.trials)} 次共同試抽`;
  elements.gameFirstRate.textContent = formatRate(result.firstRate);
  elements.gameFirstFraction.textContent = `${formatInteger(result.firstWins)} / ${formatInteger(result.trials)}`;
  elements.gameSecondRate.textContent = formatRate(result.secondRate);
  elements.gameSecondFraction.textContent = `${formatInteger(result.secondWins)} / ${formatInteger(result.trials)}`;
  elements.gameOutcomeTT.textContent = formatRate(result.matrix.tt / result.trials);
  elements.gameOutcomeTF.textContent = formatRate(result.matrix.tf / result.trials);
  elements.gameOutcomeFT.textContent = formatRate(result.matrix.ft / result.trials);
  elements.gameOutcomeFF.textContent = formatRate(result.matrix.ff / result.trials);
  const isReverse = state.gameMode === "reverse";
  elements.allocationResult.hidden = !isReverse;
  if (isReverse) {
    elements.bestDeckSize.textContent = String(result.deckSize);
    elements.bestFloatingCount.textContent = String(result.floatingCount);
    const minDeckSize = result.baseDeckSize + result.floatingMin;
    const maxDeckSize = result.baseDeckSize + result.floatingMax;
    elements.deckRangeResult.textContent =
      `已比較總牌組 ${minDeckSize}～${maxDeckSize} 張；最佳結果採 ${result.deckSize} 張。`;
    elements.allocationList.innerHTML = result.allocation
      .map(({ method, cards }) => {
        const label = allocationMethodLabels[method] || method;
        return `<article><span>${label}</span><strong>${cards.length} 張</strong><p>${cards.length ? cards.join("、") : "—"}</p></article>`;
      })
      .join("");
    elements.allocationNote.textContent =
      `只比較「${result.allocation.map(({ method }) => allocationMethodLabels[method]).join("、")}」；固定 ${result.baseDeckSize} 張非浮動核心。只有同密碼卡全數移入浮動卡位時才會排除既有條件；部分移入仍保留，現有 ${result.maskedComboCount} 組啟動條件。`;
  }
  elements.gameResultCard.hidden = false;
}

function runGameSimulation() {
  const validationError = validateGameSimulation();
  if (validationError) {
    showToast(validationError, "error");
    return;
  }

  invalidateGameResult(false);
  const handSize = Number(elements.handSizeInput.value);
  const trials = Number(elements.trialCountInput.value);
  const worker = new Worker("/assets/game-simulation-worker.mjs", { type: "module" });
  state.gameWorker = worker;
  updateCalculateState();
  elements.calculateGameButton.classList.add("is-running");
  elements.calculateGameButton.querySelector(".calculate-label").textContent =
    state.gameMode === "reverse" ? "正在比較分配" : "賽局模擬中";
  elements.gameProgressWrap.hidden = false;
  elements.gameProgressBar.style.width = "0%";
  elements.gameProgressText.textContent =
    state.gameMode === "reverse" ? "正在建立共同試抽並比較配置… 0%" : "正在進行先後手共同判定… 0%";

  worker.addEventListener("message", (event) => {
    if (event.data.type === "progress") {
      const percent = Math.min(100, Math.round(event.data.progress * 100));
      elements.gameProgressBar.style.width = `${percent}%`;
      elements.gameProgressText.textContent =
        state.gameMode === "reverse"
          ? `正在建立共同試抽並比較配置… ${percent}%`
          : `正在進行先後手共同判定… ${percent}%`;
      return;
    }
    if (event.data.type === "error") {
      showToast(event.data.message, "error");
      worker.terminate();
      state.gameWorker = null;
      invalidateGameResult();
      return;
    }
    if (event.data.type === "result") {
      const result = event.data.result;
      elements.gameProgressBar.style.width = "100%";
      elements.gameProgressText.textContent = state.gameMode === "reverse"
        ? `完成 ${formatInteger(result.totalEvaluatedTrials)} 次跨張數試抽`
        : `完成 ${formatInteger(result.trials)} 次共同試抽`;
      renderGameResult(result);
      worker.terminate();
      state.gameWorker = null;
      elements.calculateGameButton.classList.remove("is-running");
      elements.calculateGameButton.querySelector(".calculate-label").textContent =
        state.gameMode === "reverse" ? "重新尋找最佳分配" : "重新計算賽局勝率";
      updateCalculateState();
    }
  });

  worker.addEventListener("error", () => {
    showToast("賽局模擬工作程序發生錯誤。", "error");
    worker.terminate();
    state.gameWorker = null;
    invalidateGameResult();
  });

  worker.postMessage({
    mode: state.gameMode,
    deck: state.deck,
    combos: state.combos,
    activeEffects: state.cardGroups.judgment,
    handSize,
    trials,
    goingFirstCards: state.cardGroups.goingFirst,
    goingSecondCards: state.cardGroups.goingSecond,
    floatingCards: state.cardGroups.floating,
    floatingMin: Number(elements.floatingMinInput.value),
    floatingMax: Number(elements.floatingMaxInput.value),
    allocationMethods: selectedAllocationMethods(),
    firstStarterMin: Number(elements.firstStarterMinInput.value),
    firstRoleMin: Number(elements.firstRoleMinInput.value),
    secondStarterMin: Number(elements.secondStarterMinInput.value),
    secondRoleMin: Number(elements.secondRoleMinInput.value),
  });
}

function runSimulation() {
  const validationError = validateSimulation();
  if (validationError) {
    showToast(validationError, "error");
    return;
  }

  invalidateResult();
  const handSize = Number(elements.handSizeInput.value);
  const trials = Number(elements.trialCountInput.value);
  const worker = new Worker("/assets/monte-carlo-worker.mjs", { type: "module" });
  state.worker = worker;
  elements.calculateButton.disabled = true;
  elements.calculateButton.classList.add("is-running");
  elements.calculateButton.querySelector(".calculate-label").textContent = "模擬進行中";
  elements.progressWrap.hidden = false;
  elements.progressBar.style.width = "0%";
  elements.progressText.textContent = "正在洗牌與試抽… 0%";

  worker.addEventListener("message", (event) => {
    if (event.data.type === "progress") {
      const percent = Math.min(100, Math.round(event.data.progress * 100));
      elements.progressBar.style.width = `${percent}%`;
      elements.progressText.textContent = `正在洗牌與試抽… ${percent}%`;
      return;
    }
    if (event.data.type === "error") {
      showToast(event.data.message, "error");
      worker.terminate();
      state.worker = null;
      invalidateResult();
      return;
    }
    if (event.data.type === "result") {
      const result = event.data.result;
      elements.progressBar.style.width = "100%";
      elements.progressText.textContent = `完成 ${formatInteger(result.trials)} 次試抽`;
      elements.resultRate.textContent = formatRate(result.rate);
      elements.resultFraction.textContent = `${formatInteger(result.success)} / ${formatInteger(result.trials)}`;
      elements.resultSuccess.textContent = formatInteger(result.success);
      elements.resultFailure.textContent = formatInteger(result.failure);
      elements.resultInterval.textContent = `${formatRate(result.intervalLow)}–${formatRate(result.intervalHigh)}`;
      elements.resultGoingFirstExpected.textContent = result.goingFirstExpected.toFixed(3);
      elements.resultGoingFirstDetail.textContent = `基礎起手 ${handSize} 張（含抽牌追加）· 至少一張 ${formatRate(result.goingFirstHitRate)}`;
      elements.resultGoingSecondExpected.textContent = result.goingSecondExpected.toFixed(3);
      elements.resultGoingSecondDetail.textContent = `基礎起手 ${handSize} 張（含抽牌追加）· 至少一張 ${formatRate(result.goingSecondHitRate)}`;
      elements.resultBrickGames.textContent = Number.isFinite(result.brickGamesPerHit)
        ? result.brickGamesPerHit.toFixed(2)
        : "未發生";
      elements.resultBrickDetail.textContent = `基礎起手 ${handSize} 張（含抽牌追加）· 至少一張 ${formatRate(result.brickHitRate)}`;
      elements.resultCard.hidden = false;
      worker.terminate();
      state.worker = null;
      elements.calculateButton.classList.remove("is-running");
      elements.calculateButton.querySelector(".calculate-label").textContent = "重新計算";
      updateCalculateState();
    }
  });

  worker.addEventListener("error", () => {
    showToast("模擬工作程序發生錯誤。", "error");
    worker.terminate();
    state.worker = null;
    invalidateResult();
  });

  worker.postMessage({
    deck: state.deck,
    combos: state.combos,
    activeEffects: state.cardGroups.judgment,
    handSize,
    trials,
    goingFirstCards: state.cardGroups.goingFirst,
    goingSecondCards: state.cardGroups.goingSecond,
    brickCards: state.cardGroups.brick,
  });
}

elements.openSettingsButton.addEventListener("click", () => openSettings(false));
elements.pickRootButton.addEventListener("click", () => pickDirectory("root"));
elements.pickPicsButton.addEventListener("click", () => pickDirectory("pics"));
elements.settingsDialog.addEventListener("cancel", (event) => {
  if (state.requiredSetup || !state.config.ready) event.preventDefault();
});
elements.settingsForm.addEventListener("submit", (event) => {
  const action = event.submitter?.value;
  if (action === "cancel" && (state.requiredSetup || !state.config.ready)) {
    event.preventDefault();
    return;
  }
  if (action === "confirm") {
    if (!state.config.ready) {
      event.preventDefault();
      return;
    }
    state.requiredSetup = false;
    elements.cancelSettingsButton.hidden = false;
    showToast("路徑設定已儲存。", "success");
  }
});

elements.uploadTarget.addEventListener("click", () => elements.deckFileInput.click());
elements.replaceDeckButton.addEventListener("click", () => elements.deckFileInput.click());
elements.deckFileInput.addEventListener("change", () => handleDeckFile(elements.deckFileInput.files?.[0]));
for (const eventName of ["dragenter", "dragover"]) {
  elements.uploadTarget.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.uploadTarget.classList.add("is-dragging");
  });
}
for (const eventName of ["dragleave", "drop"]) {
  elements.uploadTarget.addEventListener(eventName, (event) => {
    event.preventDefault();
    elements.uploadTarget.classList.remove("is-dragging");
  });
}
elements.uploadTarget.addEventListener("drop", (event) => handleDeckFile(event.dataTransfer?.files?.[0]));

elements.cardGrid.addEventListener("dragstart", (event) => {
  const card = event.target.closest(".deck-card");
  if (!card || !event.dataTransfer) return;
  event.dataTransfer.effectAllowed = "copy";
  setDraggedCardToken(event.dataTransfer, card.dataset.code);
  card.classList.add("is-dragging");
});
elements.cardGrid.addEventListener("dragend", (event) => {
  event.target.closest(".deck-card")?.classList.remove("is-dragging");
  document.querySelectorAll(".dropzone.is-over").forEach((zone) => zone.classList.remove("is-over"));
  document.querySelectorAll(".group-dropzone.is-over").forEach((zone) => zone.classList.remove("is-over"));
});
function selectDeckCard(card) {
  if (!card) return;
  const wasSelected = state.selectedToken === card.dataset.code && card.classList.contains("is-selected");
  clearSelectedCard();
  if (!wasSelected) {
    state.selectedToken = card.dataset.code;
    card.classList.add("is-selected");
    showToast(`已選取 ${card.dataset.code}，請點右側的分類或啟動條件欄位。`);
  }
}
elements.cardGrid.addEventListener("click", (event) => selectDeckCard(event.target.closest(".deck-card")));
elements.cardGrid.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target.closest(".deck-card");
  if (!card) return;
  event.preventDefault();
  selectDeckCard(card);
});

elements.addCustomCardButton.addEventListener("click", openCustomCardEditor);
elements.cancelCustomCardButton.addEventListener("click", closeCustomCardEditor);
elements.saveCustomCardButton.addEventListener("click", saveCustomCard);
elements.customCardKindInput.addEventListener("change", updateCustomEditorKind);
elements.customEffectTarget.addEventListener("click", (event) => {
  if (event.target.closest("#removeCustomEffectTarget")) {
    state.customDraftTarget = null;
    renderCustomEffectTarget();
  }
});
for (const eventName of ["dragenter", "dragover"]) {
  elements.customEffectTargetDropzone.addEventListener(eventName, (event) => {
    if (elements.customEffectFields.hidden) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    elements.customEffectTargetDropzone.classList.add("is-over");
  });
}
elements.customEffectTargetDropzone.addEventListener("dragleave", (event) => {
  if (!elements.customEffectTargetDropzone.contains(event.relatedTarget)) {
    elements.customEffectTargetDropzone.classList.remove("is-over");
  }
});
elements.customEffectTargetDropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  elements.customEffectTargetDropzone.classList.remove("is-over");
  const token = draggedCardToken(event.dataTransfer);
  if (token) setCustomEffectTarget(token);
});
elements.customEffectTargetDropzone.addEventListener("click", (event) => {
  if (event.target.closest("#removeCustomEffectTarget")) return;
  if (state.selectedToken) {
    setCustomEffectTarget(state.selectedToken);
    clearSelectedCard();
  }
});
elements.customEffectTargetDropzone.addEventListener("keydown", (event) => {
  if ((event.key !== "Enter" && event.key !== " ") || !state.selectedToken) return;
  event.preventDefault();
  setCustomEffectTarget(state.selectedToken);
  clearSelectedCard();
});
elements.customDraftMembers.addEventListener("click", (event) => {
  const button = event.target.closest("[data-draft-index]");
  if (!button) return;
  state.customDraftMembers.splice(Number(button.dataset.draftIndex), 1);
  renderCustomDraft();
});
for (const eventName of ["dragenter", "dragover"]) {
  elements.customMemberDropzone.addEventListener(eventName, (event) => {
    if (elements.customCardEditor.hidden) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    elements.customMemberDropzone.classList.add("is-over");
  });
}
elements.customMemberDropzone.addEventListener("dragleave", (event) => {
  if (!elements.customMemberDropzone.contains(event.relatedTarget)) {
    elements.customMemberDropzone.classList.remove("is-over");
  }
});
elements.customMemberDropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  elements.customMemberDropzone.classList.remove("is-over");
  const token = draggedCardToken(event.dataTransfer);
  if (token) addDraftMember(token);
});
elements.customMemberDropzone.addEventListener("click", () => {
  if (typeof state.selectedToken !== "string") return;
  addDraftMember(state.selectedToken);
  clearSelectedCard();
});
elements.customMemberDropzone.addEventListener("keydown", (event) => {
  if ((event.key !== "Enter" && event.key !== " ") || typeof state.selectedToken !== "string") return;
  event.preventDefault();
  addDraftMember(state.selectedToken);
  clearSelectedCard();
});

function showCustomCardDetails(cardElement) {
  if (!cardElement) return;
  const card = customCardById(cardElement.dataset.customId);
  if (card) openCustomCardDetails(card);
}

elements.customCardList.addEventListener("click", (event) => {
  const removeButton = event.target.closest(".remove-custom-card");
  if (removeButton) {
    removeCustomCard(removeButton.dataset.customId);
    return;
  }
  if (state.customCardDragged) return;
  showCustomCardDetails(event.target.closest(".custom-card-item"));
});
elements.customCardList.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const card = event.target.closest(".custom-card-item");
  if (!card || event.target.closest("button")) return;
  event.preventDefault();
  showCustomCardDetails(card);
});
elements.customCardList.addEventListener("dragstart", (event) => {
  const cardElement = event.target.closest(".custom-card-item");
  const card = cardElement ? customCardById(cardElement.dataset.customId) : null;
  if (!card || !event.dataTransfer) return;
  state.customCardDragged = true;
  event.dataTransfer.effectAllowed = "copy";
  setDraggedCardToken(event.dataTransfer, card);
  cardElement.classList.add("is-dragging");
});
elements.customCardList.addEventListener("dragend", (event) => {
  event.target.closest(".custom-card-item")?.classList.remove("is-dragging");
  document.querySelectorAll(".dropzone.is-over, .group-dropzone.is-over").forEach((zone) => zone.classList.remove("is-over"));
  window.setTimeout(() => {
    state.customCardDragged = false;
  }, 0);
});

elements.closeCustomCardDetailsButton.addEventListener("click", closeCustomCardDetails);
elements.customCardDetailsDialog.addEventListener("click", (event) => {
  const shell = event.target.closest(".custom-details-shell");
  if (!shell) closeCustomCardDetails();
});

elements.cardGroups.addEventListener("click", (event) => {
  const removeButton = event.target.closest(".remove-group-card");
  if (removeButton) {
    removeCardFromGroup(removeButton.dataset.group, Number(removeButton.dataset.index));
    return;
  }
  const zone = event.target.closest(".group-dropzone");
  if (zone && state.selectedToken) addCardToGroup(zone.dataset.group, state.selectedToken);
});
elements.cardGroups.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const zone = event.target.closest(".group-dropzone");
  if (!zone || !state.selectedToken) return;
  event.preventDefault();
  addCardToGroup(zone.dataset.group, state.selectedToken);
});
elements.cardGroups.addEventListener("dragover", (event) => {
  const zone = event.target.closest(".group-dropzone");
  if (!zone || !state.deck.length) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  elements.cardGroups
    .querySelectorAll(".group-dropzone.is-over")
    .forEach((item) => item.classList.toggle("is-over", item === zone));
});
elements.cardGroups.addEventListener("dragleave", (event) => {
  const zone = event.target.closest(".group-dropzone");
  if (zone && !zone.contains(event.relatedTarget)) zone.classList.remove("is-over");
});
elements.cardGroups.addEventListener("drop", (event) => {
  const zone = event.target.closest(".group-dropzone");
  if (!zone) return;
  event.preventDefault();
  zone.classList.remove("is-over");
  const token = draggedCardToken(event.dataTransfer);
  if (token) addCardToGroup(zone.dataset.group, token);
});

elements.addComboButton.addEventListener("click", () => addCombo("hand"));
elements.addGraveComboButton.addEventListener("click", () => addCombo("grave"));
elements.combosList.addEventListener("click", (event) => {
  const removeComboButton = event.target.closest(".remove-combo");
  if (removeComboButton) {
    removeCombo(Number(removeComboButton.dataset.comboId));
    return;
  }
  const removeCardButton = event.target.closest(".remove-card");
  if (removeCardButton) {
    removeCardFromCombo(
      Number(removeCardButton.dataset.comboId),
      removeCardButton.dataset.role,
      Number(removeCardButton.dataset.index),
    );
    return;
  }
  const zone = event.target.closest(".dropzone");
  if (zone && state.selectedToken) {
    addCardToCombo(Number(zone.dataset.comboId), zone.dataset.role, state.selectedToken);
  }
});
elements.combosList.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const zone = event.target.closest(".dropzone");
  if (!zone || !state.selectedToken) return;
  event.preventDefault();
  addCardToCombo(Number(zone.dataset.comboId), zone.dataset.role, state.selectedToken);
});
elements.combosList.addEventListener("dragover", (event) => {
  const zone = event.target.closest(".dropzone");
  if (!zone) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  document.querySelectorAll(".dropzone.is-over").forEach((item) => item.classList.toggle("is-over", item === zone));
});
elements.combosList.addEventListener("dragleave", (event) => {
  const zone = event.target.closest(".dropzone");
  if (zone && !zone.contains(event.relatedTarget)) zone.classList.remove("is-over");
});
elements.combosList.addEventListener("drop", (event) => {
  const zone = event.target.closest(".dropzone");
  if (!zone) return;
  event.preventDefault();
  zone.classList.remove("is-over");
  const token = draggedCardToken(event.dataTransfer);
  if (token) addCardToCombo(Number(zone.dataset.comboId), zone.dataset.role, token);
});

elements.calculateButton.addEventListener("click", runSimulation);
elements.calculateGameButton.addEventListener("click", runGameSimulation);
elements.gameModeSwitch.addEventListener("change", (event) => {
  if (!event.target.matches('input[name="gameMode"]')) return;
  state.gameMode = event.target.value;
  elements.reverseModeNote.hidden = state.gameMode !== "reverse";
  elements.floatingCountRange.hidden = state.gameMode !== "reverse";
  elements.allocationMethodSelector.hidden = state.gameMode !== "reverse";
  invalidateGameResult();
});
elements.allocationMethodSelector.addEventListener("change", (event) => {
  if (!event.target.matches('input[name="allocationMethod"]')) return;
  let methods = selectedAllocationMethods();
  if (methods.length > 3) {
    event.target.checked = false;
    showToast("浮動卡配置方式最多只能選擇三項。", "warning");
    methods = selectedAllocationMethods();
  }
  elements.allocationMethodCount.textContent = String(methods.length);
  invalidateGameResult();
});
for (const input of [elements.floatingMinInput, elements.floatingMaxInput]) {
  input.addEventListener("input", () => {
    updateFloatingDeckRangeSummary();
    invalidateGameResult();
  });
}
for (const input of [
  elements.firstStarterMinInput,
  elements.firstRoleMinInput,
  elements.secondStarterMinInput,
  elements.secondRoleMinInput,
]) {
  input.addEventListener("input", () => invalidateGameResult());
}
elements.handSizeInput.addEventListener("input", () => {
  updateGameHandLabels();
  invalidateResult();
});
elements.trialCountInput.addEventListener("input", invalidateResult);

attachImageFallback(elements.cardGrid);
attachImageFallback(elements.customCardList);
attachImageFallback(elements.customDraftMembers);
attachImageFallback(elements.customEffectTarget);
attachImageFallback(elements.customCardDetailsGrid);
attachImageFallback(elements.cardGroups);
attachImageFallback(elements.combosList);
renderDeck();
renderCustomCards();
renderCustomDraft();
renderCustomEffectTarget();
renderCardGroups();
renderCombos();
updateGameHandLabels();
loadConfig();
