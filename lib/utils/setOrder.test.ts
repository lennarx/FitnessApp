import { describe, expect, it } from "vitest";
import { nextSetOrder } from "./setOrder";

describe("nextSetOrder", () => {
  it("returns 0 for an empty list", () => {
    expect(nextSetOrder([])).toBe(0);
  });

  it("returns max + 1 when there are no gaps", () => {
    expect(nextSetOrder([{ set_order: 0 }, { set_order: 1 }, { set_order: 2 }])).toBe(3);
  });

  it("returns max + 1 even with gaps from soft-deleted sets", () => {
    expect(nextSetOrder([{ set_order: 0 }, { set_order: 2 }])).toBe(3);
  });
});
