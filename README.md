# Master Gun

Master Gun is a local browser arcade game built with pnpm, Vite, JavaScript, and Three.js. It is inspired by fast lane-shooter runners: steer a weapon across a forward-scrolling runway, shoot continuously, route through green buffs and away from red debuffs, earn soft currency, and grow stronger between rounds.

## Commands

```sh
corepack pnpm install
corepack pnpm dev
corepack pnpm check
```

The development-only visual prototype lab is available at `http://127.0.0.1:5173/?artLab=1`. Its `showcase`, `runway`, and `stress` views compare legacy and prototype assets before production rollout. See [docs/art-direction.md](docs/art-direction.md) for dimensions and budgets, and [docs/visual-remaster-implementation-plan.md](docs/visual-remaster-implementation-plan.md) for phases, quality gates, and approval criteria.

## Gameplay

- Mouse movement automatically controls the gun laterally.
- Keyboard fallback uses `A/D` or arrow keys.
- Controller support uses the left stick or D-pad.
- Green gates improve fire rate, range, ammo, power, double weapons, and temporary soldiers.
- Red gates apply temporary debuffs and route pressure.
- Round cash buys persistent upgrades after each run.

## Modes

- **Arcade**: the 200-level primary ladder and persistent Upgrade economy.
- **Weekly Challenge**: unlocked after Arcade 25; one seeded 3.5-4 minute challenge, three shared Attempts, and Easy/Medium/Hard rewards.
- **Weapon Mastery**: unlocked after Arcade 50; 20 weapon-locked Trials for each of the four weapons.
- **Boss Rush**: unlocked after Arcade 100; 25 authored Fights across five specialist boss families.
- **Endless Operations**: unlocked after Arcade 200; escalating Sectors, five-Sector Extraction checkpoints, and post-cap Overclocks.

Weekly Challenge intentionally uses a curated combat baseline. Persistent Arcade Power does not carry into it; Arcade and Endless use the full saved build, while Mastery and Boss Rush cap persistent advantages near their authored baselines.

## Quality Rules

- Source files must stay under 600 lines.
- Simulation state must stay separate from Three.js objects.
- HUD and menus use DOM overlays.
- Complexity and nesting checks run through `corepack pnpm check`.
- Mode content is regression-tested through deterministic unit/property batches and production-browser smoke checks.
