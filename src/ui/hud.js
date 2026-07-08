import { PHASE } from "../game/content/constants.js";
import { LOCALES, normalizeLocale, t, tStat } from "../game/content/i18n.js";
import { getOfferCost } from "../game/content/shop.js";
import { getShopUpgrades } from "../game/content/upgrades.js";
import { WEAPON_DEFINITIONS, findWeapon } from "../game/content/weapons.js";
import { formatCash } from "../game/simulation/math.js";
import { getNextUnlock } from "../game/simulation/progression.js";
import { icon } from "./icons.js";

const STAT_ORDER = ["fireRate", "range", "ammo", "power", "income", "doubleWeapon", "assistants"];
const WIKI_ITEMS = ["enemies", "variants", "health", "collision", "ammo", "duration", "buffs", "debuffs", "boss"];

export function createHud(root, callbacks) {
  root.innerHTML = createShell();
  const elements = collectElements(root);

  root.addEventListener("click", (event) => handleClick(event, callbacks, root));
  root.addEventListener("change", (event) => handleChange(event, callbacks));

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
        <div class="hud-chip score" data-testid="score-chip"></div>
        <button class="icon-button" data-action="info" data-testid="info-button" aria-label="Info">${icon("info")}</button>
        <select class="locale-select" data-change="locale" data-testid="locale-select"></select>
        <button class="icon-button" data-action="pause" aria-label="Pause">II</button>
      </section>
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
    canvasHost: root.querySelector(".canvas-host"),
    level: root.querySelector("[data-testid='level-chip']"),
    cash: root.querySelector("[data-testid='cash-chip']"),
    ammo: root.querySelector("[data-testid='ammo-chip']"),
    score: root.querySelector("[data-testid='score-chip']"),
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
  const actions = {
    start: callbacks.onStart,
    pause: callbacks.onPause,
    resume: callbacks.onResume,
    menu: callbacks.onMenu,
    next: callbacks.onNext,
    reset: callbacks.onReset,
    info: callbacks.onInfo,
    closeInfo: callbacks.onCloseInfo,
    buy: () => callbacks.onBuy(button.dataset.offer),
    equip: () => callbacks.onEquipWeapon(button.dataset.weapon),
    profileCreate: () => callbacks.onProfileCreate(getProfileInput(root)),
  };

  actions[action]?.();
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
  elements.level.innerHTML = `${icon("score")} ${t(locale, "hud.level", { value: state.save.level })}`;
  elements.cash.innerHTML = `${icon("cash")} ${t(locale, "hud.cash", { value: formatNumber(state.save.cash) })}`;
  elements.ammo.innerHTML = `${icon("ammo")} ${run ? t(locale, "hud.ammo", { value: Math.ceil(run.player.ammo) }) : t(locale, "hud.ammo", { value: "--" })}`;
  elements.score.innerHTML = `${icon("score")} ${t(locale, "hud.score", { value: run?.score ?? 0 })}`;
  elements.progress.style.width = `${getProgressPercent(run)}%`;
  elements.stats.innerHTML = renderStats(state, locale);
  elements.messages.innerHTML = renderMessages(run);
  elements.locale.innerHTML = renderLocaleOptions(locale);
  elements.locale.value = locale;
}

function updateOverlay(elements, state) {
  const content = getOverlayContent(state);
  elements.overlay.classList.toggle("is-visible", Boolean(content));
  if (elements.overlay.dataset.content === content) return;

  elements.overlay.innerHTML = content;
  elements.overlay.dataset.content = content;
  if (content) focusFirstAction(elements.overlay);
}

function getOverlayContent(state) {
  if (state.ui?.infoOpen) return renderInfo(state);
  if (state.phase === PHASE.MENU) return renderMenu(state);
  if (state.phase === PHASE.PAUSED) return renderPause(state);
  if (state.phase === PHASE.SHOP) return renderShop(state);
  return "";
}

function renderMenu(state) {
  const locale = getLocale(state);
  const unlock = getNextUnlock(state.save.level, locale);
  return `
    <div class="panel menu-panel">
      <h1>Master Gun</h1>
      <div class="menu-stats">
        <span>${formatCash(state.save.cash)}</span>
        <span>${t(locale, "menu.bestTier", { value: state.save.bestFinishTier })}</span>
        <span>${t(locale, "menu.next", { value: t(locale, unlock.labelKey) })}</span>
      </div>
      <button class="primary-button" data-action="start" data-testid="start-run">${t(locale, "action.start")}</button>
      ${renderProfileTools(state, locale)}
      ${renderWeaponTools(state, locale)}
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
        <button class="secondary-button" data-action="profileCreate">${t(locale, "menu.createProfile")}</button>
      </div>
      <select class="profile-select" data-change="profile">${renderProfileOptions(profiles, state.save.profileId)}</select>
      ${renderLeaderboard(state.save.leaderboard, locale)}
    </section>
  `;
}

