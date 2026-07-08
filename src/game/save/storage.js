import { SAVE_KEY } from "../content/constants.js";
import { createDefaultSave } from "../simulation/economy.js";

export function loadSave(storage = localStorage) {
  const fallback = createDefaultSave();
  const raw = storage.getItem(SAVE_KEY);

  if (!raw) return fallback;

  try {
    return normalizeSave(JSON.parse(raw), fallback);
  } catch {
    return fallback;
  }
}

export function saveGame(save, storage = localStorage) {
  storage.setItem(SAVE_KEY, JSON.stringify(save));
}

export function resetSave(storage = localStorage) {
  const save = createDefaultSave();
  saveGame(save, storage);
  return save;
}

function normalizeSave(value, fallback) {
  if (!value || value.schemaVersion !== 1) return fallback;
  const weaponsOwned = normalizeWeapons(value.weaponsOwned, fallback.weaponsOwned);

  return {
    ...fallback,
    ...value,
    upgrades: { ...fallback.upgrades, ...value.upgrades },
    weaponsOwned,
    equippedWeapon: weaponsOwned.includes(value.equippedWeapon) ? value.equippedWeapon : fallback.equippedWeapon,
    profiles: Array.isArray(value.profiles) ? value.profiles : fallback.profiles,
    leaderboard: Array.isArray(value.leaderboard) ? value.leaderboard : fallback.leaderboard,
    settings: { ...fallback.settings, ...value.settings },
  };
}

function normalizeWeapons(value, fallback) {
  const weapons = Array.isArray(value) && value.length > 0 ? value : fallback;
  return [...new Set(weapons)];
}
