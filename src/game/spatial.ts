/** Grilă spațială simplă: găsește rapid entitățile din apropierea unui punct. */
export class SpatialGrid<T extends { x: number; y: number }> {
  private readonly cols: number;
  private readonly cells: T[][];

  constructor(
    worldSize: number,
    private readonly cellSize: number,
  ) {
    this.cols = Math.ceil(worldSize / cellSize);
    this.cells = Array.from({ length: this.cols * this.cols }, () => []);
  }

  clear(): void {
    for (const cell of this.cells) cell.length = 0;
  }

  insert(item: T): void {
    this.cells[this.index(item.x, item.y)].push(item);
  }

  /** Apelează fn pentru fiecare entitate din celulele care ating cercul (x, y, r). */
  query(x: number, y: number, r: number, fn: (item: T) => void): void {
    const c0 = this.clampCell(Math.floor((x - r) / this.cellSize));
    const c1 = this.clampCell(Math.floor((x + r) / this.cellSize));
    const r0 = this.clampCell(Math.floor((y - r) / this.cellSize));
    const r1 = this.clampCell(Math.floor((y + r) / this.cellSize));
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        const cell = this.cells[row * this.cols + col];
        for (let i = 0; i < cell.length; i++) fn(cell[i]);
      }
    }
  }

  private clampCell(c: number): number {
    return c < 0 ? 0 : c >= this.cols ? this.cols - 1 : c;
  }

  private index(x: number, y: number): number {
    return this.clampCell(Math.floor(y / this.cellSize)) * this.cols + this.clampCell(Math.floor(x / this.cellSize));
  }
}
