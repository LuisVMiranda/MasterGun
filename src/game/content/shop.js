import { UPGRADE_DEFINITIONS, getUpgradeCost } from "./upgrades.js";
import { WEAPON_DEFINITIONS, getWeaponCost } from "./weapons.js";

export function getShopOffers(save, seed = save.level) {
  const offers = shuffleOffers([...getUpgradeOffers(save), ...getWeaponOffers(save)], seed);
  const available = offers.filter((offer) => !offer.locked && !offer.maxed && !offer.owned);
  const backups = offers.filter((offer) => !available.includes(offer));
  return [...available, ...backups].slice(0, 2);
}

export function getOfferCost(offer, save) {
  if (offer.kind === "weapon") return getWeaponCost(offer);

  const level = save.upgrades[offer.id] ?? 0;
  return getUpgradeCost(offer, level);
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
      maxed: level >= upgrade.maxLevel,
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
