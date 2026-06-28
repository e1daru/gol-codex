export type LifeGrid = {
  width: number;
  height: number;
  cells: Uint8Array;
};

export type CellPoint = {
  x: number;
  y: number;
};

export function createGrid(width: number, height: number): LifeGrid {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new Error("Grid dimensions must be positive integers.");
  }

  return {
    width,
    height,
    cells: new Uint8Array(width * height)
  };
}

export function cloneGrid(grid: LifeGrid): LifeGrid {
  return {
    width: grid.width,
    height: grid.height,
    cells: new Uint8Array(grid.cells)
  };
}

export function clearGrid(grid: LifeGrid): void {
  grid.cells.fill(0);
}

export function getCell(grid: LifeGrid, x: number, y: number): 0 | 1 {
  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) {
    return 0;
  }

  return grid.cells[y * grid.width + x] === 1 ? 1 : 0;
}

export function setCell(grid: LifeGrid, x: number, y: number, alive: boolean): void {
  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) {
    return;
  }

  grid.cells[y * grid.width + x] = alive ? 1 : 0;
}

export function countNeighbors(grid: LifeGrid, x: number, y: number): number {
  let count = 0;

  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) {
        continue;
      }

      count += getCell(grid, x + dx, y + dy);
    }
  }

  return count;
}

export function stepGrid(current: LifeGrid, next = createGrid(current.width, current.height)): LifeGrid {
  if (next.width !== current.width || next.height !== current.height) {
    throw new Error("Next grid dimensions must match the current grid.");
  }

  for (let y = 0; y < current.height; y += 1) {
    for (let x = 0; x < current.width; x += 1) {
      const alive = getCell(current, x, y) === 1;
      const neighbors = countNeighbors(current, x, y);
      const willLive = neighbors === 3 || (alive && neighbors === 2);
      next.cells[y * current.width + x] = willLive ? 1 : 0;
    }
  }

  return next;
}

export function stampCells(grid: LifeGrid, cells: CellPoint[], originX: number, originY: number): void {
  for (const cell of cells) {
    setCell(grid, originX + cell.x, originY + cell.y, true);
  }
}

export function seedRandom(grid: LifeGrid, density = 0.08, random = Math.random): void {
  const safeDensity = Math.min(1, Math.max(0, density));

  for (let index = 0; index < grid.cells.length; index += 1) {
    grid.cells[index] = random() < safeDensity ? 1 : 0;
  }
}

export function liveCells(grid: LifeGrid): CellPoint[] {
  const cells: CellPoint[] = [];

  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      if (getCell(grid, x, y) === 1) {
        cells.push({ x, y });
      }
    }
  }

  return cells;
}
