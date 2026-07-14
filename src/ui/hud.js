import { PHASE } from "../game/content/constants.js";
import { LOCALES, normalizeLocale, t, tStat } from "../game/content/i18n.js";
import { findWeapon } from "../game/content/weapons.js";
import { formatCash, formatCashAmount } from "../game/simulation/math.js";
import { getNextUnlock } from "../game/simulation/progression.js";
import { getVisibleRunEffects } from "../game/simulation/runEffects.js";
import { normalizeAudioSettings } from "../game/audio/audioSettings.js";
import { formatScore } from "./formatters.js";
import { renderControlHints } from "./hints.js";
import { icon } from "./icons.js";
import { renderLeaderboardButton, renderLeaderboardPanel } from "./leaderboardView.js";
import { renderMissionProgress, renderMissions, renderVictory } from "./missionViews.js";
import { renderEndlessCheckpoint, renderRoundVictoryPrompt } from "./runSummaryView.js";
import { renderShop } from "./shopView.js";
import { getDisplayedStatValue } from "./runStats.js";
import { renderWeaponTools } from "./weaponView.js";
import { GAME_MODE } from "../game/content/modes.js";
import { renderModeSelect } from "./modeSelectView.js";
import { getPendingVictory } from "../game/simulation/victoryProgress.js";
import { renderAlternateModeLobby } from "./modeLobbyView.js";

const STAT_ORDER = ["fireRate", "range", "ammo", "power", "baseLife", "income", "doubleWeapon", "soldiers", "soldierTraining", "wallDamage", "shieldDamage", "breachDamage"];
const WIKI_ITEMS = ["enemies", "variants", "health", "life", "collision", "ammo", "soldiers", "recruits", "materials", "duration", "buffs", "debuffs", "boss"];

export function createHud(root, callbacks) {
  root.innerHTML = createShell();
  const elements = collectElements(root);

  root.addEventListener("click", (event) => handleClick(event, callbacks, root));
  root.addEventListener("change", (event) => handleChange(event, callbacks));
  root.addEventListener("input", (event) => handleInput(event, callbacks));

  return {
    canvasHost: elements.canvasHost,
    update(state) {
      updateHud(elements, state);
      updateOverlay(elements, state);
    },
    activateFocused() {
      activateFocusedAction(root, elements.overlay);
    },
    moveFocus(direction) {
      moveOverlayFocus(elements.overlay, direction);
    },
    scrollOverlay(amount) {
      scrollOverlayPanel(elements.overlay, amount);
    },
    hasOverlay() {
      return elements.overlay.classList.contains("is-visible");
    },
  };
}

function createShell() {
  return `
    <main class="game-shell">
      <div class="canvas-host" data-testid="canvas-host"></div>
      <section class="top-hud" aria-live="polite">
        <div class="brand-chip">Master Gun</div>
        <div class="hud-chip" data-testid="level-chip"></div>
        <div class="hud-chip cash" data-testid="cash-chip"></div>
        <div class="hud-chip" data-testid="ammo-chip"></div>
        <div class="hud-chip life" data-testid="life-chip"></div>
        <div class="hud-chip score" data-testid="score-chip"></div>
        <button class="icon-button" data-action="missions" data-testid="missions-button" aria-label="Missions">${icon("score")}</button>
        <button class="icon-button" data-action="info" data-testid="info-button" aria-label="Info">${icon("info")}</button>
        <button class="icon-button" data-action="sound" data-testid="sound-button" aria-label="Sound">${icon("sound")}</button>
        <select class="locale-select" data-change="locale" data-testid="locale-select"></select>
        <button class="icon-button" data-action="pause" aria-label="Pause">II</button>
      </section>
      <section class="control-hints" data-testid="control-hints"></section>
      <section class="effect-stack" data-testid="effect-stack" aria-live="polite"></section>
      <section class="special-shot-prompt" data-testid="special-shot-prompt" aria-live="assertive"></section>
      <section class="stat-stack" data-testid="stat-stack"></section>
      <section class="progress-strip">
        <div class="progress-fill" data-testid="progress-fill"></div>
      </section>
      <section class="message-stack" data-testid="message-stack"></section>
      <section class="overlay" data-testid="overlay"></section>
    </main>
  `;
}

