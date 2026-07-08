import { ENTITY } from "../content/constants.js";

export function calculateLiveScore(run) {
  const progress = Math.floor(run.distance * 1.8);
  const finish = run.finishTier * 85;
  const score = progress + run.destroyedValue + finish - run.scorePenalty;
  return Math.max(0, Math.round(score));
}

export function getCollisionPenalty(entity, level) {
  const base = {
    [ENTITY.ENEMY]: 18,
    [ENTITY.BARRICADE]: 28,
    [ENTITY.SOLID_WALL]: 22,
    [ENTITY.SHOOTER]: 34,
    [ENTITY.FINISH_BLOCK]: 16,
    [ENTITY.BOSS]: 55,
  };
  return Math.round((base[entity.type] ?? 14) + level * 1.8);
}
