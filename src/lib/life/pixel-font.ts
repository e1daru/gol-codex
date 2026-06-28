import type { CellPoint } from "@/lib/life/life";

type Glyph = readonly string[];

const UNKNOWN_GLYPH: Glyph = ["11110", "00010", "00100", "01000", "01000", "00000", "01000"];

const GLYPHS: Record<string, Glyph> = {
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "11110", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "00100", "00100"],
  "_": ["00000", "00000", "00000", "00000", "00000", "00000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  "A": ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  "B": ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  "C": ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  "D": ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  "E": ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  "F": ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  "G": ["01110", "10001", "10000", "10111", "10001", "10001", "01110"],
  "H": ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  "I": ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  "J": ["00111", "00010", "00010", "00010", "10010", "10010", "01100"],
  "K": ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  "L": ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  "M": ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  "N": ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  "O": ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  "P": ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  "Q": ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  "R": ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  "S": ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  "T": ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  "U": ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  "V": ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  "W": ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  "X": ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  "Y": ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  "Z": ["11111", "00001", "00010", "00100", "01000", "10000", "11111"]
};

export type PixelText = {
  width: number;
  height: number;
  cells: CellPoint[];
};

export function renderPixelText(text: string): PixelText {
  const normalized = text.toUpperCase();
  const cells: CellPoint[] = [];
  let cursorX = 0;
  let renderedWidth = 0;

  for (const character of normalized) {
    const glyph = GLYPHS[character] ?? UNKNOWN_GLYPH;
    const glyphWidth = glyph[0]?.length ?? 0;

    for (let y = 0; y < glyph.length; y += 1) {
      for (let x = 0; x < glyphWidth; x += 1) {
        if (glyph[y]?.[x] === "1") {
          cells.push({ x: cursorX + x, y });
        }
      }
    }

    renderedWidth = cursorX + glyphWidth;
    cursorX += glyphWidth + 1;
  }

  return {
    width: Math.max(0, renderedWidth),
    height: 7,
    cells
  };
}

export function scalePixelText(pixelText: PixelText, scale: number): PixelText {
  const safeScale = Math.max(1, Math.floor(scale));
  const cells: CellPoint[] = [];

  for (const cell of pixelText.cells) {
    for (let y = 0; y < safeScale; y += 1) {
      for (let x = 0; x < safeScale; x += 1) {
        cells.push({
          x: cell.x * safeScale + x,
          y: cell.y * safeScale + y
        });
      }
    }
  }

  return {
    width: pixelText.width * safeScale,
    height: pixelText.height * safeScale,
    cells
  };
}

export function renderCodexLogo(maxWidth: number, maxHeight: number): PixelText {
  const base = renderPixelText("CODEX");
  const maxScale = Math.max(1, Math.min(Math.floor(maxWidth / base.width), Math.floor(maxHeight / base.height)));
  return scalePixelText(base, Math.min(3, maxScale));
}

export function renderCodexTerminalLogo(maxWidth: number, maxHeight: number): PixelText {
  const size = clamp(Math.min(maxWidth, maxHeight, 58), 30, 58);
  const center = (size - 1) / 2;
  const outerRadius = size * 0.44;
  const ringThickness = Math.max(2, Math.round(size * 0.075));
  const cells = new Set<string>();

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const distance = Math.hypot(x - center, y - center);

      if (distance >= outerRadius - ringThickness && distance <= outerRadius) {
        cells.add(pointKey(x, y));
      }
    }
  }

  addThickLine(cells, size * 0.36, size * 0.35, size * 0.48, size * 0.5, size * 0.045);
  addThickLine(cells, size * 0.48, size * 0.5, size * 0.36, size * 0.65, size * 0.045);
  addThickLine(cells, size * 0.58, size * 0.58, size * 0.76, size * 0.58, size * 0.045);

  return setToPixelText(cells, size, size);
}

