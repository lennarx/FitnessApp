import { describe, expect, it } from "vitest";
import { addLocalDays, formatSessionDate, localDayRangeIso, parseTimeInput } from "./dates";

describe("addLocalDays", () => {
  it.each([
    ["2026-08-09", 1, "2026-08-10"],
    ["2026-08-09", -1, "2026-08-08"],
    ["2026-08-31", 1, "2026-09-01"],
    ["2026-01-01", -1, "2025-12-31"],
    ["2026-02-28", 1, "2026-03-01"],
    ["2026-08-09", 0, "2026-08-09"],
  ])("addLocalDays(%s, %d) -> %s", (date, n, expected) => {
    expect(addLocalDays(date, n)).toBe(expected);
  });
});

describe("localDayRangeIso", () => {
  it("returns start/end ISO instants 24h apart in local time", () => {
    const { startIso, endIso } = localDayRangeIso("2026-08-09");
    const start = new Date(startIso);
    const end = new Date(endIso);
    expect(end.getTime() - start.getTime()).toBe(24 * 60 * 60 * 1000);
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(7);
    expect(start.getDate()).toBe(9);
    expect(start.getHours()).toBe(0);
  });

  it("end of one day matches start of the next", () => {
    expect(localDayRangeIso("2026-08-09").endIso).toBe(localDayRangeIso("2026-08-10").startIso);
  });
});

describe("formatSessionDate", () => {
  it("formats a known date", () => {
    expect(formatSessionDate("2026-08-09")).toBe("dom 9 ago");
  });
});

describe("parseTimeInput", () => {
  it.each([
    ["09:05", { hours: 9, minutes: 5 }],
    ["23:59", { hours: 23, minutes: 59 }],
    ["00:00", { hours: 0, minutes: 0 }],
  ])("parses %s", (time, expected) => {
    expect(parseTimeInput(time)).toEqual(expected);
  });

  it.each([[""], ["  "], ["24:00"], ["12:60"], ["-1:00"], ["abc"], ["12"], ["12:5"]])(
    "returns null for %s",
    (time) => {
      expect(parseTimeInput(time)).toBeNull();
    }
  );
});