function collectElements(root) {
  return {
    shell: root.querySelector(".game-shell"),
    canvasHost: root.querySelector(".canvas-host"),
    level: root.querySelector("[data-testid='level-chip']"),
    cash: root.querySelector("[data-testid='cash-chip']"),
    ammo: root.querySelector("[data-testid='ammo-chip']"),
    life: root.querySelector("[data-testid='life-chip']"),
    score: root.querySelector("[data-testid='score-chip']"),
    hints: root.querySelector("[data-testid='control-hints']"),
    effects: root.querySelector("[data-testid='effect-stack']"),
    specialShot: root.querySelector("[data-testid='special-shot-prompt']"),
    soundButton: root.querySelector("[data-testid='sound-button']"),
    stats: root.querySelector("[data-testid='stat-stack']"),
    progress: root.querySelector("[data-testid='progress-fill']"),
    messages: root.querySelector("[data-testid='message-stack']"),
    overlay: root.querySelector("[data-testid='overlay']"),
    locale: root.querySelector("[data-testid='locale-select']"),
  };
}

function handleClick(event, callbacks, root) {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  rememberFocus(root, button);
  callbacks.onUiAction?.(action);
  if (action === "shopScroll") {
    scrollShopOffers(root, Number(button.dataset.direction));
    return;
  }
  const actions = {
    start: callbacks.onStart,
    pause: callbacks.onPause,
    resume: callbacks.onResume,
    menu: callbacks.onMenu,
    next: callbacks.onNext,
    continueVictory: callbacks.onContinueVictory,
    reset: callbacks.onReset,
    info: callbacks.onInfo,
    closeInfo: callbacks.onCloseInfo,
    sound: callbacks.onSound,
    closeSound: callbacks.onCloseSound,
    missions: callbacks.onMissions,
    closeMissions: callbacks.onCloseMissions,
    missionFilter: () => callbacks.onMissionFilter(button.dataset.filter),
    leaderboard: callbacks.onLeaderboard,
    closeLeaderboard: callbacks.onCloseLeaderboard,
    closeVictory: callbacks.onVictoryClose,
    buy: () => callbacks.onBuy(button.dataset.offer),
    equip: () => callbacks.onEquipWeapon(button.dataset.weapon),
    profileCreate: () => callbacks.onProfileCreate(getProfileInput(root)),
    modeSelect: () => callbacks.onModeSelect(button.dataset.mode),
    modeBack: callbacks.onModeBack,
    modeOption: () => callbacks.onModeSelection(button.dataset.key, parseModeValue(button.dataset.value)),
    endlessContinue: callbacks.onEndlessContinue,
    endlessExtract: callbacks.onEndlessExtract,
  };

  actions[action]?.();
}

function handleInput(event, callbacks) {
  const control = event.target.closest("[data-audio-setting]");
  if (!control) return;
  const value = Number(control.value) / 100;
  const container = control.closest(".volume-control");
  container?.style.setProperty("--volume", `${control.value}%`);
  container?.style.setProperty("--angle", `${-135 + Number(control.value) * 2.7}deg`);
  const output = container?.querySelector("output");
  if (output) output.textContent = `${control.value}%`;
  callbacks.onAudioSetting?.(control.dataset.audioSetting, value);
}

function handleChange(event, callbacks) {
  const control = event.target.closest("[data-change]");
  if (!control) return;

  if (control.dataset.change === "locale") callbacks.onLocale(control.value);
  if (control.dataset.change === "profile") callbacks.onProfileSelect(control.value);
}

