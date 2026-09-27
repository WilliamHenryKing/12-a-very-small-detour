// A printed face as a terraced relief model: stepped contours, trail bed, water and pines.
import {
  BoxGeometry,
  BufferAttribute,
  Color,
  ConeGeometry,
  Group,
  InstancedMesh,
  type Material,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  Vector3,
} from "three";
import { DIRS, E, N, S, W } from "../game/edges";
import { heightAt, isWater, TRAIL_H, terrace, trailDistance, treeSpots } from "../game/relief";
import type { Face } from "../game/types";
import { COLORS, TERRAIN_SHIFT, TINTS } from "./palette";

export const STEP = 0.05;
export const BASE = 0.012;
export const TRAIL_Y = BASE + terrace(TRAIL_H) * STEP;
const SEGMENTS = 56;

/** Height of the model surface above the piece's top face. */
export function surfaceY(face: Face, u: number, v: number): number {
  return BASE + terrace(heightAt(face, u, v)) * STEP;
}

const reliefMaterial = new MeshStandardMaterial({
  vertexColors: true,
  flatShading: true,
  roughness: 0.92,
});
const waterMaterial = new MeshStandardMaterial({
  color: COLORS.water,
  roughness: 0.18,
  metalness: 0.05,
  transparent: true,
  opacity: 0.86,
});
export const dashIdle = new MeshStandardMaterial({ color: COLORS.dashIdle, roughness: 0.7 });
export const dashLit = new MeshStandardMaterial({
  color: COLORS.dashLit,
  emissive: COLORS.dashLit,
  emissiveIntensity: 0.55,
  roughness: 0.5,
});
const pineMaterial = new MeshStandardMaterial({ color: COLORS.pine, flatShading: true });

function reliefGeometry(face: Face) {
  const geo = new PlaneGeometry(1, 1, SEGMENTS, SEGMENTS).toNonIndexed();
  geo.rotateX(-Math.PI / 2);
  const pos = geo.getAttribute("position");
  const colors = new Float32Array(pos.count * 3);
  const shift = TERRAIN_SHIFT[face.terrain];
  const c = new Color();
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i);
    const v = pos.getZ(i);
    const h = heightAt(face, u, v);
    const level = terrace(h);
    pos.setY(i, BASE + level * STEP);
    if (isWater(face, u, v)) c.set(COLORS.waterBed);
    else if (face.paths && trailDistance(face.paths, u, v) < 0.06) c.set(COLORS.trailBed);
    else {
      c.set(TINTS[level] ?? TINTS[0]);
      c.r += shift[0];
      c.g += shift[1];
      c.b += shift[2];
    }
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}

const dashGeometry = new BoxGeometry(0.05, 0.014, 0.024);
const pineGeometry = new ConeGeometry(0.045, 0.16, 6);
pineGeometry.translate(0, 0.08, 0);

const SPOKE: Record<number, readonly [number, number]> = {
  [N]: [0, -1],
  [E]: [1, 0],
  [S]: [0, 1],
  [W]: [-1, 0],
};

function dashes(face: Face): InstancedMesh | null {
  const spots: [number, number, number][] = [];
  for (const dir of DIRS) {
    if (!(face.paths & dir)) continue;
    const [dx, dz] = SPOKE[dir] ?? [0, 0];
    for (let t = 0.07; t < 0.5; t += 0.085) spots.push([dx * t, dz * t, Math.atan2(-dz, dx)]);
  }
  if (!spots.length) return null;
  const mesh = new InstancedMesh(dashGeometry, dashIdle, spots.length);
  const m = new Matrix4();
  const q = new Quaternion();
  const up = new Vector3(0, 1, 0);
  const one = new Vector3(1, 1, 1);
  spots.forEach(([x, z, a], i) => {
    const y = isWater(face, x, z) ? BASE + 0.03 : TRAIL_Y + 0.007;
    mesh.setMatrixAt(i, m.compose(new Vector3(x, y, z), q.setFromAxisAngle(up, a), one));
  });
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  return mesh;
}

function pines(face: Face): InstancedMesh | null {
  const spots = treeSpots(face);
  if (!spots.length) return null;
  const mesh = new InstancedMesh(pineGeometry, pineMaterial, spots.length);
  const m = new Matrix4();
  const q = new Quaternion();
  spots.forEach((s, i) => {
    const y = surfaceY(face, s.u, s.v);
    const k = s.size;
    mesh.setMatrixAt(i, m.compose(new Vector3(s.u, y, s.v), q, new Vector3(k, k * 1.1, k)));
  });
  mesh.castShadow = true;
  return mesh;
}

function water(face: Face): Mesh | null {
  if (!["lake", "river", "ford"].includes(face.terrain)) return null;
  const geo = new PlaneGeometry(0.98, 0.98, 40, 40).toNonIndexed();
  geo.rotateX(-Math.PI / 2);
  // Collapse triangles that sit on dry land so only the water outline remains.
  const pos = geo.getAttribute("position");
  for (let i = 0; i < pos.count; i += 3) {
    let wet = 0;
    for (let k = 0; k < 3; k++) if (isWater(face, pos.getX(i + k), pos.getZ(i + k))) wet++;
    if (wet < 2) for (let k = 0; k < 3; k++) pos.setXYZ(i + k, 0, -1, 0);
  }
  geo.translate(0, BASE + 0.028, 0);
  const mesh = new Mesh(geo, waterMaterial);
  mesh.receiveShadow = true;
  return mesh;
}

export interface FaceView {
  readonly group: Group;
  readonly dashes: InstancedMesh | null;
}

/** Build one printed face, sitting on y = 0 of its own group. */
export function buildFace(face: Face): FaceView {
  const group = new Group();
  const relief = new Mesh(reliefGeometry(face), reliefMaterial);
  relief.castShadow = true;
  relief.receiveShadow = true;
  group.add(relief);
  const trail = dashes(face);
  for (const part of [trail, pines(face), water(face)]) if (part) group.add(part);
  return { group, dashes: trail };
}

export function setDashes(view: FaceView, lit: boolean) {
  if (view.dashes) view.dashes.material = (lit ? dashLit : dashIdle) as Material;
}
