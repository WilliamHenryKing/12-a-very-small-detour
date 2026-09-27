// Leg heading, brief, first-time hints and the route status for the current leg.
import { gridRef } from "../game/edges";
import { LEGS, TILES } from "../game/map";
import type { GameState } from "../game/types";

interface Props {
  state: GameState;
  route: number[] | null;
  note: string;
}

function hint(state: GameState): string | null {
  if (state.leg === 0 && state.moves === 0) {
    return "Tap a piece with brass rivets, here or on the model, to turn it a quarter. On a keyboard, arrow keys move around the map and Enter turns.";
  }
  if (state.leg === 1 && state.face.every((f) => f === 0)) {
    return "Pieces with brass axles flip over. Their underside has a different trail printed on it.";
  }
  return null;
}

export function LegCard({ state, route, note }: Props) {
  const leg = LEGS[state.leg];
  if (!leg) {
    return (
      <section aria-live="polite">
        <h1 className="text-lg font-bold leading-tight text-cream sm:text-xl">Summit reached</h1>
        <p className="text-[13px] text-cream/80">Evening comes on over Little Nothing Fell.</p>
      </section>
    );
  }
  const dest = TILES[leg.to]?.place ?? "";
  const tip = hint(state);
  const status = route
    ? `Route open: ${route.length - 1} squares to ${dest}.`
    : `No way through to ${dest} (${gridRef(leg.to)}) yet.`;
  return (
    <section aria-labelledby="leg-title" className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brass">
        Leg {state.leg + 1} of {LEGS.length}
      </p>
      <h1 id="leg-title" className="text-lg font-bold leading-tight text-cream sm:text-xl">
        {leg.title}
      </h1>
      <p className="text-[13px] leading-snug text-cream/80">{leg.brief}</p>
      {tip ? (
        <p className="rounded-md border border-brass/50 bg-brass/10 px-3 py-2 text-[12.5px] leading-snug text-cream">
          {tip}
        </p>
      ) : null}
      <p
        aria-live="polite"
        className={`text-[13px] font-semibold ${route ? "text-vermilion-soft" : "text-cream/70"}`}
      >
        {note || status}
      </p>
    </section>
  );
}
