// Painted-pawn props: landmarks, the traveller, the destination pin and hinge hardware.
import {
  BoxGeometry,
  CapsuleGeometry,
  ConeGeometry,
  CylinderGeometry,
  DodecahedronGeometry,
  Group,
  Mesh,
  MeshStandardMaterial,
  type MeshStandardMaterialParameters,
  SphereGeometry,
} from "three";
import type { Face, Landmark } from "../game/types";
import { COLORS } from "./palette";
import { shared } from "./resources";
import { surfaceY } from "./terrain";

const mat = (color: string, extra: MeshStandardMaterialParameters = {}) =>
  new MeshStandardMaterial({ color, roughness: 0.75, flatShading: true, ...extra });

const M = {
  tent: mat(COLORS.tent),
  roof: mat(COLORS.roof),
  wall: mat(COLORS.wall),
  stone: mat(COLORS.stone),
  trunk: mat(COLORS.trunk),
  pin: mat(COLORS.pin, { emissive: COLORS.pin, emissiveIntensity: 0.35 }),
  jacket: mat(COLORS.jacket),
  pack: mat(COLORS.pack),
  skin: mat(COLORS.skin),
  brass: new MeshStandardMaterial({ color: COLORS.brass, metalness: 0.85, roughness: 0.32 }),
  iron: new MeshStandardMaterial({ color: COLORS.iron, metalness: 0.6, roughness: 0.6 }),
};
export const hingeMaterials = { brass: M.brass, iron: M.iron };

function part(geo: ConstructorParameters<typeof Mesh>[0], m: MeshStandardMaterial) {
  const mesh = new Mesh(geo, m);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function at(face: Face, obj: Mesh | Group, u: number, v: number, lift = 0) {
  obj.position.set(u, surfaceY(face, u, v) + lift, v);
  return obj;
}

function house(face: Face, u: number, v: number, turn: number) {
  const g = new Group();
  const walls = part(new BoxGeometry(0.1, 0.07, 0.07), M.wall);
  walls.position.y = 0.035;
  const roof = part(new ConeGeometry(0.075, 0.06, 4), M.roof);
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1, 1, 0.72);
  roof.position.y = 0.1;
  g.add(walls, roof);
  g.rotation.y = turn;
  return at(face, g, u, v);
}

/** Landmark props, positioned off the trail so the traveller can stand at the centre. */
export function landmark(kind: Landmark, face: Face): Group {
  const g = new Group();
  switch (kind) {
    case "camp": {
      const tent = part(new ConeGeometry(0.11, 0.13, 4), M.tent);
      tent.rotation.y = Math.PI / 4;
      tent.position.y = 0.065;
      const tentG = new Group();
      tentG.add(tent);
      g.add(at(face, tentG, -0.2, -0.16));
      const fire = part(new ConeGeometry(0.025, 0.04, 5), M.pin);
      g.add(at(face, fire, -0.16, 0.12, 0.02));
      break;
    }
    case "ford":
      for (const [u, v] of [
        [-0.03, -0.3],
        [0.03, -0.25],
        [-0.01, -0.2],
      ] as const) {
        const stone = part(new DodecahedronGeometry(0.028), M.stone);
        stone.scale.y = 0.5;
        g.add(at(face, stone, u, v, 0.02));
      }
      break;
    case "village":
      g.add(house(face, -0.2, -0.2, 0.2), house(face, 0.18, -0.24, -0.3));
      g.add(house(face, -0.26, 0.12, 1.2), house(face, 0.02, -0.3, 0.05));
      break;
    case "tower": {
      const t = new Group();
      for (const [x, z] of [
        [-0.03, -0.03],
        [0.03, -0.03],
        [-0.03, 0.03],
        [0.03, 0.03],
      ] as const) {
        const leg = part(new CylinderGeometry(0.006, 0.008, 0.26, 4), M.trunk);
        leg.position.set(x, 0.13, z);
        t.add(leg);
      }
      const cab = part(new BoxGeometry(0.1, 0.06, 0.1), M.wall);
      cab.position.y = 0.29;
      const cap = part(new ConeGeometry(0.085, 0.05, 4), M.roof);
      cap.rotation.y = Math.PI / 4;
      cap.position.y = 0.345;
      t.add(cab, cap);
      g.add(at(face, t, 0.2, -0.2));
      break;
    }
    case "summit": {
      const cairn = new Group();
      [0.05, 0.04, 0.03, 0.02].forEach((r, i) => {
        const s = part(new DodecahedronGeometry(r), M.stone);
        s.position.y = r + i * 0.045;
        cairn.add(s);
      });
      g.add(at(face, cairn, -0.18, -0.04));
      const pole = part(new CylinderGeometry(0.005, 0.005, 0.28, 4), M.trunk);
      pole.position.y = 0.14;
      const flag = part(new BoxGeometry(0.1, 0.06, 0.004), M.pin);
      flag.position.set(0.05, 0.24, 0);
      flag.name = "flag";
      const staff = new Group();
      staff.add(pole, flag);
      g.add(at(face, staff, -0.05, -0.14));
      break;
    }
  }
  return g;
}

/** The traveller: a little painted pawn with a pack. Origin at the feet. */
export function traveller(): Group {
  const g = new Group();
  const body = part(new CapsuleGeometry(0.035, 0.07, 3, 8), M.jacket);
  body.position.y = 0.075;
  const head = part(new SphereGeometry(0.03, 12, 8), M.skin);
  head.position.y = 0.165;
  const pack = part(new BoxGeometry(0.06, 0.07, 0.04), M.pack);
  pack.position.set(0, 0.09, -0.04);
  g.add(body, head, pack);
  g.scale.setScalar(1.3);
  return g;
}

/** Floating vermilion pin that marks the current destination. */
export function destinationPin(): Group {
  const g = new Group();
  const cone = part(new ConeGeometry(0.06, 0.16, 12), M.pin);
  cone.rotation.x = Math.PI;
  cone.position.y = 0.08;
  const ball = part(new SphereGeometry(0.065, 16, 12), M.pin);
  ball.position.y = 0.19;
  g.add(cone, ball);
  return g;
}

export const rivetGeometry = new CylinderGeometry(0.03, 0.03, 0.02, 12);
export const axleGeometry = new CylinderGeometry(0.034, 0.034, 0.05, 12);
axleGeometry.rotateZ(Math.PI / 2);
shared(...Object.values(M), rivetGeometry, axleGeometry);
