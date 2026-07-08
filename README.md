# Master Gun

Master Gun is a local browser arcade game built with pnpm, Vite, JavaScript, and Three.js. It is inspired by fast lane-shooter runners: steer a weapon across a forward-scrolling runway, shoot continuously, route through green buffs and away from red debuffs, earn soft currency, and grow stronger between rounds.

## Commands

```sh
corepack pnpm install
corepack pnpm dev
corepack pnpm check
```

## Gameplay

- Mouse movement automatically controls the gun laterally.
- Keyboard fallback uses `A/D` or arrow keys.
- Controller support uses the left stick or D-pad.
- Green gates improve fire rate, range, ammo, power, double weapons, and assistants.
- Red gates apply temporary debuffs and route pressure.
- Round cash buys persistent upgrades after each run.

## Quality Rules

- Source files must stay under 600 lines.
- Simulation state must stay separate from Three.js objects.
- HUD and menus use DOM overlays.
- Complexity and nesting checks run through `corepack pnpm check`.
