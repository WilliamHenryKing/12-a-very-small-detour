import * as THREE from "three";

type Resource = THREE.BufferGeometry | THREE.Material | THREE.Texture;
const caches = new Set<Resource>();

/** Module caches may disappear from the board temporarily when materials switch. */
export function shared(...resources: Resource[]) {
  for (const resource of resources) caches.add(resource);
}

/** Dispose an entire world once, including cached assets no longer attached to a mesh. */
export function disposeTree(root: THREE.Object3D) {
  const resources = new Set<Resource>(caches);
  root.traverse((object) => {
    if (object instanceof THREE.InstancedMesh) object.dispose();
    if (
      object instanceof THREE.DirectionalLight ||
      object instanceof THREE.SpotLight ||
      object instanceof THREE.PointLight
    )
      object.shadow.dispose();
    if (
      object instanceof THREE.Mesh ||
      object instanceof THREE.Line ||
      object instanceof THREE.Points ||
      object instanceof THREE.Sprite
    ) {
      resources.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        resources.add(material);
        for (const value of Object.values(material)) {
          if (value instanceof THREE.Texture) resources.add(value);
        }
      }
    }
  });
  for (const resource of resources) resource.dispose();
  root.clear();
}
