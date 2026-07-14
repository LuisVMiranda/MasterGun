import { BOSS_RUSH_FIGHTS, findBossFight, isBossFightUnlocked } from "../game/content/bossRush.js";
import { findMasteryTrial, getMasteryTrials, isMasteryTrialUnlocked } from "../game/content/masteryTrials.js";
import { GAME_MODE, getHighestArcadeClear } from "../game/content/modes.js";
import { createWeeklyChallenge, getNextWeekUtc, getTrustedWeeklyNow } from "../game/content/weeklyChallenge.js";
import { WEAPON_DEFINITIONS } from "../game/content/weapons.js";
import { t } from "../game/content/i18n.js";
import { formatCash } from "../game/simulation/math.js";
import { icon } from "./icons.js";
import { weaponSprite } from "./weaponSprites.js";

export function renderAlternateModeLobby(state, locale) {
  const renderers = {
    [GAME_MODE.WEAPON_MASTERY]: renderMasteryLobby,
    [GAME_MODE.BOSS_RUSH]: renderBossLobby,
    [GAME_MODE.WEEKLY]: renderWeeklyLobby,
    [GAME_MODE.ENDLESS]: renderEndlessLobby,
  };
  return renderers[state.selectedMode]?.(state, locale) ?? "";
}

function renderMasteryLobby(state, locale) {
  const selection = state.modeSelection;
  const trial = findMasteryTrial(selection.masteryWeapon, selection.masteryTrial);
  const progress = state.save.modeProgress.mastery[selection.masteryWeapon];
  const medalCount = Object.values(progress.medals).filter((value) => value > 0).length;
  const goldCount = Object.values(progress.medals).filter((value) => value >= 3).length;
  const weapons = WEAPON_DEFINITIONS.map((weapon) => renderMasteryWeapon(state, weapon, locale)).join("");
  const trials = getMasteryTrials(selection.masteryWeapon).map((item) => renderTrialButton(item, progress)).join("");
  return renderLobbyShell(state, locale, `
    ${renderModeNotice(state, locale)}
    <div class="mode-record-strip"><span>${t(locale, "mastery.cleared", { value: medalCount })}</span><span>${t(locale, "mastery.goldCount", { value: goldCount })}</span></div>
    <div class="mode-tab-row">${weapons}</div>
    <div class="mode-detail-grid">
      <section><h2>${t(locale, "mastery.campaign", { weapon: t(locale, `weapon.${selection.masteryWeapon}.name`) })}</h2>
        <p>${t(locale, `mastery.theme.${trial.theme}`)}</p><div class="trial-grid">${trials}</div></section>
      <aside class="briefing-card"><span>${t(locale, "mastery.act", { value: trial.act })}</span><h2>${t(locale, "mastery.trial", { value: trial.number })}</h2>
        <p>${t(locale, "mastery.duration", { value: trial.duration })}</p>${renderMedalRules(trial, locale)}
        <button class="primary-button" data-action="start" data-testid="start-run" data-focus-key="start">${t(locale, "action.start")}</button></aside>
    </div>`, "mastery-lobby");
}

function renderBossLobby(state, locale) {
  const fight = findBossFight(state.modeSelection.bossFight);
  const progress = state.save.modeProgress.bossRush;
  const cleared = Object.values(progress.medals).filter((value) => value > 0).length;
  const gold = Object.values(progress.medals).filter((value) => value >= 3).length;
  const fights = BOSS_RUSH_FIGHTS.map((item) => renderFightButton(item, progress)).join("");
  return renderLobbyShell(state, locale, `
    ${renderModeNotice(state, locale)}
    <div class="mode-record-strip"><span>${t(locale, "bossRush.cleared", { value: cleared })}</span><span>${t(locale, "bossRush.goldCount", { value: gold })}</span></div>
    <div class="mode-detail-grid"><section><h2>${t(locale, "bossRush.select")}</h2><div class="fight-grid">${fights}</div></section>
      <aside class="briefing-card boss-briefing" style="--boss-color:${fight.family.projectileColor}">
        <span>${t(locale, "bossRush.tier", { value: fight.tier })}</span><h2>${t(locale, `boss.${fight.family.id}`)}</h2>
        <p>${t(locale, `boss.pattern.${fight.family.pattern}`)}</p><p>${t(locale, `boss.skill.${fight.family.skill}`)}</p>
        <b>${t(locale, "bossRush.duration", { value: fight.approachSeconds + fight.fightSeconds })}</b>
        <button class="primary-button" data-action="start" data-testid="start-run" data-focus-key="start">${t(locale, "action.start")}</button>
      </aside></div>`, "boss-lobby");
}

