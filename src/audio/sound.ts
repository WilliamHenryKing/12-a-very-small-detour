// Sound desk: music, an ambient bed of fell wind and birdsong, and one-shot cues.
// Files are fetched after the first frame and decoded on the first user gesture.
// Muting persists; audio suspends while the tab is hidden.

export type Cue =
  | "turn"
  | "settle"
  | "flip"
  | "land"
  | "pinned"
  | "set-off"
  | "step"
  | "fold"
  | "tick"
  | "toggle"
  | "route-open"
  | "arrive"
  | "finale";

const VARIANTS: Record<Cue, readonly string[]> = {
  turn: ["turn-1", "turn-2", "turn-3"],
  settle: ["settle"],
  flip: ["flip-1", "flip-2"],
  land: ["land"],
  pinned: ["pinned"],
  "set-off": ["set-off"],
  step: ["step-0", "step-1", "step-2", "step-3", "step-4"],
  fold: ["fold"],
  tick: ["tick"],
  toggle: ["toggle"],
  "route-open": ["route-open"],
  arrive: ["arrive"],
  finale: ["finale"],
};

const LEVEL: Record<Cue, number> = {
  turn: 0.7,
  settle: 0.45,
  flip: 0.8,
  land: 0.55,
  pinned: 0.6,
  "set-off": 0.7,
  step: 0.35,
  fold: 0.7,
  tick: 0.25,
  toggle: 0.4,
  "route-open": 0.6,
  arrive: 0.65,
  finale: 0.8,
};

const MUSIC_LEVEL = 0.32;
const MUSIC_REST_MS = 22_000;
const BEDS = { wind: 0.5, birds: 0.35 } as const;
const STORE_KEY = "a-very-small-detour:muted";
const ALL = [...new Set(Object.values(VARIANTS).flat()), "music", ...Object.keys(BEDS)];

const url = (name: string) => `${import.meta.env.BASE_URL}audio/${name}.mp3`;

function readMuted(): boolean {
  try {
    return localStorage.getItem(STORE_KEY) === "1";
  } catch {
    return false;
  }
}

class SoundDesk {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private sfx: GainNode | null = null;
  private beds: GainNode | null = null;
  private readonly files = new Map<string, Promise<ArrayBuffer | null>>();
  private readonly decoded = new Map<string, Promise<AudioBuffer | null>>();
  private readonly listeners = new Set<(muted: boolean) => void>();
  private musicTimer = 0;
  muted = readMuted();

  constructor() {
    if (typeof document === "undefined") return;
    document.addEventListener("visibilitychange", () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend();
      else void this.ctx.resume();
    });
  }

  /** Start downloading every file; nothing is decoded or played yet. */
  prefetch() {
    for (const name of ALL) {
      if (this.files.has(name)) continue;
      this.files.set(
        name,
        fetch(url(name))
          .then((r) => (r.ok ? r.arrayBuffer() : null))
          .catch(() => null),
      );
    }
  }

  /** Called from the first user gesture: open the audio context and start the beds. */
  unlock() {
    if (this.ctx || typeof AudioContext === "undefined") return;
    this.prefetch();
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(ctx.destination);
    const bus = (level: number) => {
      const g = ctx.createGain();
      g.gain.value = level;
      g.connect(this.master as GainNode);
      return g;
    };
    this.sfx = bus(1);
    this.beds = bus(1);
    this.music = bus(MUSIC_LEVEL);
    for (const name of ALL) this.decode(name);
    for (const [name, level] of Object.entries(BEDS)) void this.startBed(name, level);
    void this.playMusic();
  }

  private decode(name: string): Promise<AudioBuffer | null> {
    const hit = this.decoded.get(name);
    if (hit) return hit;
    const ctx = this.ctx;
    const job = (this.files.get(name) ?? Promise.resolve(null)).then((data) =>
      ctx && data ? ctx.decodeAudioData(data.slice(0)).catch(() => null) : null,
    );
    this.decoded.set(name, job);
    return job;
  }

  private async startBed(name: string, level: number) {
    const buffer = await this.decode(name);
    const ctx = this.ctx;
    if (!buffer || !ctx || !this.beds) return;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    // Skip the MP3 encoder's priming silence so the loop seam stays closed.
    src.loopStart = 0.05;
    src.loopEnd = buffer.duration - 0.03;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(level, ctx.currentTime + 4);
    src.connect(g).connect(this.beds);
    src.start(ctx.currentTime, Math.random() * buffer.duration * 0.8);
  }

  private async playMusic() {
    const buffer = await this.decode("music");
    const ctx = this.ctx;
    if (!buffer || !ctx || !this.music) return;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.music);
    src.start(ctx.currentTime + 1.5);
    src.onended = () => {
      window.clearTimeout(this.musicTimer);
      this.musicTimer = window.setTimeout(() => void this.playMusic(), MUSIC_REST_MS);
    };
  }

  /** Play a cue now or after `delay` seconds; cues still decoding play if they are ready soon. */
  play(cue: Cue, delay = 0) {
    const ctx = this.ctx;
    const out = this.sfx;
    if (!ctx || !out) return;
    const names = VARIANTS[cue];
    const name = names[Math.floor(Math.random() * names.length)] ?? names[0] ?? "";
    const asked = ctx.currentTime;
    void this.decode(name).then((buffer) => {
      if (!buffer || ctx.currentTime - asked > 0.35) return;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.playbackRate.value = cue === "step" || cue === "turn" ? 0.94 + Math.random() * 0.12 : 1;
      const g = ctx.createGain();
      g.gain.value = LEVEL[cue];
      src.connect(g).connect(out);
      src.start(Math.max(ctx.currentTime, asked + delay));
      if (cue === "arrive" || cue === "finale" || cue === "route-open") this.duck(asked + delay);
    });
  }

  /** Dip the music under a jingle, then bring it back. */
  private duck(at: number) {
    const g = this.music?.gain;
    if (!g) return;
    g.cancelScheduledValues(at);
    g.setTargetAtTime(MUSIC_LEVEL * 0.35, at, 0.08);
    g.setTargetAtTime(MUSIC_LEVEL, at + 1.6, 0.6);
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    try {
      localStorage.setItem(STORE_KEY, muted ? "1" : "0");
    } catch {
      // Storage unavailable: the choice lasts for this visit only.
    }
    const ctx = this.ctx;
    if (ctx && this.master) this.master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.08);
    for (const fn of this.listeners) fn(muted);
    if (!muted) this.play("toggle");
  }

  toggle() {
    this.setMuted(!this.muted);
  }

  subscribe(fn: (muted: boolean) => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
}

export const sound = new SoundDesk();
