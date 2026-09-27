# A VERY SMALL DETOUR

Status: v1 is playable from start to finish. A traveller crosses Little Nothing Fell over four authored legs: the ford, the village, round the tarn to the fire tower, and up to the summit. There is an ending card and a replay. The pocket map and the miniature relief model are drawn from one game state and one shared heightfield. When you turn or flip a hinged piece, it moves on both views, and the walkable trail from the traveller re-lights at once. The game is a single scene: three.js relief model, React HUD, and pure, tested rules. Nothing is deployed.

## How to play

- The traveller's current destination is marked by a vermilion pin on the model and a ring on the map.
- **Turn pieces** (brass rivets at the corners) rotate a quarter turn clockwise. **Flip pieces** (brass axles on their sides) turn over, and the underside has a different trail and terrain printed on it. Iron rivets or axles mean that hinge is still pinned. Hinges come loose leg by leg.
- A trail connects when two neighbouring pieces both print a trail end on their shared edge. Every square the traveller can reach right now lights up in vermilion on the map and the model.
- When the route reaches the destination, press **Set off along the trail**. The traveller walks it and the next leg begins.
- Controls: click or tap a piece on the map or on the model. On a keyboard, Tab reaches the map, arrow keys move between pieces, and Enter or Space turns or flips the focused piece.
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

## Credits

All geometry, terrain, textures and symbols are generated procedurally in code. There are no external assets. The type is the system font stack. Libraries: three.js, React, GSAP, Tailwind CSS, all under their own licences.
