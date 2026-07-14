# Master Gun

Master Gun is a browser arcade lane shooter about building stronger weapons across short rounds while choosing riskier or safer routes.

## Language

**Round**:
A single playable attempt on one generated runway, ending at the finish ladder or by running out of ammo and failing to clear required obstacles.
_Avoid_: Match, stage

**Run**:
The active moment-to-moment traversal within a round, including steering, shooting, gates, hazards, enemies, and finish rewards.
_Avoid_: Session

**Soft Currency**:
Earned game money spent on persistent upgrades inside the local browser save.
_Avoid_: Microtransaction, real-money purchase

**Round Score**:
A temporary run value that can be reduced by enemy shots before it is converted into the round payout. It never subtracts already-saved Soft Currency.
_Avoid_: Permanent score, wallet penalty

**Gate**:
A lane object that changes the player's temporary run stats when crossed or destroyed.
_Avoid_: Portal, pickup door

**Buff**:
A green positive gate or pickup that improves the current run.
_Avoid_: Bonus when referring to stat changes

**Debuff**:
A red negative gate or hazard that weakens the current run.
_Avoid_: Penalty when referring to stat changes

**Soldier**:
A temporary blue companion fighter that joins only for the current Run, fires alongside the player, and can lose life from enemy shots.
_Avoid_: Pet, minion

**Finish Ladder**:
The end-of-round target stack that converts remaining combat strength into extra cash.
_Avoid_: High score board

**Progression**:
The visible long-term growth across rounds through upgrades, unlocks, income, stronger builds, and higher finish rewards.
_Avoid_: Projection

**Mode**:
A distinct ruleset and progression path built on the shared steering and shooting loop.
_Avoid_: Game type, playlist

**Arcade**:
The primary 200-level progression Mode whose cleared levels authorize access to the other Modes.
_Avoid_: Campaign when naming the Mode

**Trial**:
A weapon-locked challenge in Weapon Mastery with one completion objective and up to three Medal grades.
_Avoid_: Level when referring to Mastery content

**Fight**:
An authored Boss Rush challenge centered on one specialist boss family and its combat pattern.
_Avoid_: Boss level when referring to Boss Rush content

**Weekly Challenge**:
A deterministic seven-day operation with one assigned weapon, difficulty-specific conditions, and a shared three-Attempt limit.
_Avoid_: Daily challenge, weekly level

**Attempt**:
One launch of the current Weekly Challenge, consumed when its Run starts regardless of success.
_Avoid_: Life, retry

**Operation**:
One continuous Endless journey containing sequential Sectors and ending on failure or voluntary Extraction.
_Avoid_: Endless round

**Sector**:
A single escalating Round within an Operation; every fifth Sector ends at an Extraction decision.
_Avoid_: Endless level

**Extraction**:
The voluntary end of an Operation that converts its unbanked loot into saved Soft Currency.
_Avoid_: Cash out, finish

**Medal**:
A bronze, silver, or gold grade for a completed Trial or Fight; only improvement to a prior grade earns the grade difference again.
_Avoid_: Star when referring to the progression grade

**Overclock**:
An Endless-only extension beyond a persistent Upgrade's normal level cap, with reduced incremental effect and escalating cost.
_Avoid_: Prestige, infinite upgrade

## Example Dialogue

Designer: "This round should offer a Fire Rate buff on the left and a Power debuff on the right."

Developer: "So the left Gate is a Buff, the right Gate is a Debuff, and both only affect this Run unless the player buys a persistent Upgrade after the Round. If a Shooter hits the player, it reduces Round Score, not saved Soft Currency."

Designer: "Correct. Arcade clears authorize Modes, a Trial earns a Medal, and an Operation banks loot only through Extraction. The Finish Ladder remains an Arcade concept."
