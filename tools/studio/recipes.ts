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
  const r = rng(seed);
  const S = 1;
  const peak = range(r, 0.05, 0.22);
  const f = range(r, 1.5, 3.5);
  const river = r() < 0.4;
  const path = !river && r() < 0.6;
  const height = (x: number, z: number) => {
    let h = 0.06 + peak * (0.5 + 0.5 * fbm(x * f, 0.3, z * f, 4, seed));
    if (river) h -= 0.05 * Math.exp(-(((x - Math.sin(z * 3) * 0.15) / 0.07) ** 2));
    return Math.max(0.02, h);
  };
  const terrain: Node = {
    d: (x, y, z) => {
      const inside = Math.max(Math.abs(x) - S / 2, Math.abs(z) - S / 2, -y);
      return Math.max(inside, (y - height(x, z)) * 0.6);
    },
    mat: (x, y, z) => {
      if (river && y < 0.04) return mat(0x6a9ab8, 0.2);
      if (path && Math.abs(x - z * 0.3) < 0.03 && y > height(x, z) - 0.01) return mat(0xc9a878, 0.85);
      if (y < height(x, z) - 0.015) return mat(0xb8a488, 0.9);
      const band = Math.min(BANDS.length - 1, Math.floor(((y - 0.02) / (0.3)) * BANDS.length));
      return mat(BANDS[Math.max(0, band)] as number, 0.8);
    },
    box: [-S / 2, 0, -S / 2, S / 2, 0.32, S / 2],
  };
  const knuckles = union(...[-0.3, 0, 0.3].map((z) => move(rotate(cylinder(0.02, 0.18, 0.004, mat(0xc49a4a, 0.3, 1)), [Math.PI / 2, 0, 0]), [S / 2 + 0.015, 0.02, z])));
  return union(terrain, knuckles);
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
  { id: "terrain-tile", count: 64, voxel: 0.005, keep: 0.25, build: tile },
  { id: "landmark", count: 24, voxel: 0.0012, keep: 0.3, build: landmark },
];
export const textures: Recipes["textures"] = [
  { id: "map-paper", ramp: [0xd9c7a0, 0xe8dcc0, 0xf2ead6], layers: [{ kind: "fibres", scale: 48, stretch: 4 }, { kind: "fbm", scale: 6, weight: 0.5 }], roughness: [0.8, 0.95], normal: 0.6 },
  { id: "contour-print", ramp: [0x6f8f5a, 0xa8b27a, 0xd9c7a0], layers: [{ kind: "grain", rings: 18, warp: 2.5 }], roughness: [0.7, 0.85], normal: 0.4 },
  { id: "cloth-binding", ramp: [0x2a3a4a, 0x3a4a5a, 0x4a5a6a], layers: [{ kind: "weave", count: 80 }, { kind: "fbm", scale: 8, weight: 0.3 }], roughness: [0.7, 0.9], normal: 1.4 },
];
