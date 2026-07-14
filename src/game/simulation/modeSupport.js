import { ENTITY, TARGET_SCALE } from "../content/constants.js";
import { tStat } from "../content/i18n.js";
import { GAME_MODE } from "../content/modes.js";

const SUPPORTED_MODES = new Set([GAME_MODE.BOSS_RUSH, GAME_MODE.WEEKLY, GAME_MODE.ENDLESS]);

export function updateModeAmmoSupport(run, dt) {
  if (!SUPPORTED_MODES.has(run.mode) || !hasActiveBoss(run)) return;
  run.modeContext.ammoSupportCooldown = Math.max(0, (run.modeContext.ammoSupportCooldown ?? 0) - dt);
  if (!needsAmmoSupport(run) || run.modeContext.ammoSupportCooldown > 0 || hasAmmoPickup(run)) return;
  spawnAmmoSupport(run);
}

function hasActiveBoss(run) {
  return run.entities.some((entity) => entity.type === ENTITY.BOSS && entity.active && entity.health > 0);
}

function needsAmmoSupport(run) {
  const reserve = Math.max(8, Math.ceil(run.stats.fireRate * 5.5));
  return run.player.ammo <= reserve;
}

function hasAmmoPickup(run) {
  return run.entities.some((entity) => entity.type === ENTITY.PICKUP && entity.stat === "ammo" && entity.active);
}

function spawnAmmoSupport(run) {
  const value = Math.max(18, Math.ceil(run.stats.fireRate * 8));
  const lane = Math.sin(run.elapsed * 1.7) >= 0 ? 2.25 : -2.25;
  run.entities.push({
    id: run.nextId++,
    type: ENTITY.PICKUP,
    x: lane,
    z: Math.max(7, Math.min(13, run.stats.range * 0.78)),
    width: Number((0.62 * TARGET_SCALE).toFixed(3)),
    depth: Number((0.54 * TARGET_SCALE).toFixed(3)),
    stat: "ammo",
    value,
    ammoCap: value,
    ammoEarned: 0,
    label: `${tStat(run.locale, "ammo")} +${value}`,
    health: 1,
    maxHealth: 1,
    active: true,
    collected: false,
  });
  run.modeContext.ammoSupportCooldown = 10;
}
