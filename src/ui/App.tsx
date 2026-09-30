// Wiring: one game state drives both the pocket map and the survey model.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { sound } from "../audio/sound";
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
import { type OpeningPhase, wantsTitle } from "../scene/opening";
import { World } from "../scene/world";
import { Ending } from "./Ending";
import { focusMapCell } from "./focus";
import { LegCard } from "./LegCard";
import { MuteButton } from "./MuteButton";
import { Guide, Title } from "./Opening";
import { PocketMap } from "./PocketMap";

const GUIDE_KEY = "very-small-detour:guide-v1";
const initialGuide = () => {
  try {
    return localStorage.getItem(GUIDE_KEY) ? -1 : 0;
  } catch {
    return 0;
  }
};

export function App({ onReady }: { onReady(): void }) {
  const [reducedMotion, setReducedMotion] = useState(
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const motion = useRef(reducedMotion);
  motion.current = reducedMotion;
  const host = useRef<HTMLDivElement>(null);
  const world = useRef<World | null>(null);
  const panel = useRef<HTMLElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const alive = useRef(true);
  const journey = useRef(0);
  const endingTimer = useRef<number | undefined>(undefined);
  const [state, setState] = useState<GameState>(createState);
  const [walking, setWalking] = useState(false);
  const [walkerAt, setWalkerAt] = useState(state.at);
  const [active, setActive] = useState(LEGS[0]?.unlock[0] ?? 0);
  const [note, setNote] = useState("");
  const [ending, setEnding] = useState(false);
  const [noGl, setNoGl] = useState(false);
  const [opening, setOpening] = useState<OpeningPhase>(wantsTitle ? "title" : "done");
  const [guide, setGuide] = useState(initialGuide);
  const guideRef = useRef(guide);
  guideRef.current = guide;
  const skipGuide = useCallback(() => {
    setGuide(-1);
    try {
      localStorage.setItem(GUIDE_KEY, "seen");
    } catch {
      /* Optional storage. */
    }
  }, []);

  const route = useMemo(() => findRoute(state), [state]);
  const lit = useMemo(() => reachable(state), [state]);
  const dest = currentLeg(state)?.to ?? null;

  const busy = useRef(false);
  busy.current = opening !== "done" || walking || state.finished;
  const stateRef = useRef(state);
  stateRef.current = state;

  const tryOperate = useCallback(
    (cell: number) => {
      const s = stateRef.current;
      if (busy.current) return;
      const tile = TILES[cell];
      if (!canOperate(s, cell)) {
        sound.play("pinned");
        const why = tile?.kind === "fixed" ? "is glued to the map" : "is still pinned";
        setNote(`${tile?.place ?? "That piece"} ${why}.`);
        return;
      }
      setNote("");
      const next = operate(s, cell);
      stateRef.current = next;
      if (guideRef.current === 2 && tile?.kind === "flip") skipGuide();
      else setGuide((g) => (g === 0 ? 1 : g));
      const lag = motion.current ? 0.05 : 1;
      if (tile?.kind === "flip") {
        sound.play("flip");
        sound.play("land", 0.7 * lag);
      } else {
        sound.play("turn");
        sound.play("settle", 0.4 * lag);
      }
      if (!findRoute(s) && findRoute(next)) sound.play("route-open", 0.55 * lag);
      setState(next);
    },
    [skipGuide],
  );

  useEffect(() => {
    const el = panel.current;
    const root = shell.current;
    if (!el || !root) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      const side = rect.left > innerWidth * 0.25 && rect.height > innerHeight * 0.6;
      root.style.setProperty("--kit-width", `${side ? innerWidth - rect.left : 0}px`);
      root.style.setProperty("--kit-height", `${side ? 0 : innerHeight - rect.top}px`);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener("resize", measure);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  // Audio starts on the first gesture; M toggles sound anywhere.
  useEffect(() => {
    const unlock = () => sound.unlock();
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() !== "m" ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        e.repeat ||
        e.defaultPrevented
      )
        return;
      const target = e.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      )
        return;
      sound.unlock();
      sound.toggle();
    };
    window.addEventListener("pointerdown", unlock, { capture: true, once: true });
    window.addEventListener("keydown", unlock, { capture: true, once: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", unlock, { capture: true });
      window.removeEventListener("keydown", unlock, { capture: true });
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    alive.current = true;
    try {
      world.current = new World(el, {
        onPick: (cell) => {
          setActive(cell);
          tryOperate(cell);
        },
        onHover: (cell) => world.current?.setFocus(cell),
        onFirstFrame: () => {
          onReady();
          sound.prefetch();
        },
        reducedMotion: motion.current,
      });
      world.current.setInteractive(!wantsTitle);
      world.current.opening.onDone = () => {
        setOpening("done");
        world.current?.setInteractive(true);
        focusMapCell(LEGS[0]?.unlock[0] ?? 0);
      };
    } catch {
      setNoGl(true);
      onReady();
    }
    return () => {
      alive.current = false;
      journey.current++;
      window.clearTimeout(endingTimer.current);
      world.current?.dispose();
      world.current = null;
    };
  }, [onReady, tryOperate]);

  useEffect(() => {
    world.current?.sync(state, lit, (c) => canOperate(state, c), state.finished ? null : dest);
  }, [state, lit, dest]);

  useEffect(() => {
    world.current?.setInteractive(opening === "done" && !walking && !state.finished);
  }, [opening, walking, state.finished]);

  useEffect(() => {
    world.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  const setOff = async () => {
    const start = stateRef.current;
    const path = findRoute(start);
    if (!path || busy.current) return;
    busy.current = true;
    const run = ++journey.current;
    setWalking(true);
    setNote("");
    sound.play("set-off");
    const w = world.current;
    const step = (cell: number) => {
      setWalkerAt(cell);
      sound.play("step");
    };
    const completed = w ? await w.walk(path, step) : true;
    if (!alive.current || run !== journey.current) return;
    if (!completed) {
      setWalking(false);
      busy.current = false;
      w?.sync(
        start,
        reachable(start),
        (cell) => canOperate(start, cell),
        currentLeg(start)?.to ?? null,
      );
      setWalkerAt(start.at);
      return;
    }
    const next = arrive(start);
    stateRef.current = next;
    setWalkerAt(next.at);
    setState(next);
    setWalking(false);
    busy.current = next.finished;
    if (guideRef.current >= 0) {
      if (next.leg === 1) setGuide(2);
      else skipGuide();
    }
    sound.play(next.finished ? "finale" : "arrive");
    if (next.finished) {
      w?.dusk(true);
      endingTimer.current = window.setTimeout(
        () => {
          if (alive.current && run === journey.current) setEnding(true);
        },
        motion.current ? 0 : 1400,
      );
    } else {
      const cell = LEGS[next.leg]?.unlock[0] ?? active;
      setActive(cell);
      focusMapCell(cell);
    }
  };

  const replay = () => {
    journey.current++;
    window.clearTimeout(endingTimer.current);
    const fresh = createState();
    stateRef.current = fresh;
    busy.current = false;
    sound.play("fold");
    world.current?.dusk(false);
    setEnding(false);
    setState(fresh);
    setWalkerAt(fresh.at);
    setActive(LEGS[0]?.unlock[0] ?? 0);
    setNote("");
    focusMapCell(LEGS[0]?.unlock[0] ?? 0);
  };

  return (
    <div ref={shell} className="app-shell" data-opening={opening}>
      <div
        ref={host}
        className="model-host relative min-h-0 overflow-hidden"
        inert={opening !== "done" || ending}
      >
        {noGl ? (
          <p className="absolute inset-0 grid place-items-center p-6 text-center text-cream/70">
            The relief model needs WebGL. The pocket map still works.
          </p>
        ) : null}
        <MuteButton />
      </div>
      <aside
        ref={panel}
        className="panel"
        aria-label="Expedition kit"
        inert={opening !== "done" || ending}
      >
        <LegCard state={state} route={route} note={note} />
        <PocketMap
          state={state}
          lit={lit}
          dest={state.finished ? null : dest}
          walkerAt={walkerAt}
          active={active}
          disabled={walking || state.finished}
          onActive={setActive}
          onHover={(c) => world.current?.setFocus(c)}
          onOperate={tryOperate}
          onNudge={() => sound.play("tick")}
        />
        <button
          type="button"
          className="btn-primary w-full"
          aria-describedby="route-status"
          disabled={!route || busy.current}
          onClick={setOff}
        >
          {walking ? "Walking…" : route ? "Set off along the trail →" : "Find a way through first"}
        </button>
      </aside>
      {opening === "title" && (
        <Title
          onBegin={() => {
            sound.play("fold");
            setOpening(reducedMotion || noGl ? "done" : "glide");
            if (world.current) world.current.opening.begin(reducedMotion);
            else focusMapCell(LEGS[0]?.unlock[0] ?? 0);
          }}
        />
      )}
      {opening === "done" && !state.finished && guide >= 0 && (
        <Guide step={guide} routeOpen={!!route} firstLeg={state.leg === 0} onSkip={skipGuide} />
      )}
      {opening === "done" && !state.finished && guide < 0 && (
        <button
          type="button"
          className="guide-replay"
          aria-label="Replay the guide"
          onClick={() => setGuide(0)}
        >
          ?
        </button>
      )}
      {ending ? <Ending state={state} onReplay={replay} /> : null}
    </div>
  );
}