function updateHud(elements, state) {
  const locale = getLocale(state);
  const run = state.run;
  elements.shell.dataset.inputSource = state.inputSource ?? "pointer";
  elements.level.innerHTML = `${icon("score")} ${getModeProgressLabel(state, locale)}`;
  elements.cash.innerHTML = `${icon("cash")} ${t(locale, "hud.cash", { value: formatCashAmount(state.save.cash) })}`;
  elements.ammo.innerHTML = `${icon("ammo")} ${getAmmoText(run, locale)}`;
  elements.life.innerHTML = `${icon("life")} ${getLifeText(run, locale)}`;
  elements.score.innerHTML = `${icon("score")} ${t(locale, "hud.score", { value: formatScore(run?.score) })}`;
  elements.progress.style.width = `${getProgressPercent(run)}%`;
  elements.hints.innerHTML = renderControlHints(state, locale);
  elements.effects.innerHTML = renderRunEffects(run, locale);
  elements.specialShot.innerHTML = renderSpecialShotPrompt(run, locale);
  elements.stats.innerHTML = renderStats(state, locale);
  syncMessages(elements.messages, state.phase === PHASE.RUNNING ? run : null);
  elements.locale.innerHTML = renderLocaleOptions(locale);
  elements.locale.value = locale;
  elements.soundButton.setAttribute("aria-label", t(locale, "action.sound"));
}

function getModeProgressLabel(state, locale) {
  const mode = state.run?.mode ?? state.selectedMode;
  const renderers = {
    [GAME_MODE.WEAPON_MASTERY]: () => t(locale, "hud.masteryTrial", { value: state.run?.modeContext?.trial?.number ?? state.modeSelection.masteryTrial }),
    [GAME_MODE.BOSS_RUSH]: () => t(locale, "hud.bossFight", { value: state.run?.modeContext?.fight?.number ?? state.modeSelection.bossFight }),
    [GAME_MODE.WEEKLY]: () => t(locale, "hud.weekly"),
    [GAME_MODE.ENDLESS]: () => t(locale, "hud.endlessSector", { value: state.run?.modeContext?.sector ?? state.save.modeProgress.endless.activeOperation?.sector ?? 1 }),
  };
  return renderers[mode]?.() ?? t(locale, "hud.level", { value: state.save.level });
}

function updateOverlay(elements, state) {
  const content = getOverlayContent(state);
  elements.shell.classList.toggle("has-overlay", Boolean(content));
  elements.overlay.classList.toggle("is-visible", Boolean(content));
  if (elements.overlay.dataset.content === content) return;

  elements.overlay.innerHTML = content;
  elements.overlay.dataset.content = content;
  if (content) focusFirstAction(elements.overlay);
}

function getOverlayContent(state) {
  return getUiOverlayContent(state) || getPhaseOverlayContent(state);
}

function getUiOverlayContent(state) {
  const locale = getLocale(state);
  const victory = getVictoryOverlay(state, locale);
  if (victory) return victory;
  if (state.ui?.soundOpen) return renderSoundPanel(state, locale);
  if (state.ui?.infoOpen) return renderInfo(state);
  if (state.ui?.missionsOpen) return renderMissions(state, locale);
  if (state.ui?.leaderboardOpen) return renderLeaderboardPanel(state.save, locale);
  return "";
}

function getVictoryOverlay(state, locale) {
  if (state.phase === PHASE.VICTORY) return renderRoundVictoryPrompt(state.lastSummary, locale);
  const pending = getPendingVictory(state.save);
  if (pending) return renderVictory(state, locale, pending);
  return "";
}

