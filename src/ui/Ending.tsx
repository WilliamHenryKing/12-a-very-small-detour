// The summit card: how far round the long way was, and a way to start over.
import { useEffect, useId, useRef } from "react";
import { SQUARE_METRES } from "../game/map";
import { crowFlies } from "../game/rules";
import type { GameState } from "../game/types";

const km = (squares: number) => `${((squares * SQUARE_METRES) / 1000).toFixed(1)} km`;

export function Ending({ state, onReplay }: { state: GameState; onReplay(): void }) {
  const button = useRef<HTMLButtonElement>(null);
  const description = useId();
  useEffect(() => button.current?.focus(), []);
  return (
    <div className="ending-veil fixed inset-0 z-20 grid place-items-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ending-title"
        aria-describedby={description}
        className="ending-card w-full max-w-sm rounded-xl p-6 text-ink shadow-2xl"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/60">
          Summit of Little Nothing · 420 m
        </p>
        <h2 id="ending-title" className="mt-1 text-2xl font-bold leading-tight">
          A very small detour
        </h2>
        <div id={description}>
          <p className="mt-3 text-[14px] leading-snug">
            The cairn is {km(crowFlies())} from camp as the crow flies. You walked{" "}
            {km(state.walked)}, by the ford, the village, the tarn and the tower, and turned{" "}
            {state.moves} hinges on the way.
          </p>
          <p className="mt-2 text-[14px] leading-snug">
            The sun is going down over Wether Crag. It was worth the long way round.
          </p>
        </div>
        <button
          ref={button}
          type="button"
          onClick={onReplay}
          onKeyDown={(e) => {
            if (e.key !== "Tab" || e.ctrlKey || e.metaKey || e.altKey) return;
            e.preventDefault();
            button.current?.focus();
          }}
          className="btn-primary mt-5 w-full"
        >
          Fold the map and start again
        </button>
      </div>
    </div>
  );
}
