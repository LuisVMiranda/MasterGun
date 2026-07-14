import { describe, expect, it } from "vitest";
import { MISSION_DEFINITIONS, getMissionCopy } from "../../src/game/content/achievements.js";
import { LOCALES, t, tStat } from "../../src/game/content/i18n.js";
import { UPGRADE_DEFINITIONS } from "../../src/game/content/upgrades.js";
import { WEAPON_DEFINITIONS } from "../../src/game/content/weapons.js";

const INFO_ITEMS = ["enemies", "variants", "health", "life", "collision", "ammo", "soldiers", "recruits", "materials", "duration", "buffs", "debuffs", "boss"];
const UI_KEYS = [
  "action.retry",
  "action.backModes",
  "action.previousOffer",
  "action.nextOffer",
  "effect.specialShotInstruction",
  "effect.specialShotTitle",
  "hud.life",
  "hint.controllerClose",
  "hint.controllerConfirm",
  "hint.controllerMove",
  "hint.controllerOptions",
  "hint.controllerScroll",
  "hint.controllerShare",
  "hint.keyboardConfirm",
  "hint.keyboardMove",
  "hint.keyboardPause",
  "hint.pointerClick",
  "hint.pointerMove",
  "mission.empty",
  "mission.filter.all",
  "mission.filter.incomplete",
  "mission.filter.complete",
  "shop.failed",
  "shop.highlight.ammo",
  "shop.highlight.collisions",
  "shop.highlight.damage",
  "shop.highlight.targets",
  "shop.life",
  "shop.victorySubtitle",
  "shop.victoryTitle",
  "sound.effects",
  "sound.master",
  "sound.music",
  "sound.subtitle",
  "sound.title",
  "mode.selectTitle",
  "mode.arcade.title",
  "mode.weekly.description",
  "mode.weaponMastery.title",
  "mode.bossRush.title",
  "mode.endless.title",
];

describe("localization", () => {
  it("resolves core UI, stat, weapon, and mission text for every locale", () => {
    LOCALES.forEach((locale) => {
      expect(t(locale.id, "action.start")).not.toContain("action.");
      expect(tStat(locale.id, "score")).not.toContain("stat.");
      UI_KEYS.forEach((key) => expect(t(locale.id, key)).not.toBe(key));

      INFO_ITEMS.forEach((item) => {
        expect(t(locale.id, `info.${item}`)).not.toContain("info.");
        expect(t(locale.id, `info.${item}Title`)).not.toContain("info.");
      });

      WEAPON_DEFINITIONS.forEach((weapon) => {
        expect(t(locale.id, weapon.labelKey)).not.toContain("weapon.");
        expect(t(locale.id, weapon.descriptionKey)).not.toContain("weapon.");
      });

      UPGRADE_DEFINITIONS.forEach((upgrade) => {
        expect(tStat(locale.id, upgrade.id)).not.toContain("stat.");
        expect(t(locale.id, `upgrade.${upgrade.id}.desc`)).not.toContain("upgrade.");
      });

      MISSION_DEFINITIONS.forEach((mission) => {
        expect(getMissionCopy(mission, locale.id).title).toBeTruthy();
        expect(getMissionCopy(mission, locale.id).description).toBeTruthy();
      });
    });
  });

  it("keeps Portuguese and Spanish accents readable in UI and info copy", () => {
    expect(LOCALES.find((locale) => locale.id === "pt-BR").label).toBe("Português BR");
    expect(LOCALES.find((locale) => locale.id === "es-LA").label).toBe("Español LATAM");
    expect(t("pt-BR", "info.ammo")).toContain("munição");
    expect(t("pt-BR", "info.collision")).toContain("você");
    expect(t("es-LA", "info.ammo")).toContain("munición");
    expect(t("es-LA", "info.boss")).toContain("checkpoint");
    expect(getMissionCopy(findMission("ammoHunter"), "pt-BR").title).toContain("munição");
    expect(getMissionCopy(findMission("heavyHitter"), "es-LA").description).toContain("daño");
    expect(getMissionCopy(findMission("bonusShooter"), "pt-BR").description).toContain("chão");
  });
});

function findMission(id) {
  return MISSION_DEFINITIONS.find((mission) => mission.id === id);
}
