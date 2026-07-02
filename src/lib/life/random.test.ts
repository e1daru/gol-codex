import { describe, expect, it } from "vitest";

import { createSeededRandom } from "@/lib/life/random";

describe("createSeededRandom", () => {
  it("returns the same sequence for the same seed", () => {
    const first = createSeededRandom("display-seed");
    const second = createSeededRandom("display-seed");

    expect([first(), first(), first()]).toEqual([second(), second(), second()]);
  });

  it("returns different sequences for different seeds", () => {
    const first = createSeededRandom("display-seed-a");
    const second = createSeededRandom("display-seed-b");

    expect([first(), first(), first()]).not.toEqual([second(), second(), second()]);
  });
});
