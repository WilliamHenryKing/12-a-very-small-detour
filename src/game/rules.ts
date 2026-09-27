// Pure rules: which pieces move, how trails connect, and how the traveller advances.
import { COLS, colOf, DIRS, opposite, ROWS, rotateMask, rowOf, step } from "./edges";
import { LEGS, START_CELL, TILES } from "./map";
import type { Face, GameState, Leg, TileDef } from "./types";

const CELLS = COLS * ROWS;

export function createState(): GameState {
  return {
    rot: Array.from({ length: CELLS }, () => 0),
    face: Array.from({ length: CELLS }, () => 0),
    at: START_CELL,
    leg: 0,
    moves: 0,
    walked: 0,
    finished: false,
  };
}

export function tileAt(cell: number): TileDef {
  const t = TILES[cell];
  if (!t) throw new RangeError(`No tile at ${cell}`);
  return t;
}

/** The side of a piece currently facing up. */
export function faceUp(state: GameState, cell: number): Face {
  const faces = tileAt(cell).faces;
  return faces[state.face[cell] ?? 0] ?? faces[0];
}

/** Trail ends of a cell as the map currently shows it. */
export function pathsAt(state: GameState, cell: number): number {
  return rotateMask(faceUp(state, cell).paths, state.rot[cell] ?? 0);
}

export function currentLeg(state: GameState): Leg | undefined {
  return LEGS[state.leg];
}

/** Hinges loosen leg by leg and stay loose. */
export function isUnlocked(state: GameState, cell: number): boolean {
  if (tileAt(cell).kind === "fixed") return false;
  const upTo = Math.min(state.leg, LEGS.length - 1);
  for (let i = 0; i <= upTo; i++) if (LEGS[i]?.unlock.includes(cell)) return true;
  return false;
}

export function canOperate(state: GameState, cell: number): boolean {
  return !state.finished && cell !== state.at && isUnlocked(state, cell);
}

/** Turn or flip a piece. Returns the same state when the piece is pinned. */
export function operate(state: GameState, cell: number): GameState {
  if (!canOperate(state, cell)) return state;
  const kind = tileAt(cell).kind;
  if (kind === "turn") {
    const rot = state.rot.slice();
    rot[cell] = ((rot[cell] ?? 0) + 1) % 4;
    return { ...state, rot, moves: state.moves + 1 };
  }
  const face = state.face.slice();
  face[cell] = (face[cell] ?? 0) ^ 1;
  return { ...state, face, moves: state.moves + 1 };
}

/** Two neighbours connect when both print a trail end on their shared edge. */
export function linked(state: GameState, cell: number, dir: number): number {
  if (!(pathsAt(state, cell) & dir)) return -1;
  const next = step(cell, dir);
  if (next < 0 || !(pathsAt(state, next) & opposite(dir))) return -1;
  return next;
}

/** Every cell the traveller can currently walk to, in breadth-first order, with parents. */
function explore(state: GameState, from: number): Map<number, number> {
  const parent = new Map<number, number>([[from, -1]]);
  const queue = [from];
  for (let i = 0; i < queue.length; i++) {
    const cell = queue[i] as number;
    for (const dir of DIRS) {
      const next = linked(state, cell, dir);
      if (next >= 0 && !parent.has(next)) {
        parent.set(next, cell);
        queue.push(next);
      }
    }
  }
  return parent;
}

export function reachable(state: GameState): Set<number> {
  return new Set(explore(state, state.at).keys());
}

/** Shortest walkable route from the traveller to the leg's destination, or null. */
export function findRoute(state: GameState): number[] | null {
  const leg = currentLeg(state);
  if (!leg || state.finished) return null;
  const parent = explore(state, state.at);
  if (!parent.has(leg.to)) return null;
  const route: number[] = [];
  for (let c = leg.to; c >= 0; c = parent.get(c) ?? -1) route.unshift(c);
  return route;
}

/** Walk the open route: the traveller arrives and the next leg begins. */
export function arrive(state: GameState): GameState {
  const route = findRoute(state);
  const leg = currentLeg(state);
  if (!route || !leg) return state;
  const next = state.leg + 1;
  return {
    ...state,
    at: leg.to,
    leg: next,
    walked: state.walked + route.length - 1,
    finished: next >= LEGS.length,
  };
}

/** Straight-line distance from camp to the final destination, in squares. */
export function crowFlies(): number {
  const end = LEGS[LEGS.length - 1]?.to ?? START_CELL;
  return Math.hypot(colOf(end) - colOf(START_CELL), rowOf(end) - rowOf(START_CELL));
}
