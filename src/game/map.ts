// The authored pocket map of Little Nothing Fell and the four legs of the detour.
import { cellOf, E, N, S, W } from "./edges";
import type { Face, Leg, Terrain, TileDef } from "./types";

const f = (paths: number, terrain: Terrain, seed: number): Face => ({ paths, terrain, seed });
const fixed = (place: string, face: Face, landmark?: TileDef["landmark"]): TileDef =>
  landmark
    ? { kind: "fixed", faces: [face], landmark, place }
    : { kind: "fixed", faces: [face], place };
const turn = (place: string, face: Face): TileDef => ({ kind: "turn", faces: [face], place });
const flip = (place: string, up: Face, under: Face): TileDef => ({
  kind: "flip",
  faces: [up, under],
  place,
});

/** Row-major, north row first. Map scale: one square is 250 m. */
export const TILES: readonly TileDef[] = [
  // Row 1 — the fell tops
  fixed("Cold Knuckle", f(0, "ridge", 11)),
  fixed("Brack Edge", f(0, "ridge", 12)),
  fixed("Summit of Little Nothing", f(E, "ridge", 13), "summit"),
  turn("Scree Stair", f(N | E, "scree", 14)),
  fixed("Wether Crag", f(0, "ridge", 15)),
  // Row 2
  fixed("Gorse Wood", f(0, "forest", 21)),
  turn("Pike Corner", f(N | E, "forest", 22)),
  flip("The Washout", f(N | S, "scree", 23), f(E | W, "meadow", 24)),
  turn("Crook Bend", f(E | S, "meadow", 25)),
  fixed("Fire Tower", f(S | W, "forest", 26), "tower"),
  // Row 3
  fixed("Hobble Village", f(S | E, "meadow", 31), "village"),
  turn("Stile Field", f(E | S, "meadow", 32)),
  fixed("Mere Tarn", f(0, "lake", 33)),
  turn("Owl Copse", f(N | W, "forest", 34)),
  fixed("Larch Row", f(N | W, "forest", 35)),
  // Row 4
  fixed("Sheep Fold", f(N | E, "meadow", 41)),
  flip("Hay Flap", f(N | S, "forest", 42), f(E | W, "meadow", 43)),
  turn("Mill Turn", f(E | S, "meadow", 44)),
  fixed("Grey Steps", f(0, "scree", 45)),
  fixed("Bramble Rise", f(0, "meadow", 46)),
  // Row 5 — the valley floor
  fixed("Base Camp", f(E, "meadow", 51), "camp"),
  turn("Plank Meadow", f(N | S, "meadow", 52)),
  fixed("Low Wick Ford", f(W | N, "ford", 53), "ford"),
  fixed("Wick Beck", f(0, "river", 54)),
  fixed("Wick Beck", f(0, "river", 55)),
];

export const LEGS: readonly Leg[] = [
  {
    from: cellOf(0, 4),
    to: cellOf(2, 4),
    unlock: [cellOf(1, 4)],
    title: "The ford at Low Wick",
    brief:
      "The postcard said: bring boots. Plank Meadow is turned the wrong way to reach the ford.",
  },
  {
    from: cellOf(2, 4),
    to: cellOf(0, 2),
    unlock: [cellOf(2, 3), cellOf(1, 3)],
    title: "Tea at Hobble Village",
    brief:
      "Two more pieces have come loose. Hay Flap turns over on its axle, and its underside has a different trail printed on it.",
  },
  {
    from: cellOf(0, 2),
    to: cellOf(4, 1),
    unlock: [cellOf(1, 2), cellOf(1, 1), cellOf(2, 1), cellOf(3, 1), cellOf(3, 2)],
    title: "Round the tarn to the Fire Tower",
    brief:
      "Mere Tarn is in the way, so the trail has to go round it. Flip the Washout, then turn the corners into one long loop.",
  },
  {
    from: cellOf(4, 1),
    to: cellOf(2, 0),
    unlock: [cellOf(3, 0)],
    title: "Up to the Summit of Little Nothing",
    brief:
      "From the tower you can see the cairn. Crook Bend has to leave the loop you just walked and point up the Scree Stair instead.",
  },
];

export const START_CELL = LEGS[0]?.from ?? 0;
export const SQUARE_METRES = 250;
