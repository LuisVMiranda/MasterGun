export function getDisplayedStatValue(run, id) {
  const stats = run?.stats;
  if (!stats) return "--";

  const values = {
    fireRate: stats.fireRate.toFixed(1),
    range: Math.round(stats.range),
    ammo: Math.max(0, Math.ceil(run.player.ammo)),
    power: Math.round(stats.power),
    baseLife: Math.round(stats.baseLife),
    income: `${Math.round(stats.incomeMultiplier * 100)}%`,
    doubleWeapon: stats.projectileCount,
    soldiers: stats.soldiers,
    soldierTraining: Math.round(stats.soldierTraining),
    wallDamage: `${Math.round(stats.wallDamageMultiplier * 100)}%`,
    shieldDamage: `${Math.round(stats.shieldDamageMultiplier * 100)}%`,
    breachDamage: `${Math.round((stats.wallDamageMultiplier + stats.shieldDamageMultiplier) * 50)}%`,
  };
  return values[id] ?? "--";
}
