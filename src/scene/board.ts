// The hinged survey model: 25 pieces on a walnut plinth, kept in step with the game state.
import { gsap } from "gsap";
import {
  BoxGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RingGeometry,
  Vector3,
} from "three";
import { COLS, colOf, ROWS, rowOf } from "../game/edges";
import { TILES } from "../game/map";
import type { GameState, Kind } from "../game/types";
import { COLORS } from "./palette";
import { axleGeometry, hingeMaterials, landmark, rivetGeometry } from "./props";
import { BASE, buildFace, type FaceView, setDashes } from "./terrain";

export const PITCH = 1.08;
export const SLAB = 0.12;

export function cellCentre(cell: number): Vector3 {
  return new Vector3(
    (colOf(cell) - (COLS - 1) / 2) * PITCH,
    0,
    (rowOf(cell) - (ROWS - 1) / 2) * PITCH,
  );
}

interface Piece {
  readonly cell: number;
  readonly kind: Kind;
  readonly pivot: Group;
  readonly views: FaceView[];
  readonly hardware: Mesh[];
  turns: number;
  flips: number;
}

const slabGeometry = new BoxGeometry(1, SLAB, 1);
const slabMaterial = new MeshStandardMaterial({ color: COLORS.slab, roughness: 0.85 });
const slabUnderMaterial = new MeshStandardMaterial({ color: COLORS.slabDark, roughness: 0.9 });

export class Board {
  readonly group = new Group();
  private readonly pieces: Piece[] = [];
  private readonly frame: Mesh;

  constructor() {
    const span = COLS * PITCH + 0.3;
    const plinth = new Mesh(
      new BoxGeometry(span, 0.3, span),
      new MeshStandardMaterial({ color: COLORS.plinth, roughness: 0.6 }),
    );
    plinth.position.y = -0.15;
    plinth.receiveShadow = true;
    plinth.castShadow = true;
    this.group.add(plinth);
    TILES.forEach((tile, cell) => {
      this.pieces.push(this.buildPiece(cell, tile.kind));
    });
    this.frame = new Mesh(
      new RingGeometry(0.721, 0.78, 4, 1, Math.PI / 4),
      new MeshBasicMaterial({ color: COLORS.focus, side: DoubleSide, toneMapped: false }),
    );
    this.frame.rotation.x = -Math.PI / 2;
    this.frame.visible = false;
    this.group.add(this.frame);
  }

  private buildPiece(cell: number, kind: Kind): Piece {
    const tile = TILES[cell];
    if (!tile) throw new RangeError(`No tile ${cell}`);
    const pivot = new Group();
    pivot.position.copy(cellCentre(cell)).setY(SLAB / 2);
    pivot.userData.cell = cell;
    const slab = new Mesh(slabGeometry, [
      slabMaterial,
      slabMaterial,
      slabMaterial,
      slabUnderMaterial,
      slabMaterial,
      slabMaterial,
    ]);
    slab.castShadow = true;
    slab.receiveShadow = true;
    pivot.add(slab);
    const views = tile.faces.map((face, i) => {
      const view = buildFace(face);
      view.group.position.y = SLAB / 2;
      if (i === 0 && tile.landmark) view.group.add(landmark(tile.landmark, face));
      if (i === 0) pivot.add(view.group);
      else {
        const under = new Group();
        under.rotation.x = Math.PI;
        under.add(view.group);
        pivot.add(under);
      }
      return view;
    });
    const hardware: Mesh[] = [];
    if (kind === "turn") {
      for (const [x, z] of [
        [-0.43, -0.43],
        [0.43, -0.43],
        [0.43, 0.43],
        [-0.43, 0.43],
      ] as const) {
        const rivet = new Mesh(rivetGeometry, hingeMaterials.iron);
        rivet.position.set(x, SLAB / 2 + BASE, z);
        hardware.push(rivet);
      }
    } else if (kind === "flip") {
      for (const x of [-0.515, 0.515]) {
        const axle = new Mesh(axleGeometry, hingeMaterials.iron);
        axle.position.set(x, 0, 0);
        hardware.push(axle);
      }
    }
    for (const h of hardware) {
      h.castShadow = true;
      pivot.add(h);
    }
    this.group.add(pivot);
    return { cell, kind, pivot, views, hardware, turns: 0, flips: 0 };
  }

  /** Match the model to the state; `pace` scales animation time (0 = instant). */
  sync(state: GameState, lit: Set<number>, loose: (cell: number) => boolean, pace: number) {
    for (const p of this.pieces) {
      const on = lit.has(p.cell);
      for (const v of p.views) setDashes(v, on);
      const mat = loose(p.cell) ? hingeMaterials.brass : hingeMaterials.iron;
      for (const h of p.hardware) h.material = mat;
      if (p.kind === "turn") {
        const delta = ((((state.rot[p.cell] ?? 0) - p.turns) % 4) + 4) % 4;
        if (delta) this.turn(p, delta, pace);
      } else if (p.kind === "flip") {
        const delta = ((((state.face[p.cell] ?? 0) - p.flips) % 2) + 2) % 2;
        if (delta) this.flip(p, pace);
      }
    }
  }

  private turn(p: Piece, delta: number, pace: number) {
    p.turns += delta;
    const d = 0.5 * pace;
    gsap.to(p.pivot.rotation, { y: (-p.turns * Math.PI) / 2, duration: d, ease: "back.out(1.4)" });
    if (pace > 0) {
      gsap.to(p.pivot.position, {
        y: SLAB / 2 + 0.12,
        duration: d / 2,
        yoyo: true,
        repeat: 1,
        ease: "sine.inOut",
      });
    }
  }

  private flip(p: Piece, pace: number) {
    p.flips += 1;
    const d = 0.8 * pace;
    const tl = gsap.timeline();
    tl.to(p.pivot.position, { y: SLAB / 2 + 0.55, duration: d * 0.35, ease: "power2.out" })
      .to(
        p.pivot.rotation,
        { x: p.flips * Math.PI, duration: d * 0.45, ease: "power2.inOut" },
        "<0.1",
      )
      .to(p.pivot.position, { y: SLAB / 2, duration: d * 0.35, ease: "bounce.out" });
    if (pace === 0) tl.progress(1);
  }

  setFocus(cell: number | null) {
    this.frame.visible = cell !== null;
    if (cell !== null) this.frame.position.copy(cellCentre(cell)).setY(SLAB + 0.015);
  }

  pickables() {
    return this.pieces.map((p) => p.pivot);
  }
}
