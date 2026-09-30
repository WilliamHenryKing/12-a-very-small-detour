import { COLS, cellOf, colOf, describeMask, gridRef, ROWS, rowOf } from "../game/edges";
import { TILES } from "../game/map";
import { canOperate, pathsAt } from "../game/rules";
import type { GameState } from "../game/types";

/** Keep each hinge moving forward while the final printed face stays in the rule's orientation. */
export function advancePhase(previous: number, state: number, period: number): number {
  return previous + ((((state - previous) % period) + period) % period);
}

/** The keyboard follows the map's rows and columns, stopping at its edges. */
export function nextMapCell(cell: number, key: string): number | null {
  const delta: Record<string, readonly [number, number]> = {
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
  };
  const d = delta[key];
  if (!d) return null;
  const col = Math.min(COLS - 1, Math.max(0, colOf(cell) + d[0]));
  const row = Math.min(ROWS - 1, Math.max(0, rowOf(cell) + d[1]));
  return cellOf(col, row);
}

/** A complete reading of the visible face; unavailable hinges never promise an action. */
export function mapLabel(
  state: GameState,
  cell: number,
  dest: number | null,
  walkerAt: number,
  disabled: boolean,
  reachable: boolean,
): string {
  const tile = TILES[cell];
  if (!tile) return "";
  const parts = [`${gridRef(cell)}, ${tile.place}`, describeMask(pathsAt(state, cell))];
  if (cell === walkerAt) parts.push("traveller here");
  if (cell === dest) parts.push("destination");
  if (reachable) parts.push("reachable by trail");
  if (state.finished) parts.push("journey complete");
  else if (tile.kind === "fixed") parts.push("fixed terrain");
  else if (disabled) parts.push("wait for the traveller before moving this piece");
  else if (canOperate(state, cell)) {
    parts.push(tile.kind === "turn" ? "press to turn clockwise a quarter" : "press to flip");
  } else
    parts.push(cell === state.at ? "cannot move the traveller's square" : "hinge still pinned");
  return parts.join(", ");
}
