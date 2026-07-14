export function getRunHighlights(run) {
  const metrics = run.metrics ?? {};
  return {
    damage: Math.max(0, Math.round(metrics.damageDealt ?? 0)),
    targets: Math.max(0, Math.round(metrics.targetsDestroyed ?? 0)),
    ammo: Math.max(0, Math.round(metrics.ammoEarned ?? 0)),
    collisions: Math.max(0, Math.round(metrics.collisions ?? 0)),
  };
}
