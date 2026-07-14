export const MASTER_MISSION_ID = "masterGunChampion";
export const THIRD_UPGRADE_SLOT_MISSION_ID = "expandedArmory";
export const FOURTH_UPGRADE_SLOT_MISSION_ID = "quartermasterElite";

const CORE_MISSION_ROWS = Object.freeze([
  row("firstSortie", "runsCompleted", 1, ["First Sortie", "Complete 1 run."], ["Primeira decolagem", "Complete 1 rodada."], ["Primera salida", "Completa 1 ronda."]),
  row("tourTen", "runsCompleted", 10, ["Route Familiar", "Complete 10 runs."], ["Rota familiar", "Complete 10 rodadas."], ["Ruta familiar", "Completa 10 rondas."]),
  row("veteranPilot", "runsCompleted", 50, ["Veteran Pilot", "Complete 50 runs."], ["Piloto veterano", "Complete 50 rodadas."], ["Piloto veterano", "Completa 50 rondas."]),
  row("marathonPilot", "runsCompleted", 120, ["Marathon Pilot", "Complete 120 runs."], ["Piloto maratonista", "Complete 120 rodadas."], ["Piloto maratonista", "Completa 120 rondas."]),
  row("level25Pilot", "levelReached", 25, ["Level 25 Pilot", "Reach level 25."], ["Piloto nível 25", "Alcance o nível 25."], ["Piloto nivel 25", "Alcanza el nivel 25."]),
  row("level50Pilot", "levelReached", 50, ["Level 50 Pilot", "Reach level 50."], ["Piloto nível 50", "Alcance o nível 50."], ["Piloto nivel 50", "Alcanza el nivel 50."]),
  row(THIRD_UPGRADE_SLOT_MISSION_ID, "levelReached", 80, ["Expanded Armory", "Reach level 80 and prove your armory depth."], ["Arsenal expandido", "Alcance o nível 80 e comprove a força do seu arsenal."], ["Arsenal ampliado", "Alcanza el nivel 80 y demuestra la fuerza de tu arsenal."]),
  row("level100Pilot", "levelReached", 100, ["Level 100 Pilot", "Reach level 100."], ["Piloto nível 100", "Alcance o nível 100."], ["Piloto nivel 100", "Alcanza el nivel 100."]),
  row(FOURTH_UPGRADE_SLOT_MISSION_ID, "levelReached", 140, ["Quartermaster Elite", "Reach level 140 and master late-game logistics."], ["Intendente elite", "Alcance o nível 140 e domine a logística do fim de jogo."], ["Intendente de élite", "Alcanza el nivel 140 y domina la logística del final del juego."]),
  row("level150Pilot", "levelReached", 150, ["Level 150 Pilot", "Reach level 150."], ["Piloto nível 150", "Alcance o nível 150."], ["Piloto nivel 150", "Alcanza el nivel 150."]),
  row("level200Pilot", "levelReached", 200, ["Level 200 Pilot", "Reach level 200."], ["Piloto nível 200", "Alcance o nível 200."], ["Piloto nivel 200", "Alcanza el nivel 200."]),
  row("pocketMoney", "cashDrops", 20, ["Pocket Money", "Collect 20 cash drops."], ["Dinheiro de bolso", "Colete 20 pacotes de dinheiro."], ["Dinero de bolsillo", "Recoge 20 paquetes de dinero."]),
  row("cashMagnet", "cashDrops", 150, ["Cash Magnet", "Collect 150 cash drops."], ["Ímã de dinheiro", "Colete 150 pacotes de dinheiro."], ["Imán de dinero", "Recoge 150 paquetes de dinero."]),
  row("skyCollector", "cashDrops", 400, ["Sky Collector", "Collect 400 cash drops."], ["Coletor do ceu", "Colete 400 pacotes de dinheiro."], ["Recolector del cielo", "Recoge 400 paquetes de dinero."]),
  row("perfectCollector", "cashDropsSingleRun", 12, ["Perfect Collector", "Collect 12 cash drops in one run."], ["Coletor perfeito", "Colete 12 pacotes de dinheiro em uma rodada."], ["Recolector perfecto", "Recoge 12 paquetes de dinero en una ronda."]),
  row("vaultRunner", "cashHeld", 10000, ["Vault Runner", "Hold at least $10,000."], ["Corredor do cofre", "Guarde pelo menos $10.000."], ["Corredor de caja fuerte", "Conserva al menos $10,000."]),
  row("skyBanker", "finishCashDrops", 60, ["Sky Banker", "Collect 60 finish-wall cash drops."], ["Banqueiro do céu", "Colete 60 pacotes de dinheiro dos muros finais."], ["Banquero del cielo", "Recoge 60 paquetes de dinero de los muros finales."]),
  row("finishInvestor", "finishCashDrops", 160, ["Finish Investor", "Collect 160 finish-wall cash drops."], ["Investidor final", "Colete 160 pacotes de dinheiro dos muros finais."], ["Inversionista final", "Recoge 160 paquetes de dinero de los muros finales."]),
  row("targetPractice", "enemiesDestroyed", 100, ["Target Practice", "Destroy 100 enemies."], ["Treino de mira", "Destrua 100 inimigos."], ["Práctica de tiro", "Destruye 100 enemigos."]),
  row("enemySweeper", "enemiesDestroyed", 350, ["Enemy Sweeper", "Destroy 350 enemies."], ["Varredor de inimigos", "Destrua 350 inimigos."], ["Barrendero de enemigos", "Destruye 350 enemigos."]),
  row("enemyEradicator", "enemiesDestroyed", 900, ["Enemy Eradicator", "Destroy 900 enemies."], ["Erradicador de inimigos", "Destrua 900 inimigos."], ["Erradicador de enemigos", "Destruye 900 enemigos."]),
  row("sprinterStopper", "sprinterKills", 80, ["Sprinter Stopper", "Defeat 80 sprinter enemies."], ["Freio de sprinters", "Derrote 80 inimigos sprinters."], ["Freno de sprinters", "Derrota 80 enemigos sprinters."]),
  row("sprinterHunter", "sprinterKills", 200, ["Sprinter Hunter", "Defeat 200 sprinter enemies."], ["Caçador de sprinters", "Derrote 200 inimigos sprinters."], ["Cazador de sprinters", "Derrota 200 enemigos sprinters."]),
  row("shieldBreaker", "shieldKills", 70, ["Shield Breaker", "Defeat 70 shield enemies."], ["Quebra-escudos", "Derrote 70 inimigos com escudo."], ["Rompeescudos", "Derrota 70 enemigos con escudo."]),
  row("shieldCrusher", "shieldKills", 180, ["Shield Crusher", "Defeat 180 shield enemies."], ["Esmagador de escudos", "Derrote 180 inimigos com escudo."], ["Aplastador de escudos", "Derrota 180 enemigos con escudo."]),
  row("bruteForce", "bruteKills", 40, ["Brute Force", "Defeat 40 brute enemies."], ["Força bruta", "Derrote 40 inimigos brutos."], ["Fuerza bruta", "Derrota 40 enemigos brutos."]),
  row("bruteLegend", "bruteKills", 100, ["Brute Legend", "Defeat 100 brute enemies."], ["Lenda bruta", "Derrote 100 inimigos brutos."], ["Leyenda bruta", "Derrota 100 enemigos brutos."]),
  row("firstBossDown", "bossKills", 1, ["First Boss Down", "Defeat 1 boss."], ["Primeiro chefe abatido", "Derrote 1 chefe."], ["Primer jefe derrotado", "Derrota 1 jefe."]),
  row("bossHunter", "bossKills", 10, ["Boss Hunter", "Defeat 10 bosses."], ["Caçador de chefes", "Derrote 10 chefes."], ["Cazador de jefes", "Derrota 10 jefes."]),
  row("bossBreaker", "bossKills", 25, ["Boss Breaker", "Defeat 25 bosses."], ["Quebra-chefes", "Derrote 25 chefes."], ["Rompejefes", "Derrota 25 jefes."]),
  row("bossConqueror", "bossKills", 40, ["Boss Conqueror", "Defeat all 40 checkpoint bosses."], ["Conquistador de chefes", "Derrote todos os 40 chefes de checkpoint."], ["Conquistador de jefes", "Derrota a los 40 jefes de checkpoint."]),
  row("bossDancer", "bossNoProjectileRuns", 3, ["Boss Dancer", "Complete 3 boss runs without enemy projectile hits."], ["Dança contra chefes", "Complete 3 rodadas com chefe sem ser atingido por projéteis."], ["Baile contra jefes", "Completa 3 rondas con jefe sin recibir proyectiles."]),
  row("bossUntouchable", "bossNoProjectileRuns", 12, ["Boss Untouchable", "Complete 12 boss runs without enemy projectile hits."], ["Intocável contra chefes", "Complete 12 rodadas com chefe sem ser atingido por projéteis."], ["Intocable contra jefes", "Completa 12 rondas con jefe sin recibir proyectiles."]),
  row("gateCracker", "gatesDestroyed", 75, ["Gate Cracker", "Destroy 75 gates."], ["Quebra-portões", "Destrua 75 portões."], ["Rompepuertas", "Destruye 75 puertas."]),
  row("gateDemolisher", "gatesDestroyed", 220, ["Gate Demolisher", "Destroy 220 gates."], ["Demolidor de portões", "Destrua 220 portões."], ["Demoledor de puertas", "Destruye 220 puertas."]),
  row("redCleaner", "redGatesDestroyed", 80, ["Red Cleaner", "Destroy 80 red debuff gates before contact."], ["Limpa-vermelhos", "Destrua 80 portões vermelhos antes do contato."], ["Limpieza roja", "Destruye 80 puertas rojas antes del contacto."]),
  row("redSpecialist", "redGatesDestroyed", 200, ["Red Specialist", "Destroy 200 red debuff gates before contact."], ["Especialista em vermelhos", "Destrua 200 portões vermelhos antes do contato."], ["Especialista rojo", "Destruye 200 puertas rojas antes del contacto."]),
  row("wallBreaker", "wallsDestroyed", 45, ["Wall Breaker", "Destroy 45 solid walls."], ["Quebra-muros", "Destrua 45 muros sólidos."], ["Rompe muros", "Destruye 45 muros sólidos."]),
  row("wallDemolition", "wallsDestroyed", 140, ["Wall Demolition", "Destroy 140 solid walls."], ["Demolição de muros", "Destrua 140 muros sólidos."], ["Demolición de muros", "Destruye 140 muros sólidos."]),
  row("finishTier3", "finishTierBest", 3, ["Finish Tier 3", "Reach finish tier 3 in one run."], ["Final tier 3", "Alcance o tier final 3 em uma rodada."], ["Final tier 3", "Alcanza el tier final 3 en una ronda."]),
  row("finishTier10", "finishTierBest", 10, ["Finish Tier 10", "Reach finish tier 10 in one run."], ["Final tier 10", "Alcance o tier final 10 em uma rodada."], ["Final tier 10", "Alcanza el tier final 10 en una ronda."]),
  row("finishTier20", "finishTierBest", 20, ["Finish Tier 20", "Reach finish tier 20 in one run."], ["Final tier 20", "Alcance o tier final 20 em uma rodada."], ["Final tier 20", "Alcanza el tier final 20 en una ronda."]),
  row("twoMinuteRunner", "cappedRuns", 1, ["Two-Minute Runner", "Complete a capped 120-second run."], ["Corredor de dois minutos", "Complete uma rodada com limite de 120 segundos."], ["Corredor de dos minutos", "Completa una ronda limitada a 120 segundos."]),
  row("enduranceAce", "cappedRuns", 10, ["Endurance Ace", "Complete 10 capped 120-second runs."], ["Ás da resistência", "Complete 10 rodadas com limite de 120 segundos."], ["As de resistencia", "Completa 10 rondas limitadas a 120 segundos."]),
  row("heavyHitter", "damageDealt", 50000, ["Heavy Hitter", "Deal 50,000 total damage."], ["Mão pesada", "Cause 50.000 de dano total."], ["Golpe pesado", "Causa 50,000 de daño total."]),
  row("heavyOrdnance", "damageDealt", 200000, ["Heavy Ordnance", "Deal 200,000 total damage."], ["Artilharia pesada", "Cause 200.000 de dano total."], ["Artillería pesada", "Causa 200,000 de daño total."]),
  row("masterGunner", "damageDealt", 600000, ["Master Gunner", "Deal 600,000 total damage."], ["Atirador mestre", "Cause 600.000 de dano total."], ["Artillero maestro", "Causa 600,000 de daño total."]),
  row("bonusShooter", "pickupsShot", 40, ["Bonus Shooter", "Shoot 40 green floor bonuses."], ["Atirador de bônus", "Atire em 40 bônus verdes no chão."], ["Tirador de bonos", "Dispara a 40 bonos verdes del piso."]),
  row("bonusMarksman", "pickupsShot", 160, ["Bonus Marksman", "Shoot 160 green floor bonuses."], ["Mira de bônus", "Atire em 160 bônus verdes no chão."], ["Tirador experto de bonos", "Dispara a 160 bonos verdes del piso."]),
  row("ammoHunter", "ammoEarned", 500, ["Ammo Hunter", "Earn 500 ammo from ammo pickups."], ["Caçador de munição", "Ganhe 500 de munição com alvos de munição."], ["Cazador de munición", "Gana 500 de munición con objetivos de munición."]),
  row("ammoQuartermaster", "ammoEarned", 2000, ["Ammo Quartermaster", "Earn 2,000 ammo from ammo pickups."], ["Intendente de munição", "Ganhe 2.000 de munição com alvos de munição."], ["Intendente de munición", "Gana 2,000 de munición con objetivos de munición."]),
  row("greenRoute", "greenBuffs", 160, ["Green Route", "Collect 160 green buffs from gates or pickups."], ["Rota verde", "Colete 160 buffs verdes de portões ou bônus."], ["Ruta verde", "Recoge 160 buffs verdes de puertas o bonos."]),
  row("greenMaster", "greenBuffs", 500, ["Green Master", "Collect 500 green buffs from gates or pickups."], ["Mestre verde", "Colete 500 buffs verdes de portões ou bônus."], ["Maestro verde", "Recoge 500 buffs verdes de puertas o bonos."]),
  row("firstUpgrade", "upgradesBought", 1, ["First Upgrade", "Buy any upgrade."], ["Primeiro upgrade", "Compre qualquer upgrade."], ["Primera mejora", "Compra cualquier mejora."]),
  row("quartermaster", "upgradesBought", 40, ["Quartermaster", "Buy 40 total upgrade levels."], ["Intendente", "Compre 40 níveis de upgrade no total."], ["Intendente", "Compra 40 niveles de mejora en total."]),
  row("arsenalEngineer", "upgradesBought", 100, ["Arsenal Engineer", "Buy 100 total upgrade levels."], ["Engenheiro do arsenal", "Compre 100 níveis de upgrade no total."], ["Ingeniero del arsenal", "Compra 100 niveles de mejora en total."]),
  row("newGrip", "nonPistolEquips", 1, ["New Grip", "Equip any non-pistol weapon."], ["Nova empunhadura", "Equipe qualquer arma que não seja a pistola."], ["Nuevo agarre", "Equipa cualquier arma que no sea la pistola."]),
  row("sidearmLoyalist", "pistolRuns", 10, ["Sidearm Loyalist", "Complete 10 runs with the pistol."], ["Fiel a pistola", "Complete 10 rodadas com a pistola."], ["Leal a la pistola", "Completa 10 rondas con la pistola."]),
  row("shotgunTrial", "shotgunRuns", 3, ["Shotgun Trial", "Complete 3 runs with the shotgun."], ["Teste da escopeta", "Complete 3 rodadas com a escopeta."], ["Prueba de escopeta", "Completa 3 rondas con la escopeta."]),
  row("shotgunVeteran", "shotgunRuns", 25, ["Shotgun Veteran", "Complete 25 runs with the shotgun."], ["Veterano da escopeta", "Complete 25 rodadas com a escopeta."], ["Veterano de escopeta", "Completa 25 rondas con la escopeta."]),
  row("machineGunTrial", "machineGunRuns", 3, ["Machine Gun Trial", "Complete 3 runs with the machine gun."], ["Teste da metralhadora", "Complete 3 rodadas com a metralhadora."], ["Prueba de ametralladora", "Completa 3 rondas con la ametralladora."]),
  row("machineGunVeteran", "machineGunRuns", 25, ["Machine Gun Veteran", "Complete 25 runs with the machine gun."], ["Veterano da metralhadora", "Complete 25 rodadas com a metralhadora."], ["Veterano de ametralladora", "Completa 25 rondas con la ametralladora."]),
  row("rifleTrial", "rifleRuns", 3, ["Rifle Trial", "Complete 3 runs with the rifle."], ["Teste do rifle", "Complete 3 rodadas com o rifle."], ["Prueba de rifle", "Completa 3 rondas con el rifle."]),
  row("rifleVeteran", "rifleRuns", 25, ["Rifle Veteran", "Complete 25 runs with the rifle."], ["Veterano do rifle", "Complete 25 rodadas com o rifle."], ["Veterano de rifle", "Completa 25 rondas con el rifle."]),
  row("fullArsenal", "weaponsOwned", 4, ["Full Arsenal", "Own every weapon."], ["Arsenal completo", "Tenha todas as armas."], ["Arsenal completo", "Posee todas las armas."]),
]);

