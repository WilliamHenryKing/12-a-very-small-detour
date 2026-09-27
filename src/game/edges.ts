// Trail ends as a bitmask: north, east, south, west. Grid rows grow southward.

export const N = 1;
export const E = 2;
export const S = 4;
export const W = 8;
export const DIRS = [N, E, S, W] as const;

export const COLS = 5;
export const ROWS = 5;

const DELTA: Record<number, readonly [number, number]> = {
  [N]: [0, -1],
  [E]: [1, 0],
  [S]: [0, 1],
  [W]: [-1, 0],
};

export function opposite(dir: number): number {
  return dir <= E ? dir << 2 : dir >> 2;
}

/** Rotate a trail mask clockwise by `turns` quarter turns. */
export function rotateMask(mask: number, turns: number): number {
  let m = mask & 15;
  const n = ((turns % 4) + 4) % 4;
  for (let i = 0; i < n; i++) m = ((m << 1) | (m >> 3)) & 15;
  return m;
}

export const cellOf = (col: number, row: number) => row * COLS + col;
export const colOf = (cell: number) => cell % COLS;
export const rowOf = (cell: number) => Math.floor(cell / COLS);

/** Neighbour cell in a direction, or -1 off the map edge. */
export function step(cell: number, dir: number): number {
  const d = DELTA[dir];
  if (!d) return -1;
  const c = colOf(cell) + d[0];
  const r = rowOf(cell) + d[1];
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return -1;
  return cellOf(c, r);
}

/** Map-style grid reference, e.g. "C4" (columns A–E west to east, rows 1–5 north to south). */
export function gridRef(cell: number): string {
  return `${String.fromCharCode(65 + colOf(cell))}${rowOf(cell) + 1}`;
}

const NAMES: Record<number, string> = { [N]: "north", [E]: "east", [S]: "south", [W]: "west" };

export function describeMask(mask: number): string {
  const ends = DIRS.filter((d) => mask & d).map((d) => NAMES[d]);
  if (ends.length === 0) return "no trail";
  if (ends.length === 1) return `trail runs ${ends[0]}`;
  return `trail joins ${ends.slice(0, -1).join(", ")} and ${ends[ends.length - 1]}`;
}
