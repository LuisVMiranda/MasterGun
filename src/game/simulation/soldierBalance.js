const SOLDIER_DAMAGE_SCALE = 0.25;
const SOLDIER_INTERVAL = 0.58;
const FORMATION_FALLOFF = 0.32;

export function getSoldierShotDamage(run) {
  const training = run.stats.soldierDamageMultiplier ?? 1;
  const formation = getSoldierFormationScale(countActiveSoldiers(run));
  return Math.max(2, Math.round(run.stats.power * SOLDIER_DAMAGE_SCALE * training * formation));
}

export function getSoldierShotInterval(run, index) {
  const rate = Math.max(1, run.stats.soldierFireRateMultiplier ?? 1);
  return Math.max(0.34, SOLDIER_INTERVAL / rate) + (index % 3) * 0.035;
}

export function getSoldierFormationScale(count) {
  return 1 / (1 + Math.max(0, count - 1) * FORMATION_FALLOFF);
}

function countActiveSoldiers(run) {
  return (run.soldiers ?? []).filter((soldier) => soldier.active && soldier.health > 0).length;
}