const MISSION_ROWS = Object.freeze([
  ...CORE_MISSION_ROWS,
  row(
    MASTER_MISSION_ID,
    "completedMissions",
    CORE_MISSION_ROWS.length,
    ["Master Gun Champion", `Complete the other ${CORE_MISSION_ROWS.length} missions.`],
    ["Campeão Master Gun", `Complete as outras ${CORE_MISSION_ROWS.length} missões.`],
    ["Campeón Master Gun", `Completa las otras ${CORE_MISSION_ROWS.length} misiones.`],
  ),
]);

export const MISSION_DEFINITIONS = Object.freeze(
  MISSION_ROWS.map((item) => ({
    id: item.id,
    title: item.text.en[0],
    description: item.text.en[1],
    stat: item.stat,
    target: item.target,
    text: item.text,
  })),
);

export function getMissionDefinition(id) {
  return MISSION_DEFINITIONS.find((missionDefinition) => missionDefinition.id === id);
}

export function getMissionCopy(mission, locale = "en") {
  const [title, description] = mission.text?.[locale] ?? mission.text?.en ?? [mission.title, mission.description];
  return { title, description };
}

function row(...items) {
  const [id, stat, target, en, ptBR, esLA] = items;
  return { id, stat, target, text: { en, "pt-BR": ptBR, "es-LA": esLA } };
}