function renderWeeklyLobby(state, locale) {
  const weekly = state.save.modeProgress.weekly;
  const now = getTrustedWeeklyNow(weekly);
  const challenge = createWeeklyChallenge(state.modeSelection.weeklyDifficulty, getHighestArcadeClear(state.save), now);
  const current = weekly.weekKey === challenge.weekKey ? weekly : { attemptsUsed: 0, completed: false };
  const locked = current.completed || current.attemptsUsed >= 3;
  const lockout = renderWeeklyLockout(current, locale);
  return renderLobbyShell(state, locale, `
    ${renderModeNotice(state, locale)}
    <div class="difficulty-tabs">${["easy", "medium", "hard"].map((id) => renderDifficulty(id, state.modeSelection.weeklyDifficulty, locale)).join("")}</div>
    <div class="weekly-briefing"><section><h2>${t(locale, "weekly.briefing")}</h2>
      <div class="briefing-list">${brief(icon("weapon"), t(locale, `weapon.${challenge.weaponId}.name`))}${brief(icon("ammo"), t(locale, "weekly.duration", { value: challenge.difficulty.duration }))}
        ${brief(icon("enemy"), t(locale, "weekly.bossRequired"))}${brief(icon("cash"), t(locale, "weekly.cashTarget", { value: challenge.cashTarget }))}
        ${brief(icon("score"), t(locale, `weekly.objective.${challenge.objective}`))}</div>
      <div class="modifier-row">${challenge.modifiers.map((modifier) => `<span>${t(locale, `weekly.modifier.${modifier}`)}</span>`).join("")}</div></section>
      <aside class="briefing-card">${lockout}<span>${t(locale, "weekly.attempts", { value: Math.max(0, 3 - current.attemptsUsed) })}</span>
        <h2>${formatCash(challenge.reward)}</h2><p>${t(locale, "weekly.reward")}</p>
        <b>${t(locale, "weekly.rollover", { value: formatCountdown(getNextWeekUtc(now) - now) })}</b>
        <button class="primary-button" data-action="start" data-testid="start-run" data-focus-key="start" ${locked ? "disabled" : ""}>${t(locale, locked ? "weekly.locked" : "action.start")}</button></aside>
    </div>`, "weekly-lobby");
}

function renderWeeklyLockout(progress, locale) {
  if (progress.completed) return `<div class="weekly-lockout is-complete"><strong>${t(locale, "weekly.completedTitle")}</strong><p>${t(locale, "weekly.completedBody")}</p></div>`;
  if (progress.attemptsUsed < 3) return "";
  return `<div class="weekly-lockout" data-testid="weekly-game-over"><strong>${t(locale, "weekly.gameOverTitle")}</strong><p>${t(locale, "weekly.gameOverBody")}</p></div>`;
}

function renderModeNotice(state, locale) {
  const summary = state.lastSummary;
  if (!summary) return "";
  if (summary.lostLoot) return `<div class="mode-result-notice is-failure"><strong>${t(locale, "result.operationLost")}</strong><span>${t(locale, "result.lootLost")}</span></div>`;
  if (summary.failed) return `<div class="mode-result-notice is-failure"><strong>${t(locale, "result.operationFailed")}</strong><span>${t(locale, summary.objectiveFailed ? "result.objectiveFailed" : "result.tryAgain")}</span></div>`;
  const result = summary.medal ? "★".repeat(summary.medal) : formatCash(summary.reward ?? 0);
  return `<div class="mode-result-notice"><strong>${t(locale, "result.recorded")}</strong><span>${result}</span></div>`;
}

