import { describe, expect, it } from "vitest";
import { LOCALES, t, tStat } from "../../src/game/content/i18n.js";
import { WEAPON_DEFINITIONS } from "../../src/game/content/weapons.js";

const INFO_ITEMS = ["enemies", "variants", "health", "collision", "ammo", "duration", "buffs", "debuffs", "boss"];

describe("localization", () => {
  it("resolves core UI, stat, and weapon text for every locale", () => {
    LOCALES.forEach((locale) => {
      expect(t(locale.id, "action.start")).not.toContain("action.");
      expect(tStat(locale.id, "score")).not.toContain("stat.");

      INFO_ITEMS.forEach((item) => {
        expect(t(locale.id, `info.${item}`)).not.toContain("info.");
        expect(t(locale.id, `info.${item}Title`)).not.toContain("info.");
      });

      WEAPON_DEFINITIONS.forEach((weapon) => {
        expect(t(locale.id, weapon.labelKey)).not.toContain("weapon.");
        expect(t(locale.id, weapon.descriptionKey)).not.toContain("weapon.");
      });
    });
  });

  it("keeps Portuguese and Spanish accents readable in UI and info copy", () => {
    expect(LOCALES.find((locale) => locale.id === "pt-BR").label).toBe("Português BR");
    expect(LOCALES.find((locale) => locale.id === "es-LA").label).toBe("Español LATAM");
    expect(t("pt-BR", "info.ammo")).toContain("munição");
    expect(t("pt-BR", "info.collision")).toContain("você");
    expect(t("es-LA", "info.ammo")).toContain("munición");
    expect(t("es-LA", "info.boss")).toContain("daño");
  });
});
