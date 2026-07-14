import { getMissionCopy } from "../game/content/achievements.js";
import { t } from "../game/content/i18n.js";
import { getMissionCards, getMissionSummary } from "../game/simulation/achievements.js";
import { icon } from "./icons.js";
import { renderFireworks } from "./celebration.js";

const FILTERS = ["all", "incomplete", "complete"];

export function renderMissionProgress(save, locale) {
  const summary = getMissionSummary(save);
  return `
    <section class="mission-summary">
      <span>${icon("score")} ${t(locale, "mission.progress", { value: summary.completed, total: summary.total })}</span>
      <button class="secondary-button" data-action="missions" data-testid="missions-open" data-focus-key="missions">${t(locale, "action.missions")}</button>
    </section>
  `;
}

export function renderMissions(state, locale) {
  const filter = normalizeFilter(state.ui?.missionFilter);
  const cards = filterMissionCards(getMissionCards(state.save), filter);
  const renderedCards = cards.length ? cards.map((mission) => renderMissionCard(mission, locale)).join("") : `<p class="mission-empty">${t(locale, "mission.empty")}</p>`;
  const summary = getMissionSummary(state.save);
  return `
    <div class="panel mission-panel" data-testid="missions-panel">
      <div class="mission-heading">
        <h2>${icon("score")} ${t(locale, "mission.title")}</h2>
        <button class="icon-button" data-action="closeMissions" data-focus-key="closeMissions" aria-label="${t(locale, "action.close")}">X</button>
      </div>
      <p>${t(locale, "mission.progress", { value: summary.completed, total: summary.total })}</p>
      <nav class="mission-filters" aria-label="${t(locale, "mission.filterLabel")}">
        ${FILTERS.map((item) => renderFilterButton(item, filter, locale)).join("")}
      </nav>
      <div class="mission-list">${renderedCards}</div>
    </div>
  `;
}

export function renderVictory(state, locale, victoryId = "arcadeChampion") {
  return `
    <div class="panel victory-panel layered-victory" data-testid="victory-panel" data-victory="${victoryId}">
      ${renderFireworks(victoryId === "legend" ? 24 : 16)}
      <span class="victory-kicker">${t(locale, `victory.${victoryId}.kicker`)}</span>
      <h1>${t(locale, `victory.${victoryId}.title`)}</h1>
      <p>${t(locale, `victory.${victoryId}.body`, { name: state.save.profileName })}</p>
      <button class="primary-button" data-action="closeVictory" data-focus-key="closeVictory">${t(locale, "action.close")}</button>
    </div>
  `;
}

function renderMissionCard(mission, locale) {
  const copy = getMissionCopy(mission, locale);
  const percent = Math.round((mission.progress / mission.target) * 100);
  const status = mission.completed ? t(locale, "mission.completed") : `${mission.progress}/${mission.target}`;
  return `
    <article class="${mission.completed ? "mission-card is-complete" : "mission-card"}">
      <div>
        <h3>${copy.title}</h3>
        <p>${copy.description}</p>
      </div>
      <strong>${status}</strong>
      <div class="mission-meter"><span style="width: ${percent}%"></span></div>
    </article>
  `;
}

function renderFilterButton(filter, activeFilter, locale) {
  const active = filter === activeFilter ? "is-active" : "";
  return `
    <button class="secondary-button ${active}" data-action="missionFilter" data-filter="${filter}" data-focus-key="missionFilter:${filter}">
      ${t(locale, `mission.filter.${filter}`)}
    </button>
  `;
}

function filterMissionCards(cards, filter) {
  if (filter === "complete") return cards.filter((mission) => mission.completed);
  if (filter === "incomplete") return cards.filter((mission) => !mission.completed);
  return cards;
}

function normalizeFilter(filter) {
  return FILTERS.includes(filter) ? filter : "all";
}
