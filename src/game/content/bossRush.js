const BOSS_FAMILIES = Object.freeze([
  boss("ironWarden", "single", "#ff3c35", 0.96, "block"),
  boss("arcDuelist", "double", "#9d58ff", 0.975, "sidestep"),
  boss("triCannon", "triple", "#ff9f2f", 0.955, "armor"),
  boss("skyTempest", "shower", "#36d8ff", 0.97, "laneSweep"),
  boss("reclaimer", "mixed", "#ff4fc8", 0.965, "heal"),
]);

export const BOSS_RUSH_FIGHTS = Object.freeze(Array.from({ length: 25 }, (_, index) => {
  const tier = Math.floor(index / BOSS_FAMILIES.length) + 1;
  const family = BOSS_FAMILIES[index % BOSS_FAMILIES.length];
  return Object.freeze({
    id: `${family.id}-${tier}`,
    number: index + 1,
    tier,
    family,
    approachSeconds: 20 + tier * 2,
    fightSeconds: 82 + tier * 11,
    profileLevel: Math.min(200, 50 + tier * 25),
    silver: { collisions: Math.max(1, 5 - tier), life: 0.3 + tier * 0.05 },
    gold: { collisions: tier >= 4 ? 0 : 1, life: 0.58 + tier * 0.04 },
  });
}));

export function findBossFight(number) {
  return BOSS_RUSH_FIGHTS.find((fight) => fight.number === Number(number)) ?? BOSS_RUSH_FIGHTS[0];
}

export function getBossRushReward(fight, previousMedal, nextMedal) {
  const bronze = 1000 + fight.number * 250;
  const cumulative = [0, bronze, Math.round(bronze * 1.5), Math.round(bronze * 2.25)];
  return Math.max(0, cumulative[nextMedal] - cumulative[previousMedal]);
}

export function isBossFightUnlocked(progress, fight) {
  return fight.number === 1 || (progress?.medals?.[fight.number - 1] ?? 0) > 0;
}

export function evaluateBossMedal(run) {
  const fight = run.modeContext.fight;
  const lifeRatio = run.player.maxLife > 0 ? run.player.life / run.player.maxLife : 0;
  const collisions = run.metrics?.collisions ?? 0;
  if (collisions <= fight.gold.collisions && lifeRatio >= fight.gold.life) return 3;
  if (collisions <= fight.silver.collisions && lifeRatio >= fight.silver.life) return 2;
  return 1;
}

function boss(id, pattern, projectileColor, retreatRatio, skill) {
  return Object.freeze({ id, pattern, projectileColor, retreatRatio, skill });
}
