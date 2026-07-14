# Master Gun Game Design

## Core Loop

Each round starts a forward-scrolling runway. The gun fires automatically while the player steers laterally with mouse movement, keyboard, or controller. Green gates improve the current run, red gates weaken it, enemies and barricades reward stronger builds, and the finish ladder converts remaining combat strength into soft currency.

Between rounds, earned cash buys persistent upgrades. The next run starts stronger, unlocks denser choices, and pushes the player toward higher finish tiers.

## Progression

**Early game**:
Short rounds, readable gate pairs, forgiving enemies, quick shop purchases, and obvious cash growth. The player learns Fire Rate, Range, Ammo, and Power.

**Mid game**:
More mixed lanes, moving hazards, tougher barricades, soldier unlocks, income scaling, and route tradeoffs where the best green gate may sit behind a red hazard.

**Late game**:
Dense gate chains, shooter crossfire, blocked upgrade routes, stronger finish ladders, double-weapon builds, soldier synergies, higher health blocks, and longer reward paths that reward planning the whole run rather than reacting gate by gate.

The first 30 levels use explicit profiles so speed, reward pacing, wall density, shooter count, walker count, and blocked upgrade routes grow deliberately instead of scaling as one flat formula.

## Modes

Arcade is the primary 200-level ladder and the source of persistent Upgrade growth. Clearing Arcade level 25 unlocks Weekly Challenge, level 50 unlocks Weapon Mastery, level 100 unlocks Boss Rush, and level 200 unlocks Endless Operations.

### Weapon Mastery

Each of the four weapon platforms has 20 authored Trials split into four acts. A Trial locks the weapon, removes weapon pickups, and shapes its route around that weapon's identity: pistol precision, shotgun timing and breach, machine-gun sustain and rationing, or rifle range and shields. Trials unlock sequentially and award bronze, silver, or gold Medals for completion, collision, life, reserve-ammo, and identity objectives. Persistent combat stats are capped close to the weapon baseline so a strong Arcade save helps without trivializing authored challenges.

### Boss Rush

Boss Rush contains 25 sequential Fights across five specialist families and five threat tiers. Iron Warden blocks, Arc Duelist changes lanes, Tri-Cannon uses armor, Sky Tempest sweeps lanes, and Reclaimer heals when left uninterrupted. Their projectile colors, shot patterns, visuals, health, damage, and fight duration scale by tier. Approach routes include guards, obstacles, forced reload pressure, and weapon-aware ammo support; the boss remains the final required target.

### Weekly Challenge

One UTC week deterministically selects a weapon, objective, route modifiers, and reward. Easy, medium, and hard last 210, 225, and 240 seconds and share a three-Attempt budget. A launch consumes an Attempt; collected route cash is an objective rather than direct Arcade income, and only successful completion awards the published prize.

Weekly combat uses a curated weapon baseline instead of persistent Arcade Power. This makes the challenge comparable between profiles, so its baseline Power, Range, and material multipliers must be balanced in the mode itself. The first target appears within roughly 2.35 seconds, long routes receive weapon-burn-rate ammo support, and support pickups keep at least eight world units of separation.

### Endless Operations

Endless begins after Arcade 200 and carries the full persistent build into escalating Sectors. Health, damage, reward, density, speed, and duration rise with Sector count while active entities and duration remain capped for stability. Every fifth Sector is a boss checkpoint where the player either Extracts all unbanked loot or risks it in the next Sector. Failure loses unbanked loot. Endless also permits 20 Overclock levels beyond each normal Upgrade cap at reduced effect and sharply increasing cost.

## World Feedback

Walls, barricades, and finish blocks reveal a cracked state below roughly half life and a chipped critical state near defeat. These are visual state changes on the existing obstacle rather than separate collision objects. Small instanced grass patches sit near the runway edges as low-opacity scenery only; they never block shots, movement, or pickups.

## Economy

The game uses local soft currency only. Arcade cash comes from completed-round rewards, collected enemy drops, barricades, finish ladder tiers, and income upgrades. Failed Arcade rounds do not bank route cash. Mastery and Boss Rush pay only new Medal improvement, Weekly pays its stated completion prize rather than route cash, and Endless banks loot only on Extraction. Enemy shots reduce Round Score before payout but never subtract saved cash. The versioned local save contains only serializable progression data.

## Performance And Stability

- Simulation state is separate from Three.js scene objects.
- The runway uses instanced geometry.
- Bullets and entities are pruned every frame.
- Long modes keep fewer than 220 active route entities and cap Endless duration at 120 seconds.
- Repeated grass uses one instanced mesh, and damage-state materials are disposed with their owners.
- Vite preview runs against production output for browser smoke testing.
- WebGL context loss is handled without crashing the app.
- Vite uses native config loading in scripts to avoid sandbox-sensitive esbuild config loading.

## Testing Coverage

- Unit tests cover stats, purchases, generation, movement, effects, settlement, damage states, boss skills, mode unlocks, and weekly persistence.
- Property batches generate all 80 Mastery Trials, all 25 Boss Rush Fights, 52 Weekly seeds, and large samples of Arcade and Endless routes.
- Balance tests enforce early Weekly contact, collectible Weekly cash, weapon-aware ammo budgets, pickup spacing, single final bosses, and finite entity counts.
- E2E smoke testing uses the production preview to exercise mouse/controller switching, localization, audio controls, Arcade completion, shop purchases, every Mode lobby, Weekly Attempt persistence, and phone/tablet/TV layouts.
- Browser screenshots and isolated WebGL pixel sampling verify nonblank rendering, image assets, panel padding, and responsive bounds.
- Quality checks enforce file length, lint complexity, max depth, max params, and a custom nesting audit.
