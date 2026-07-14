# Master Gun Visual Remaster Implementation Plan

## Objective

Raise the game from readable procedural placeholders to a cohesive stylized 3D action presentation inspired by the supplied reference, without changing gameplay balance during the visual rollout. The target is a hybrid pipeline: authored GLB assets for hero weapons and operators, procedural Three.js fallbacks for resilience, and instanced procedural assets for repeated runway objects.

Production replacement is gated by approval in the hidden Art Lab. Prototype work must not silently replace the live game.

## Prototype Entry Points

- Turntable: `/?artLab=1&variant=showcase`
- Runway composition: `/?artLab=1&variant=runway`
- Stress test: `/?artLab=1&variant=stress`
- Focused assets can be opened with `&asset=pistol`, `operator`, `gate`, `wall`, or `pickup`.
- Add `&paused=1` for a deterministic still frame during visual review.

## Visual Direction

- Shape language: military-inspired, stylized, immediately readable, and free of real manufacturer branding.
- Detail density: highest around the player weapon, operators, boss faces, and interactive silhouettes; reduced on distant repeated props.
- Materials: restrained PBR surfaces with distinct metal, polymer, glass, cloth/armor, translucent signal panels, and masonry.
- Shadows: soft directional shadows for weapons and people, compact contact shadows at feet, and subtle shadows for gates, walls, and pickups.
- Separation: material contrast and silhouette first. White outlines remain thin and selective; no internal wireframe-like strokes.
- Scale: large enough for television viewing while preserving runway clearance and target recognition.

## Asset Contracts

### Weapons

Each weapon supplies `muzzle`, `eject`, `grip_primary`, `grip_support`, and `shadow_anchor` sockets.

| Weapon | Identity | Hero budget | Projectile identity |
| --- | --- | ---: | --- |
| Pistol | Slim slide, angled grip, visible trigger guard and ejection port | 4,000 tris | Compact amber capsule, short trail, crisp spark |
| Shotgun | Single barrel, pump, tube, stock, heavy receiver | 5,000 tris | One large orange projectile, broad short trail, heavy burst |
| Machine gun | Magazine, foregrip, sight rail, handguard | 5,500 tris | Small yellow rounds, long cadence trail, small sparks |
| Rifle | Long barrel, scope, stock, slim handguard | 6,000 tris | Narrow violet round, long trail, piercing impact |

LOD targets are approximately 45% and 18% of the hero triangle count. Player weapons cast a cohesive silhouette shadow from `shadow_anchor`. Projectiles never cast shadows.

### Operators

- Enemy uses a red armor family; player soldiers use blue.
- Body proportions should read as human before armor is considered: smaller head, tapered torso, separated upper/lower limbs, hands, knees, and feet.
- Required animations: `idle`, `aim`, `run`, `strafeLeft`, `strafeRight`, `fire`, `reload`, hit, and defeat.
- Strafing keeps torso, eyes, and weapon aimed forward. Feet cross-step and the body leans toward travel.
- The procedural prototype body budget is 5,500 triangles excluding its held weapon.
- Authored production rigs share one skeleton and animation set wherever practical.

### Gates And Pickups

- Buff and debuff panels are translucent signal surfaces mounted between two gunmetal posts.
- Posts should be lighter than black so they remain readable against translucent green/red panels.
- Floor pickups use a physical crate plus a floating contents icon, not a generic ball.
- Initial icon families: cash stack, ammunition cartridges, power bolt, and debuff warning.
- Icons bob and rotate subtly while the crate remains grounded.

### Walls And Occlusion Assistance

- Brick walls use intact, cracked, critical, and collapsed states.
- The cracked state appears at or below 50% life; critical damage removes/displaces selected bricks and adds debris.
- A hidden unit may receive one sparse white dashed outer contour only where wall pixels occlude it.
- The contour belongs to the wall/view layer, never the operator material or model.
- The contour is generated from vertical extrema of the actual hidden geometry, so it follows the real outer silhouette without drawing internal armor edges.
- Stencil clipping prevents the contour from appearing outside the wall.
- The contour disappears when the wall collapses, leaves the scene, or no longer blocks the unit.
- Placement must include both object depths plus at least `0.58` world units of empty clearance. Level generation must not place a hidden unit so its solid sprite touches or overlaps its wall.

## Phase 0: Runtime Audit And Baseline

### Work

- Map simulation entities to current Three.js factories and update paths.
- Record production collision dimensions, z direction, sockets, shadows, outline behavior, and quality settings.
- Capture draw calls, triangles, geometries, textures, frame time, and viewport behavior before replacement.
- Freeze gameplay values for damage, range, cadence, ammo, collision, economy, and progression during visual work.

### Quality Gate

- Existing unit, property, localization, and E2E suites pass before visual replacement.
- Production and prototype routes have separate entry boundaries.
- No Art Lab code is included in the production build.

## Phase 1: Art Lab And Procedural Prototypes

### Work

- Build focused turntable, runway, and stress-test views.
- Add prototype/legacy comparison, asset controls, animation states, damage slider, quality profiles, thin-projectile mode, and live metrics.
- Make focused assets large enough for close inspection.
- Support desktop, tablet, phone, large monitor, and television layouts.

### Quality Gate

- Every control changes the intended model without reloading the game.
- No horizontal overflow at 390, 820, 1366, 1920, and 3840 CSS-pixel widths.
- Text and controls remain legible and reachable.
- The Art Lab stays hidden unless `artLab=1` is explicitly present in development.

## Phase 2: Weapons, Projectiles, And Effects

### Work

