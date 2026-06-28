import { describe, expect, it } from "vitest";

import { getCodexLogoVariant, renderCodexCloudLogo, renderCodexLogo, renderCodexTerminalLogo, renderPixelText } from "@/lib/life/pixel-font";

describe("renderPixelText", () => {
  it("renders blocky uppercase text cells", () => {
    const rendered = renderPixelText("Ada");

    expect(rendered.width).toBe(17);
    expect(rendered.height).toBe(7);
    expect(rendered.cells.length).toBeGreaterThan(20);
  });

  it("renders the A crossbar", () => {
    const rendered = renderPixelText("A");
    const crossbar = new Set(rendered.cells.filter((cell) => cell.y === 3).map((cell) => cell.x));

    expect(crossbar).toEqual(new Set([0, 1, 2, 3, 4]));
  });

  it("renders a larger Codex logo when space allows", () => {
    const normal = renderPixelText("CODEX");
    const logo = renderCodexLogo(160, 60);

    expect(logo.width).toBeGreaterThan(normal.width);
    expect(logo.height).toBeGreaterThan(normal.height);
    expect(logo.cells.length).toBeGreaterThan(normal.cells.length);
  });

  it("renders terminal and cloud Codex logo variants", () => {
    const terminal = renderCodexTerminalLogo(80, 80);
    const cloud = renderCodexCloudLogo(100, 80);

    expect(terminal.width).toBe(terminal.height);
    expect(terminal.cells.length).toBeGreaterThan(100);
    expect(cloud.width).toBeGreaterThan(cloud.height);
    expect(cloud.cells.length).toBeGreaterThan(500);
  });

  it("maps Codex trigger text to logo variants", () => {
    expect(getCodexLogoVariant("codex terminal")).toBe("terminal");
    expect(getCodexLogoVariant("Codex Cloud")).toBe("cloud");
    expect(getCodexLogoVariant("Codex Logo")).toBe("word");
    expect(getCodexLogoVariant("Ada")).toBeNull();
    expect(getCodexLogoVariant("Codex", () => 0)).toBe("word");
    expect(getCodexLogoVariant("Codex", () => 0.5)).toBe("terminal");
    expect(getCodexLogoVariant("Codex", () => 0.99)).toBe("cloud");
  });
});
