import { getHighestArcadeClear } from "../content/modes.js";
import { normalizeModeProgress } from "./modeProgress.js";

export const VICTORY = Object.freeze({
  ARCADE_CHAMPION: "arcadeChampion",
  MASTERY_CROWN: "masteryCrown",
  BOSS_RUSH_CROWN: "bossRushCrown",
  LEGEND: "legend",
});

const VICTORY_ORDER = Object.freeze([VICTORY.LEGEND, VICTORY.MASTERY_CROWN, VICTORY.BOSS_RUSH_CROWN, VICTORY.ARCADE_CHAMPION]);

export function syncModeVictories(save) {
  const progress = normalizeModeProgress(save.modeProgress, save.level);
  const arcadeChampion = Boolean(save.achievements?.gameWon);
  const masteryCrown = hasGoldMastery(progress.mastery);
  const bossRushCrown = countGold(progress.bossRush.medals) === 25;
  const legend = getHighestArcadeClear({ ...save, modeProgress: progress }) >= 200 && masteryCrown && bossRushCrown;
  const victories = { ...progress.victories, arcadeChampion, masteryCrown, bossRushCrown, legend };
  return { ...save, modeProgress: { ...progress, victories } };
}

export function getPendingVictory(save) {
  const synced = syncModeVictories(save);
  const victories = synced.modeProgress.victories;
  const seen = new Set(victories.seen ?? []);
  return VICTORY_ORDER.find((id) => victories[id] && !seen.has(id)) ?? null;
}

export function markVictorySeen(save, victoryId = getPendingVictory(save)) {
  if (!victoryId) return save;
  const synced = syncModeVictories(save);
  const victories = synced.modeProgress.victories;
  const seen = [...new Set([...(victories.seen ?? []), victoryId])];
  const achievements = victoryId === VICTORY.ARCADE_CHAMPION
    ? { ...synced.achievements, gameWonSeen: true }
    : synced.achievements;
  return { ...synced, achievements, modeProgress: { ...synced.modeProgress, victories: { ...victories, seen } } };
}

function hasGoldMastery(mastery) {
  return Object.values(mastery).every((campaign) => countGold(campaign.medals) === 20);
}

function countGold(medals) {
  return Object.values(medals ?? {}).filter((value) => value >= 3).length;
}
