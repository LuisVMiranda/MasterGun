const HEAL_CHANNEL_SECONDS = 2;
const BLOCK_SECONDS = 2.5;
const SIGNATURE_SECONDS = Object.freeze({ sidestep: 0.65, armor: 2.2, laneSweep: 1.9 });

export function updateBossCombat(run, boss, dt, spawnProjectile) {
  if (!isBossInCombat(boss)) return;
  updateBossSkills(run, boss, dt);
  updateSalvo(run, boss, dt, spawnProjectile);
  prepareBossAttack(run, boss, dt, spawnProjectile);
}

export function recordBossDamage(run, boss) {
  boss.lastDamagedAt = run.elapsed;
  if (boss.skillState === "healing") boss.skillInterrupted = true;
}

export function isBossBlocking(boss) {
  return boss.skillState === "blocking" && boss.skillTimer > 0;
}

export function getBossDamageMultiplier(boss) {
  if (boss.skillState !== "armoring" || boss.skillTimer <= 0) return 1;
  return Math.max(0.38, 0.62 - (boss.skillTier ?? 1) * 0.035);
}

function updateBossSkills(run, boss, dt) {
  if (!boss.skillState) return;
  boss.skillTimer = Math.max(0, boss.skillTimer - dt);
  if (boss.skillTimer > 0) return;
  if (boss.skillState === "healing" && !boss.skillInterrupted) {
    const heal = Math.max(1, Math.round(boss.maxHealth * 0.08));
    boss.health = Math.min(boss.maxHealth, boss.health + heal);
    boss.healUses = (boss.healUses ?? 0) + 1;
    run.messages.push({ id: `boss-heal-${boss.id}-${run.elapsed}`, text: `+${heal}`, tone: "debuff", ttl: 1.2 });
  }
  boss.skillState = null;
  boss.skillInterrupted = false;
  boss.skillCycles = (boss.skillCycles ?? 0) + 1;
  boss.skillCooldown = 11 + Math.max(0, 5 - (boss.skillTier ?? 1));
}

function tryStartSkill(run, boss) {
  if (!canTrySkill(boss)) return false;
  const tier = boss.skillTier ?? 1;
  if (shouldHeal(boss, tier)) return startSkill(boss, "healing", HEAL_CHANNEL_SECONDS, run.elapsed);
  if (boss.signatureSkill === "block") return startSkill(boss, "blocking", BLOCK_SECONDS, run.elapsed);
  if (startSignatureSkill(run, boss)) return true;
  if (shouldBlock(boss, tier)) return startSkill(boss, "blocking", BLOCK_SECONDS, run.elapsed);
  return false;
}

function startSignatureSkill(run, boss) {
  if (boss.signatureSkill === "sidestep") {
    boss.sidestepTargetX = getOppositeLane(boss);
    return startSkill(boss, "sidestepping", SIGNATURE_SECONDS.sidestep, run.elapsed);
  }
  if (boss.signatureSkill === "armor") return startSkill(boss, "armoring", SIGNATURE_SECONDS.armor, run.elapsed);
  if (boss.signatureSkill !== "laneSweep") return false;
  boss.salvo = createLaneSweep(boss.skillTier);
  boss.salvoTimer = 0;
  return startSkill(boss, "sweeping", SIGNATURE_SECONDS.laneSweep, run.elapsed);
}

function startSkill(boss, state, duration, elapsed) {
  boss.skillState = state;
  boss.skillTimer = duration;
  boss.skillStartedAt = elapsed;
  boss.skillInterrupted = false;
  boss.skillCooldown = duration + 8;
  return true;
}

function isBossBusy(boss) {
  return Boolean(boss.skillState && boss.skillTimer > 0);
}

function isBossInCombat(boss) {
  return boss.type === "boss" && boss.z >= 2 && boss.z <= 38;
}

function prepareBossAttack(run, boss, dt, spawnProjectile) {
  if (isBossBusy(boss)) return;
  boss.shootCooldown -= dt;
  boss.skillCooldown = Math.max(0, (boss.skillCooldown ?? 0) - dt);
  if (tryStartSkill(run, boss) || boss.shootCooldown > 0 || boss.salvo?.length) return;
  boss.salvo = createSalvo(boss.shotPattern, boss.skillTier);
  boss.salvoTimer = 0;
  boss.shootCooldown = Math.max(0.7, boss.shootInterval * (1 - (boss.skillTier ?? 1) * 0.035));
  updateSalvo(run, boss, 0, spawnProjectile);
}

function canTrySkill(boss) {
  return boss.skillCooldown <= 0 && !boss.salvo?.length;
}

function shouldHeal(boss, tier) {
  const available = tier >= 4 || boss.signatureSkill === "heal";
  return available && boss.health < boss.maxHealth * 0.72 && (boss.healUses ?? 0) < 2;
}

function shouldBlock(boss, tier) {
  const available = tier >= 2 || boss.signatureSkill === "block";
  return available && (boss.skillCycles ?? 0) % 3 === 2;
}

function updateSalvo(run, boss, dt, spawnProjectile) {
  if (!boss.salvo?.length) return;
  boss.salvoTimer -= dt;
  while (boss.salvo.length && boss.salvoTimer <= 0) {
    const shot = boss.salvo.shift();
    spawnProjectile(run, boss, shot);
    boss.salvoTimer += shot.nextDelay;
  }
}

function createLaneSweep(tier = 1) {
  const count = Math.min(9, 5 + tier);
  return shots(count, 0.2, Array.from({ length: count }, (_, index) => -0.52 + index * 1.04 / Math.max(1, count - 1)));
}

function getOppositeLane(boss) {
  const direction = boss.x >= 0 ? -1 : 1;
  return direction * (1.75 + (boss.skillTier ?? 1) * 0.16);
}

function createSalvo(pattern, tier) {
  const pressure = Math.max(0, (tier ?? 1) - 1);
  if (pattern === "double") return shots(2 + Math.floor(pressure / 3), 0.18, [0, 0.18]);
  if (pattern === "triple") return shots(3, 0.14, [-0.12, 0, 0.12]);
  if (pattern === "shower") return shots(3 + Math.floor(pressure / 2), 0.16, [-0.34, 0.28, -0.12, 0.4]);
  if (pattern === "mixed") return createSalvo(["single", "double", "triple", "shower"][pressure % 4], tier);
  return shots(1, 0.1, [0]);
}

function shots(count, delay, aimOffsets) {
  return Array.from({ length: count }, (_, index) => ({
    aimOffset: aimOffsets[index % aimOffsets.length],
    laneVelocity: aimOffsets[index % aimOffsets.length] * 1.8,
    nextDelay: delay,
  }));
}
