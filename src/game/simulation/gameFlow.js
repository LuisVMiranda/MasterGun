import { PHASE } from "../content/constants.js";
import { getShopOffers } from "../content/shop.js";
import { applyRoundReward, calculateRoundReward, purchaseShopOffer } from "./economy.js";
import { recordLeaderboard } from "./profiles.js";
import { calculateLiveScore } from "./scoring.js";

export function completeRun(state) {
  const run = state.run;
  const reward = calculateRoundReward({
    baseReward: run.profile.baseReward,
    destroyedValue: run.destroyedValue,
    finishTier: run.finishTier,
    incomeMultiplier: run.stats.incomeMultiplier,
    scorePenalty: run.scorePenalty,
  });

  run.score = calculateLiveScore(run);
  const rewardedSave = applyRoundReward(state.save, reward, run.finishTier);
  const save = recordLeaderboard(rewardedSave, { level: run.level, score: run.score, finishTier: run.finishTier });

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
      buildRating: run.buildRating ?? 0,
      shopOffers: getShopOffers(save, run.seed ^ Math.round(reward * 31)),
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
    state: { ...state, save: result.save },
  };
}