export function renderSoundPanel(state, locale) {
  const settings = normalizeAudioSettings(state.save.settings);
  return `
    <div class="panel sound-panel" data-testid="sound-panel">
      <div class="sound-heading">
        <div>
          <h2>${icon("sound")} ${t(locale, "sound.title")}</h2>
          <p>${t(locale, "sound.subtitle")}</p>
        </div>
        <button class="icon-button" data-action="closeSound" data-focus-key="closeSound" aria-label="${t(locale, "action.close")}">X</button>
      </div>
      <div class="sound-controls">
        ${renderVolumeControl("masterVolume", settings.masterVolume, "master", locale, true)}
        <div class="sound-sliders">
          ${renderVolumeControl("musicVolume", settings.musicVolume, "music", locale)}
          ${renderVolumeControl("sfxVolume", settings.sfxVolume, "effects", locale)}
        </div>
      </div>
    </div>
  `;
}

function renderVolumeControl(key, value, label, locale, knob = false) {
  const percent = Math.round(value * 100);
  return `
    <label class="volume-control ${knob ? "master-knob-control" : ""}" style="--volume: ${percent}%; --angle: ${-135 + percent * 2.7}deg">
      <span>${t(locale, `sound.${label}`)}</span>
      ${knob ? '<span class="volume-knob" aria-hidden="true"><i></i></span>' : ""}
      <input type="range" min="0" max="100" step="1" value="${percent}" data-audio-setting="${key}" data-focus-key="audio:${key}" />
      <output>${percent}%</output>
    </label>
  `;
}

function getPhaseOverlayContent(state) {
  const renderers = {
    [PHASE.MENU]: renderModeSelect,
    [PHASE.MODE_MENU]: renderModeLobby,
    [PHASE.PAUSED]: renderPause,
    [PHASE.SHOP]: renderShop,
    [PHASE.ENDLESS_CHECKPOINT]: (state) => renderEndlessCheckpoint(state.lastSummary, getLocale(state)),
  };
  return renderers[state.phase]?.(state) ?? "";
}

function renderModeLobby(state) {
  if (state.selectedMode === GAME_MODE.ARCADE) return renderArcadeLobby(state);
  const locale = getLocale(state);
  return renderAlternateModeLobby(state, locale);
}

export function renderArcadeLobby(state) {
  const locale = getLocale(state);
  const unlock = getNextUnlock(state.save.level, locale);
  return `
    <div class="panel menu-panel">
      <nav class="menu-navigation" aria-label="${t(locale, "action.backModes")}">
        <button class="secondary-button menu-back-button" data-action="modeBack" data-focus-key="modeBack">
          ${icon("arrowLeft")}<span>${t(locale, "action.backModes")}</span>
        </button>
      </nav>
      <header class="arcade-menu-heading"><h1>${t(locale, "mode.arcade.title")}</h1></header>
      <div class="menu-stats">
        <span>${formatCash(state.save.cash)}</span>
        <span>${t(locale, "menu.bestTier", { value: state.save.bestFinishTier })}</span>
        <span>${t(locale, "menu.next", { value: t(locale, unlock.labelKey) })}</span>
      </div>
        <button class="primary-button" data-action="start" data-testid="start-run" data-focus-key="start">${t(locale, "action.start")}</button>
      ${renderProfileTools(state, locale)}
      ${renderWeaponTools(state, locale)}
      ${renderMissionProgress(state.save, locale)}
    </div>
  `;
}

function renderProfileTools(state, locale) {
  const profiles = getProfiles(state.save);
  return `
    <section class="profile-panel">
      <h2>${t(locale, "menu.profile")}: ${state.save.profileName}</h2>
      <div class="profile-row">
        <input class="profile-input" data-testid="profile-name" maxlength="18" placeholder="${t(locale, "menu.profilePlaceholder")}" />
        <button class="secondary-button" data-action="profileCreate" data-focus-key="profileCreate">${t(locale, "menu.createProfile")}</button>
      </div>
      <div class="profile-actions">
        <select class="profile-select" data-change="profile" data-focus-key="profileSelect">${renderProfileOptions(profiles, state.save.profileId)}</select>
        ${renderLeaderboardButton(locale)}
      </div>
    </section>
  `;
}

