import { cellColWidthDeg, cellRowHeightDeg } from "./geo.ts";

export type FogWindow = { w: number; s: number; e: number; n: number };
const BLOCK = 32;

/** Spatial index; persisted row:col keys remain unchanged. */
export class FogCellIndex {
  private blocks = new Map<number, Map<number, Map<string, [number, number]>>>();

  add(key: string) {
    const [row, col] = key.split(":").map(Number);
    if (!Number.isInteger(row) || !Number.isInteger(col)) return;
    const br = Math.floor(row / BLOCK), bc = Math.floor(col / BLOCK);
    let columns = this.blocks.get(br);
    if (!columns) this.blocks.set(br, columns = new Map());
    let cells = columns.get(bc);
    if (!cells) columns.set(bc, cells = new Map());
    cells.set(key, [row, col]);
  }

  clear() { this.blocks.clear(); }

  *inWindow(win: FogWindow, padding = 1): Generator<[number, number]> {
    const rowMin = Math.floor(win.s / cellRowHeightDeg()) - padding;
    const rowMax = Math.floor(win.n / cellRowHeightDeg()) + padding;
    const brMin = Math.floor(rowMin / BLOCK), brMax = Math.floor(rowMax / BLOCK);
    // Visit occupied row blocks only, including when the view spans the whole city.
    for (const [br, columns] of this.blocks) {
      if (br < brMin || br > brMax) continue;
      const widths = [cellColWidthDeg(br * BLOCK), cellColWidthDeg((br + 1) * BLOCK - 1)];
      const limits = widths.flatMap(width => [win.w / width, win.e / width]);
      const bcMin = Math.floor((Math.floor(Math.min(...limits)) - padding) / BLOCK);
      const bcMax = Math.floor((Math.floor(Math.max(...limits)) + padding) / BLOCK);
      for (const [bc, cells] of columns) {
        if (bc < bcMin || bc > bcMax) continue;
        for (const [row, col] of cells.values()) {
          if (row < rowMin || row > rowMax) continue;
          const width = cellColWidthDeg(row);
          if (col >= Math.floor(win.w / width) - padding && col <= Math.floor(win.e / width) + padding) yield [row, col];
        }
      }
    }
  }
}
