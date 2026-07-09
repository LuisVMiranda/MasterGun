import { STARTING_CASH } from "../content/constants.js";
import { createUpgradeLevels, findUpgrade, getUpgradeCost } from "../content/upgrades.js";
import { DEFAULT_WEAPON_ID, createWeaponInventory, findWeapon, getWeaponCost } from "../content/weapons.js";
import { createAchievementState, createMissionStats } from "./achievements.js";

const COMPLETION_REWARD_FLOOR = 0.3;

export function createDefaultSave() {
  return {
    schemaVersion: 1,
    cash: STARTING_CASH,
    level: 1,
    bestFinishTier: 0,
    upgrades: createUpgradeLevels(),
    weaponsOwned: createWeaponInventory(),
    equippedWeapon: DEFAULT_WEAPON_ID,
    profileId: "pilot-1",
    profileName: "Pilot 1",
    profiles: [],
    leaderboard: [],
    achievements: createAchievementState(),
    missionStats: createMissionStats(),
    settings: { reducedMotion: false, volume: 0.7, locale: "en" },
  };
}

export function calculateRoundReward(summary) {
  const finishBonus = summary.finishTier * 42;
  const combatBonus = summary.destroyedValue;
  const minimumReward = summary.baseReward * COMPLETION_REWARD_FLOOR;
  const rawReward = Math.max(minimumReward, summary.baseReward + finishBonus + combatBonus - (summary.scorePenalty ?? 0));
  const lifeMultiplier = 0.72 + clamp(summary.lifeRatio ?? 1, 0, 1) * 0.28;
  return Math.round(rawReward * summary.incomeMultiplier * lifeMultiplier);
}

export function canBuyUpgrade(save, upgradeId, currentLevel = save.level) {
  const upgrade = findUpgrade(upgradeId);
  if (!upgrade) return false;

  const level = save.upgrades[upgradeId] ?? 0;
  const cost = getUpgradeCost(upgrade, level);
  return currentLevel >= upgrade.unlockLevel && level < upgrade.maxLevel && save.cash >= cost;
}

export function purchaseUpgrade(save, upgradeId, currentLevel = save.level) {
  const upgrade = findUpgrade(upgradeId);
  if (!upgrade) return { save, purchased: false, cost: 0 };

  const level = save.upgrades[upgradeId] ?? 0;
  const cost = getUpgradeCost(upgrade, level);

  if (!canBuyUpgrade(save, upgradeId, currentLevel)) {
    return { save, purchased: false, cost };
  }

  return {
    purchased: true,
    cost,
    save: {
      ...save,
      cash: save.cash - cost,
      upgrades: { ...save.upgrades, [upgradeId]: level + 1 },
    },
  };
}

export function purchaseShopOffer(save, offerId) {
  const [kind, id] = parseOfferId(offerId);
  if (kind === "weapon") return purchaseWeapon(save, id);
  return purchaseUpgrade(save, id);
}

export function purchaseWeapon(save, weaponId) {
  const weapon = findWeapon(weaponId);
  const owned = new Set(save.weaponsOwned ?? []);
  const cost = getWeaponCost(weapon);

  if (owned.has(weapon.id) || save.level < weapon.unlockLevel || save.cash < cost) {
    return { save, purchased: false, cost };
  }

  return {
    purchased: true,
    cost,
    save: {
      ...save,
      cash: save.cash - cost,
      weaponsOwned: [...owned, weapon.id],
      equippedWeapon: weapon.id,
    },
  };
}

export function equipWeapon(save, weaponId) {
  const owned = new Set(save.weaponsOwned ?? []);
  if (!owned.has(weaponId)) return save;
  if (save.equippedWeapon === weaponId) return save;
  return { ...save, equippedWeapon: weaponId };
}

export function applyRoundReward(save, reward, finishTier) {
  return {
    ...save,
    cash: save.cash + reward,
    level: save.level + 1,
    bestFinishTier: Math.max(save.bestFinishTier, finishTier),
  };
}

function parseOfferId(offerId = "") {
  if (!offerId.includes(":")) return ["upgrade", offerId];
  return offerId.split(":");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
