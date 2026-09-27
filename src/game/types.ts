// Shared shapes for the pocket map, its hinged pieces and the traveller's legs.

export type Terrain = "meadow" | "forest" | "ridge" | "scree" | "lake" | "river" | "ford";
export type Landmark = "camp" | "ford" | "village" | "tower" | "summit";

/** fixed: glued to the map. turn: rotates a quarter clockwise. flip: turns over on its axle. */
export type Kind = "fixed" | "turn" | "flip";

/** One printed side of a piece. `paths` is a N/E/S/W bitmask of trail ends (see edges.ts). */
export interface Face {
  readonly paths: number;
  readonly terrain: Terrain;
  readonly seed: number;
}

export interface TileDef {
  readonly kind: Kind;
  readonly faces: readonly [Face] | readonly [Face, Face];
  readonly landmark?: Landmark;
  readonly place: string;
}

export interface Leg {
  readonly from: number;
  readonly to: number;
  /** Cells whose hinges come loose at the start of this leg. */
  readonly unlock: readonly number[];
  readonly title: string;
  readonly brief: string;
}

export interface GameState {
  /** Quarter turns applied to each cell (turn pieces only). */
  readonly rot: readonly number[];
  /** Which side is up (flip pieces only). */
  readonly face: readonly number[];
  /** Cell the traveller stands on. */
  readonly at: number;
  readonly leg: number;
  readonly moves: number;
  /** Squares walked so far. */
  readonly walked: number;
  readonly finished: boolean;
}
