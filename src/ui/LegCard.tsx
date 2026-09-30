// Leg heading, brief and the route status for the current leg.
import { gridRef } from "../game/edges";
import { LEGS, TILES } from "../game/map";
import type { GameState } from "../game/types";

interface Props {
  state: GameState;
  route: number[] | null;
  note: string;
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
  const status = route
    ? `Route open: ${route.length - 1} squares to ${dest}.`
    : `No way through to ${dest} (${gridRef(leg.to)}) yet.`;
  return (
    <section aria-labelledby="leg-title" className="space-y-1.5 lg:space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brass">
        Leg {state.leg + 1} of {LEGS.length}
      </p>
      <h1 id="leg-title" className="text-lg font-bold leading-tight text-cream sm:text-xl">
        {leg.title}
      </h1>
      <p className="text-[12.5px] leading-snug text-cream/80 lg:text-[13px]">{leg.brief}</p>
      <p
        id="route-status"
        aria-live="polite"
        aria-atomic="true"
        className={`text-[13px] font-semibold ${route ? "text-vermilion-soft" : "text-cream/70"}`}
      >
        {note ? `${note} ${status}` : status}
      </p>
    </section>
  );
}
