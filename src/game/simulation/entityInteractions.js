import { ENTITY } from "../content/constants.js";

const CONTRACTS = Object.freeze({
  [ENTITY.GATE]: contract({ damageable: true, collectible: true, bounces: true }),
  [ENTITY.ENEMY]: contract({ damageable: true, blocking: true }),
  [ENTITY.BARRICADE]: contract({ damageable: true, blocking: true }),
  [ENTITY.HAZARD]: contract({ damageable: true, collectible: true, bounces: true }),
  [ENTITY.PICKUP]: contract({ damageable: true, collectible: true }),
  [ENTITY.SOLID_WALL]: contract({ damageable: true, blocking: true }),
  [ENTITY.SHOOTER]: contract({ damageable: true, blocking: true }),
  [ENTITY.FINISH_BLOCK]: contract({ damageable: true, blocking: true }),
  [ENTITY.WEAPON_PICKUP]: contract({ damageable: true, collectible: true }),
  [ENTITY.BOSS]: contract({ damageable: true, blocking: true }),
  [ENTITY.CASH]: contract({ collectible: true }),
  [ENTITY.RECRUITER]: contract({ damageable: true }),
});

export function getInteractionContract(entity) {
  return CONTRACTS[entity?.type] ?? contract();
}

export function canDamageEntity(entity) {
  return Boolean(entity?.active && entity.health > 0 && getInteractionContract(entity).damageable);
}

export function canCollectEntity(entity) {
  return Boolean(entity?.active && !entity.collected && getInteractionContract(entity).collectible);
}

export function isBlockingEntity(entity) {
  return Boolean(entity?.active && entity.health > 0 && getInteractionContract(entity).blocking);
}

export function shouldBounceOnCollect(entity) {
  return getInteractionContract(entity).bounces;
}

function contract(overrides = {}) {
  return Object.freeze({ damageable: false, collectible: false, blocking: false, bounces: false, ...overrides });
}
