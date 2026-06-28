import { describe, expect, it } from "vitest";

import { choosePlacement, intersects } from "@/lib/life/placement";

describe("choosePlacement", () => {
  it("avoids reserved display regions", () => {
    const reserved = { x: 20, y: 10, width: 18, height: 18 };
    const placement = choosePlacement(40, 30, 6, 7, [reserved], () => 0.99);

    expect(intersects({ ...placement, width: 6, height: 7 }, reserved)).toBe(false);
  });

  it("keeps objects inside the board margins", () => {
    const placement = choosePlacement(60, 40, 12, 7, [], () => 0);

    expect(placement.x).toBeGreaterThanOrEqual(2);
    expect(placement.y).toBeGreaterThanOrEqual(2);
  });
});
