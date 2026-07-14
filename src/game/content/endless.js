export function getEndlessSectorProfile(sector) {
  const index = Math.max(1, Math.floor(sector));
  return Object.freeze({
    sector: index,
    duration: Math.min(120, 75 + Math.floor((index - 1) / 5) * 5),
    boss: index % 5 === 0,
    healthScale: 1.08 ** (index - 1),
    damageScale: 1.045 ** (index - 1),
    rewardScale: 1.07 ** (index - 1),
    densityScale: Math.min(1.75, 1.025 ** (index - 1)),
    speedScale: Math.min(1.2, 1.008 ** (index - 1)),
  });
}

export function createEndlessOperation(seed) {
  return { seed, sector: 1, unbankedCash: 0, score: 0, startedAt: Date.now() };
}

export function getEndlessLoot(run) {
  const scale = run.modeContext.sectorProfile.rewardScale;
  return Math.max(100, Math.round((run.profile.baseReward + run.destroyedValue * 0.45) * scale));
}

export function getOverclockMaxLevel(upgrade) {
  return upgrade.maxLevel + 20;
}

export function getOverclockEffectLevel(upgrade, level) {
  const normal = Math.min(level, upgrade.maxLevel);
  const overclock = Math.max(0, level - upgrade.maxLevel);
  return normal + overclock * 0.35;
}

export function getOverclockCost(upgrade, level, rewardBenchmark = 5000) {
  const overclockIndex = Math.max(0, level - upgrade.maxLevel);
  const relativeWeight = Math.max(0.7, upgrade.baseCost / 300);
  return Math.round((rewardBenchmark * 6 * relativeWeight * 1.16 ** overclockIndex) / 100) * 100;
}
