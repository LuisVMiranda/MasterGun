import { ENTITY, TRACK } from "../content/constants.js";

const TARGET_APPROACH_SECONDS = 3.5;

export function tightenBossApproach(run) {
  if (!run.profile.challenge) return;

  const boss = getActiveBoss(run);
  if (!boss || hasPreBossEntity(run, boss)) return;

  const maxBossZ = run.stats.range + run.profile.speed * TARGET_APPROACH_SECONDS;
  if (boss.z > maxBossZ) boss.z = Number(maxBossZ.toFixed(2));
}

export function getBossApproachSeconds(run, boss = getActiveBoss(run)) {
  if (!boss) return 0;
  const engageZ = Math.max(run.stats.range, boss.engageZ ?? run.stats.range);
  const fastDistance = Math.max(0, boss.z - engageZ);
  const closingDistance = Math.max(0, Math.min(boss.z, engageZ) - run.stats.range);
  const seconds = fastDistance / Math.max(0.01, run.profile.speed) + closingDistance / getBossClosingSpeed(run, boss);
  return Number(seconds.toFixed(2));
}

function getActiveBoss(run) {
  return run.entities.find((entity) => entity.type === ENTITY.BOSS && entity.active && entity.health > 0);
}

function hasPreBossEntity(run, boss) {
  return run.entities.some((entity) => {
    if (!entity.active || entity.id === boss.id || entity.z <= TRACK.playerZ || entity.z >= boss.z) return false;
    return entity.type !== ENTITY.CASH;
  });
}

function getBossClosingSpeed(run, boss) {
  return Math.max(0.04, run.profile.speed - (boss.retreatSpeed ?? 0));
}
