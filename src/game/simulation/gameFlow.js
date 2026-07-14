import { PHASE } from "../content/constants.js";
import { getShopOffers } from "../content/shop.js";
import { recordRunMissions, recordWeaponEquip, refreshMissionProgress } from "./achievements.js";
import { applyRoundReward, calculateRoundReward, purchaseShopOffer } from "./economy.js";
import { getLifeRatio } from "./life.js";
import { recordLeaderboard } from "./profiles.js";
import { calculateLiveScore } from "./scoring.js";
import { getRunHighlights } from "./runHighlights.js";
import { GAME_MODE } from "../content/modes.js";
import { recordArcadeClear } from "./modeProgress.js";
import { continueAlternateVictory, continueEndlessOperation, extractEndlessOperation, settleAlternateFailure, settleAlternateSuccess } from "./modeSettlement.js";

export function completeRun(state) {
  const run = state.run;
  const reward = calculateRoundReward({
    baseReward: run.profile.baseReward,
    destroyedValue: run.destroyedValue,
    finishTier: run.finishTier,
    incomeMultiplier: run.stats.incomeMultiplier,
    lifeRatio: getLifeRatio(run),
    scorePenalty: run.scorePenalty,
  });

  run.score = calculateLiveScore(run);
  clearTemporarySupport(run);
  if (run.mode !== GAME_MODE.ARCADE) return completeAlternateRun(state, createSummary(run, reward));
  const progressedSave = run.mode === GAME_MODE.ARCADE ? recordArcadeClear(state.save, run.level) : state.save;
  const rewardedSave = applyRoundReward(progressedSave, reward, run.finishTier);
  const scoredSave = recordLeaderboard(rewardedSave, { level: run.level, score: run.score, finishTier: run.finishTier });
  const save = recordRunMissions(scoredSave, run);
  const summary = withNewAchievements(createSummary(run, reward), state.save, save);

  return {
    ...state,
    phase: PHASE.VICTORY,
    save,
    lastSummary: {
      ...summary,
      shopOffers: getShopOffers(save, run.seed ^ Math.round(reward * 31)),
    },
  };
}

export function continueRunVictory(state) {
  if (state.phase !== PHASE.VICTORY) return state;
  if (hasPendingAchievementPrompt(state.lastSummary)) {
    return { ...state, lastSummary: { ...state.lastSummary, achievementPromptActive: true } };
  }
  if (state.run?.mode !== GAME_MODE.ARCADE) return continueAlternateVictory(state);
  return { ...state, phase: PHASE.SHOP };
}

export function failRun(state) {
  const run = state.run;
  run.score = calculateLiveScore(run);
  clearTemporarySupport(run);
  const summary = { ...createSummary(run, 0), failed: true, lifeRatio: 0 };
  if (run.mode !== GAME_MODE.ARCADE) return settleAlternateFailure(state, summary);

  return {
    ...state,
    phase: PHASE.SHOP,
    lastSummary: {
      ...summary,
      shopOffers: getShopOffers(state.save, run.seed ^ 0x51f3),
    },
  };
}

export { continueEndlessOperation, extractEndlessOperation };

function completeAlternateRun(state, summary) {
  const result = settleAlternateSuccess(state, summary);
  const save = result.phase === PHASE.VICTORY ? recordRunMissions(result.save, state.run) : result.save;
  const nextSummary = withNewAchievements(result.summary, state.save, save);
  return { ...state, phase: result.phase, save, lastSummary: nextSummary };
}

function withNewAchievements(summary, previousSave, nextSave) {
  const previous = new Set(previousSave.achievements?.completedIds ?? []);
  const completed = nextSave.achievements?.completedIds ?? [];
  return { ...summary, newAchievementIds: completed.filter((id) => !previous.has(id)) };
}

function hasPendingAchievementPrompt(summary) {
  return !summary?.achievementPromptActive && (summary?.newAchievementIds?.length ?? 0) > 0;
}

function createSummary(run, reward) {
  return {
    mode: run.mode,
    level: run.level,
    reward,
    finishTier: run.finishTier,
    destroyedValue: run.destroyedValue,
    scorePenalty: run.scorePenalty,
    score: run.score,
    lifeRatio: getLifeRatio(run),
    buildRating: run.buildRating ?? 0,
    highlights: getRunHighlights(run),
  };
}

function clearTemporarySupport(run) {
  run.soldiers = [];
}

export function buyOffer(state, offerId) {
  const result = purchaseShopOffer(state.save, offerId);

  if (!result.purchased) {
    return { state, purchased: false, cost: result.cost };
  }

  return {
    purchased: true,
    cost: result.cost,
    state: { ...state, save: applyPurchaseMissions(result.save, offerId) },
  };
}

function applyPurchaseMissions(save, offerId) {
  if (offerId?.startsWith("weapon:")) return recordWeaponEquip(save, offerId.split(":")[1]);
  return refreshMissionProgress(save);
}
