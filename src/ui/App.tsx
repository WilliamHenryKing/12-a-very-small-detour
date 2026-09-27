// Wiring: one game state drives both the pocket map and the survey model.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LEGS, TILES } from "../game/map";
import {
  arrive,
  canOperate,
  createState,
  currentLeg,
  findRoute,
  operate,
  reachable,
} from "../game/rules";
import type { GameState } from "../game/types";
import { World } from "../scene/world";
import { Ending } from "./Ending";
import { LegCard } from "./LegCard";
import { PocketMap } from "./PocketMap";

const reducedMotion =
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export function App({ onReady }: { onReady(): void }) {
  const host = useRef<HTMLDivElement>(null);
  const world = useRef<World | null>(null);
  const [state, setState] = useState<GameState>(createState);
  const [walking, setWalking] = useState(false);
  const [walkerAt, setWalkerAt] = useState(state.at);
  const [active, setActive] = useState(LEGS[0]?.unlock[0] ?? 0);
  const [note, setNote] = useState("");
  const [ending, setEnding] = useState(false);
  const [noGl, setNoGl] = useState(false);

  const route = useMemo(() => findRoute(state), [state]);
  const lit = useMemo(() => reachable(state), [state]);
  const dest = currentLeg(state)?.to ?? null;

  const busy = useRef(false);
  busy.current = walking || state.finished;
  const stateRef = useRef(state);
  stateRef.current = state;

  const tryOperate = useCallback((cell: number) => {
    const s = stateRef.current;
    if (busy.current) return;
    const tile = TILES[cell];
    if (!canOperate(s, cell)) {
      const why = tile?.kind === "fixed" ? "is glued to the map" : "is still pinned";
      setNote(`${tile?.place ?? "That piece"} ${why}.`);
      return;
    }
    setNote("");
    setState(operate(s, cell));
  }, []);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    try {
      world.current = new World(el, {
        onPick: (cell) => {
          setActive(cell);
          tryOperate(cell);
        },
        onHover: (cell) => world.current?.setFocus(cell),
        onFirstFrame: onReady,
        reducedMotion,
      });
    } catch {
      setNoGl(true);
      onReady();
    }
    return () => {
      world.current?.dispose();
      world.current = null;
    };
  }, [onReady, tryOperate]);

  useEffect(() => {
    world.current?.sync(state, lit, (c) => canOperate(state, c), state.finished ? null : dest);
  }, [state, lit, dest]);

  const setOff = async () => {
    if (!route || busy.current) return;
    setWalking(true);
    setNote("");
    const w = world.current;
    if (w) await w.walk(route, setWalkerAt);
    const next = arrive(state);
    setWalkerAt(next.at);
    setState(next);
    setWalking(false);
    if (next.finished) {
      w?.dusk(true);
      window.setTimeout(() => setEnding(true), reducedMotion ? 0 : 1400);
    } else {
      setActive(LEGS[next.leg]?.unlock[0] ?? active);
    }
  };

  const replay = () => {
    const fresh = createState();
    world.current?.dusk(false);
    setEnding(false);
    setState(fresh);
    setWalkerAt(fresh.at);
    setActive(LEGS[0]?.unlock[0] ?? 0);
    setNote("");
  };

  return (
    <div className="app-shell">
      <div ref={host} className="relative min-h-0 overflow-hidden">
        {noGl ? (
          <p className="absolute inset-0 grid place-items-center p-6 text-center text-cream/70">
            The relief model needs WebGL. The pocket map still works.
          </p>
        ) : null}
      </div>
      <aside className="panel" aria-label="Expedition kit">
        <LegCard state={state} route={route} note={note} />
        <PocketMap
          state={state}
          lit={lit}
          dest={state.finished ? null : dest}
          walkerAt={walkerAt}
          active={active}
          onActive={setActive}
          onHover={(c) => world.current?.setFocus(c)}
          onOperate={tryOperate}
        />
        <button
          type="button"
          className="btn-primary w-full"
          disabled={!route || walking}
          onClick={setOff}
        >
          {walking ? "Walking…" : route ? "Set off along the trail →" : "Find a way through first"}
        </button>
      </aside>
      {ending ? <Ending state={state} onReplay={replay} /> : null}
    </div>
  );
}
