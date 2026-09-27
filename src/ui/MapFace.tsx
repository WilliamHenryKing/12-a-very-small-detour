// One printed side of a pocket-map piece: tint bands, contours, water, trees, trail, landmark.
import { memo } from "react";
import { DIRS, E, N, S, W } from "../game/edges";
import { contours, treeSpots } from "../game/relief";
import type { Face, Landmark } from "../game/types";
import { tintImage } from "./tint";

const END: Record<number, string> = { [N]: "0,-50", [E]: "50,0", [S]: "0,50", [W]: "-50,0" };
const INK = "#5b4330";

function contourPath(face: Face): string {
  const seg = contours(face);
  let d = "";
  for (let i = 0; i + 3 < seg.length; i += 4) {
    const p = seg.slice(i, i + 4).map((n) => (n * 100).toFixed(1));
    d += `M${p[0]} ${p[1]}L${p[2]} ${p[3]}`;
  }
  return d;
}

function Mark({ kind }: { kind: Landmark }) {
  switch (kind) {
    case "camp":
      return <path d="M-26,-9 L-20,-23 L-14,-9 Z" fill="#c9602a" stroke={INK} strokeWidth="1" />;
    case "ford":
      return (
        <g fill={INK}>
          <circle cx="-3" cy="-30" r="2.2" />
          <circle cx="3" cy="-25" r="2.2" />
          <circle cx="-1" cy="-20" r="2.2" />
        </g>
      );
    case "village":
      return (
        <g fill="#9c4a35" stroke={INK} strokeWidth="0.8">
          <rect x="-25" y="-25" width="9" height="7" />
          <rect x="13" y="-28" width="9" height="7" />
          <rect x="-30" y="8" width="9" height="7" />
          <rect x="-3" y="-34" width="9" height="7" />
        </g>
      );
    case "tower":
      return (
        <g stroke={INK} strokeWidth="1.2" fill="#eadfc8">
          <rect x="14" y="-26" width="12" height="12" />
          <path d="M14,-26 L26,-14 M26,-26 L14,-14" />
        </g>
      );
    case "summit":
      return (
        <g>
          <path d="M-25,-1 L-18,-14 L-11,-1 Z" fill={INK} />
          <text x="-18" y="11" textAnchor="middle" fontSize="8" fontWeight="700" fill={INK}>
            420
          </text>
        </g>
      );
  }
}

interface Props {
  face: Face;
  landmark?: Landmark | undefined;
  lit: boolean;
}

export const MapFace = memo(function MapFace({ face, landmark, lit }: Props) {
  const tint = tintImage(face);
  const trail = DIRS.filter((d) => face.paths & d)
    .map((d) => `M0,0 L${END[d]}`)
    .join(" ");
  return (
    <svg viewBox="-50 -50 100 100" className="block h-full w-full" aria-hidden="true">
      {tint ? (
        <image href={tint} x="-50" y="-50" width="100" height="100" preserveAspectRatio="none" />
      ) : (
        <rect x="-50" y="-50" width="100" height="100" fill="#d9d6a8" />
      )}
      <path d={contourPath(face)} stroke={INK} strokeOpacity="0.45" strokeWidth="0.7" fill="none" />
      <g fill="#3f6b48" stroke="#27432d" strokeWidth="0.6">
        {treeSpots(face).map((t) => (
          <circle key={`${t.u}:${t.v}`} cx={t.u * 100} cy={t.v * 100} r={2.4 * t.size} />
        ))}
      </g>
      {face.paths ? (
        <>
          <path d={trail} stroke="#fff8e6" strokeWidth={lit ? 8 : 6} strokeLinecap="round" />
          <path
            d={trail}
            stroke={lit ? "#d8402a" : "#7a4b2e"}
            strokeWidth={lit ? 4.5 : 2.6}
            strokeDasharray={lit ? undefined : "5 4"}
            strokeLinecap="round"
            fill="none"
          />
        </>
      ) : null}
      {landmark ? <Mark kind={landmark} /> : null}
    </svg>
  );
});
