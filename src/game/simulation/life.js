import { ENTITY } from "../content/constants.js";

const MAX_LIFE = 100;

export function createLifeState(stats) {
  const baseLife = Math.max(0, Math.round(stats.baseLife ?? 0));
  const maxLife = MAX_LIFE + Math.round(baseLife * 0.25);
  return { life: Math.min(baseLife, maxLife), maxLife };
}

export function recoverLifeByDistance(run, distanceDelta) {
  const player = run.player;
  const gain = Math.max(0, distanceDelta) * getRecoveryPerMeter(run);
  player.life = Math.min(player.maxLife, player.life + gain);
}

export function applyLifeLoss(run, source, scorePenalty, contactHit = 2) {
  const loss = getLifePenalty(source, run.level, scorePenalty, contactHit);
  run.player.lifeDamageTaken = (run.player.lifeDamageTaken ?? 0) + loss;
  run.player.life = Math.max(0, run.player.life - loss);
  return loss;
}

export function getLifePenalty(source, level, scorePenalty = 0, contactHit = 2) {
  const base = getSourceBasePenalty(source);
  const levelScale = 1 + Math.min(1.75, Math.max(0, level - 1) / 85);
  const hitScale = contactHit <= 1 ? getFirstHitScale(level) : 1;
  const scorePressure = Math.min(16, scorePenalty * 0.08);
  return Math.max(1, Math.round((base + scorePressure) * levelScale * hitScale));
}

export function getLifeRecoveryTarget(level) {
  const normalizedLevel = Math.max(1, level);
  const earlyBoost = Math.max(0, 1 - (normalizedLevel - 1) / 60) * 44;
  const lateDrag = Math.min(22, Math.max(0, normalizedLevel - 60) * 0.14);
  return Math.max(54, Math.round(70 + earlyBoost - lateDrag));
}

export function getLifeRatio(run) {
  const player = run?.player;
  if (!player?.maxLife) return 1;
  return clamp(player.life / player.maxLife, 0, 1);
}

function getRecoveryPerMeter(run) {
  return getLifeRecoveryTarget(run.level) / Math.max(1, run.profile.trackLength);
}

function getFirstHitScale(level) {
  if (level <= 5) return 0.55;
  if (level <= 20) return 0.7;
  return 0.86;
}

function getSourceBasePenalty(source) {
  if (source.owner === "enemy") return 9;

  const values = {
    [ENTITY.ENEMY]: 10,
    [ENTITY.BARRICADE]: 14,
    [ENTITY.SOLID_WALL]: 13,
    [ENTITY.SHOOTER]: 16,
    [ENTITY.FINISH_BLOCK]: 11,
    [ENTITY.BOSS]: 24,
  };
  return values[source.type] ?? 8;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
