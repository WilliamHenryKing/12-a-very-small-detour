import { afterEach, describe, expect, test } from "bun:test";
import { gsap } from "gsap";
import { Group } from "three";
import { arrive, createState, operate } from "../src/game/rules";
import { Board, cellCentre, SLAB } from "../src/scene/board";
import { disposeTree } from "../src/scene/resources";
import { WalkMotion } from "../src/scene/walk";

const clocks: gsap.core.Timeline[] = [];
const boards: Board[] = [];
const walks: WalkMotion[] = [];

function ownTimeline(run: () => void): gsap.core.Timeline {
  const before = new Set(gsap.globalTimeline.getChildren(false, false, true));
  run();
  const timelines = gsap.globalTimeline
    .getChildren(false, false, true)
    .filter((child) => !before.has(child));
  if (!timelines.length) throw new Error("No new scene timeline");
  const clock = gsap.timeline({ paused: true });
  for (const timeline of timelines) clock.add(timeline, 0);
  clocks.push(clock);
  return clock;
}

function makeWalk() {
  const walker = new Group();
  walker.position.copy(cellCentre(20)).setY(0.18);
  const motion = new WalkMotion(walker, 0.18);
  walks.push(motion);
  return { walker, motion };
}

function makeBoard() {
  const board = new Board();
  boards.push(board);
  return board;
}

afterEach(() => {
  for (const walk of walks.splice(0)) walk.cancel();
  for (const board of boards.splice(0)) {
    board.cancelAnimations();
    disposeTree(board.group);
  }
  for (const clock of clocks.splice(0)) clock.kill();
  gsap.ticker.sleep();
});

describe("owned traveller motion", () => {
  test("waits for terrain and reports each square only after arrival", async () => {
    const { walker, motion } = makeWalk();
    const arrivals: { cell: number; x: number; y: number; z: number }[] = [];
    let result = Promise.resolve(false);
    const clock = ownTimeline(() => {
      result = motion.run(
        [20, 21, 22],
        (cell) => arrivals.push({ cell, ...walker.position }),
        1,
        0.5,
      );
    });
    clock.time(0.25);
    expect(walker.position.x).toBeCloseTo(cellCentre(20).x, 6);
    expect(arrivals).toHaveLength(0);
    clock.time(0.71);
    expect(walker.position.x).toBeGreaterThan(cellCentre(20).x);
    expect(walker.position.x).toBeLessThan(cellCentre(21).x);
    expect(arrivals).toHaveLength(0);
    clock.time(0.92);
    expect(arrivals).toHaveLength(1);
    expect(arrivals[0]?.cell).toBe(21);
    expect(arrivals[0]?.x).toBeCloseTo(cellCentre(21).x, 6);
    expect(arrivals[0]?.y).toBeCloseTo(0.18, 6);
    clock.totalProgress(1);
    expect(await result).toBe(true);
    expect(arrivals.map((step) => step.cell)).toEqual([21, 22]);
    expect(walker.position.x).toBeCloseTo(cellCentre(22).x, 6);
    expect(walker.position.y).toBeCloseTo(0.18, 6);
    expect(motion.active).toBe(false);
  });

  test("cancel settles a delayed walk and removes all future arrivals", async () => {
    const { walker, motion } = makeWalk();
    const arrivals: number[] = [];
    let result = Promise.resolve(true);
    const clock = ownTimeline(() => {
      result = motion.run([20, 21, 22], (cell) => arrivals.push(cell), 1, 0.5);
    });
    motion.cancel();
    expect(await result).toBe(false);
    clock.totalProgress(1);
    expect(arrivals).toEqual([]);
    expect(walker.position.x).toBeCloseTo(cellCentre(20).x, 6);
    expect(walker.position.y).toBeCloseTo(0.18, 6);
    expect(motion.active).toBe(false);
  });

  test("replacement settles the old run and keeps only the new endpoint", async () => {
    const { walker, motion } = makeWalk();
    const arrivals: number[] = [];
    let previous = Promise.resolve(true);
    const clock = ownTimeline(() => {
      previous = motion.run([20, 21, 22], (cell) => arrivals.push(cell), 1);
    });
    clock.time(0.1);
    const current = motion.run([20, 15], (cell) => arrivals.push(cell), 0);
    expect(await previous).toBe(false);
    expect(await current).toBe(true);
    clock.totalProgress(1);
    expect(arrivals).toEqual([15]);
    expect(walker.position.x).toBeCloseTo(cellCentre(15).x, 6);
    expect(walker.position.z).toBeCloseTo(cellCentre(15).z, 6);
  });

  test("mid-step cancellation preserves only completed arrivals and stops bobbing", async () => {
    const { walker, motion } = makeWalk();
    const arrivals: number[] = [];
    let result = Promise.resolve(true);
    const clock = ownTimeline(() => {
      result = motion.run([20, 21, 22], (cell) => arrivals.push(cell), 1);
    });
    clock.time(0.6);
    const stoppedAt = walker.position.x;
    motion.cancel();
    expect(await result).toBe(false);
    clock.totalProgress(1);
    expect(arrivals).toEqual([21]);
    expect(walker.position.x).toBe(stoppedAt);
    expect(walker.position.y).toBeCloseTo(0.18, 6);
  });

  test("live reduced motion finishes a delayed path with successful arrivals", async () => {
    const { walker, motion } = makeWalk();
    const arrivals: number[] = [];
    let result = Promise.resolve(false);
    ownTimeline(() => {
      result = motion.run([20, 21, 22], (cell) => arrivals.push(cell), 1, 0.5);
    });
    motion.finish();
    expect(await result).toBe(true);
    expect(arrivals).toEqual([21, 22]);
    expect(walker.position.x).toBeCloseTo(cellCentre(22).x, 6);
    expect(walker.position.y).toBeCloseTo(0.18, 6);
    expect(motion.active).toBe(false);
  });
});

