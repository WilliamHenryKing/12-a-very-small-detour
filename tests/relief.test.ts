import { describe, expect, test } from "bun:test";
import { describeMask, E, N, S, W } from "../src/game/edges";
import { TILES } from "../src/game/map";
import { contours, heightAt, isWater, TRAIL_H, trailDistance, treeSpots } from "../src/game/relief";

const faces = TILES.flatMap((t) => [...t.faces]);

describe("shared relief", () => {
  test("trail ends meet neighbours at the same height on every face", () => {
    const ends: Record<number, [number, number]> = {
      [N]: [0, -0.5],
      [E]: [0.5, 0],
      [S]: [0, 0.5],
      [W]: [-0.5, 0],
    };
    for (const face of faces) {
      for (const [dir, [u, v]] of Object.entries(ends)) {
        if (face.paths & Number(dir) && !isWater(face, u, v)) {
          expect(heightAt(face, u, v)).toBeCloseTo(TRAIL_H, 5);
        }
      }
    }
  });

  test("trees stay off trails and out of water", () => {
    for (const face of faces) {
      for (const t of treeSpots(face)) {
        if (face.paths) expect(trailDistance(face.paths, t.u, t.v)).toBeGreaterThan(0.13);
        expect(isWater(face, t.u, t.v)).toBe(false);
      }
    }
  });

  test("the fell tops draw more contour lines than the meadows", () => {
    const ridge = faces.find((f) => f.terrain === "ridge");
    const meadow = faces.find((f) => f.terrain === "meadow" && f.paths === 0);
    expect(ridge && meadow).toBeTruthy();
    if (ridge && meadow) expect(contours(ridge).length).toBeGreaterThan(contours(meadow).length);
  });

  test("labels read as plain directions", () => {
    expect(describeMask(0)).toBe("no trail");
    expect(describeMask(E)).toBe("trail runs east");
    expect(describeMask(N | W)).toBe("trail joins north and west");
  });
});
