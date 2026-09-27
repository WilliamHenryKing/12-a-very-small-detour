// Persistent sound toggle (also on the M key, wired in App).
import { useEffect, useState } from "react";
import { sound } from "../audio/sound";

export function MuteButton() {
  const [muted, setMuted] = useState(sound.muted);
  useEffect(() => sound.subscribe(setMuted), []);
  return (
    <button
      type="button"
      className="sound-toggle"
      aria-pressed={!muted}
      aria-label="Sound (M key)"
      title="Sound (M)"
      onClick={() => {
        sound.unlock();
        sound.toggle();
      }}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
        {muted ? (
          <path
            d="M16 9l5 6M21 9l-5 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        ) : (
          <path
            d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
        )}
      </svg>
      <span className="text-[12px] font-semibold">{muted ? "Sound off" : "Sound on"}</span>
    </button>
  );
}
