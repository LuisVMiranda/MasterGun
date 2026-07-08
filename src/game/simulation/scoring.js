import { ENTITY } from "../content/constants.js";

export function calculateLiveScore(run) {
  const progress = Math.floor(run.distance * 1.8);
  const finish = run.finishTier * 85;
  const score = progress + run.destroyedValue + finish - run.scorePenalty;
  return Math.max(0, Math.round(score));
}

export function getCollisionPenalty(entity, level, contactHit = 2) {
  const base = {
    [ENTITY.ENEMY]: 18,
    [ENTITY.BARRICADE]: 28,
    [ENTITY.SOLID_WALL]: 22,
    [ENTITY.SHOOTER]: 34,
    [ENTITY.FINISH_BLOCK]: 16,
    [ENTITY.BOSS]: 55,
  };
  const rawPenalty = (base[entity.type] ?? 14) + level * 1.8;
  return Math.round(rawPenalty * getPenaltyScale(level, contactHit));
}

export function getPenaltyScale(level, contactHit) {
  if (contactHit <= 1 && level <= 5) return 0.45;
  if (contactHit <= 1 && level <= 15) return 0.6;
  if (contactHit <= 1) return 0.8;
  if (level <= 5) return 0.65;
  if (level <= 15) return 0.8;
  return 1;
}
