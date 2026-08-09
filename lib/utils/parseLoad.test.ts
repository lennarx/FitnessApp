import { describe, expect, it } from "vitest";
import { parseLoad } from "./parseLoad";

describe("parseLoad", () => {
  it.each([
    ["190", 190],
    ["62,5", 62.5],
    ["62.5", 62.5],
    ["40 kg", 40],
    ["40kg", 40],
    ["  85  ", 85],
  ])("parses %s as %d", (raw, expected) => {
    expect(parseLoad(raw)).toBe(expected);
  });

  it.each([["+10 kg de lastre"], ["40 kg/lado"], ["I10-D10"], [""], ["corporal"]])(
    "returns null for %s",
    (raw) => {
      expect(parseLoad(raw)).toBeNull();
    }
  );
});
