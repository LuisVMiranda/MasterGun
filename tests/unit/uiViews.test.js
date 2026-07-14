import { describe, expect, it } from "vitest";
import { createDefaultSave } from "../../src/game/simulation/economy.js";
import { createAppState } from "../../src/game/simulation/runState.js";
import { renderMissions } from "../../src/ui/missionViews.js";
import { renderRoundVictoryPrompt, renderRunVictory } from "../../src/ui/runSummaryView.js";
import { renderSoundPanel, renderSpecialShotPrompt } from "../../src/ui/hud.js";
import { renderShop } from "../../src/ui/shopView.js";
import { UPGRADE_DEFINITIONS } from "../../src/game/content/upgrades.js";

describe("ui views", () => {
  it("filters missions between all, incomplete, and complete lists", () => {
    const save = createDefaultSave();
    save.achievements.completedIds = ["firstSortie"];
    const all = renderMissions(createState(save, "all"), "en");
    const complete = renderMissions(createState(save, "complete"), "en");
    const incomplete = renderMissions(createState(save, "incomplete"), "en");

    expect(all).toContain("First Sortie");
    expect(all).toContain("Pocket Money");
    expect(complete).toContain("First Sortie");
    expect(complete).not.toContain("Pocket Money");
    expect(incomplete).not.toContain("First Sortie");
    expect(incomplete).toContain("Pocket Money");
  });

  it("separates the victory celebration from the run highlights", () => {
    const summary = {
      level: 25,
      highlights: { damage: 840, targets: 12, ammo: 46, collisions: 1 },
    };
    const prompt = renderRoundVictoryPrompt(summary, "en");
    const html = renderRunVictory({
      ...summary,
    }, "en");

    expect(prompt).toContain("Run Secured");
    expect(prompt).toContain("CONTINUE");
    expect(prompt).toContain("firework-field");
    expect(prompt).toContain("--firework-top:");
    expect(html).toContain("Run Secured");
    expect(html).toContain("Level 25 cleared");
    expect(html).toContain("840");
    expect(html).not.toContain("firework-field");
    expect(renderRunVictory({ failed: true }, "en")).toBe("");
  });

  it("renders localized special-shot instructions only while aiming", () => {
    const run = { specialShot: { active: true } };
    expect(renderSpecialShotPrompt(run, "en")).toContain("SPECIAL SHOT");
    expect(renderSpecialShotPrompt(run, "pt-BR")).toContain("trajetória");
    expect(renderSpecialShotPrompt(run, "es-LA")).toContain("trayectoria");
    expect(renderSpecialShotPrompt({ specialShot: null }, "en")).toBe("");
  });

  it("renders localized master, music, and effects sound controls", () => {
    const state = createState(createDefaultSave(), "all");
    const english = renderSoundPanel(state, "en");
    const portuguese = renderSoundPanel(state, "pt-BR");

    expect(english).toContain("Master volume");
    expect(english.match(/type="range"/g)).toHaveLength(3);
    expect(portuguese).toContain("Opções de som");
    expect(portuguese).toContain("Efeitos sonoros");
  });

  it("uses horizontal shop navigation once four slots are available", () => {
    const compact = createShopState(25);
    const carousel = createShopState(50);

    expect(renderShop(compact)).not.toContain("shop-scroll-button");
    expect(renderShop(carousel)).toContain("shop-offer-carousel");
    expect(renderShop(carousel).match(/shop-scroll-button/g)).toHaveLength(2);
  });

  it("keeps post-200 Overclocks purchasable beyond the original cap", () => {
    const save = createDefaultSave();
    const upgrade = UPGRADE_DEFINITIONS[0];
    save.level = 200;
    save.cash = 1000000;
    save.modeProgress.arcade.highestCleared = 200;
    save.upgrades[upgrade.id] = upgrade.maxLevel;
    const state = createAppState(save);
    state.phase = "shop";
    state.lastSummary = { reward: 0, level: 200, highlights: {}, shopOffers: [{ ...upgrade, kind: "upgrade", offerId: `upgrade:${upgrade.id}` }] };
    const html = renderShop(state);
    const button = html.match(new RegExp(`<button[^>]+data-offer="upgrade:${upgrade.id}"[^>]*>`))?.[0] ?? "";

    expect(html).toContain("Overclock 1/20");
    expect(button).not.toContain("disabled");
  });
});

function createState(save, missionFilter) {
  const state = createAppState(save);
  return { ...state, ui: { ...state.ui, missionFilter, missionsOpen: true } };
}

function createShopState(level) {
  const save = createDefaultSave();
  save.level = level;
  save.cash = 20000;
  const state = createAppState(save);
  return {
    ...state,
    phase: "shop",
    lastSummary: { reward: 100, level: level - 1, finishTier: 1, buildRating: 1, score: 100, highlights: {} },
  };
}
