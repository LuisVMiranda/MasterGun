# Master Gun Visual Remaster Contract

## Goal

Raise the game from readable procedural primitives to a polished stylized-military presentation without changing simulation balance. The target is a bright, clean, low-poly/PBR look: credible equipment, human proportions, strong silhouettes, restrained material detail, and readable effects at runway distance.

The development-only Art Lab is available at `/?artLab=1`. Use `variant=showcase`, `variant=runway`, or `variant=stress` to share a specific inspection view.

## Approval Boundary

The Art Lab remains the visual approval surface. The procedural families approved on 2026-07-13 now ship through production-owned factories; collision boxes, labels, save data, and balance remain simulation-owned. Later replacements still graduate one family at a time in this order:

1. Player weapons and projectiles.
2. Posted gates, walls, pickups, recruiters, and finish blocks.
3. Enemies, shooters, melee variants, and temporary soldiers.
4. Boss families.
5. Adaptive production lighting, LOD, and shadows.

Keep procedural models as runtime fallbacks if a GLB fails to load.

The first production graduation covers all player weapons, ordinary projectiles and effects, posted gates, damage-state walls, floor pickups, temporary soldiers, and ranged shooters. Specialized melee enemies and bosses retain their existing production loadouts until their dedicated families receive the same review. Far ranged shooters use the approved instanced LOD and switch to detailed operators before engagement range.

## Shape Language

### Weapons

- Use fictional, mechanically credible silhouettes with no manufacturer marks or branded real-world replicas.
- Pistol: compact slide, angled grip, visible barrel, trigger guard, front/rear sights.
- Shotgun: one pump-action barrel, magazine tube, broad pump, substantial stock. It always fires one gameplay projectile.
- Machine gun: compact receiver, curved magazine, short stock, handguard, muzzle brake, restrained optic.
- Rifle: long narrow barrel, clear stock, magazine, scope, cheek line, concentrated muzzle.
- Maximum three primary materials per weapon: dark steel, body finish, one restrained accent.

Prototype budgets:

| Asset | Near triangles | Runtime payload |
|---|---:|---:|
| Pistol | 2,500 | 420 KB |
| Shotgun | 3,500 | 620 KB |
| Machine gun | 4,500 | 760 KB |
| Rifle | 5,000 | 840 KB |

Every weapon exports `muzzle`, `eject`, `grip_primary`, `grip_support`, and `shadow_anchor` sockets.

### Operators

- Use armored operators with adult human proportions, clear shoulders/pelvis/knees/elbows, stylized helmets, and no detailed faces.
- Enemy armor is red; soldiers are blue. Skin, dark armor, and weapon steel remain neutral.
- Melee variants receive an authored sword in one hand without changing their body proportions.
- Soldiers remain ten percent smaller than standard enemies in production.

Operator budgets are 5,500 near, 2,500 mid, and 900 far triangles, no more than 24 bones, and four materials. Required clips are `idle`, `aim`, `run`, `strafe`, `fire`, `reload`, `hit`, and `death`.

### Structures

- Standing green/red sections are posted gates: two dark steel posts, broad feet, cap lights, an inset translucent signal panel, and one centered symbol.
- Floor pickups remain crates, gems, cash, or beacons. They must never resemble a blocking gate.
- Standard wall size is approximately 1.75 wide, 2.25 high, and 0.62 deep.
- Walls use five courses of four beveled bricks and authored states: intact above 50%, cracked at 50%, critical at 20%, collapsed at 0%.
- Damage transitions may displace or hide authored pieces; runtime mesh fracture is out of scope.

## Materials And Lighting

- Render in sRGB with ACES tone mapping and restrained exposure.
- Favor medium roughness and broad highlights. Avoid mirror metal, noisy microtextures, and full-surface emissive materials.
- Preserve the bright sky palette and light turquoise runway.
- Dynamic directional shadows belong to the player, nearby humanoids, and nearby major structures.
- Far assets use contact shadows only. Do not let ordinary projectiles cast shadows.
- Character contact-shadow opacity: 0.16 to 0.22. Structures and pickups: 0.05 to 0.09.
- Player weapon contact shadows should use one cohesive blurred silhouette mask, not overlapping circular blobs.

## Projectile Profiles

Projectile appearance changes by weapon while simulation damage, speed, collision, ammo, and range remain authoritative.

| Source | Core | Trail | Read |
|---|---|---|---|
| Pistol | Amber capsule, 0.09 x 0.30 | 0.45 | Compact star flash, moderate recoil |
| Shotgun | Orange slug, 0.14 x 0.42 | 0.35 thick | Expanding flash ring, smoke, heavy kick |
| Machine gun | Yellow tracer, 0.05 x 0.26 | 0.70 thin | Frequent compact flashes, restrained recoil |
| Rifle | Blue-white dart, 0.045 x 0.52 | 1.10 | Concentrated flash, sharp impact |
| Soldier | Blue-white, 0.035 x 0.22 | 0.38 | Smaller and thinner than player fire |
| Enemy | Red capsule, 0.11 x 0.30 | 0.32 | Hostile red impact; bosses retain family colors |

The thin-projectile debuff scales the active profile's core and trail width while retaining the simulation's current narrow hitbox. Special Shot remains a separate, larger effect.

## Runtime Budgets

- Critical model payload: under 3.5 MB.
- Total new runtime model payload: under 6 MB.
- Ordinary gameplay draw calls: no more than 140 desktop or 95 mobile.
- Projectile pools: no more than 12 additional draw calls at maximum projectile count.
- Median frame time: no more than 16.7 ms desktop or 33.3 ms mobile.
- P95 frame time: no more than 22 ms desktop or 45 ms mobile.
- Quality may degrade during a run, but should only improve between rounds to avoid visible hitches.

## Inspection Checklist

- Compare prototype and legacy in all three Art Lab views.
- Inspect intact, cracked, critical, and collapsed wall states.
- Play every projectile profile with and without the thin debuff.
- Inspect operator idle, aim, run, fire, and reload motion.
- Verify no health bars or labels clip the approved silhouette at runway distance.
- Capture phone, tablet, desktop, 1080p, and 4K screenshots before graduation.
