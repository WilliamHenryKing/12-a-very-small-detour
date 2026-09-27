import type { Recipes } from "./kit/build";
import {
  bend,
  blend,
  box,
  capsule,
  carve,
  chain,
  cone,
  cylinder,
  displace,
  ellipsoid,
  extrude,
  fbm,
  lathe,
  type Mat,
  mat,
  mirrorX,
  mottle,
  move,
  type Node,
  paint,
  polygon2,
  radial,
  rng,
  rotate,
  scale,
  sphere,
  subtract,
  torus,
  union,
  type Vec3,
} from "./kit/sdf";

const pick = <T>(r: () => number, list: T[]) => list[Math.floor(r() * list.length)] as T;
const range = (r: () => number, a: number, b: number) => a + (b - a) * r();
void [bend, blend, box, capsule, carve, chain, cone, cylinder, displace, ellipsoid, extrude, fbm, lathe, mirrorX, mottle, move, paint, polygon2, radial, rotate, scale, sphere, subtract, torus, union];
type Build = (seed: number, index: number) => Node;
void (0 as unknown as Mat | Vec3 | Build);

// A VERY SMALL DETOUR — hinged terrain tiles for the pocket-map puzzle: square relief tiles
// with hills, valleys, paths and rivers in cartographic bands, hinge knuckles on one edge,
// and small landmarks (cottages, trees, bridges) at map scale.
const BANDS = [0x6f8f5a, 0x8aa06a, 0xa8b27a, 0xc9c08a, 0xd9c7a0, 0xe8dcc0];
const tile: Build = (seed) => {
  // A pocket-map tile the player rotates and swaps to make a route: one clear landform per tile
  // (meadow, hill, ridge, river, lake, coast, village) and a path joining edge midpoints (straight,
  // bend, tee or cross), sunk into the ground, with a plank bridge where it crosses water.
  const r = rng(seed);
  const S = 1;
  const habit = pick(r, ["meadow", "hill", "ridge", "river", "lake", "coast", "village"] as const);
  const edges: [number, number][] = [[0, -0.5], [0.5, 0], [0, 0.5], [-0.5, 0]];
  const shape = pick(r, [[0, 2], [0, 1], [0, 1, 2], [0, 1, 2, 3], [0, 2], [1, 3]]);
  const turn = Math.floor(r() * 4);
  const ends = shape.map((e) => edges[(e + turn) % 4] as [number, number]);
  const pathDistance = (x: number, z: number) =>
    Math.min(
      ...ends.map(([ex, ez]) => {
        // Segment from the tile centre to an edge midpoint.
        const t = Math.max(0, Math.min(1, (x * ex + z * ez) / (ex * ex + ez * ez)));
        return Math.hypot(x - ex * t, z - ez * t);
      }),
    );
  const f = range(r, 2, 3.5);
  const meander = range(r, -0.12, 0.12);
  const riverAxis = r() < 0.5;
  const coastSide = Math.floor(r() * 4);
  const water = 0.05;
  const base = (x: number, z: number) => {
    let h = 0.09 + 0.025 * fbm(x * f, 0.3, z * f, 4, seed);
    if (habit === "hill") h += 0.17 * Math.exp(-((x * x + z * z) / 0.09));
    if (habit === "ridge") {
      const across = riverAxis ? x : z;
      h += 0.1 * Math.exp(-((across - meander) ** 2) / 0.02) + 0.08 * (1 / (1 + Math.exp(-(across - meander) * 40)));
    }
    if (habit === "river") {
      const along = riverAxis ? z : x;
      const across = (riverAxis ? x : z) - meander - Math.sin(along * 5 + seed) * 0.08;
      h -= 0.06 * Math.exp(-((across / 0.08) ** 2));
    }
    if (habit === "lake") h -= 0.08 * Math.exp(-((x * x + z * z) / 0.06));
    if (habit === "coast") {
      const [cx, cz] = edges[coastSide] as [number, number];
      const toward = (x * cx + z * cz) / 0.5;
      h -= 0.09 * (1 / (1 + Math.exp(-(toward - 0.25) * 12)));
    }
    // The path is levelled and sunk a little into the ground.
    const onPath = Math.exp(-((pathDistance(x, z) / 0.045) ** 2));
    h = h * (1 - onPath * 0.6) + (Math.max(h, water + 0.012) - 0.006) * onPath * 0.6;
    return Math.max(0.02, h);
  };
  const terrain: Node = {
    d: (x, y, z) => Math.max(Math.max(Math.abs(x) - S / 2, Math.abs(z) - S / 2, -y), (y - base(x, z)) * 0.6),
    mat: (x, y, z) => {
      const h = base(x, z);
      if (pathDistance(x, z) < 0.035 && y > h - 0.012) return mat(0xc9a878, 0.85);
      if (y < h - 0.02) return mat(0xa89478, 0.9);
      if (h < water + 0.006) return mat(0xd8c9a0, 0.85);
      if (habit === "ridge" && h > 0.2) return mat(0x8b8478, 0.8);
      const band = Math.min(BANDS.length - 1, Math.floor(((h - 0.06) / 0.28) * BANDS.length));
      return mat(BANDS[Math.max(0, band)] as number, 0.8);
    },
    box: [-S / 2, 0, -S / 2, S / 2, 0.32, S / 2],
  };
  const parts: Node[] = [terrain];
  // Water: a flat surface wherever the ground dips below it.
  if (habit === "river" || habit === "lake" || habit === "coast")
    parts.push({
      d: (x, y, z) => Math.max(Math.abs(x) - S / 2 + 0.002, Math.abs(z) - S / 2 + 0.002, y - water, base(x, z) - 0.002 - y),
      mat: () => mat(0x5f93b3, 0.12),
      box: [-S / 2, 0, -S / 2, S / 2, water + 0.01, S / 2],
    });
  // Bridges where the path meets water.
  if (habit === "river" || habit === "lake")
    for (const [ex, ez] of ends) {
      const at: Vec3 = [ex * 0.45, water + 0.012, ez * 0.45];
      if (base(at[0], at[2]) < water + 0.004)
        parts.push(move(box(ex !== 0 ? 0.32 : 0.1, 0.012, ex !== 0 ? 0.1 : 0.32, 0.003, mat(0x8a6a48, 0.8)), [ex * 0.28, water + 0.012, ez * 0.28]));
    }
  // Trees on green ground, clear of the path; small houses around a square in a village.
  const trees = habit === "village" ? 3 : habit === "coast" ? 4 : 10 + Math.floor(r() * 12);
  for (let t = 0; t < trees; t++) {
    const x = range(r, -0.44, 0.44);
    const z = range(r, -0.44, 0.44);
    const h = base(x, z);
    if (pathDistance(x, z) < 0.09 || h < water + 0.02) continue;
    const size = range(r, 0.025, 0.05);
    const leaf = mat(pick(r, [0x4f7a3e, 0x5d8a46, 0x3f6a36]), 0.85);
    parts.push(move(r() < 0.5 ? cone(size, 0.004, size * 2.6, leaf) : sphere(size * 0.9, leaf), [x, h + size * (r() < 0.5 ? 1.2 : 0.9), z]));
    parts.push(move(cylinder(0.005, size * 0.9, 0, mat(0x6b4f35, 0.9)), [x, h + size * 0.35, z]));
  }
  if (habit === "village")
    for (let v = 0; v < 4 + Math.floor(r() * 3); v++) {
      const a = (v / 6) * Math.PI * 2 + r();
      const x = Math.cos(a) * range(r, 0.16, 0.34);
      const z = Math.sin(a) * range(r, 0.16, 0.34);
      if (pathDistance(x, z) < 0.07) continue;
      const w = range(r, 0.045, 0.07);
      const h = base(x, z);
      const wall = mat(pick(r, [0xe8dcc8, 0xd9c2a0, 0xc9b8a8]), 0.8);
      const roof = mat(pick(r, [0xa0523a, 0x7a4a3a, 0x5a6a7a]), 0.7);
      parts.push(move(box(w, w * 0.8, w * 0.8, 0.002, wall), [x, h + w * 0.4, z]));
      parts.push(move(rotate(cylinder(w * 0.62, w * 1.02, 0, roof), [0, 0, Math.PI / 2]), [x, h + w * 0.85, z]));
    }
  const knuckles = union(...[-0.3, 0, 0.3].map((z) => move(rotate(cylinder(0.02, 0.18, 0.004, mat(0xc49a4a, 0.3, 1)), [Math.PI / 2, 0, 0]), [S / 2 + 0.015, 0.02, z])));
  return union(...parts, knuckles);
};
const landmark: Build = (seed, index) => {
  const r = rng(seed);
  switch (index % 3) {
    case 0: {
      // cottage
      const wall = mat(pick(r, [0xe8dcc0, 0xd9c7a0]), 0.8);
      const roof = mat(pick(r, [0xa8452a, 0x3a4a5a, 0x6a4a2a]), 0.7);
      const body = move(box(0.08, 0.06, 0.06, 0.004, wall), [0, 0.03, 0]);
      const top = { d: (x: number, y: number, z: number) => Math.max(Math.abs(z) - 0.035, (Math.abs(x) + (y - 0.06) - 0.045) / 1.414, 0.058 - y), mat: () => roof, box: [-0.05, 0.05, -0.035, 0.05, 0.11, 0.035] as [number, number, number, number, number, number] };
      return union(body, top);
    }
    case 1: // round tree
      return union(capsule([0, 0, 0], [0, 0.04, 0], 0.006, 0.005, mat(0x5a4636, 0.9)), displace(move(sphere(0.035, mat(pick(r, [0x4a6a3a, 0x5a7a3a]), 0.8)), [0, 0.07, 0]), 0.006, 60, 3, seed));
    default: // arch bridge
      return subtract(move(box(0.18, 0.05, 0.04, 0.004, mat(0xb8b0a0, 0.8)), [0, 0.025, 0]), move(rotate(cylinder(0.05, 0.1, 0), [Math.PI / 2, 0, 0]), [0, -0.01, 0]));
  }
};

export const project = { id: "12-a-very-small-detour", name: "A VERY SMALL DETOUR", background: 0x2f2b24 };
export const families: Recipes["families"] = [
  { id: "terrain-tile", count: 128, voxel: 0.005, keep: 0.25, elevation: 48, build: tile },
  { id: "landmark", count: 48, voxel: 0.0012, keep: 0.3, build: landmark },
];
export const textures: Recipes["textures"] = [
  { id: "map-paper", ramp: [0xd9c7a0, 0xe8dcc0, 0xf2ead6], layers: [{ kind: "fibres", scale: 48, stretch: 4 }, { kind: "fbm", scale: 6, weight: 0.5 }], roughness: [0.8, 0.95], normal: 0.6 },
  { id: "contour-print", ramp: [0x6f8f5a, 0xa8b27a, 0xd9c7a0], layers: [{ kind: "grain", rings: 18, warp: 2.5 }], roughness: [0.7, 0.85], normal: 0.4 },
  { id: "cloth-binding", ramp: [0x2a3a4a, 0x3a4a5a, 0x4a5a6a], layers: [{ kind: "weave", count: 80 }, { kind: "fbm", scale: 8, weight: 0.3 }], roughness: [0.7, 0.9], normal: 1.4 },
];
