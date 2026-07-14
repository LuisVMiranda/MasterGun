import { UPGRADE_DEFINITIONS } from "./upgrades.js";
import { WEAPON_DEFINITIONS, getWeaponCost } from "./weapons.js";
import { getUpgradeLevelLimit, getUpgradePurchaseCost } from "../simulation/economy.js";

const MAX_SHOP_SLOTS = 10;

export function getShopOffers(save, seed = save.level) {
  const offers = shuffleOffers([...getUpgradeOffers(save), ...getWeaponOffers(save)], seed);
  const available = offers.filter(isAvailableOffer);
  return prioritizeOffers(available, save).slice(0, getShopSlotCount(save));
}

export function getShopSlotCount(save) {
  const level = Math.max(0, Number(save.level) || 0);
  return Math.min(MAX_SHOP_SLOTS, 2 + Math.floor(level / 25));
}

export function getOfferCost(offer, save) {
  if (offer.kind === "weapon") return getWeaponCost(offer);

  return getUpgradePurchaseCost(save, offer);
}

function getUpgradeOffers(save) {
  return UPGRADE_DEFINITIONS.map((upgrade) => {
    const level = save.upgrades[upgrade.id] ?? 0;
    return {
      ...upgrade,
      kind: "upgrade",
      offerId: `upgrade:${upgrade.id}`,
      level,
      locked: upgrade.unlockLevel > save.level,
      maxed: level >= getUpgradeLevelLimit(save, upgrade),
    };
  });
}

function getWeaponOffers(save) {
  const owned = new Set(save.weaponsOwned ?? []);
  return WEAPON_DEFINITIONS.filter((weapon) => weapon.cost > 0).map((weapon) => ({
    ...weapon,
    kind: "weapon",
    offerId: `weapon:${weapon.id}`,
    locked: weapon.unlockLevel > save.level,
    owned: owned.has(weapon.id),
  }));
}

function prioritizeOffers(offers, save) {
  const selected = [];
  addOffer(selected, chooseInvestedOffer(offers, save));
  addOffer(selected, chooseLowDevelopmentOffer(offers, selected, save));
  const remaining = offers.filter((offer) => !selected.includes(offer));
  const affordable = remaining.filter((offer) => getOfferCost(offer, save) <= save.cash).sort((a, b) => getOfferCost(b, save) - getOfferCost(a, save));
  const stretch = remaining.filter((offer) => !affordable.includes(offer)).sort((a, b) => getOfferCost(a, save) - getOfferCost(b, save));
  return [...selected, ...affordable, ...stretch];
}

function chooseInvestedOffer(offers, save) {
  const invested = offers.filter((offer) => offer.kind === "upgrade" && offer.level > 0);
  return invested.sort((a, b) => b.level - a.level || getOfferCost(a, save) - getOfferCost(b, save))[0];
}

function chooseLowDevelopmentOffer(offers, selected, save) {
  const upgrades = offers.filter((offer) => offer.kind === "upgrade" && !selected.includes(offer));
  const minimumLevel = Math.min(...upgrades.map((offer) => offer.level));
  const lowest = upgrades.filter((offer) => offer.level === minimumLevel);
  return lowest.sort((a, b) => getOfferCost(a, save) - getOfferCost(b, save))[0];
}

function addOffer(offers, offer) {
  if (offer && !offers.includes(offer)) offers.push(offer);
}

function isAvailableOffer(offer) {
  return !offer.locked && !offer.maxed && !offer.owned;
}

function shuffleOffers(offers, seed) {
  const output = [...offers];
  let state = seed >>> 0;

  for (let index = output.length - 1; index > 0; index -= 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const swapIndex = state % (index + 1);
    [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
  }

  return output;
}
