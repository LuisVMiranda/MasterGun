import { createDefaultSave } from "./economy.js";
import { normalizeModeProgress } from "./modeProgress.js";

const MAX_LEADERBOARD = 10;

export function createProfile(save, name) {
  const current = upsertActiveProfile(save);
  const profile = createProfileSave(name);
  return {
    ...profile,
    profiles: [...current.profiles, createSnapshot(profile)],
    leaderboard: current.leaderboard,
    settings: { ...profile.settings, locale: save.settings?.locale ?? "en" },
  };
}

export function selectProfile(save, profileId) {
  const current = upsertActiveProfile(save);
  const profile = current.profiles.find((item) => item.profileId === profileId);
  if (!profile) return save;

  return {
    ...current,
    ...profile,
    profiles: current.profiles,
    leaderboard: current.leaderboard,
  };
}

export function renameProfile(save, name) {
  const profileName = cleanName(name, save.profileName);
  return upsertActiveProfile({ ...save, profileName });
}

export function recordLeaderboard(save, summary) {
  const entry = {
    id: `${save.profileId}-${Date.now()}`,
    profileId: save.profileId,
    profileName: save.profileName,
    level: summary.level,
    score: summary.score,
    finishTier: summary.finishTier,
  };
  const leaderboard = [...(save.leaderboard ?? []), entry]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_LEADERBOARD);
  return upsertActiveProfile({ ...save, leaderboard, bestScore: Math.max(save.bestScore ?? 0, summary.score) });
}

export function upsertActiveProfile(save) {
  const profiles = save.profiles ?? [];
  const snapshot = createSnapshot(save);
  const index = profiles.findIndex((profile) => profile.profileId === save.profileId);
  const nextProfiles = index >= 0 ? profiles.map((profile, itemIndex) => (itemIndex === index ? snapshot : profile)) : [...profiles, snapshot];
  return { ...save, profiles: nextProfiles };
}

function createProfileSave(name) {
  const save = createDefaultSave();
  const stamp = Date.now().toString(36);
  return {
    ...save,
    profileId: `pilot-${stamp}`,
    profileName: cleanName(name, `Pilot ${stamp.slice(-3).toUpperCase()}`),
  };
}

function createSnapshot(save) {
  return {
    profileId: save.profileId,
    profileName: save.profileName,
    bestScore: save.bestScore ?? 0,
    cash: save.cash,
    level: save.level,
    bestFinishTier: save.bestFinishTier,
    upgrades: { ...save.upgrades },
    weaponsOwned: [...(save.weaponsOwned ?? [])],
    equippedWeapon: save.equippedWeapon,
    achievements: { ...save.achievements, completedIds: [...(save.achievements?.completedIds ?? [])] },
    missionStats: { ...(save.missionStats ?? {}) },
    modeProgress: normalizeModeProgress(save.modeProgress, save.level),
    settings: { ...save.settings },
  };
}

function cleanName(name, fallback) {
  const trimmed = String(name ?? "").trim().slice(0, 18);
  return trimmed || fallback;
}
