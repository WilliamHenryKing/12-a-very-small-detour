import { MathUtils, type PerspectiveCamera, Quaternion, Vector3 } from "three";

const query = new URLSearchParams(location.search);
export const wantsTitle = query.has("intro") || (!import.meta.env.DEV && !query.has("e2e"));
export type OpeningPhase = "title" | "glide" | "done";
const ease = (t: number) => {
  const x = MathUtils.clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
};

/** Survey the miniature from its valley floor, then settle over the working map. */
export class Opening {
  phase: OpeningPhase = wantsTitle ? "title" : "done";
  onDone: (() => void) | null = null;
  private time = 0;
  private playFov = 32;
  private playEye = new Vector3();
  private playRotation = new Quaternion();
  private titleEye = new Vector3();
  private titleRotation = new Quaternion();
  private from = new Vector3();
  private to = new Vector3();

  rememberPlayView(camera: PerspectiveCamera) {
    this.playFov = camera.fov;
    this.playEye.copy(camera.position);
    this.playRotation.copy(camera.quaternion);
  }

  begin(reduced: boolean) {
    if (this.phase !== "title") return;
    this.time = 0;
    this.phase = reduced ? "done" : "glide";
    if (reduced) this.onDone?.();
  }

  update(camera: PerspectiveCamera, dt: number, reduced: boolean) {
    camera.position.copy(this.playEye);
    camera.quaternion.copy(this.playRotation);
    camera.fov = this.playFov;
    camera.clearViewOffset();
    if (this.phase === "done") return;
    const veil = document.getElementById("arrival");
    if (!veil || veil.classList.contains("is-done")) this.time += Math.min(dt, 0.05);
    const phone = innerWidth < 700 && innerHeight > innerWidth;
    let weight = 1;
    if (this.phase === "title") {
      const t = reduced ? 1 : ease(this.time / 10);
      this.from.set(phone ? -3.5 : -5.8, 3.5, phone ? 13.8 : 8.5);
      this.to.set(phone ? 4.2 : 5.4, phone ? 8.5 : 8, phone ? 15.4 : 12.2);
      camera.position.copy(this.from).lerp(this.to, t);
      if (!reduced) camera.position.y += Math.sin(this.time * 0.19) * 0.08;
      camera.lookAt(0, 0.2, 0);
      this.titleEye.copy(camera.position);
      this.titleRotation.copy(camera.quaternion);
    } else {
      const t = reduced ? 1 : ease(this.time / 2.8);
      camera.position.lerp(this.titleEye, 1 - t);
      camera.quaternion.slerp(this.titleRotation, 1 - t);
      weight = 1 - t;
      if (t === 1) {
        this.phase = "done";
        this.onDone?.();
      }
    }
    if (phone) camera.fov = MathUtils.lerp(this.playFov, 44, weight);
    const width = camera.aspect * innerHeight;
    camera.setViewOffset(
      width,
      innerHeight,
      phone ? 0 : -width * 0.2 * weight,
      phone ? -innerHeight * 0.2 * weight : 0,
      width,
      innerHeight,
    );
  }
}