function renderWeaponTools(state, locale) {
  const owned = new Set(state.save.weaponsOwned ?? []);
  const buttons = WEAPON_DEFINITIONS.filter((weapon) => owned.has(weapon.id))
    .map((weapon) => renderWeaponButton(weapon, state.save.equippedWeapon, locale))
    .join("");

  return `
    <section class="weapon-panel">
      <h2>${icon("weapon")} ${t(locale, "menu.weapon")}: ${t(locale, findWeapon(state.save.equippedWeapon).labelKey)}</h2>
      <div class="button-row">${buttons}</div>
    </section>
  `;
}

function renderWeaponButton(weapon, equippedWeapon, locale) {
  const equipped = equippedWeapon === weapon.id;
  return `
    <button class="${equipped ? "primary-button" : "secondary-button"}" data-action="equip" data-weapon="${weapon.id}">
      ${t(locale, weapon.labelKey)}
    </button>
  `;
}

function renderPause(state) {
  const locale = getLocale(state);
  return `
    <div class="panel pause-panel">
      <h2>${t(locale, "action.pause")}</h2>
      <div class="button-row">
        <button class="primary-button" data-action="resume">${t(locale, "action.resume")}</button>
        <button class="secondary-button" data-action="menu">${t(locale, "action.menu")}</button>
        <button class="danger-button" data-action="reset">${t(locale, "action.reset")}</button>
      </div>
    </div>
  `;
}

function renderShop(state) {
  const locale = getLocale(state);
  const choices = state.lastSummary?.shopOffers ?? getShopUpgrades(state.save.level);
  const cards = choices.map((offer) => renderShopCard(offer, state, locale)).join("");
  const summary = state.lastSummary ?? { reward: 0, finishTier: 0, buildRating: 0, score: 0 };

  return `
    <div class="panel shop-panel" data-testid="shop-panel">
      <div class="shop-heading">
        <h2>${t(locale, "shop.complete")}</h2>
        <span>${t(locale, "shop.earned", { value: formatNumber(summary.reward) })}</span>
        <span>${t(locale, "shop.score", { value: summary.score })}</span>
        <span>${t(locale, "shop.tier", { value: summary.finishTier })}</span>
        <span>${t(locale, "shop.build", { value: summary.buildRating })}</span>
      </div>
      <div class="shop-grid">${cards}</div>
      <button class="primary-button" data-action="next" data-testid="next-run">${t(locale, "action.next")}</button>
    </div>
  `;
}

function renderShopCard(offer, state, locale) {
  const cost = getOfferCost(offer, state.save);
  const disabled = isOfferDisabled(offer, state.save, cost) ? "disabled" : "";
  const className = offer.locked ? "upgrade-card is-locked" : "upgrade-card";
  return `
    <article class="${className}">
      <h3>${getOfferIcon(offer)} ${getOfferName(offer, locale)}</h3>
      <p>${getOfferStatus(offer, state.save, locale)}</p>
      <small>${getOfferDescription(offer, locale)}</small>
      <button class="buy-button" data-action="buy" data-offer="${offer.offerId ?? `upgrade:${offer.id}`}" ${disabled}>
        ${getOfferButtonLabel(offer, cost, locale)}
      </button>
    </article>
  `;
}

function renderInfo(state) {
  const locale = getLocale(state);
  const items = WIKI_ITEMS.map((item) => renderWikiItem(item, locale)).join("");
  return `
    <div class="panel info-panel" data-testid="info-panel">
      <div class="info-heading">
        <h2>${icon("info")} ${t(locale, "info.title")}</h2>
        <button class="icon-button" data-action="closeInfo" aria-label="${t(locale, "action.close")}">X</button>
      </div>
      <div class="wiki-grid">${items}</div>
    </div>
  `;
}

function renderWikiItem(item, locale) {
  const iconId = item === "boss" ? "boss" : item === "enemies" ? "enemy" : item === "ammo" ? "ammo" : "info";
  return `
    <article class="wiki-card">
      <h3>${icon(iconId)} ${t(locale, `info.${item}Title`)}</h3>
      <p>${t(locale, `info.${item}`)}</p>
    </article>
  `;
}

