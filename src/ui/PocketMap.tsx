// The pocket map: every piece is a keyboard-reachable button mirroring the model's state.
import { type KeyboardEvent, useRef } from "react";
import { COLS, colOf, ROWS, rowOf } from "../game/edges";
import { SQUARE_METRES, TILES } from "../game/map";
import { canOperate } from "../game/rules";
import type { GameState } from "../game/types";
import { MapFace } from "./MapFace";
import { advancePhase, mapLabel, nextMapCell } from "./mapPresentation";

interface Props {
  state: GameState;
  lit: Set<number>;
  dest: number | null;
  walkerAt: number;
  active: number;
  disabled?: boolean;
  onActive(cell: number): void;
  onHover(cell: number | null): void;
  onOperate(cell: number): void;
  onNudge(): void;
}

const COL_LABELS = Array.from({ length: COLS }, (_, c) => String.fromCharCode(65 + c));
const ROW_LABELS = Array.from({ length: ROWS }, (_, r) => String(r + 1));
const pct = (n: number, of: number) => `${(n / of) * 100}%`;

export function PocketMap(props: Props) {
  const { state, lit, dest, walkerAt, active, disabled = false } = props;
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  // Accumulated turns so the paper always swings forward, like the model.
  const spun = useRef<number[]>(TILES.map(() => 0));
  const flipped = useRef<number[]>(TILES.map(() => 0));
  TILES.forEach((_, c) => {
    const s = spun.current;
    const f = flipped.current;
    s[c] = advancePhase(s[c] ?? 0, state.rot[c] ?? 0, 4);
    f[c] = advancePhase(f[c] ?? 0, state.face[c] ?? 0, 2);
  });

  const move = (e: KeyboardEvent, cell: number) => {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    const next = nextMapCell(cell, e.key);
    if (next === null) return;
    e.preventDefault();
    if (next !== cell) props.onNudge();
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
          aria-label="Pocket map, five by five pieces. Arrow keys move, Enter or Space turns or flips."
        >
          {TILES.map((tile, cell) => {
            const loose = !disabled && canOperate(state, cell);
            const turn = spun.current[cell] ?? 0;
            const flip = flipped.current[cell] ?? 0;
            return (
              <button
                key={tile.place + String(cell)}
                ref={(el) => {
                  buttons.current[cell] = el;
                }}
                type="button"
                data-cell={cell}
                tabIndex={cell === active ? 0 : -1}
                aria-label={mapLabel(state, cell, dest, walkerAt, disabled, lit.has(cell))}
                aria-disabled={!loose}
                aria-keyshortcuts={loose ? "Enter Space" : undefined}
                data-loose={loose || undefined}
                className="map-cell"
                onClick={() => {
                  if (!disabled) props.onOperate(cell);
                }}
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
          {SQUARE_METRES} m / square
        </span>
        <span className="hidden sm:inline">Little Nothing Fell · sheet 12</span>
        <span>
          <span aria-hidden="true">▲</span> North
        </span>
      </figcaption>
    </figure>
  );
}
