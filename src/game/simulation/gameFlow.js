import { PHASE } from "../content/constants.js";
import { getShopOffers } from "../content/shop.js";
import { recordRunMissions, recordWeaponEquip, refreshMissionProgress } from "./achievements.js";
import { applyRoundReward, calculateRoundReward, purchaseShopOffer } from "./economy.js";
import { getLifeRatio } from "./life.js";
import { recordLeaderboard } from "./profiles.js";
import { calculateLiveScore } from "./scoring.js";

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
  const rewardedSave = applyRoundReward(state.save, reward, run.finishTier);
  const scoredSave = recordLeaderboard(rewardedSave, { level: run.level, score: run.score, finishTier: run.finishTier });
  const save = recordRunMissions(scoredSave, run);

  return {
    ...state,
    phase: PHASE.SHOP,
    save,
    lastSummary: {
      level: run.level,
      reward,
      finishTier: run.finishTier,
      destroyedValue: run.destroyedValue,
      scorePenalty: run.scorePenalty,
      score: run.score,
      lifeRatio: getLifeRatio(run),
      buildRating: run.buildRating ?? 0,
      shopOffers: getShopOffers(save, run.seed ^ Math.round(reward * 31)),
    },
  };
}

export function failRun(state) {
  const run = state.run;
  run.score = calculateLiveScore(run);

  return {
    ...state,
    phase: PHASE.SHOP,
    lastSummary: {
      level: run.level,
      failed: true,
      reward: 0,
      finishTier: run.finishTier,
      destroyedValue: run.destroyedValue,
      scorePenalty: run.scorePenalty,
      score: run.score,
      lifeRatio: 0,
      buildRating: run.buildRating ?? 0,
      shopOffers: getShopOffers(state.save, run.seed ^ 0x51f3),
    },
  };
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
