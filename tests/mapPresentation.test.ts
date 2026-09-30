import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { COLS, cellOf, colOf, DIRS, E, N, ROWS, rowOf, S, W } from "../src/game/edges";
import { LEGS } from "../src/game/map";
import { arrive, createState, findRoute, operate, pathsAt, reachable } from "../src/game/rules";
import { Ending } from "../src/ui/Ending";
import { LegCard } from "../src/ui/LegCard";
import { advancePhase, mapLabel, nextMapCell } from "../src/ui/mapPresentation";
import { PocketMap } from "../src/ui/PocketMap";

const plank = cellOf(1, 4);
const hay = cellOf(1, 3);

test("arrow navigation follows paper coordinates without wrapping over an edge", () => {
  for (let cell = 0; cell < COLS * ROWS; cell++) {
    const col = colOf(cell);
    const row = rowOf(cell);
    expect(nextMapCell(cell, "ArrowRight")).toBe(cellOf(Math.min(col + 1, COLS - 1), row));
    expect(nextMapCell(cell, "ArrowLeft")).toBe(cellOf(Math.max(col - 1, 0), row));
    expect(nextMapCell(cell, "ArrowUp")).toBe(cellOf(col, Math.max(row - 1, 0)));
    expect(nextMapCell(cell, "ArrowDown")).toBe(cellOf(col, Math.min(row + 1, ROWS - 1)));
  }
  expect(nextMapCell(plank, "Enter")).toBeNull();
  expect(nextMapCell(plank, " ")).toBeNull();
});

test("paper turns stay clockwise through repeated wraps and match the open trail", () => {
  let state = createState();
  let phase = 0;
  for (let turn = 1; turn <= 12; turn++) {
    state = operate(state, plank);
    phase = advancePhase(phase, state.rot[plank] ?? 0, 4);
    expect(phase).toBe(turn);
    expect(pathsAt(state, plank)).toBe(turn % 2 === 0 ? N | S : E | W);
  }
  expect(advancePhase(phase, 0, 4)).toBe(phase);
});

test("flipping the printed underside restores canonical north and south on every cycle", () => {
  const css = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");
  const match = /\.face\.under\s*\{\s*transform:\s*rotateX\(([-\d.]+)deg\)/.exec(css);
  if (!match?.[1]) throw new Error("Printed underside transform missing");
  const underside = Number(match[1]);
  let state = arrive(operate(createState(), plank));
  let phase = 0;
  for (let flip = 1; flip <= 12; flip++) {
    state = operate(state, hay);
    const side = state.face[hay] ?? 0;
    phase = advancePhase(phase, side, 2);
    expect(phase).toBe(flip);
    const verticalScale = Math.cos(((phase * 180 + side * underside) * Math.PI) / 180);
    expect(verticalScale).toBeCloseTo(1, 10);
    expect(pathsAt(state, hay)).toBe(side === 0 ? N | S : E | W);
    for (const direction of DIRS) {
      if (direction === N || direction === S) expect(verticalScale).toBeGreaterThan(0);
    }
  }
});

test("cell descriptions use the current traveller and never promise locked actions", () => {
  const state = createState();
  const dest = LEGS[0]?.to ?? null;
  expect(mapLabel(state, plank, dest, plank, false, true)).toContain("traveller here");
  expect(mapLabel(state, state.at, dest, plank, false, true)).not.toContain("traveller here");
  expect(mapLabel(state, plank, dest, state.at, false, false)).toContain("press to turn clockwise");
  expect(mapLabel(state, plank, dest, state.at, true, false)).not.toContain("press to");
  expect(mapLabel(state, hay, dest, state.at, false, false)).toContain("hinge still pinned");
  const finished = { ...state, finished: true, leg: LEGS.length };
  const label = mapLabel(finished, hay, null, finished.at, true, false);
  expect(label).toContain("journey complete");
  expect(label).not.toContain("press to");
  expect(label).not.toContain("hinge still pinned");
});

test("a busy pocket map exposes one tab stop and all pieces as unavailable", () => {
  const state = createState();
  const html = renderToStaticMarkup(
    createElement(PocketMap, {
      state,
      lit: reachable(state),
      dest: LEGS[0]?.to ?? null,
      walkerAt: state.at,
      active: plank,
      disabled: true,
      onActive: () => {},
      onHover: () => {},
      onOperate: () => {},
      onNudge: () => {},
    }),
  );
  expect(html.match(/data-cell="\d+"/g)).toHaveLength(25);
  expect(html.match(/tabindex="0"/g)).toHaveLength(1);
  expect(html.match(/aria-disabled="true"/g)).toHaveLength(25);
  expect(html).toContain(`data-cell="${plank}" tabindex="0"`);
  expect(html).not.toContain("press to turn");
});

test("a pinned-piece note does not conceal the open route", () => {
  const state = operate(createState(), plank);
  const html = renderToStaticMarkup(
    createElement(LegCard, {
      state,
      route: findRoute(state),
      note: "Base Camp is glued to the map.",
    }),
  );
  expect(html).toContain('id="route-status"');
  expect(html).toContain("Base Camp is glued to the map.");
  expect(html).toContain("Route open: 2 squares to Low Wick Ford.");
});

test("the ending supplies its story as the dialog description and preserves the journey totals", () => {
  const state = { ...createState(), finished: true, leg: LEGS.length, moves: 13, walked: 16 };
  const html = renderToStaticMarkup(createElement(Ending, { state, onReplay: () => {} }));
  const description = /aria-describedby="([^"]+)"/.exec(html)?.[1];
  if (!description) throw new Error("Ending description missing");
  expect(html).toContain('aria-modal="true"');
  expect(html).toContain(`id="${description}"`);
  expect(html).toContain("You walked 4.0 km");
  expect(html).toContain("turned 13 hinges");
  expect(html).toContain("Fold the map and start again");
});
