import { normalizeLocale, t, tStat } from "../game/content/i18n.js";
import { getOfferCost, getShopOffers } from "../game/content/shop.js";
import { getUpgradeLevelLimit } from "../game/simulation/economy.js";
import { formatCash } from "../game/simulation/math.js";
import { formatScore } from "./formatters.js";
import { icon } from "./icons.js";
import { renderMissionProgress } from "./missionViews.js";
import { renderRunVictory } from "./runSummaryView.js";
import { renderWeaponTools } from "./weaponView.js";
import { weaponSprite } from "./weaponSprites.js";

export function renderShop(state) {
  const locale = normalizeLocale(state.save.settings?.locale);
  const choices = state.lastSummary?.shopOffers ?? getShopOffers(state.save);
  const cards = choices.map((offer) => renderShopCard(offer, state, locale)).join("");
  const summary = state.lastSummary ?? { reward: 0, finishTier: 0, buildRating: 0, score: 0 };
  const title = summary.failed ? t(locale, "shop.failed") : t(locale, "shop.complete");
  const nextLabel = summary.failed ? t(locale, "action.retry") : t(locale, "action.next");

  return `
    <div class="panel shop-panel" data-testid="shop-panel">
      <div class="shop-heading">
        <h2>${title}</h2>
        <span>${t(locale, "shop.earned", { value: formatNumber(summary.reward) })}</span>
        <span>${t(locale, "shop.score", { value: formatScore(summary.score) })}</span>
        <span>${t(locale, "shop.life", { value: Math.round((summary.lifeRatio ?? 1) * 100) })}</span>
        <span>${t(locale, "shop.tier", { value: summary.finishTier })}</span>
        <span>${t(locale, "shop.build", { value: summary.buildRating })}</span>
      </div>
      ${renderRunVictory(summary, locale)}
      ${renderWeaponTools(state, locale)}
      ${renderMissionProgress(state.save, locale)}
      ${renderShopOffers(cards, choices.length, locale)}
      <button class="primary-button" data-action="next" data-testid="next-run" data-focus-key="next">${nextLabel}</button>
    </div>
  `;
}

function renderShopOffers(cards, count, locale) {
  if (count < 4) return `<div class="shop-grid">${cards}</div>`;
  return `
    <div class="shop-offer-carousel">
      <button class="icon-button shop-scroll-button" data-action="shopScroll" data-direction="-1" data-focus-key="shopScroll:previous" aria-label="${t(locale, "action.previousOffer")}">${icon("arrowLeft")}</button>
      <div class="shop-offer-viewport" data-testid="shop-offer-viewport">
        <div class="shop-grid is-carousel">${cards}</div>
      </div>
      <button class="icon-button shop-scroll-button" data-action="shopScroll" data-direction="1" data-focus-key="shopScroll:next" aria-label="${t(locale, "action.nextOffer")}">${icon("arrowRight")}</button>
    </div>
  `;
}

function renderShopCard(offer, state, locale) {
  const cost = getOfferCost(offer, state.save);
  const disabled = isOfferDisabled(offer, state.save, cost) ? "disabled" : "";
  return `
    <article class="upgrade-card">
      <h3>${getOfferIcon(offer, locale)} ${getOfferName(offer, locale)}</h3>
      <p>${getOfferStatus(offer, state.save, locale)}</p>
      <small>${getOfferDescription(offer, locale)}</small>
      <button class="buy-button" data-action="buy" data-offer="${offer.offerId}" data-focus-key="buy:${offer.offerId}" data-focus-default ${disabled}>
        ${getOfferButtonLabel(offer, state.save, cost, locale)}
      </button>
    </article>
  `;
}

function getOfferName(offer, locale) {
  if (offer.kind === "weapon") return t(locale, offer.labelKey);
  return tStat(locale, getUpgradeIconId(offer.id));
}

function getOfferDescription(offer, locale) {
  if (offer.kind === "weapon") return t(locale, offer.descriptionKey);
  return t(locale, `upgrade.${offer.id}.desc`);
}

function getOfferStatus(offer, save, locale) {
  if (isWeaponOwned(offer, save)) return t(locale, "shop.owned");
  if (isOfferLocked(offer, save)) return t(locale, "shop.unlock", { value: offer.unlockLevel });
  const level = save.upgrades[offer.id] ?? 0;
  if (offer.kind === "upgrade" && level >= offer.maxLevel) return t(locale, "shop.overclock", { value: level - offer.maxLevel + 1 });
  return t(locale, "shop.level", { value: level });
}

function getOfferButtonLabel(offer, save, cost, locale) {
  if (isWeaponOwned(offer, save)) return t(locale, "shop.owned");
  if (isOfferMaxed(offer, save)) return t(locale, "shop.max");
  if (isOfferLocked(offer, save)) return t(locale, "shop.unlock", { value: offer.unlockLevel });
  return formatCash(cost);
}

function getOfferIcon(offer, locale) {
  if (offer.kind === "weapon") return weaponSprite(offer.id, t(locale, offer.labelKey));
  return icon(getUpgradeIconId(offer.id));
}

function getUpgradeIconId(id) {
  const aliases = { assistants: "soldiers", assistantAmmo: "soldierTraining", soldierAmmo: "soldierTraining" };
  return aliases[id] ?? id;
}

function isOfferDisabled(offer, save, cost) {
  return isOfferMaxed(offer, save) || isOfferLocked(offer, save) || isWeaponOwned(offer, save) || save.cash < cost;
}

function isOfferMaxed(offer, save) {
  return offer.kind !== "weapon" && (save.upgrades[offer.id] ?? 0) >= getUpgradeLevelLimit(save, offer);
}

function isOfferLocked(offer, save) {
  return offer.unlockLevel > save.level;
}

function isWeaponOwned(offer, save) {
  return offer.kind === "weapon" && (save.weaponsOwned ?? []).includes(offer.id);
}

function formatNumber(value) {
  return Math.max(0, Math.floor(value)).toLocaleString("en-US");
}
