import { t } from "../game/content/i18n.js";
import { icon } from "./icons.js";

export function renderLeaderboardButton(locale) {
  return `
    <button class="secondary-button leaderboard-button" data-action="leaderboard" data-testid="leaderboard-button" data-focus-key="leaderboard">
      ${icon("score")} ${t(locale, "menu.leaderboard")}
    </button>
  `;
}

export function renderLeaderboardPanel(save, locale) {
  const rows = save.leaderboard?.length ? save.leaderboard.slice(0, 12).map(renderLeaderboardRow).join("") : `<li>${t(locale, "menu.noScores")}</li>`;
  return `
    <div class="panel leaderboard-panel" data-testid="leaderboard-panel">
      <div class="leaderboard-heading">
        <h2>${icon("score")} ${t(locale, "menu.leaderboard")}</h2>
        <button class="icon-button" data-action="closeLeaderboard" data-focus-key="closeLeaderboard" aria-label="${t(locale, "action.close")}">X</button>
      </div>
      <ol class="leaderboard-list">${rows}</ol>
    </div>
  `;
}

function renderLeaderboardRow(entry, index) {
  return `
    <li>
      <span>${index + 1}. ${entry.profileName}</span>
      <b>${entry.score}</b>
    </li>
  `;
}
