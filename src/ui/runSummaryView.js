import { t } from "../game/content/i18n.js";
import { icon } from "./icons.js";
import { renderFireworks } from "./celebration.js";
import { GAME_MODE } from "../game/content/modes.js";
import { formatCash } from "../game/simulation/math.js";

const HIGHLIGHTS = Object.freeze([
  { id: "damage", icon: "power" },
  { id: "targets", icon: "enemy" },
  { id: "ammo", icon: "ammo" },
  { id: "collisions", icon: "life" },
]);

export function renderRunVictory(summary, locale) {
  if (!summary || summary.failed) return "";
  const highlights = summary.highlights ?? {};
  return `
    <section class="run-victory" data-testid="run-victory" aria-label="${t(locale, "shop.victoryTitle")}">
      <div class="run-victory-copy">
        <strong>${t(locale, "shop.victoryTitle")}</strong>
        <span>${t(locale, "shop.victorySubtitle", { value: summary.level })}</span>
      </div>
      <div class="run-highlights">${HIGHLIGHTS.map((item) => renderHighlight(item, highlights, locale)).join("")}</div>
    </section>
  `;
}

export function renderRoundVictoryPrompt(summary, locale) {
  if (!summary || summary.failed) return "";
  if (summary.mode && summary.mode !== GAME_MODE.ARCADE) return renderModeVictoryPrompt(summary, locale);
  return `
    <div class="panel victory-panel round-victory-panel" data-testid="round-victory">
      ${renderFireworks(18)}
      <span class="victory-kicker">${t(locale, "shop.victorySubtitle", { value: summary.level })}</span>
      <h1>${t(locale, "shop.victoryTitle")}</h1>
      <button class="primary-button victory-continue" data-action="continueVictory" data-testid="continue-victory" data-focus-key="continueVictory">
        ${t(locale, "action.continue")}
      </button>
    </div>
  `;
}

export function renderEndlessCheckpoint(summary, locale) {
  return `
    <div class="panel victory-panel extraction-panel" data-testid="endless-checkpoint">
      <span class="victory-kicker">${t(locale, "result.checkpoint")}</span>
      <h1>${t(locale, "result.extractTitle")}</h1>
      <p>${t(locale, "result.unbanked", { value: formatCash(summary?.unbankedCash ?? 0) })}</p>
      <div class="button-row">
        <button class="primary-button" data-action="endlessContinue" data-focus-key="endlessContinue">${t(locale, "result.riskLoot")}</button>
        <button class="secondary-button" data-action="endlessExtract" data-focus-key="endlessExtract">${t(locale, "result.extract")}</button>
      </div>
    </div>
  `;
}

function renderModeVictoryPrompt(summary, locale) {
  const medal = summary.medal ? `<div class="result-medal">${"★".repeat(summary.medal)}</div>` : "";
  const rewardLabel = summary.mode === GAME_MODE.ENDLESS ? t(locale, "result.lootAdded") : t(locale, "result.rewardBanked");
  return `
    <div class="panel victory-panel round-victory-panel" data-testid="round-victory">
      ${renderFireworks(summary.checkpoint ? 14 : 9)}
      <span class="victory-kicker">${t(locale, `mode.${summary.mode}.title`)}</span>
      <h1>${t(locale, "result.secured")}</h1>${medal}
      <p>${rewardLabel}: ${formatCash(summary.reward ?? 0)}</p>
      <button class="primary-button victory-continue" data-action="continueVictory" data-testid="continue-victory" data-focus-key="continueVictory">${t(locale, "action.continue")}</button>
    </div>
  `;
}

function renderHighlight(item, highlights, locale) {
  const value = Math.max(0, Math.round(highlights[item.id] ?? 0));
  return `<span>${icon(item.icon)} <b>${value}</b> ${t(locale, `shop.highlight.${item.id}`)}</span>`;
}
