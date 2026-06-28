import { describe, expect, it } from "vitest";

import { createGrid, getCell, setCell, stepGrid, type LifeGrid } from "@/lib/life/life";

describe("Conway Life rules", () => {
  it("keeps a block stable", () => {
    let grid = createGrid(5, 5);
    setCells(grid, [
      [1, 1],
      [2, 1],
      [1, 2],
      [2, 2]
    ]);

    grid = stepGrid(grid);

    expect(aliveSet(grid)).toEqual(new Set(["1,1", "2,1", "1,2", "2,2"]));
  });

  it("oscillates a blinker", () => {
    let grid = createGrid(5, 5);
    setCells(grid, [
      [2, 1],
      [2, 2],
      [2, 3]
    ]);

    grid = stepGrid(grid);
    expect(aliveSet(grid)).toEqual(new Set(["1,2", "2,2", "3,2"]));

    grid = stepGrid(grid);
    expect(aliveSet(grid)).toEqual(new Set(["2,1", "2,2", "2,3"]));
  });

  it("moves a glider after four generations", () => {
    let grid = createGrid(6, 6);
    setCells(grid, [
      [1, 0],
      [2, 1],
      [0, 2],
      [1, 2],
      [2, 2]
    ]);

    for (let index = 0; index < 4; index += 1) {
      grid = stepGrid(grid);
    }

    expect(aliveSet(grid)).toEqual(new Set(["2,1", "3,2", "1,3", "2,3", "3,3"]));
  });
});

function setCells(grid: LifeGrid, cells: Array<[number, number]>) {
  for (const [x, y] of cells) {
    setCell(grid, x, y, true);
  }
}

function aliveSet(grid: LifeGrid): Set<string> {
  const result = new Set<string>();

  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      if (getCell(grid, x, y) === 1) {
        result.add(`${x},${y}`);
      }
    }
  }

  return result;
}
