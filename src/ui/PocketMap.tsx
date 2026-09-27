// The pocket map: every piece is a keyboard-reachable button mirroring the model's state.
import { type KeyboardEvent, useRef } from "react";
import { COLS, cellOf, colOf, describeMask, gridRef, ROWS, rowOf } from "../game/edges";
import { SQUARE_METRES, TILES } from "../game/map";
import { canOperate, pathsAt } from "../game/rules";
import type { GameState } from "../game/types";
import { MapFace } from "./MapFace";

interface Props {
  state: GameState;
  lit: Set<number>;
  dest: number | null;
  walkerAt: number;
  active: number;
  onActive(cell: number): void;
  onHover(cell: number | null): void;
  onOperate(cell: number): void;
}

const COL_LABELS = Array.from({ length: COLS }, (_, c) => String.fromCharCode(65 + c));
const ROW_LABELS = Array.from({ length: ROWS }, (_, r) => String(r + 1));
const pct = (n: number, of: number) => `${(n / of) * 100}%`;

function label(state: GameState, cell: number, dest: number | null) {
  const tile = TILES[cell];
  if (!tile) return "";
  const parts = [`${gridRef(cell)}, ${tile.place}`, describeMask(pathsAt(state, cell))];
  if (cell === state.at) parts.push("you are here");
  if (cell === dest) parts.push("destination");
  if (canOperate(state, cell)) parts.push(tile.kind === "turn" ? "press to turn" : "press to flip");
  else if (tile.kind !== "fixed" && !state.finished) parts.push("hinge still pinned");
  return parts.join(", ");
}

export function PocketMap(props: Props) {
  const { state, lit, dest, walkerAt, active } = props;
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  // Accumulated turns so the paper always swings forward, like the model.
  const spun = useRef<number[]>(TILES.map(() => 0));
  const flipped = useRef<number[]>(TILES.map(() => 0));
  TILES.forEach((_, c) => {
    const s = spun.current;
    const f = flipped.current;
    s[c] = (s[c] ?? 0) + (((((state.rot[c] ?? 0) - (s[c] ?? 0)) % 4) + 4) % 4);
    f[c] = (f[c] ?? 0) + (((((state.face[c] ?? 0) - (f[c] ?? 0)) % 2) + 2) % 2);
  });

  const move = (e: KeyboardEvent, cell: number) => {
    const d = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[
      e.key
    ];
    if (!d) return;
    e.preventDefault();
    const c = Math.min(COLS - 1, Math.max(0, colOf(cell) + (d[0] ?? 0)));
    const r = Math.min(ROWS - 1, Math.max(0, rowOf(cell) + (d[1] ?? 0)));
    const next = cellOf(c, r);
    props.onActive(next);
    buttons.current[next]?.focus();
  };

  return (
    <figure className="m-0 w-full">
      <div className="map-case relative mx-auto aspect-square w-full">
        <div className="absolute inset-x-[7%] top-[1.5%] flex text-[10px] font-semibold text-ink/70">
          {COL_LABELS.map((l) => (
            <span key={l} className="flex-1 text-center">
              {l}
            </span>
          ))}
        </div>
        <div className="absolute inset-y-[7%] left-[1.5%] flex flex-col text-[10px] font-semibold text-ink/70">
          {ROW_LABELS.map((l) => (
            <span key={l} className="flex flex-1 items-center">
              {l}
            </span>
          ))}
        </div>
        <fieldset
          className="absolute m-0 min-w-0 border-0 p-0 inset-[7%] grid grid-cols-5 grid-rows-5 gap-[3px]"
          aria-label="Pocket map, five by five pieces. Arrow keys move, Enter turns or flips."
        >
          {TILES.map((tile, cell) => {
            const loose = canOperate(state, cell);
            const turn = spun.current[cell] ?? 0;
            const flip = flipped.current[cell] ?? 0;
            return (
              <button
                key={tile.place + String(cell)}
                ref={(el) => {
                  buttons.current[cell] = el;
                }}
                type="button"
                tabIndex={cell === active ? 0 : -1}
                aria-label={label(state, cell, dest)}
                aria-disabled={!loose}
                data-loose={loose || undefined}
                className="map-cell"
                onClick={() => props.onOperate(cell)}
                onKeyDown={(e) => move(e, cell)}
                onFocus={() => {
                  props.onActive(cell);
                  props.onHover(cell);
                }}
                onBlur={() => props.onHover(null)}
                onMouseEnter={() => props.onHover(cell)}
                onMouseLeave={() => props.onHover(null)}
              >
                <span
                  className="piece"
                  style={{ transform: `rotate(${turn * 90}deg) rotateX(${flip * 180}deg)` }}
                >
                  {tile.faces.map((face, i) => (
                    <span key={face.seed} className={i ? "face under" : "face"}>
                      <MapFace
                        face={face}
                        landmark={i === 0 ? tile.landmark : undefined}
                        lit={lit.has(cell) && (state.face[cell] ?? 0) === i}
                      />
                      {tile.kind === "turn" ? <span className="rivets" /> : null}
                      {tile.kind === "flip" ? <span className="axle" /> : null}
                    </span>
                  ))}
                </span>
              </button>
            );
          })}
          <span
            aria-hidden="true"
            className="walker-mark"
            style={{
              left: pct(colOf(walkerAt) + 0.5, COLS),
              top: pct(rowOf(walkerAt) + 0.5, ROWS),
            }}
          />
          {dest !== null ? (
            <span
              aria-hidden="true"
              className="dest-mark"
              style={{ left: pct(colOf(dest) + 0.5, COLS), top: pct(rowOf(dest) + 0.5, ROWS) }}
            />
          ) : null}
        </fieldset>
      </div>
      <figcaption className="mt-2 flex items-center justify-between gap-3 text-[11px] text-cream/70">
        <span className="flex items-center gap-2">
          <span className="scale-bar" aria-hidden="true" />
          {SQUARE_METRES} m per square
        </span>
        <span>Little Nothing Fell · sheet 12</span>
        <span>
          <span aria-hidden="true">▲</span> North
        </span>
      </figcaption>
    </figure>
  );
}
