# Master Gun Game Design

## Core Loop

Each round starts a forward-scrolling runway. The gun fires automatically while the player steers laterally with mouse movement, keyboard, or controller. Green gates improve the current run, red gates weaken it, enemies and barricades reward stronger builds, and the finish ladder converts remaining combat strength into soft currency.

Between rounds, earned cash buys persistent upgrades. The next run starts stronger, unlocks denser choices, and pushes the player toward higher finish tiers.

## Progression

**Early game**:
Short rounds, readable gate pairs, forgiving enemies, quick shop purchases, and obvious cash growth. The player learns Fire Rate, Range, Ammo, and Power.

**Mid game**:
More mixed lanes, moving hazards, tougher barricades, assistant unlocks, income scaling, and route tradeoffs where the best green gate may sit behind a red hazard.

**Late game**:
Dense gate chains, shooter crossfire, blocked upgrade routes, stronger finish ladders, double-weapon builds, assistant synergies, higher health blocks, and longer reward paths that reward planning the whole run rather than reacting gate by gate.

The first 30 levels use explicit profiles so speed, reward pacing, wall density, shooter count, walker count, and blocked upgrade routes grow deliberately instead of scaling as one flat formula.

## Economy

The game uses local soft currency only. Cash comes from base round rewards, destroyed enemies and barricades, finish ladder tiers, and income upgrades. Enemy shots reduce Round Score before payout, but never subtract saved cash. The save is versioned in local storage and contains only serializable progression data.

## Performance And Stability

- Simulation state is separate from Three.js scene objects.
- The runway uses instanced geometry.
- Bullets and entities are pruned every frame.
- Vite preview runs against production output for browser smoke testing.
- WebGL context loss is handled without crashing the app.
- Vite uses native config loading in scripts to avoid sandbox-sensitive esbuild config loading.

## Testing Coverage

- Unit tests cover stats, soft-currency purchases, round generation, movement, gates, debuff clearing, and round completion.
- E2E smoke testing loads the production preview, starts a run, moves the mouse, reaches the shop, captures a screenshot, and fails on relevant console warnings or errors.
- Quality checks enforce file length, lint complexity, max depth, max params, and a custom nesting audit.
