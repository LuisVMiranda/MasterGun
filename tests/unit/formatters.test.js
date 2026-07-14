import { describe, expect, it } from "vitest";
import { formatScore } from "../../src/ui/formatters.js";
import { formatCash, formatCashAmount } from "../../src/game/simulation/math.js";

describe("score formatting", () => {
  it("keeps small scores whole and compacts thousands with k", () => {
    expect(formatScore(999)).toBe("999");
    expect(formatScore(1000)).toBe("1k");
    expect(formatScore(1250)).toBe("1.3k");
    expect(formatScore(12400)).toBe("12.4k");
  });

  it("normalizes invalid and negative display values", () => {
    expect(formatScore(-10)).toBe("0");
    expect(formatScore(undefined)).toBe("0");
  });

  it("compacts cash only once it reaches six figures", () => {
    expect(formatCashAmount(99999)).toBe("99,999");
    expect(formatCashAmount(100000)).toBe("100k");
    expect(formatCash(125400)).toBe("$125.4k");
  });
});
