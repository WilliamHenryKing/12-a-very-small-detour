// One heightfield per printed face. The miniature terrain is built from it and the pocket map
// draws its contour lines, water and tree symbols from it, so both views always agree.
// Coordinates are tile-local: u runs west→east and v runs north→south, each from -0.5 to 0.5.
import { DIRS, E, N, S, W } from "./edges";
import type { Face } from "./types";

/** Contour interval: the relief is cut into this many terraces. */
export const LEVELS = 6;
export const TRAIL_H = 0.22;
const EDGE_H = 0.14;
const TRAIL_HALF = 0.065;

const END: Record<number, readonly [number, number]> = {
  [N]: [0, -0.5],
  [E]: [0.5, 0],
  [S]: [0, 0.5],
  [W]: [-0.5, 0],
};

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

function wobble(u: number, v: number, seed: number): number {
  const s = seed * 1.618;
  return (
    Math.sin(u * 7.1 + s) * Math.cos(v * 6.3 - s * 0.7) * 0.5 +
    Math.sin((u + v) * 11.3 + s * 2.1) * 0.3 +
    Math.cos((u - v) * 17.7 - s) * 0.2
  );
}

/** Distance from (u, v) to the printed trail: spokes from the centre to each trail end. */
export function trailDistance(paths: number, u: number, v: number): number {
  let best = Number.POSITIVE_INFINITY;
  for (const dir of DIRS) {
    if (!(paths & dir)) continue;
    const [ex, ey] = END[dir] ?? [0, 0];
    const t = Math.max(0, Math.min(1, (u * ex + v * ey) / (ex * ex + ey * ey)));
    best = Math.min(best, Math.hypot(u - ex * t, v - ey * t));
  }
  return best;
}

/** Where water lies on this face (lakes, the beck and the ford). */
export function isWater(face: Face, u: number, v: number): boolean {
  const w = wobble(u, v, face.seed) * 0.025;
  if (face.terrain === "lake") return Math.hypot(u, v * 1.1) < 0.28 + w;
  if (face.terrain === "river") return Math.abs(v + 0.25 + w) < 0.075;
  if (face.terrain === "ford") return u > -0.14 && Math.abs(v + 0.25 + w) < 0.075;
  return false;
}

function landHeight(face: Face, u: number, v: number): number {
  const n = wobble(u, v, face.seed);
  switch (face.terrain) {
    case "ridge": {
      const a = face.seed * 0.9;
      const across = u * Math.cos(a) + v * Math.sin(a);
      const crest = Math.exp(-(across * across) / 0.05);
      const peak = Math.exp(-((u + 0.18) ** 2 + (v + 0.05) ** 2) / 0.04);
      return 0.36 + 0.42 * crest + 0.22 * peak + 0.08 * n;
    }
    case "scree":
      return 0.42 + 0.2 * n + 0.12 * Math.exp(-((u - 0.2) ** 2 + (v + 0.2) ** 2) / 0.03);
    case "forest":
      return 0.3 + 0.14 * n;
    case "lake":
      return 0.02 + 0.44 * smooth(0.22, 0.46, Math.hypot(u, v)) + 0.06 * n;
    case "river":
    case "ford":
      return 0.26 + 0.1 * n;
    default:
      return 0.27 + 0.1 * n;
  }
}

/** Relief height in 0..1: land, cut by the trail and eased down at the piece's edges. */
export function heightAt(face: Face, u: number, v: number): number {
  if (isWater(face, u, v)) return 0;
  let h = landHeight(face, u, v);
  const edge = 0.5 - Math.max(Math.abs(u), Math.abs(v));
  h = EDGE_H + (h - EDGE_H) * smooth(0, 0.09, edge);
  if (face.paths) {
    const d = Math.min(trailDistance(face.paths, u, v), Math.hypot(u, v) - 0.05);
    h = TRAIL_H + (h - TRAIL_H) * smooth(TRAIL_HALF, TRAIL_HALF + 0.08, d);
  }
  return Math.min(1, Math.max(0, h));
}

export const terrace = (h: number) => Math.min(LEVELS - 1, Math.floor(h * LEVELS));

function rng(seed: number) {
  let a = seed * 2654435761;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Spot {
  readonly u: number;
  readonly v: number;
  readonly size: number;
}

const treeCache = new Map<string, Spot[]>();

/** Tree positions, shared by the model's instanced pines and the map's tree symbols. */
export function treeSpots(face: Face): Spot[] {
  const key = `${face.seed}:${face.paths}:${face.terrain}`;
  const hit = treeCache.get(key);
  if (hit) return hit;
  const want = { forest: 16, meadow: 3, lake: 4, river: 2, ford: 1, ridge: 0, scree: 0 }[
    face.terrain
  ];
  const r = rng(face.seed);
  const out: Spot[] = [];
  for (let tries = 0; out.length < want && tries < 200; tries++) {
    const u = r() * 0.8 - 0.4;
    const v = r() * 0.8 - 0.4;
    if (face.paths && trailDistance(face.paths, u, v) < 0.14) continue;
    if (Math.hypot(u, v) < 0.16) continue;
    if (isWater(face, u, v) || isWater(face, u, v + 0.06) || isWater(face, u, v - 0.06)) continue;
    if (out.some((s) => Math.hypot(s.u - u, s.v - v) < 0.1)) continue;
    out.push({ u, v, size: 0.75 + r() * 0.5 });
  }
  treeCache.set(key, out);
  return out;
}

const contourCache = new Map<string, number[]>();

/** Contour lines by marching squares: flat list of segments [u1, v1, u2, v2, ...]. */
export function contours(face: Face, res = 22): number[] {
  const key = `${face.seed}:${face.paths}:${face.terrain}:${res}`;
  const hit = contourCache.get(key);
  if (hit) return hit;
  const g: number[] = [];
  const at = (i: number) => i / res - 0.5;
  for (let j = 0; j <= res; j++)
    for (let i = 0; i <= res; i++) g.push(heightAt(face, at(i), at(j)));
  const h = (i: number, j: number) => g[j * (res + 1) + i] ?? 0;
  const out: number[] = [];
  for (let k = 1; k < LEVELS; k++) {
    const iso = k / LEVELS;
    for (let j = 0; j < res; j++) {
      for (let i = 0; i < res; i++) {
        const c = [h(i, j), h(i + 1, j), h(i + 1, j + 1), h(i, j + 1)] as const;
        const corners: [number, number][] = [
          [i, j],
          [i + 1, j],
          [i + 1, j + 1],
          [i, j + 1],
        ];
        const hits: number[] = [];
        for (let e = 0; e < 4; e++) {
          const a = c[e] as number;
          const b = c[(e + 1) % 4] as number;
          if (a < iso === b < iso) continue;
          const t = (iso - a) / (b - a);
          const [ai, aj] = corners[e] as [number, number];
          const [bi, bj] = corners[(e + 1) % 4] as [number, number];
          hits.push(at(ai + (bi - ai) * t), at(aj + (bj - aj) * t));
        }
        for (let p = 0; p + 3 < hits.length; p += 4) out.push(...hits.slice(p, p + 4));
      }
    }
  }
  contourCache.set(key, out);
  return out;
}
