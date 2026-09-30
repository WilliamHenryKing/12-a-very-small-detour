import { describe, expect, test } from "bun:test";
import {
  COLS,
  cellOf,
  colOf,
  DIRS,
  E,
  gridRef,
  N,
  ROWS,
  rotateMask,
  rowOf,
  S,
  step,
  W,
} from "../src/game/edges";
import { LEGS, TILES } from "../src/game/map";
import {
  arrive,
  canOperate,
  createState,
  crowFlies,
  findRoute,
  linked,
  operate,
  pathsAt,
  reachable,
} from "../src/game/rules";
import type { GameState } from "../src/game/types";

/** Breadth-first search over loose pieces: the fewest moves that open the current leg. */
function solve(start: GameState, maxDepth = 10): number[] | null {
  const key = (s: GameState) => `${s.rot.join("")}|${s.face.join("")}`;
  const loose = TILES.map((_, c) => c).filter((c) => canOperate(start, c));
  const seen = new Set([key(start)]);
  let frontier: [GameState, number[]][] = [[start, []]];
  for (let depth = 0; depth <= maxDepth; depth++) {
    const next: [GameState, number[]][] = [];
    for (const [s, moves] of frontier) {
      if (findRoute(s)) return moves;
      for (const c of loose) {
        const t = operate(s, c);
        const k = key(t);
        if (!seen.has(k)) {
          seen.add(k);
          next.push([t, [...moves, c]]);
        }
      }
    }
    frontier = next;
  }
  return null;
}

function playThrough() {
  let s = createState();
  const perLeg: number[] = [];
  while (!s.finished) {
    const moves = solve(s);
    if (!moves) throw new Error(`Leg ${s.leg} unsolvable`);
    perLeg.push(moves.length);
    for (const c of moves) s = operate(s, c);
    s = arrive(s);
  }
  return { s, perLeg };
}

describe("edges", () => {
  test("rotating clockwise carries north to east", () => {
    expect(rotateMask(N, 1)).toBe(E);
    expect(rotateMask(N | S, 1)).toBe(E | W);
    expect(rotateMask(E | S, 1)).toBe(S | W);
    expect(rotateMask(W | N, 4)).toBe(W | N);
  });

  test("map-edge steps never wrap into another row or column", () => {
    const offsets = new Map([
      [N, [0, -1]],
      [E, [1, 0]],
      [S, [0, 1]],
      [W, [-1, 0]],
    ]);
    for (let cell = 0; cell < COLS * ROWS; cell++) {
      for (const dir of DIRS) {
        const [dx, dy] = offsets.get(dir) ?? [0, 0];
        const col = colOf(cell) + (dx ?? 0);
        const row = rowOf(cell) + (dy ?? 0);
        const expected = col < 0 || row < 0 || col >= COLS || row >= ROWS ? -1 : cellOf(col, row);
        expect(step(cell, dir)).toBe(expected);
      }
    }
  });
});

describe("pieces", () => {
  test("the map is 5×5 and landmarks are glued down", () => {
    expect(TILES).toHaveLength(25);
    for (const t of TILES) if (t.landmark) expect(t.kind).toBe("fixed");
  });

  test("only loosened hinges move", () => {
    const s = createState();
    expect(canOperate(s, cellOf(1, 4))).toBe(true);
    expect(canOperate(s, cellOf(2, 3))).toBe(false);
    expect(operate(s, cellOf(2, 3))).toBe(s);
    expect(canOperate(s, cellOf(0, 0))).toBe(false);
  });

  test("a turn piece rotates its trail; four turns bring it home", () => {
    let s = createState();
    const plank = cellOf(1, 4);
    expect(pathsAt(s, plank)).toBe(N | S);
    s = operate(s, plank);
    expect(pathsAt(s, plank)).toBe(E | W);
    for (let i = 0; i < 3; i++) s = operate(s, plank);
    expect(pathsAt(s, plank)).toBe(N | S);
    expect(s.moves).toBe(4);
  });

  test("a flip piece shows its underside trail", () => {
    let s = createState();
    s = operate(s, cellOf(1, 4));
    s = arrive(s);
    const hay = cellOf(1, 3);
    expect(pathsAt(s, hay)).toBe(N | S);
    s = operate(s, hay);
    expect(pathsAt(s, hay)).toBe(E | W);
    expect(operate(s, hay).face[hay]).toBe(0);
  });
});

