# A VERY SMALL DETOUR

Status: v1 is playable from start to finish. A traveller crosses Little Nothing Fell over four authored legs: the ford, the village, round the tarn to the fire tower, and up to the summit. There is an ending card and a replay. The pocket map and the miniature relief model are drawn from one game state and one shared heightfield. When you turn or flip a hinged piece, it moves on both views, and the walkable trail from the traveller re-lights at once. The game is a single scene: three.js relief model, React HUD, and pure, tested rules. Nothing is deployed.

## How to play

- The traveller's current destination is marked by a vermilion pin on the model and a ring on the map.
- **Turn pieces** (brass rivets at the corners) rotate a quarter turn clockwise. **Flip pieces** (brass axles on their sides) turn over, and the underside has a different trail and terrain printed on it. Iron rivets or axles mean that hinge is still pinned. Hinges come loose leg by leg.
- A trail connects when two neighbouring pieces both print a trail end on their shared edge. Every square the traveller can reach right now lights up in vermilion on the map and the model.
- When the route reaches the destination, press **Set off along the trail**. The traveller walks it and the next leg begins.
- Controls: click or tap a piece on the map or on the model. On a keyboard, Tab reaches the map, arrow keys move between pieces, and Enter or Space turns or flips the focused piece.
- Sound starts on your first click, tap or key press. The **Sound** button (top right of the model) or the **M** key mutes and unmutes, and the choice is remembered. Audio pauses while the tab is hidden.
- The game honours `prefers-reduced-motion`: pieces snap instead of swinging, and the walk is instant.

## Structure

- `src/game/` holds the pure rules (`rules.ts`), the authored map and legs (`map.ts`), the trail bitmasks (`edges.ts`) and the shared relief heightfield (`relief.ts`).
- `src/scene/` holds the three.js survey model: terraced pieces, hinge hardware, props, lights and camera.
- `src/ui/` holds the React HUD: pocket map, leg card and ending.
- `tests/` has the rule and relief tests, including a breadth-first solver. It proves that every leg starts closed and can be solved, and that the full journey reaches the summit.

## Development

```sh
bun install --frozen-lockfile
bun run dev      # http://127.0.0.1:4522/
bun run check    # tsc, Biome, bun test, production build into dist/
bun run preview  # http://127.0.0.1:4622/
```

## Sound

Sound comes from free, licence-checked recordings, re-encoded to MP3 by `tools/audio/build-audio.sh`. That script downloads every source and rebuilds `public/audio/` (about 2 MB in total).

- **Music**: *Northumberland* plays softly, with a rest between plays. It dips under jingles.
- **Ambience**: a fell-wind bed and a birdsong bed, each cut into a seamless loop.
- **Cues**:
  - a wooden creak and settle for turning a piece
  - a flap and a wooden landing for flipping one
  - a latch click for a pinned piece
  - a pizzicato phrase when a route opens
  - a leather strap for setting off
  - footsteps on grass for each square walked
  - a pizzicato jingle on arrival and a steel jingle at the summit
  - a map fold for replay
  - a soft tick when moving around the map by keyboard

## Credits

All geometry, terrain, textures and symbols are generated procedurally in code. There are no external visual assets. The type is the system font stack. Libraries: three.js, React, GSAP and Tailwind CSS, each under its own licence.

Audio (all CC0 / public domain dedication, verified on each source page and in the bundled licence files):

| File(s) in `public/audio/` | Source | Author | Licence |
| --- | --- | --- | --- |
| `turn-1..3` (creak1–3), `flip-1..2` (bookFlip1–2), `pinned` (metalLatch), `set-off` (handleSmallLeather), `fold` (bookClose) | [RPG Audio](https://kenney.nl/assets/rpg-audio) | Kenney (kenney.nl) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| `settle` (impactWood_light_001), `land` (impactWood_medium_000), `step-0..4` (footstep_grass_000–004) | [Impact Sounds](https://kenney.nl/assets/impact-sounds) | Kenney (kenney.nl) | CC0 1.0 |
| `tick` (tick_002), `toggle` (click_002) | [Interface Sounds](https://kenney.nl/assets/interface-sounds) | Kenney (kenney.nl) | CC0 1.0 |
| `route-open` (PIZZI16), `arrive` (PIZZI07), `finale` (STEEL07) | [Music Jingles](https://kenney.nl/assets/music-jingles) | Kenney (kenney.nl) | CC0 1.0 |
| `music` | [Northumberland](https://opengameart.org/content/northumberland) | Spring Spring | CC0 1.0 |
| `wind` (park_ambience_wind), `birds` (park_ambience_birds), excerpts looped | [Park ambiences](https://opengameart.org/content/park-ambiences) | Thimras | CC0 1.0 |
