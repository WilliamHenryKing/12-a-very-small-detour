import { expect, test } from "bun:test";
import {
  BoxGeometry,
  DirectionalLight,
  Group,
  InstancedMesh,
  Mesh,
  MeshStandardMaterial,
  Texture,
  WebGLRenderTarget,
} from "three";
import { disposeTree, shared } from "../src/scene/resources";

test("world disposal frees shared, detached, instanced and shadow resources once", () => {
  const geometry = new BoxGeometry();
  const texture = new Texture();
  const material = new MeshStandardMaterial({ map: texture });
  const detachedMaterial = new MeshStandardMaterial();
  const instances = new InstancedMesh(geometry, material, 2);
  const sun = new DirectionalLight();
  const shadow = new WebGLRenderTarget(8, 8);
  sun.shadow.map = shadow;
  const group = new Group();
  group.add(new Mesh(geometry, [material, material]), instances, sun);
  shared(detachedMaterial);
  const resources: { addEventListener(type: "dispose", listener: () => void): void }[] = [
    geometry,
    texture,
    material,
    detachedMaterial,
    instances,
    shadow,
  ];
  const disposed = resources.map(() => 0);
  resources.forEach((resource, i) => {
    resource.addEventListener("dispose", () => {
      disposed[i] = (disposed[i] ?? 0) + 1;
    });
  });

  disposeTree(group);

  expect(disposed).toEqual([1, 1, 1, 1, 1, 1]);
  expect(group.children).toHaveLength(0);
});
