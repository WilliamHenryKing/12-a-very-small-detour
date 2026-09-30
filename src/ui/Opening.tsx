import { useEffect, useRef } from "react";
import "./opening.css";

export function Title({ onBegin }: { onBegin(): void }) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => button.current?.focus(), []);
  return (
    <section className="opening" aria-labelledby="opening-title">
      <div className="opening-copy">
        <p className="opening-eyebrow rise">Little Nothing Fell · survey sheet 12</p>
        <h1 id="opening-title" className="rise">
          A very
          <br />
          <em>small detour.</em>
        </h1>
        <p className="opening-premise rise">
          The summit is right there.
          <br />
          The map has other ideas.
        </p>
        <div className="rise">
          <button ref={button} type="button" onClick={onBegin} className="opening-button">
            Unfold the map <span aria-hidden="true">↗</span>
          </button>
          <span className="enter-note">or press Enter</span>
        </div>
      </div>
      <p className="opening-coordinate" aria-hidden="true">
        1 square / 250 metres
        <br />
        Four stops. The long way round.
      </p>
    </section>
  );
}

export function Guide({
  step,
  routeOpen,
  firstLeg,
  onSkip,
}: {
  step: number;
  routeOpen: boolean;
  firstLeg: boolean;
  onSkip(): void;
}) {
  const steps = [
    [
      "Turn the landscape",
      `${firstLeg ? "Turn Plank Meadow, the piece with brass rivets." : "Turn a piece with brass rivets, or flip a brass axle."} Use the pocket map or the relief model. On a keyboard, arrow keys choose a square and Enter turns it.`,
    ],
    [
      "A trail needs two ends",
      routeOpen
        ? "The highlighted trail now joins your destination. Choose Set off along the trail to let the traveller test your route."
        : "Join the printed trail across each shared edge. Turn or flip the loose pieces until the route opens, then Set off along the trail.",
    ],
    [
      "Look underneath",
      "You reached the ford. Hay Flap has a brass axle: flip it to reveal a different trail. Turn Mill Turn to join it, then keep exploring.",
    ],
  ];
  return (
    <aside className="detour-guide" aria-label="Trail guide" aria-live="polite">
      <p className="opening-eyebrow">
        {step + 1}/3 · {steps[step]?.[0]}
      </p>
      <p>{steps[step]?.[1]}</p>
      <div className="guide-foot">
        <span aria-hidden="true">{steps.map((_, i) => (i === step ? "● " : "○ "))}</span>
        <button type="button" onClick={onSkip}>
          Skip the guide
        </button>
      </div>
    </aside>
  );
}
