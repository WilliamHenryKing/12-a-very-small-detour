import { describe, expect, test } from "bun:test";
import { cellOf, E, N, rotateMask, S, W } from "../src/game/edges";
import { LEGS, TILES } from "../src/game/map";
import {
  arrive,
  canOperate,
  createState,
  crowFlies,
  findRoute,
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
});
