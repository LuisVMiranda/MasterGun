const AMMO_GAIN_TTL = 1.1;

export function applyAmmoGain(run, value) {
  run.player.ammo += value;
  run.player.ammoGain = {
    value: (run.player.ammoGain?.ttl > 0 ? run.player.ammoGain.value : 0) + value,
    ttl: AMMO_GAIN_TTL,
    maxTtl: AMMO_GAIN_TTL,
  };
}

export function updateAmmoGain(run, dt) {
  const gain = run.player.ammoGain;
  if (!gain) return;

  gain.ttl -= dt;
  if (gain.ttl <= 0) delete run.player.ammoGain;
}