function renderPause(state) {
  const locale = getLocale(state);
  return `
    <div class="panel pause-panel">
      <h2>${t(locale, "action.pause")}</h2>
      <div class="button-row">
        <button class="primary-button" data-action="resume" data-focus-key="resume">${t(locale, "action.resume")}</button>
        <button class="secondary-button" data-action="menu" data-focus-key="menu">${t(locale, "action.menu")}</button>
        <button class="danger-button" data-action="reset" data-focus-key="reset">${t(locale, "action.reset")}</button>
      </div>
    </div>
  `;
}

function renderInfo(state) {
  const locale = getLocale(state);
  const items = WIKI_ITEMS.map((item) => renderWikiItem(item, locale)).join("");
  return `
    <div class="panel info-panel" data-testid="info-panel">
      <div class="info-heading">
        <h2>${icon("info")} ${t(locale, "info.title")}</h2>
        <button class="icon-button" data-action="closeInfo" data-focus-key="closeInfo" aria-label="${t(locale, "action.close")}">X</button>
      </div>
      <div class="wiki-grid">${items}</div>
    </div>
  `;
}

function renderWikiItem(item, locale) {
  const iconId = getWikiIcon(item);
  return `
    <article class="wiki-card">
      <h3>${icon(iconId)} ${t(locale, `info.${item}Title`)}</h3>
      <p>${t(locale, `info.${item}`)}</p>
    </article>
  `;
}

function getWikiIcon(item) {
  if (item === "boss") return "boss";
  if (item === "enemies") return "enemy";
  if (item === "ammo") return "ammo";
  if (item === "soldiers" || item === "recruits") return "soldiers";
  if (item === "life") return "life";
  if (item === "materials") return "wallDamage";
  return "info";
}

function renderStats(state, locale) {
  const run = state.run;
  if (!run) return "";

  const statCards = STAT_ORDER.map((id) => renderStatChip(id, getDisplayedStatValue(run, id), locale));
  statCards.push(renderStatChip("weapon", t(locale, findWeapon(run.stats.weaponId).labelKey), locale));
  return statCards.join("");
}

function renderStatChip(id, value, locale) {
  return `<div class="stat-chip">${icon(id, tStat(locale, id))}<b>${tStat(locale, id)}</b><span>${value}</span></div>`;
}

function syncMessages(container, run) {
  const messages = run?.messages ?? [];
  const existing = new Map([...container.children].map((node) => [node.dataset.messageId, node]));
  const activeIds = new Set(messages.map((message) => String(message.id)));

  existing.forEach((node, id) => {
    if (!activeIds.has(id)) node.remove();
  });

  messages.forEach((message) => {
    const id = String(message.id);
    if (existing.has(id)) return;
    container.append(createMessageNode(message, id));
  });
}

function createMessageNode(message, id) {
  const node = document.createElement("div");
  node.className = `toast ${message.tone}`;
  node.dataset.messageId = id;
  node.textContent = message.text;
  node.style.setProperty("--toast-life", `${Math.max(0.2, message.ttl)}s`);
  return node;
}

function renderRunEffects(run, locale) {
  return getVisibleRunEffects(run).map((effect) => `
    <div class="effect-bubble ${effect.tone}" data-effect="${effect.id}">
      <span>${t(locale, `effect.${effect.id}`)}</span>
      <b>${Math.max(0, Math.ceil(effect.remaining))}s</b>
    </div>
  `).join("");
}

export function renderSpecialShotPrompt(run, locale) {
  if (!run?.specialShot?.active) return "";
  return `
    <h2>${t(locale, "effect.specialShotTitle")}</h2>
    <p>${t(locale, "effect.specialShotInstruction")}</p>
  `;
}

function renderLocaleOptions(locale) {
  return LOCALES.map((item) => `<option value="${item.id}" ${item.id === locale ? "selected" : ""}>${item.label}</option>`).join("");
}

