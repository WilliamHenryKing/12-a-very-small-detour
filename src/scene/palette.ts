// Survey-model palette: hypsometric tints, beck water, expedition vermilion, brass hinges.
import type { Terrain } from "../game/types";

/** Terrace tints from valley floor to fell top. */
export const TINTS = ["#5d7c49", "#7c9754", "#a2a860", "#c4b274", "#d9c69b", "#efe5cd"] as const;

export const TERRAIN_SHIFT: Record<Terrain, readonly [number, number, number]> = {
  meadow: [0, 0, 0],
  forest: [-0.06, -0.02, -0.04],
  ridge: [0.02, 0, 0.02],
  scree: [0.04, 0.01, 0.05],
  lake: [0, 0, 0],
  river: [0, 0, 0],
  ford: [0, 0, 0],
};

export const COLORS = {
  table: "#1a2327",
  plinth: "#2e231b",
  slab: "#c8b089",
  slabDark: "#8b7556",
  trailBed: "#cdb58c",
  waterBed: "#39626a",
  water: "#4d8fa3",
  dashIdle: "#7a5a3f",
  dashLit: "#e0492a",
  brass: "#c9a24a",
  iron: "#4b4a46",
  pine: "#2f5236",
  trunk: "#5a4030",
  focus: "#f3ead2",
  pin: "#e0492a",
  jacket: "#2c5d7c",
  pack: "#d9772b",
  skin: "#e8c5a0",
  tent: "#e07a2c",
  roof: "#9c4a35",
  wall: "#eadfc8",
  stone: "#9a978d",
  sky: "#dfe8ee",
  ground: "#3b3024",
  sun: "#fff0d8",
  dusk: "#ffab73",
  duskSky: "#e9b99a",
} as const;
