import { DEFAULT_SETTINGS, STARTING_CASH } from "../content/constants.js";
import { createUpgradeLevels, findUpgrade, getUpgradeCost } from "../content/upgrades.js";
import { DEFAULT_WEAPON_ID, createWeaponInventory, findWeapon, getWeaponCost } from "../content/weapons.js";
import { createAchievementState, createMissionStats } from "./achievements.js";
import { createModeProgress } from "./modeProgress.js";
import { getOverclockCost, getOverclockMaxLevel } from "../content/endless.js";
import { getHighestArcadeClear } from "../content/modes.js";

const COMPLETION_REWARD_FLOOR = 0.3;
const COMBAT_REWARD_RATE = 0.62;
const COMBAT_REWARD_CAP = 1.35;

export function createDefaultSave() {
  return {
    schemaVersion: 2,
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
    modeProgress: createModeProgress(),
    settings: { ...DEFAULT_SETTINGS, locale: "en" },
  };
}

export function calculateRoundReward(summary) {
  const breakdown = getRewardBreakdown(summary);
  const minimumReward = summary.baseReward * COMPLETION_REWARD_FLOOR;
  const rawReward = Math.max(minimumReward, breakdown.subtotal - breakdown.penalty);
  const lifeMultiplier = 0.72 + clamp(summary.lifeRatio ?? 1, 0, 1) * 0.28;
  return Math.round(rawReward * summary.incomeMultiplier * lifeMultiplier);
}

export function getRewardBreakdown(summary) {
  const base = Math.max(0, summary.baseReward ?? 0);
  const finishUnit = Math.min(50, Math.round(22 + Math.sqrt(base) * 0.8));
  const finish = Math.max(0, summary.finishTier ?? 0) * finishUnit;
  const combatValue = Math.min(Math.max(0, summary.destroyedValue ?? 0), base * COMBAT_REWARD_CAP);
  const combat = Math.round(combatValue * COMBAT_REWARD_RATE);
  const penalty = Math.max(0, summary.scorePenalty ?? 0);
  return { base, finish, combat, penalty, subtotal: base + finish + combat };
}

export function canBuyUpgrade(save, upgradeId, currentLevel = save.level) {
  const upgrade = findUpgrade(upgradeId);
  if (!upgrade) return false;

  const level = save.upgrades[upgradeId] ?? 0;
  const cost = getUpgradePurchaseCost(save, upgrade);
  return currentLevel >= upgrade.unlockLevel && level < getUpgradeLevelLimit(save, upgrade) && save.cash >= cost;
}

export function purchaseUpgrade(save, upgradeId, currentLevel = save.level) {
  const upgrade = findUpgrade(upgradeId);
  if (!upgrade) return { save, purchased: false, cost: 0 };

  const level = save.upgrades[upgradeId] ?? 0;
  const cost = getUpgradePurchaseCost(save, upgrade);

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

export function getUpgradeLevelLimit(save, upgrade) {
  return getHighestArcadeClear(save) >= 200 ? getOverclockMaxLevel(upgrade) : upgrade.maxLevel;
}

export function getUpgradePurchaseCost(save, upgrade) {
  const level = save.upgrades[upgrade.id] ?? 0;
  return level >= upgrade.maxLevel ? getOverclockCost(upgrade, level) : getUpgradeCost(upgrade, level);
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
    level: Math.min(200, save.level + 1),
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