describe("routes", () => {
  test("a join requires reciprocal trail ends on both pieces", () => {
    const state = createState();
    const camp = cellOf(0, 4);
    const plank = cellOf(1, 4);
    expect(pathsAt(state, camp) & E).toBe(E);
    expect(linked(state, camp, E)).toBe(-1);
    const turned = operate(state, plank);
    expect(linked(turned, camp, E)).toBe(plank);
    expect(linked(turned, plank, W)).toBe(camp);
  });

  test("one map change turns a dead end into a walkable route", () => {
    const s = createState();
    expect(findRoute(s)).toBeNull();
    expect(reachable(s)).toEqual(new Set([cellOf(0, 4)]));
    const turned = operate(s, cellOf(1, 4));
    expect(findRoute(turned)).toEqual([cellOf(0, 4), cellOf(1, 4), cellOf(2, 4)]);
  });

  test("arriving without a route changes nothing", () => {
    const s = createState();
    expect(arrive(s)).toBe(s);
  });

  test("every leg starts closed after solving the one before", () => {
    let s = createState();
    while (!s.finished) {
      expect(findRoute(s)).toBeNull();
      const moves = solve(s);
      expect(moves).not.toBeNull();
      for (const c of moves ?? []) s = operate(s, c);
      s = arrive(s);
    }
  });
});

describe("progression", () => {
  test("the authored detour finishes at the summit", () => {
    const { s, perLeg } = playThrough();
    expect(s.finished).toBe(true);
    expect(s.leg).toBe(LEGS.length);
    expect(s.at).toBe(cellOf(2, 0));
    expect(perLeg).toEqual([1, 2, 6, 4]);
    expect(s.walked).toBe(16);
    expect(s.walked).toBeGreaterThan(crowFlies() * 3);
  });

  test("nothing moves once the journey is over", () => {
    const { s } = playThrough();
    for (let c = 0; c < TILES.length; c++) expect(canOperate(s, c)).toBe(false);
    expect(findRoute(s)).toBeNull();
  });

  test("normal control actions survive a rapid full turn cycle and a complete fresh replay", () => {
    const controls = [
      [cellOf(1, 4)],
      [cellOf(1, 3), cellOf(2, 3)],
      [cellOf(1, 1), cellOf(2, 1), cellOf(3, 1), cellOf(1, 2), cellOf(1, 2), cellOf(3, 2)],
      [cellOf(3, 0), cellOf(3, 0), cellOf(3, 1), cellOf(3, 1)],
    ];
    const walks = ["A5 B5 C5", "C5 C4 B4 A4 A3", "A3 B3 B2 C2 D2 D3 E3 E2", "E2 D2 D1 C1"];
    const complete = (start: GameState) => {
      let state = start;
      for (const [index, actions] of controls.entries()) {
        const leg = LEGS[index];
        if (!leg) throw new Error("Missing authored leg");
        expect(state.at).toBe(leg.from);
        expect(state.leg).toBe(index);
        expect(findRoute(state)).toBeNull();
        const unlocked = new Set(LEGS.slice(0, index + 1).flatMap((l) => l.unlock));
        for (const [cell, tile] of TILES.entries()) {
          if (tile.kind !== "fixed") expect(canOperate(state, cell)).toBe(unlocked.has(cell));
        }
        for (const cell of actions) {
          expect(canOperate(state, cell)).toBe(true);
          const next = operate(state, cell);
          expect(next.moves).toBe(state.moves + 1);
          state = next;
        }
        const route = findRoute(state);
        expect(route?.map(gridRef).join(" ")).toBe(walks[index]);
        expect(reachable(state).has(cellOf(2, 2))).toBe(false); // The tarn never becomes a shortcut.
        const walked = state.walked;
        state = arrive(state);
        expect(state.at).toBe(leg.to);
        expect(state.walked).toBe(walked + (route?.length ?? 1) - 1);
        expect(state.finished).toBe(index === LEGS.length - 1);
      }
      return state;
    };

    let start = createState();
    for (let i = 0; i < 4; i++) start = operate(start, cellOf(1, 4));
    expect(start.moves).toBe(4);
    expect(start.rot[cellOf(1, 4)]).toBe(0);
    expect(findRoute(start)).toBeNull();
    const first = complete(start);
    expect(first).toMatchObject({ finished: true, moves: 17, walked: 16, at: cellOf(2, 0) });
    expect(arrive(first)).toBe(first);
    expect(operate(first, cellOf(1, 4))).toBe(first);

    const replay = createState();
    expect(replay.rot).not.toBe(first.rot);
    expect(replay.face).not.toBe(first.face);
    expect(replay.rot.every((r) => r === 0)).toBe(true);
    expect(replay.face.every((f) => f === 0)).toBe(true);
    const second = complete(replay);
    expect(second).toMatchObject({ finished: true, moves: 13, walked: 16, at: cellOf(2, 0) });
    expect(first.moves).toBe(17);
  });
});
