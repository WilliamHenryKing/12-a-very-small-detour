// Hypsometric tint images for the pocket map, sampled from the same heightfield as the model.
import { heightAt, isWater, terrace } from "../game/relief";
import type { Face } from "../game/types";

const MAP_TINTS = ["#b9c9a0", "#cad3a3", "#dcd9a8", "#e8dcae", "#efe3c2", "#f7f1e0"];
const WATER = "#9cc7d3";
const RES = 40;
const cache = new Map<string, string>();

/** A data URL of the face's terrace bands, or "" where canvas is unavailable. */
export function tintImage(face: Face): string {
  const key = `${face.seed}:${face.paths}:${face.terrain}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  let url = "";
  try {
    const canvas = document.createElement("canvas");
    canvas.width = RES;
    canvas.height = RES;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      for (let j = 0; j < RES; j++) {
        for (let i = 0; i < RES; i++) {
          const u = (i + 0.5) / RES - 0.5;
          const v = (j + 0.5) / RES - 0.5;
          const level = terrace(heightAt(face, u, v));
          ctx.fillStyle = isWater(face, u, v) ? WATER : (MAP_TINTS[level] ?? "#ccc");
          ctx.fillRect(i, j, 1, 1);
        }
      }
      url = canvas.toDataURL();
    }
  } catch {
    url = "";
  }
  cache.set(key, url);
  return url;
}
