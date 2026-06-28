export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type Placement = {
  x: number;
  y: number;
};

export function intersects(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function choosePlacement(
  boardWidth: number,
  boardHeight: number,
  objectWidth: number,
  objectHeight: number,
  reserved: Rect[] = [],
  random = Math.random
): Placement {
  const margin = 2;
  const maxX = Math.max(margin, boardWidth - objectWidth - margin);
  const maxY = Math.max(margin, boardHeight - objectHeight - margin);

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const x = randomInteger(margin, maxX, random);
    const y = randomInteger(margin, maxY, random);
    const candidate = { x, y, width: objectWidth, height: objectHeight };

    if (!reserved.some((rect) => intersects(candidate, rect))) {
      return { x, y };
    }
  }

  for (let y = margin; y <= maxY; y += 1) {
    for (let x = margin; x <= maxX; x += 1) {
      const candidate = { x, y, width: objectWidth, height: objectHeight };

      if (!reserved.some((rect) => intersects(candidate, rect))) {
        return { x, y };
      }
    }
  }

  return { x: margin, y: margin };
}

function randomInteger(min: number, max: number, random: () => number): number {
  if (max <= min) {
    return min;
  }

  return Math.floor(random() * (max - min + 1)) + min;
}
