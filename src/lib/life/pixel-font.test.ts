import { describe, expect, it } from "vitest";

import {
  getCodexLogoVariant,
  getSpecialPixelArtVariant,
  renderCodexCloudLogo,
  renderCodexGoblinIcon,
  renderCodexLogo,
  renderCodexTerminalLogo,
  renderPixelText,
  renderSpecialPixelArt,
  renderUnicornIcon
} from "@/lib/life/pixel-font";

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
    expect(cloud.width).toBe(cloud.height);
    expect(cloud.cells.length).toBeGreaterThan(900);
  });

  it("renders large Goblin and Unicorn pixel icons", () => {
    const goblin = renderCodexGoblinIcon(100, 100);
    const unicorn = renderUnicornIcon(100, 100);

    expect(goblin.height).toBeGreaterThan(50);
    expect(goblin.cells.length).toBeGreaterThan(140);
    expect(unicorn.width).toBeGreaterThan(50);
    expect(unicorn.height).toBeGreaterThan(50);
    expect(unicorn.width).toBe(unicorn.height);
    expect(unicorn.cells.length).toBeGreaterThan(1_700);
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

  it("maps special trigger text to pixel art", () => {
    expect(getSpecialPixelArtVariant("codex goblin")).toBe("goblin");
    expect(getSpecialPixelArtVariant("goblin")).toBe("goblin");
    expect(getSpecialPixelArtVariant("um")).toBe("unicorn");
    expect(getSpecialPixelArtVariant("Unicorn Mafia")).toBe("unicorn");
    expect(renderSpecialPixelArt("unicorn mafia", 100, 100)?.cells.length).toBeGreaterThan(1_700);
  });
});