- Approve each weapon profile independently before modeling final GLBs.
- Model fictional hero assets with the shared socket contract and LODs.
- Give every weapon a dedicated projectile width, length, trail, color, muzzle flash, recoil, and impact family.
- Preserve thin-projectile gameplay by scaling visual and collision width together while keeping projectile length stable.
- Keep the cinematic special shot outside the ordinary projectile pool.
- Use instanced meshes for ordinary projectile cores and trails.

### Quality Gate

- Ordinary projectile rendering uses no more than 12 draw calls.
- Shotgun fires one heavy projectile, not a pellet line.
- Player, soldier, enemy, and special projectiles are distinguishable at a glance.
- Simulation bullets carry `visualKind`, `weaponId`, and `bornAt` metadata without changing combat behavior.
- Muzzle and impact effects expire and dispose cleanly.

## Phase 3: Human Operators And Locomotion

### Work

- Replace blocky figures with one shared humanoid rig and faction material variants.
- Author idle breathing, aim, forward run, lateral left/right movement, fire recoil, reload, hit, and defeat clips.
- Keep soldiers smaller than principal enemies and grouped around the player in formation.
- Attach held weapons through grip sockets and projectiles through the muzzle socket.
- Retarget boss variants only when their proportions permit it.

### Quality Gate

- Strafe animation reads as sideways travel in both directions while aim remains forward.
- No foot sliding at target gameplay speeds after blend tuning.
- Hands remain within grip tolerance through aim, fire, and reload clips.
- Operator body meets LOD and triangle budgets.
- Enemy and soldier remain identifiable without relying on labels.

## Phase 4: Interactive Runway Assets

### Work

- Roll out posted gates and their translucent signaling.
- Replace generic pickup beacons with contents icons.
- Connect wall life ratio to authored damage states.
- Add wall-scoped occlusion contours and enforce generator clearance.
- Revisit floor grass patches and runway cosmetics only after interaction readability is stable.

### Quality Gate

- Green/red meaning remains clear in all three backgrounds.
- Pickup icon matches the actual interaction contract.
- Destroyable and collectible assets never exchange behaviors.
- Contours contain no internal model lines and never survive wall removal.
- Generated placements satisfy the wall-to-unit clearance property across every mode and seed batch.

## Phase 5: Scripted GLB Pipeline

### Work

- Use `scripts/blender/master_gun_assets.py` as the deterministic source for initial authored models.
- Export GLBs to the manifest paths under `public/assets/models`.
- Add shared material naming, socket empties, LOD naming, rig naming, animation clips, and origin checks.
- Compress geometry and textures only after visual approval.
- Keep the procedural fallback available for failed or missing model loads.

### Quality Gate

- `pnpm art:build` produces all expected files when Blender is installed.
- `pnpm art:validate:strict` passes after approved GLBs are generated.
- Model dimensions, triangle count, materials, sockets, animations, and file size meet manifest budgets.
- Missing GLBs fall back once, use the load cache, and do not break a run.

## Phase 6: Production Integration

### Work

- Replace one production asset family at a time behind a render flag.
- Start with weapons/projectiles, then gates/pickups, then walls, then operators.
- Preserve simulation-owned dimensions and interaction rules.
- Pool repeated effects and clone skinned instances safely.
- Connect movement direction to forward/strafe animation blends.
- Remove temporary comparison paths only after approval and soak testing.

### Quality Gate

- Baseline gameplay tests pass unchanged.
- No asset replacement changes hit timing, range, health, ammo, rewards, or progression.
- Controller and mouse/keyboard inputs remain simultaneous.
- Failed asset loads use the fallback without visible stalls or duplicate network attempts.

## Phase 7: Performance, Stability, And Release

### Work

- Apply mobile, balanced, and high quality profiles at runtime.
- Tune pixel ratio, shadow maps, LOD distance, effect density, and pooled capacity by profile.
- Dispose replaced geometries/materials without touching shared legacy resources.
- Add long-run stress, repeated mode switching, resize, context-loss, and save compatibility checks.

### Budgets

- Desktop target: 60 FPS, 16.7 ms frame time, at most 140 scene draw calls.
- Mobile target: 30 FPS, 33.3 ms frame time, at most 95 scene draw calls.
- No gameplay hitch above 50 ms from first-time asset creation after preload.
- Files remain below 600 lines; functions stay within five parameters, nesting depth three, and cyclomatic complexity ten.

### Final Quality Gate

- Lint, unit, property, build, E2E, art validation, and repository quality checks pass.
- Browser screenshots cover focused assets, all wall states, all pickup icons, both factions, both strafe directions, projectile volleys, and all target viewports.
- Stress mode remains within the selected profile budget or has a documented and approved exception.
- Production rollout receives explicit visual approval before the default renderer changes.

## Current Production Status

- The procedural families were visually approved on 2026-07-13 and moved into production-owned render modules; the live renderer does not import the development Art Lab.
- All player weapons, ordinary projectile profiles and effects, posted gates, damage-state walls, floor pickups, temporary soldiers, and ranged shooters now use the approved assets.
- Far ranged shooters use a fixed-mesh instanced LOD and transition to detailed approved operators before engagement range. The ordinary projectile pool has a fixed twelve-draw-call ceiling.
- Specialized melee enemies and bosses retain their current role-specific production loadouts pending dedicated family approval.
- Blender scripting and asset contracts remain available for a later GLB upgrade, but final GLBs, animation clips, and compressed textures are not required by this approved procedural rollout.

## Approval Checklist

1. Approved: four weapon silhouettes and materials.
2. Approved: ranged enemy and soldier proportions, armor language, and strafe motion.
3. Approved: gate post value, panel translucency, and icon scale.
4. Approved: pickup crate and each contents icon.
5. Approved: all wall damage states and the restrained occlusion contour.
6. Approved: projectile profiles, muzzle flashes, impacts, and thin-projectile behavior.
7. Approved: runway composition and stress-test performance for production integration.
