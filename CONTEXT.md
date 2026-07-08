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

**Assistant**:
A temporary or persistent companion weapon that fires alongside the player.
_Avoid_: Pet, minion

**Finish Ladder**:
The end-of-round target stack that converts remaining combat strength into extra cash.
_Avoid_: High score board

**Progression**:
The visible long-term growth across rounds through upgrades, unlocks, income, stronger builds, and higher finish rewards.
_Avoid_: Projection

## Example Dialogue

Designer: "This round should offer a Fire Rate buff on the left and a Power debuff on the right."

Developer: "So the left Gate is a Buff, the right Gate is a Debuff, and both only affect this Run unless the player buys a persistent Upgrade after the Round. If a Shooter hits the player, it reduces Round Score, not saved Soft Currency."

Designer: "Correct. The Finish Ladder should then show whether that stronger Run reaches better cash blocks."
