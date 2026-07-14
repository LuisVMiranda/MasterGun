import { PHASE } from "../content/constants.js";
import { evaluateBossMedal, getBossRushReward } from "../content/bossRush.js";
import { getEndlessLoot } from "../content/endless.js";
import { evaluateMasteryMedal, getMasteryReward } from "../content/masteryTrials.js";
import { GAME_MODE } from "../content/modes.js";
import { isWeeklyObjectiveComplete } from "../content/weeklyChallenge.js";
import { recordWeeklyCompletion, refreshMissionProgress } from "./achievements.js";
import { normalizeModeProgress } from "./modeProgress.js";
import { syncModeVictories } from "./victoryProgress.js";

export function settleAlternateSuccess(state, summary) {
  const handlers = {
    [GAME_MODE.WEAPON_MASTERY]: settleMastery,
    [GAME_MODE.BOSS_RUSH]: settleBossRush,
    [GAME_MODE.WEEKLY]: settleWeekly,
    [GAME_MODE.ENDLESS]: settleEndless,
  };
  return handlers[state.run.mode]?.(state, summary) ?? { save: state.save, summary, phase: PHASE.VICTORY };
}

export function settleAlternateFailure(state, summary) {
  const progress = normalizeModeProgress(state.save.modeProgress, state.save.level);
  if (state.run.mode === GAME_MODE.WEEKLY) {
    const weekly = { ...progress.weekly, activeAttempt: null };
    return { ...state, phase: PHASE.MODE_MENU, save: withProgress(state.save, progress, { weekly }), lastSummary: summary };
  }
  if (state.run.mode === GAME_MODE.ENDLESS) {
    const endless = { ...progress.endless, activeOperation: null };
    return { ...state, phase: PHASE.MODE_MENU, save: withProgress(state.save, progress, { endless }), lastSummary: { ...summary, lostLoot: true } };
  }
  return { ...state, phase: PHASE.MODE_MENU, lastSummary: summary };
}

export function continueAlternateVictory(state) {
  if (state.run?.mode === GAME_MODE.ENDLESS && state.lastSummary?.checkpoint) {
    return { ...state, phase: PHASE.ENDLESS_CHECKPOINT };
  }
  return { ...state, phase: PHASE.MODE_MENU, run: null, modeSelection: getNextSelection(state) };
}

export function continueEndlessOperation(state) {
  if (state.phase !== PHASE.ENDLESS_CHECKPOINT) return state;
  return { ...state, phase: PHASE.MODE_MENU, run: null };
}

export function extractEndlessOperation(state) {
  const progress = normalizeModeProgress(state.save.modeProgress, state.save.level);
  const operation = progress.endless.activeOperation;
  if (!operation) return continueEndlessOperation(state);
  const amount = Math.max(0, Math.round(operation.unbankedCash));
  const endless = {
    ...progress.endless,
    activeOperation: null,
    extractions: progress.endless.extractions + 1,
    largestExtraction: Math.max(progress.endless.largestExtraction, amount),
  };
  const save = refreshMissionProgress({ ...withProgress(state.save, progress, { endless }), cash: state.save.cash + amount });
  const newAchievementIds = getNewAchievementIds(state.save, save);
  const achievementPromptActive = newAchievementIds.length > 0;
  return {
    ...state,
    phase: achievementPromptActive ? PHASE.VICTORY : PHASE.MODE_MENU,
    run: null,
    save,
    lastSummary: { ...state.lastSummary, checkpoint: false, extracted: amount, newAchievementIds, achievementPromptActive },
  };
}

function settleMastery(state, summary) {
  const run = state.run;
  const trial = run.modeContext.trial;
  const progress = normalizeModeProgress(state.save.modeProgress, state.save.level);
  const campaign = progress.mastery[trial.weaponId];
  const previousMedal = campaign.medals[trial.number] ?? 0;
  const medal = evaluateMasteryMedal(run);
  const reward = getMasteryReward(trial, previousMedal, medal);
  const mastery = {
    ...progress.mastery,
    [trial.weaponId]: {
      ...campaign,
      medals: { ...campaign.medals, [trial.number]: Math.max(previousMedal, medal) },
      bestScores: { ...campaign.bestScores, [trial.number]: Math.max(campaign.bestScores[trial.number] ?? 0, run.score) },
    },
  };
  const victories = { ...progress.victories, masteryCrown: hasMasteryCrown(mastery) };
  const save = syncModeVictories({ ...withProgress(state.save, progress, { mastery, victories }), cash: state.save.cash + reward });
  return { save, phase: PHASE.VICTORY, summary: { ...summary, reward, medal, modeLabel: trial.id } };
}