describe("hinged terrain motion", () => {
  test("rapid turns replace old motion and return the piece to the table", () => {
    const board = makeBoard();
    const pivot = board.pickables().find((piece) => piece.userData.cell === 21);
    if (!pivot) throw new Error("No turn piece");
    let state = operate(createState(), 21);
    const first = ownTimeline(() => board.sync(state, new Set(), () => true, 1));
    first.time(0.15);
    expect(pivot.position.y).toBeGreaterThan(SLAB / 2);
    state = operate(state, 21);
    const second = ownTimeline(() => board.sync(state, new Set(), () => true, 1));
    first.totalProgress(1);
    second.totalProgress(1);
    expect(pivot.rotation.y).toBeCloseTo(-Math.PI, 6);
    expect(pivot.position.y).toBeCloseTo(SLAB / 2, 6);
    expect(board.remainingTime()).toBe(0);
  });

  test("rapid flips keep the requested face and settle at the original height", () => {
    const board = makeBoard();
    const pivot = board.pickables().find((piece) => piece.userData.cell === 16);
    if (!pivot) throw new Error("No flip piece");
    let state = operate(arrive(operate(createState(), 21)), 16);
    const first = ownTimeline(() => board.sync(state, new Set(), () => true, 1));
    first.time(0.2);
    expect(pivot.position.y).toBeGreaterThan(SLAB / 2);
    state = operate(state, 16);
    const second = ownTimeline(() => board.sync(state, new Set(), () => true, 1));
    first.totalProgress(1);
    second.totalProgress(1);
    expect(pivot.rotation.x).toBeCloseTo(Math.PI * 2, 6);
    expect(pivot.position.y).toBeCloseTo(SLAB / 2, 6);
    expect(board.remainingTime()).toBe(0);
  });

  test("live reduced motion settles every moving trail before the traveller starts", () => {
    const board = makeBoard();
    const state = operate(operate(arrive(operate(createState(), 21)), 17), 16);
    ownTimeline(() => board.sync(state, new Set(), () => true, 1));
    expect(board.remainingTime()).toBeGreaterThan(0);
    board.finishAnimations();
    expect(board.remainingTime()).toBe(0);
    for (const pivot of board.pickables()) expect(pivot.position.y).toBeCloseTo(SLAB / 2, 6);
    expect(board.pickables().find((piece) => piece.userData.cell === 16)?.rotation.x).toBeCloseTo(
      Math.PI,
      6,
    );
  });

  test("an instant reset replaces motion without a later stale orientation", () => {
    const board = makeBoard();
    const pivot = board.pickables().find((piece) => piece.userData.cell === 21);
    if (!pivot) throw new Error("No turn piece");
    const clock = ownTimeline(() =>
      board.sync(operate(createState(), 21), new Set(), () => true, 1),
    );
    clock.time(0.15);
    board.sync(createState(), new Set(), () => true, 0);
    clock.totalProgress(1);
    expect(Math.cos(pivot.rotation.y)).toBeCloseTo(1, 6);
    expect(Math.sin(pivot.rotation.y)).toBeCloseTo(0, 6);
    expect(pivot.position.y).toBeCloseTo(SLAB / 2, 6);
    expect(board.remainingTime()).toBe(0);
  });
});
