import { ENTITY } from "../content/constants.js";
import { t } from "../content/i18n.js";

export function addDamageNumber(run, damage, target) {
  const ttl = 0.72;
  run.damageNumbers.push({
    id: run.nextId++,
    text: `-${Math.round(damage)}`,
    tone: "damage",
    value: Math.round(damage),
    x: target.x,
    y: getDamageHeight(target),
    z: target.z,
    ttl,
    maxTtl: ttl,
  });
}

export function addAmmoGainNumber(run, value, target) {
  const ttl = 0.72;
  run.damageNumbers.push({
    id: run.nextId++,
    text: t(run.locale, "message.ammoEarned", { value }),
    tone: "buff",
    value,
    x: target.x,
    y: getDamageHeight(target) + 0.32,
    z: target.z,
    ttl,
    maxTtl: ttl,
  });
}

function getDamageHeight(target) {
  const heights = {
    [ENTITY.GATE]: 2.25,
    [ENTITY.BARRICADE]: 1.82,
    [ENTITY.SOLID_WALL]: 2.02,
    [ENTITY.SHOOTER]: 1.72,
    [ENTITY.FINISH_BLOCK]: 1.9,
    [ENTITY.RECRUITER]: 1.92,
  };
  return heights[target.type] ?? 1.42;
}
