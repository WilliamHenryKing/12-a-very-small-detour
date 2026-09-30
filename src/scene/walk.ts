import { gsap } from "gsap";
import type { Group } from "three";
import { cellCentre } from "./board";

/** One owned walk, including its wait for the hinged terrain to settle. */
export class WalkMotion {
  private timeline: gsap.core.Timeline | null = null;
  private settle: ((completed: boolean) => void) | null = null;

  constructor(
    private readonly walker: Group,
    private readonly standY: number,
  ) {}

  get active() {
    return this.timeline !== null;
  }

  run(
    route: readonly number[],
    onStep: (cell: number) => void,
    pace: number,
    delay = 0,
  ): Promise<boolean> {
    this.cancel();
    if (route.length < 2) return Promise.resolve(true);
    const step = 0.42 * pace;
    if (pace === 0) {
      for (let i = 1; i < route.length; i++) {
        const cell = route[i];
        if (cell === undefined) continue;
        const from = cellCentre(route[i - 1] ?? cell);
        const to = cellCentre(cell);
        this.walker.rotation.y = Math.atan2(to.x - from.x, to.z - from.z);
        this.walker.position.set(to.x, this.standY, to.z);
        onStep(cell);
      }
      return Promise.resolve(true);
    }
    return new Promise((resolve) => {
      this.settle = resolve;
      const tl = gsap.timeline({
        delay,
        onComplete: () => {
          this.timeline = null;
          this.settle = null;
          this.walker.position.y = this.standY;
          resolve(true);
        },
      });
      this.timeline = tl;
      for (let i = 1; i < route.length; i++) {
        const cell = route[i];
        if (cell === undefined) continue;
        const from = cellCentre(route[i - 1] ?? cell);
        const to = cellCentre(cell);
        const heading = Math.atan2(to.x - from.x, to.z - from.z);
        tl.set(this.walker.rotation, { y: heading });
        tl.to(this.walker.position, { x: to.x, z: to.z, duration: step, ease: "none" });
        tl.to(
          this.walker.position,
          { y: this.standY + 0.06, duration: step / 2, yoyo: true, repeat: 1, ease: "sine.out" },
          "<",
        );
        // The pocket mark and footstep sound describe an arrival, not a future square.
        tl.call(() => onStep(cell));
      }
    });
  }

  /** Finish the current path when reduced motion becomes enabled mid-walk. */
  finish() {
    this.timeline?.totalProgress(1);
  }

  cancel() {
    this.timeline?.kill();
    this.timeline = null;
    this.walker.position.y = this.standY;
    const settle = this.settle;
    this.settle = null;
    settle?.(false);
  }
}