function getAmmoText(run, locale) {
  if (!run) return t(locale, "hud.ammo", { value: "--" });

  const value = t(locale, "hud.ammo", { value: Math.ceil(run.player.ammo) });
  const gain = run.player.ammoGain;
  if (!gain?.ttl) return value;
  return `${value} <span class="hud-delta">+${gain.value}</span>`;
}

function renderProfileOptions(profiles, activeId) {
  return profiles.map((profile) => `<option value="${profile.profileId}" ${profile.profileId === activeId ? "selected" : ""}>${profile.profileName}</option>`).join("");
}

function getProfiles(save) {
  return save.profiles?.length ? save.profiles : [{ profileId: save.profileId, profileName: save.profileName }];
}

function getLocale(state) {
  return normalizeLocale(state.save.settings?.locale);
}

function getProfileInput(root) {
  return root.querySelector("[data-testid='profile-name']")?.value;
}

function parseModeValue(value) {
  const number = Number(value);
  return value !== "" && Number.isFinite(number) ? number : value;
}

function getProgressPercent(run) {
  if (!run) return 0;
  return Math.min(100, (run.distance / run.profile.trackLength) * 100);
}

function getLifeText(run, locale) {
  if (!run) return t(locale, "hud.life", { value: "--", total: "--" });
  return t(locale, "hud.life", { value: Math.ceil(run.player.life), total: run.player.maxLife });
}

function activateFocusedAction(root, overlay) {
  const active = root.ownerDocument.activeElement;
  const control = active?.closest?.("button:not(:disabled), select:not(:disabled), input[type='range']:not(:disabled)");
  const target = control && overlay.contains(control) ? control : getFocusableActions(overlay)[0];
  if (target?.tagName === "SELECT") {
    cycleSelect(target);
    return;
  }
  if (target?.matches("input[type='range']")) {
    target.value = String((Number(target.value) + 10) % 110);
    target.dispatchEvent(new target.ownerDocument.defaultView.Event("input", { bubbles: true }));
    return;
  }
  target?.click();
}

function rememberFocus(root, button) {
  const overlay = root.querySelector(".overlay");
  if (overlay) overlay.dataset.focusKey = button.dataset.focusKey ?? "";
}

function moveOverlayFocus(overlay, direction) {
  const actions = getFocusableActions(overlay);
  if (actions.length === 0) return;

  const activeIndex = actions.indexOf(overlay.ownerDocument.activeElement);
  const nextIndex = activeIndex < 0 ? 0 : (activeIndex + direction + actions.length) % actions.length;
  actions[nextIndex].focus();
}

function focusFirstAction(overlay) {
  const actions = getFocusableActions(overlay);
  const remembered = actions.find((button) => button.dataset.focusKey === overlay.dataset.focusKey);
  const preferred = actions.find((button) => button.dataset.focusDefault !== undefined);
  (remembered ?? preferred ?? actions[0])?.focus();
}

function getFocusableActions(overlay) {
  return [...overlay.querySelectorAll("button:not(:disabled), select:not(:disabled), input[type='range']:not(:disabled)")];
}

function cycleSelect(select) {
  if (select.options.length <= 1) return;
  select.selectedIndex = (select.selectedIndex + 1) % select.options.length;
  select.dispatchEvent(new select.ownerDocument.defaultView.Event("change", { bubbles: true }));
}

function scrollOverlayPanel(overlay, amount) {
  const panel = overlay.querySelector(".panel");
  if (!panel || panel.scrollHeight <= panel.clientHeight) return;
  panel.scrollTop += amount;
}

function scrollShopOffers(root, direction) {
  const viewport = root.querySelector("[data-testid='shop-offer-viewport']");
  if (!viewport || !direction) return;
  viewport.scrollBy({ left: direction * viewport.clientWidth * 0.82, behavior: "smooth" });
}
