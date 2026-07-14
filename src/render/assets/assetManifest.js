const WEAPON_SOCKETS = Object.freeze(["muzzle", "eject", "grip_primary", "grip_support", "shadow_anchor"]);
const OPERATOR_SOCKETS = Object.freeze(["muzzle", "grip_primary", "grip_support", "shadow_anchor"]);

export const ASSET_MANIFEST = Object.freeze([
  weaponAsset("pistol", 2500, 420),
  weaponAsset("shotgun", 3500, 620),
  weaponAsset("machineGun", 4500, 760),
  weaponAsset("rifle", 5000, 840),
  operatorAsset("operatorEnemy", "enemy"),
  operatorAsset("operatorSoldier", "soldier"),
  proceduralAsset("postedGate", "gate", 1400),
  proceduralAsset("brickWall", "wall", 2400),
  proceduralAsset("floorPickup", "pickup", 800),
]);

export function findAssetDefinition(id) {
  return ASSET_MANIFEST.find((asset) => asset.id === id) ?? null;
}

export function validateAssetManifest(manifest = ASSET_MANIFEST) {
  const ids = new Set();
  const errors = [];

  manifest.forEach((asset) => {
    if (!asset.id || ids.has(asset.id)) errors.push(`Duplicate or missing asset id: ${asset.id ?? "unknown"}`);
    if (!asset.kind || !asset.bounds) errors.push(`${asset.id} is missing kind or bounds.`);
    if (!Array.isArray(asset.sockets)) errors.push(`${asset.id} has no socket contract.`);
    if (!asset.budget?.triangles || asset.budget.triangles < 1) errors.push(`${asset.id} has no triangle budget.`);
    ids.add(asset.id);
  });

  return errors;
}

function weaponAsset(id, triangles, kilobytes) {
  return Object.freeze({
    id,
    kind: "weapon",
    source: "hybrid",
    modelUrl: `/assets/models/weapons/${id}.glb`,
    fallback: `prototype:${id}`,
    bounds: Object.freeze({ width: 0.9, height: 0.85, depth: id === "rifle" ? 2.7 : 2.25 }),
    sockets: WEAPON_SOCKETS,
    animations: Object.freeze(["idle", "fire", "reload"]),
    lods: Object.freeze([1, 0.55, 0.24]),
    budget: Object.freeze({ triangles, kilobytes, materials: 3 }),
  });
}

function operatorAsset(id, faction) {
  return Object.freeze({
    id,
    faction,
    kind: "operator",
    source: "hybrid",
    modelUrl: `/assets/models/operators/${id}.glb`,
    fallback: `prototype:${faction}`,
    bounds: Object.freeze({ width: 0.9, height: 1.82, depth: 0.72 }),
    sockets: OPERATOR_SOCKETS,
    animations: Object.freeze(["idle", "aim", "run", "strafe", "fire", "reload", "hit", "death"]),
    lods: Object.freeze([5500, 2500, 900]),
    budget: Object.freeze({ triangles: 5500, kilobytes: 1150, materials: 4, bones: 24 }),
  });
}

function proceduralAsset(id, kind, triangles) {
  return Object.freeze({
    id,
    kind,
    source: "procedural",
    modelUrl: null,
    fallback: `prototype:${id}`,
    bounds: Object.freeze({ width: 2.1, height: 2.25, depth: 0.72 }),
    sockets: Object.freeze(["shadow_anchor"]),
    animations: Object.freeze([]),
    lods: Object.freeze([1, 0.6]),
    budget: Object.freeze({ triangles, kilobytes: 0, materials: 4 }),
  });
}
