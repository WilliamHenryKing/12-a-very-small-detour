// Renderer, camera, light and the table the survey model sits on. Owns picking and walking.
import { gsap } from "gsap";
import {
  AgXToneMapping,
  Color,
  DirectionalLight,
  Fog,
  type Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  SRGBColorSpace,
  Vector2,
  WebGLRenderer,
} from "three";
import type { GameState } from "../game/types";
import { Board, cellCentre, SLAB } from "./board";
import { Opening } from "./opening";
import { COLORS } from "./palette";
import { destinationPin, traveller } from "./props";
import { disposeTree } from "./resources";
import { TRAIL_Y } from "./terrain";
import { WalkMotion } from "./walk";

export interface WorldOptions {
  onPick(cell: number): void;
  onHover(cell: number | null): void;
  onFirstFrame(): void;
  reducedMotion: boolean;
}

const STAND_Y = SLAB + TRAIL_Y;

export class World {
  readonly opening = new Opening();
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(32, 1, 0.1, 100);
  private readonly board = new Board();
  private readonly walker: Group = traveller();
  private readonly walking = new WalkMotion(this.walker, STAND_Y);
  private readonly pin: Group = destinationPin();
  private readonly sun = new DirectionalLight(COLORS.sun, 2.6);
  private readonly sky = new HemisphereLight(COLORS.sky, COLORS.ground, 1.15);
  private readonly ray = new Raycaster();
  private readonly observer: ResizeObserver;
  private pace: number;
  private hovered: number | null = null;
  private drawn = false;
  private down: { x: number; y: number; pointerId: number } | null = null;
  private interactive = true;
  private disposed = false;
  private lastFrame = 0;
  private drawSize = new Vector2();
  private pendingSize = new Vector2(1, 1);
  private readonly pinBase = STAND_Y + 0.5;

  constructor(
    private readonly host: HTMLElement,
    private readonly opts: WorldOptions,
  ) {
    this.pace = opts.reducedMotion ? 0 : 1;
    this.renderer = new WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    const r = this.renderer;
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.outputColorSpace = SRGBColorSpace;
    r.toneMapping = AgXToneMapping;
    r.toneMappingExposure = 1.15;
    r.shadowMap.enabled = true;
    r.shadowMap.type = PCFShadowMap;
    r.domElement.className = "block h-full w-full touch-none";
    r.domElement.setAttribute("aria-hidden", "true");
    host.appendChild(r.domElement);

    this.scene.background = new Color(COLORS.table);
    this.scene.fog = new Fog(COLORS.table, 14, 26);
    this.sun.position.set(-4.5, 8, 3.5);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.radius = 4;
    this.sun.shadow.bias = -0.0004;
    const s = this.sun.shadow.camera;
    s.left = -4.2;
    s.right = 4.2;
    s.top = 4.2;
    s.bottom = -4.2;
    s.near = 1;
    s.far = 22;
    this.scene.add(this.sun, this.sky);

    const table = new Mesh(
      new PlaneGeometry(60, 60),
      new MeshStandardMaterial({ color: COLORS.table, roughness: 1 }),
    );
    table.rotation.x = -Math.PI / 2;
    table.position.y = -0.3;
    table.receiveShadow = true;
    this.scene.add(table, this.board.group, this.walker, this.pin);

    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
    this.resize();
    const el = r.domElement;
    el.addEventListener("pointermove", this.onMove);
    el.addEventListener("pointerdown", this.onDown);
    el.addEventListener("pointerup", this.onUp);
    el.addEventListener("pointerleave", this.onLeave);
    el.addEventListener("pointercancel", this.onCancel);
    r.setAnimationLoop((t) => this.frame(t));
  }

  private resize() {
    if (this.disposed) return;
    const w = Math.max(1, this.host.clientWidth);
    const h = Math.max(1, this.host.clientHeight);
    this.pendingSize.set(w, h);
    const aspect = w / h;
    this.camera.aspect = aspect;
    this.camera.fov = 32;
    // Fit the board (radius ~3.4 on the table) inside whichever field of view is tighter.
    const vfov = (this.camera.fov * Math.PI) / 180;
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
    const dist = 3.15 / Math.sin(Math.min(vfov, hfov) / 2);
    const tilt = 0.95;
    this.camera.position.set(0, Math.sin(tilt) * dist, Math.cos(tilt) * dist + 0.1);
    this.camera.lookAt(0, -0.25, 0.25);
    this.camera.updateProjectionMatrix();
    this.opening.rememberPlayView(this.camera);
  }

  private frame(t: number) {
    if (this.disposed) return;
    // Resize and draw together: clearing a WebGL buffer in ResizeObserver can otherwise
    // erase the just-rendered frame during the opening's CSS viewport transition.
    if (!this.drawSize.equals(this.pendingSize)) {
      this.renderer.setSize(this.pendingSize.x, this.pendingSize.y, false);
      this.drawSize.copy(this.pendingSize);
    }
    const dt = this.lastFrame ? (t - this.lastFrame) / 1000 : 0;
    this.lastFrame = t;
    const bob = this.pace ? Math.sin(t / 380) * 0.04 : 0;
    this.pin.position.y = this.pinBase + bob;
    this.pin.rotation.y = this.pace ? t / 900 : 0;
    this.opening.update(this.camera, dt, this.opts.reducedMotion);
    this.renderer.render(this.scene, this.camera);
    if (!this.drawn) {
      this.drawn = true;
      this.opts.onFirstFrame();
    }
  }