function renderEndlessLobby(state, locale) {
  const progress = state.save.modeProgress.endless;
  const operation = progress.activeOperation;
  return renderLobbyShell(state, locale, `
    ${renderModeNotice(state, locale)}
    <div class="endless-records">${record(locale, "endless.bestSector", progress.bestSector)}${record(locale, "endless.bestScore", progress.bestScore)}
      ${record(locale, "endless.extractions", progress.extractions)}${record(locale, "endless.largestExtraction", formatCash(progress.largestExtraction))}</div>
    <section class="endless-briefing"><h2>${t(locale, operation ? "endless.continueTitle" : "endless.newTitle")}</h2>
      <p>${t(locale, "endless.description")}</p>${operation ? `<div class="operation-status"><b>${t(locale, "endless.sector", { value: operation.sector })}</b><span>${t(locale, "endless.unbanked", { value: formatCash(operation.unbankedCash) })}</span></div>` : ""}
      <button class="primary-button" data-action="start" data-testid="start-run" data-focus-key="start">${t(locale, operation ? "endless.continue" : "endless.start")}</button></section>`, "endless-lobby");
}

function renderLobbyShell(state, locale, content, className) {
  return `<div class="panel mode-content-panel ${className}" data-testid="mode-lobby"><header class="mode-lobby-heading"><div><h1>${t(locale, `mode.${state.selectedMode}.title`)}</h1><p>${t(locale, `mode.${state.selectedMode}.description`)}</p></div>
    <button class="secondary-button" data-action="modeBack" data-focus-key="modeBack">${t(locale, "action.backModes")}</button></header>${content}</div>`;
}

function renderMasteryWeapon(state, weapon, locale) {
  const selected = state.modeSelection.masteryWeapon === weapon.id;
  const owned = state.save.weaponsOwned.includes(weapon.id);
  return `<button class="mode-tab ${selected ? "selected" : ""}" data-action="modeOption" data-key="masteryWeapon" data-value="${weapon.id}" ${owned ? "" : "disabled"}>${weaponSprite(weapon.id, "")}<span>${t(locale, weapon.labelKey)}</span></button>`;
}

function renderTrialButton(trial, progress) {
  const medal = progress.medals[trial.number] ?? 0;
  const unlocked = isMasteryTrialUnlocked(progress, trial);
  return `<button class="trial-button" data-action="modeOption" data-key="masteryTrial" data-value="${trial.number}" data-focus-key="trial:${trial.number}" ${unlocked ? "" : "disabled"}><b>${trial.number}</b><span>${medal ? "★".repeat(medal) : unlocked ? "-" : "LOCK"}</span></button>`;
}

function renderFightButton(fight, progress) {
  const medal = progress.medals[fight.number] ?? 0;
  const unlocked = isBossFightUnlocked(progress, fight);
  return `<button class="fight-button" style="--boss-color:${fight.family.projectileColor}" data-action="modeOption" data-key="bossFight" data-value="${fight.number}" data-focus-key="fight:${fight.number}" ${unlocked ? "" : "disabled"}><b>${fight.number}</b><span>${medal ? "★".repeat(medal) : unlocked ? "-" : "LOCK"}</span></button>`;
}

function renderDifficulty(id, selected, locale) {
  return `<button class="mode-tab ${id === selected ? "selected" : ""}" data-action="modeOption" data-key="weeklyDifficulty" data-value="${id}" data-focus-key="difficulty:${id}">${t(locale, `weekly.${id}`)}</button>`;
}

function renderMedalRules(trial, locale) {
  const objective = formatObjective(trial.objective);
  return `<ul class="medal-rules"><li>★ ${t(locale, "mastery.bronze")}</li><li>★★ ${t(locale, "mastery.silver", { value: trial.silver.collisions })}</li><li>★★★ ${t(locale, "mastery.gold", { value: Math.round(trial.gold.life * 100) })}</li><li>${t(locale, `mastery.objective.${trial.objective.metric}`, { silver: objective.silver, gold: objective.gold })}</li></ul>`;
}

function formatObjective(objective) {
  if (objective.metric !== "accuracy") return objective;
  return { ...objective, silver: `${Math.round(objective.silver * 100)}%`, gold: `${Math.round(objective.gold * 100)}%` };
}

function brief(iconHtml, text) { return `<div>${iconHtml}<span>${text}</span></div>`; }
function record(locale, key, value) { return `<div><span>${t(locale, key)}</span><b>${value}</b></div>`; }

function formatCountdown(milliseconds) {
  const hours = Math.max(0, Math.floor(milliseconds / 3600000));
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}