function renderStats(state, locale) {
  const stats = state.run?.stats;
  if (!stats) return "";

  const statCards = STAT_ORDER.map((id) => renderStatChip(id, getStatValue(stats, id), locale));
  statCards.push(renderStatChip("weapon", t(locale, findWeapon(stats.weaponId).labelKey), locale));
  return statCards.join("");
}

function renderStatChip(id, value, locale) {
  return `<div class="stat-chip">${icon(id, tStat(locale, id))}<b>${tStat(locale, id)}</b><span>${value}</span></div>`;
}

function getStatValue(stats, id) {
  const values = {
    fireRate: stats.fireRate.toFixed(1),
    range: Math.round(stats.range),
    ammo: Math.round(stats.ammo),
    power: Math.round(stats.power),
    income: `${Math.round(stats.incomeMultiplier * 100)}%`,
    doubleWeapon: stats.projectileCount,
    assistants: stats.assistants,
  };
  return values[id] ?? "--";
}

function renderMessages(run) {
  if (!run) return "";

  return run.messages.map((message) => `<div class="toast ${message.tone}">${message.text}</div>`).join("");
}

function renderLocaleOptions(locale) {
  return LOCALES.map((item) => `<option value="${item.id}" ${item.id === locale ? "selected" : ""}>${item.label}</option>`).join("");
}

function renderProfileOptions(profiles, activeId) {
  return profiles.map((profile) => `<option value="${profile.profileId}" ${profile.profileId === activeId ? "selected" : ""}>${profile.profileName}</option>`).join("");
}

function renderLeaderboard(leaderboard = [], locale) {
  const rows = leaderboard.length ? leaderboard.slice(0, 5).map(renderLeaderboardRow).join("") : `<li>${t(locale, "menu.noScores")}</li>`;
  return `<div class="leaderboard"><h3>${t(locale, "menu.leaderboard")}</h3><ol>${rows}</ol></div>`;
}

function renderLeaderboardRow(entry) {
  return `<li><b>${entry.profileName}</b><span>${entry.score}</span></li>`;
}

function getProfiles(save) {
  return save.profiles?.length ? save.profiles : [{ profileId: save.profileId, profileName: save.profileName }];
}

function getOfferName(offer, locale) {
  if (offer.kind === "weapon") return t(locale, offer.labelKey);
  return tStat(locale, offer.id);
}

function getOfferDescription(offer, locale) {
  if (offer.kind === "weapon") return t(locale, offer.descriptionKey);
  return t(locale, `upgrade.${offer.id}.desc`);
}

function getOfferStatus(offer, save, locale) {
  if (offer.kind === "weapon" && (save.weaponsOwned ?? []).includes(offer.id)) return t(locale, "shop.owned");
  if (offer.locked) return t(locale, "shop.unlock", { value: offer.unlockLevel });
  return t(locale, "shop.level", { value: save.upgrades[offer.id] ?? 0 });
}

function getOfferButtonLabel(offer, cost, locale) {
  if (offer.owned) return t(locale, "shop.owned");
  if (offer.maxed) return t(locale, "shop.max");
  if (offer.locked) return t(locale, "shop.unlock", { value: offer.unlockLevel });
  return formatCash(cost);
}

function getOfferIcon(offer) {
  return icon(offer.kind === "weapon" ? "weapon" : offer.id);
}

function isOfferDisabled(offer, save, cost) {
  return offer.maxed || offer.locked || offer.owned || save.cash < cost;
}

function getLocale(state) {
  return normalizeLocale(state.save.settings?.locale);
}

function getProfileInput(root) {
  return root.querySelector("[data-testid='profile-name']")?.value;
}

function getProgressPercent(run) {
  if (!run) return 0;
  return Math.min(100, (run.distance / run.profile.trackLength) * 100);
}

function formatNumber(value) {
  return Math.max(0, Math.floor(value)).toLocaleString("en-US");
}

function activateFocusedAction(root, overlay) {
  const active = root.ownerDocument.activeElement;
  const button = active?.closest?.("button:not(:disabled)");
  const target = overlay.contains(button) ? button : getFocusableActions(overlay)[0];
  target?.click();
}

function moveOverlayFocus(overlay, direction) {
  const actions = getFocusableActions(overlay);
  if (actions.length === 0) return;

  const activeIndex = actions.indexOf(overlay.ownerDocument.activeElement);
  const nextIndex = activeIndex < 0 ? 0 : (activeIndex + direction + actions.length) % actions.length;
  actions[nextIndex].focus();
}

function focusFirstAction(overlay) {
  getFocusableActions(overlay)[0]?.focus();
}

function getFocusableActions(overlay) {
  return [...overlay.querySelectorAll("button:not(:disabled)")];
}