function settleBossRush(state, summary) {
  const run = state.run;
  const fight = run.modeContext.fight;
  const progress = normalizeModeProgress(state.save.modeProgress, state.save.level);
  const previousMedal = progress.bossRush.medals[fight.number] ?? 0;
  const medal = evaluateBossMedal(run);
  const reward = getBossRushReward(fight, previousMedal, medal);
  const bossRush = {
    ...progress.bossRush,
    medals: { ...progress.bossRush.medals, [fight.number]: Math.max(previousMedal, medal) },
    bestScores: { ...progress.bossRush.bestScores, [fight.number]: Math.max(progress.bossRush.bestScores[fight.number] ?? 0, run.score) },
  };
  const victories = { ...progress.victories, bossRushCrown: Object.values(bossRush.medals).filter((value) => value >= 3).length === 25 };
  const save = syncModeVictories({ ...withProgress(state.save, progress, { bossRush, victories }), cash: state.save.cash + reward });
  return { save, phase: PHASE.VICTORY, summary: { ...summary, reward, medal, modeLabel: fight.id } };
}

function settleWeekly(state, summary) {
  if (!isWeeklyObjectiveComplete(state.run)) return settleWeeklyFailure(state, summary);
  const challenge = state.run.modeContext.challenge;
  const progress = normalizeModeProgress(state.save.modeProgress, state.save.level);
  const weekly = { ...progress.weekly, completed: true, rewardClaimed: true, activeAttempt: null };
  const save = recordWeeklyCompletion({ ...withProgress(state.save, progress, { weekly }), cash: state.save.cash + challenge.reward });
  return { save, phase: PHASE.VICTORY, summary: { ...summary, reward: challenge.reward, modeLabel: challenge.id } };
}

function settleWeeklyFailure(state, summary) {
  const failed = settleAlternateFailure(state, { ...summary, failed: true, objectiveFailed: true, reward: 0 });
  return { save: failed.save, phase: failed.phase, summary: failed.lastSummary };
}

function settleEndless(state, summary) {
  const run = state.run;
  const progress = normalizeModeProgress(state.save.modeProgress, state.save.level);
  const current = progress.endless.activeOperation;
  const loot = getEndlessLoot(run);
  const operation = { ...current, sector: run.modeContext.sector + 1, unbankedCash: current.unbankedCash + loot, score: current.score + run.score };
  const endless = { ...progress.endless, activeOperation: operation, bestSector: Math.max(progress.endless.bestSector, run.modeContext.sector), bestScore: Math.max(progress.endless.bestScore, operation.score) };
  const save = withProgress(state.save, progress, { endless });
  return { save, phase: PHASE.VICTORY, summary: { ...summary, reward: loot, unbankedCash: operation.unbankedCash, checkpoint: run.modeContext.sector % 5 === 0, modeLabel: `sector-${run.modeContext.sector}` } };
}

function withProgress(save, progress, changes) {
  return { ...save, modeProgress: { ...progress, ...changes } };
}

function hasMasteryCrown(mastery) {
  return Object.values(mastery).every((campaign) => Object.values(campaign.medals).filter((value) => value >= 3).length === 20);
}

function getNextSelection(state) {
  if (state.run?.mode === GAME_MODE.WEAPON_MASTERY) {
    return { ...state.modeSelection, masteryTrial: Math.min(20, (state.run.modeContext.trial.number ?? 1) + 1) };
  }
  if (state.run?.mode === GAME_MODE.BOSS_RUSH) {
    return { ...state.modeSelection, bossFight: Math.min(25, (state.run.modeContext.fight.number ?? 1) + 1) };
  }
  return state.modeSelection;
}

function getNewAchievementIds(previousSave, nextSave) {
  const previous = new Set(previousSave.achievements?.completedIds ?? []);
  return (nextSave.achievements?.completedIds ?? []).filter((id) => !previous.has(id));
}