  private cellAt(e: PointerEvent): number | null {
    if (!this.interactive || this.walking.active || this.disposed) return null;
    const rect = this.renderer.domElement.getBoundingClientRect();
    if (
      !rect.width ||
      !rect.height ||
      e.clientX < rect.left ||
      e.clientX > rect.right ||
      e.clientY < rect.top ||
      e.clientY > rect.bottom
    )
      return null;
    const p = new Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.ray.setFromCamera(p, this.camera);
    const hit = this.ray.intersectObjects(this.board.pickables(), true)[0];
    let o: Object3D | null = hit?.object ?? null;
    while (o && o.userData.cell === undefined) o = o.parent;
    return o ? (o.userData.cell as number) : null;
  }

  private onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const cell = this.cellAt(e);
    if (cell === this.hovered) return;
    this.hovered = cell;
    this.renderer.domElement.style.cursor = cell === null ? "" : "pointer";
    this.opts.onHover(cell);
  };

  private onDown = (e: PointerEvent) => {
    if (!this.interactive || this.walking.active || this.disposed || e.button !== 0 || !e.isPrimary)
      return;
    this.down = { x: e.clientX, y: e.clientY, pointerId: e.pointerId };
    this.renderer.domElement.setPointerCapture(e.pointerId);
  };

  private onUp = (e: PointerEvent) => {
    const d = this.down;
    if (d?.pointerId !== e.pointerId) return;
    this.down = null;
    if (this.renderer.domElement.hasPointerCapture(e.pointerId))
      this.renderer.domElement.releasePointerCapture(e.pointerId);
    if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8) return;
    const cell = this.cellAt(e);
    if (cell !== null) this.opts.onPick(cell);
  };

  private onLeave = () => {
    this.onCancel();
    if (this.hovered === null) return;
    this.hovered = null;
    this.renderer.domElement.style.cursor = "";
    this.opts.onHover(null);
  };

  private onCancel = () => {
    const id = this.down?.pointerId;
    this.down = null;
    if (id !== undefined && this.renderer.domElement.hasPointerCapture(id))
      this.renderer.domElement.releasePointerCapture(id);
  };

  /** Block picks and highlights during opening, walking, or an ending overlay. */
  setInteractive(interactive: boolean) {
    this.interactive = interactive;
    if (!interactive) {
      this.onLeave();
      this.board.setFocus(null);
    }
  }

  setReducedMotion(reduced: boolean) {
    if (this.disposed) return;
    this.opts.reducedMotion = reduced;
    this.pace = reduced ? 0 : 1;
    if (reduced) {
      this.board.finishAnimations();
      this.walking.finish();
      for (const tween of gsap.getTweensOf([
        this.sun.color,
        this.sky.color,
        this.sun.position,
        this.sun,
      ]))
        tween.totalProgress(1);
    }
  }

  /** Bring the model in line with the rules' state. */
  sync(state: GameState, lit: Set<number>, loose: (cell: number) => boolean, dest: number | null) {
    if (this.disposed) return;
    this.board.sync(state, lit, loose, this.pace);
    const here = cellCentre(state.at);
    if (!this.walking.active) this.walker.position.set(here.x, STAND_Y, here.z);
    this.pin.visible = dest !== null;
    if (dest !== null) {
      const c = cellCentre(dest);
      this.pin.position.x = c.x;
      this.pin.position.z = c.z;
    }
  }

  setFocus(cell: number | null) {
    if (!this.disposed) this.board.setFocus(this.interactive && !this.walking.active ? cell : null);
  }

  /** Walk the traveller square by square along a route. */
  walk(route: number[], onStep: (cell: number) => void): Promise<boolean> {
    if (this.disposed) return Promise.resolve(false);
    this.onLeave();
    this.board.setFocus(null);
    return this.walking.run(route, onStep, this.pace, this.board.remainingTime());
  }

  cancelWalk() {
    this.walking.cancel();
  }

  /** Evening falls over the fell for the ending, or lifts again on replay. */
  dusk(on: boolean) {
    if (this.disposed) return;
    gsap.killTweensOf([this.sun.color, this.sky.color, this.sun.position, this.sun]);
    const d = this.pace ? 2.4 : 0;
    const sun = new Color(on ? COLORS.dusk : COLORS.sun);
    const sky = new Color(on ? COLORS.duskSky : COLORS.sky);
    gsap.to(this.sun.color, { r: sun.r, g: sun.g, b: sun.b, duration: d });
    gsap.to(this.sky.color, { r: sky.r, g: sky.g, b: sky.b, duration: d });
    gsap.to(this.sun.position, { x: on ? -7 : -4.5, y: on ? 3.2 : 8, duration: d });
    gsap.to(this.sun, { intensity: on ? 3.2 : 2.6, duration: d });
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.opening.onDone = null;
    this.observer.disconnect();
    this.walking.cancel();
    this.board.cancelAnimations();
    gsap.killTweensOf([this.sun.color, this.sky.color, this.sun.position, this.sun]);
    this.onCancel();
    const el = this.renderer.domElement;
    el.removeEventListener("pointermove", this.onMove);
    el.removeEventListener("pointerdown", this.onDown);
    el.removeEventListener("pointerup", this.onUp);
    el.removeEventListener("pointerleave", this.onLeave);
    el.removeEventListener("pointercancel", this.onCancel);
    el.style.cursor = "";
    disposeTree(this.scene);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