export function renderCodexCloudLogo(maxWidth: number, maxHeight: number): PixelText {
  const width = clamp(Math.min(maxWidth, Math.floor(maxHeight * 1.36), 82), 42, 82);
  const height = Math.max(30, Math.round(width * 0.7));
  const filled = new Set<string>();

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const nx = x / width;
      const ny = y / height;
      const insideCloud =
        inEllipse(nx, ny, 0.24, 0.5, 0.23, 0.26) ||
        inEllipse(nx, ny, 0.43, 0.34, 0.25, 0.28) ||
        inEllipse(nx, ny, 0.63, 0.42, 0.28, 0.27) ||
        inEllipse(nx, ny, 0.73, 0.58, 0.27, 0.24) ||
        inEllipse(nx, ny, 0.35, 0.72, 0.24, 0.22) ||
        inEllipse(nx, ny, 0.55, 0.76, 0.25, 0.22);

      if (insideCloud) {
        filled.add(pointKey(x, y));
      }
    }
  }

  carveThickLine(filled, width * 0.31, height * 0.39, width * 0.4, height * 0.52, width * 0.045);
  carveThickLine(filled, width * 0.4, height * 0.52, width * 0.31, height * 0.66, width * 0.045);
  carveThickLine(filled, width * 0.55, height * 0.62, width * 0.74, height * 0.62, width * 0.045);

  return setToPixelText(filled, width, height);
}

export type CodexLogoVariant = "word" | "terminal" | "cloud";

export function renderCodexLogoVariant(variant: CodexLogoVariant, maxWidth: number, maxHeight: number): PixelText {
  if (variant === "terminal") {
    return renderCodexTerminalLogo(maxWidth, maxHeight);
  }

  if (variant === "cloud") {
    return renderCodexCloudLogo(maxWidth, maxHeight);
  }

  return renderCodexLogo(maxWidth, maxHeight);
}

export function getCodexLogoVariant(input: string, random = Math.random): CodexLogoVariant | null {
  const normalized = input.trim().toLowerCase();

  if (normalized === "codex terminal" || normalized === "codex circle") {
    return "terminal";
  }

  if (normalized === "codex cloud") {
    return "cloud";
  }

  if (normalized === "codex word" || normalized === "codex logo") {
    return "word";
  }

  if (normalized === "codex") {
    const variants: CodexLogoVariant[] = ["word", "terminal", "cloud"];
    return variants[Math.floor(random() * variants.length) % variants.length];
  }

  return null;
}

function setToPixelText(cells: Set<string>, width: number, height: number): PixelText {
  return {
    width,
    height,
    cells: [...cells].map((key) => {
      const [x, y] = key.split(",").map(Number);
      return { x, y };
    })
  };
}

function addThickLine(cells: Set<string>, x1: number, y1: number, x2: number, y2: number, radius: number): void {
  const minX = Math.floor(Math.min(x1, x2) - radius - 1);
  const maxX = Math.ceil(Math.max(x1, x2) + radius + 1);
  const minY = Math.floor(Math.min(y1, y2) - radius - 1);
  const maxY = Math.ceil(Math.max(y1, y2) + radius + 1);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (distanceToSegment(x, y, x1, y1, x2, y2) <= radius) {
        cells.add(pointKey(x, y));
      }
    }
  }
}

function carveThickLine(cells: Set<string>, x1: number, y1: number, x2: number, y2: number, radius: number): void {
  const minX = Math.floor(Math.min(x1, x2) - radius - 1);
  const maxX = Math.ceil(Math.max(x1, x2) + radius + 1);
  const minY = Math.floor(Math.min(y1, y2) - radius - 1);
  const maxY = Math.ceil(Math.max(y1, y2) + radius + 1);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (distanceToSegment(x, y, x1, y1, x2, y2) <= radius) {
        cells.delete(pointKey(x, y));
      }
    }
  }
}

function distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return Math.hypot(px - x1, py - y1);
  }

  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function inEllipse(x: number, y: number, cx: number, cy: number, rx: number, ry: number): boolean {
  return ((x - cx) * (x - cx)) / (rx * rx) + ((y - cy) * (y - cy)) / (ry * ry) <= 1;
}

function pointKey(x: number, y: number): string {
  return `${Math.round(x)},${Math.round(y)}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(value)));
}
