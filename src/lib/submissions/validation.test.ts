import { describe, expect, it } from "vitest";

import { normalizeName, validateName } from "@/lib/submissions/validation";

describe("name validation", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeName("  Grace   Hopper  ")).toBe("Grace Hopper");
  });

  it("accepts short display names with simple punctuation", () => {
    expect(validateName("Ada-L")).toEqual({ ok: true, value: "Ada-L" });
  });

  it("rejects names that are too long", () => {
    expect(validateName("A very very long name")).toEqual({
      ok: false,
      reason: "Keep the name to 16 characters or fewer."
    });
  });

  it("rejects unsupported characters", () => {
    expect(validateName("Ada <>")).toEqual({
      ok: false,
      reason: "Use letters, numbers, spaces, and simple punctuation only."
    });
  });

  it("rejects blocked terms", () => {
    expect(validateName("nazi")).toEqual({
      ok: false,
      reason: "Choose a different name."
    });
  });

  it("rejects obfuscated unsafe words", () => {
    expect(validateName("f.u.c.k")).toEqual({
      ok: false,
      reason: "Choose a different name."
    });
    expect(validateName("p0rn")).toEqual({
      ok: false,
      reason: "Choose a different name."
    });
  });

  it("rejects exact unsafe tokens without blocking harmless substrings", () => {
    expect(validateName("D1ck")).toEqual({
      ok: false,
      reason: "Choose a different name."
    });
    expect(validateName("Essex")).toEqual({
      ok: true,
      value: "Essex"
    });
    expect(validateName("Grape")).toEqual({
      ok: true,
      value: "Grape"
    });
  });
});
