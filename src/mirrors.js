import {PlaneGeometry, Vector3} from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';

import {MAX_MIRRORS} from './materials.js';
const NORMALS = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
const FORWARD = new Vector3(0, 0, 1);

export class SceneMirrors {
  #planes = new Map();
  #geometry = new PlaneGeometry(1, 1);
  #reflecting = false;

  update(meshes, cubes, neutral) {
    const used = new Set();
    if (!neutral) for (const [index, cube] of cubes.entries()) {
      if (cube.volume) continue;
      for (const [face, material] of (cube.materials ?? []).entries()) {
        if (used.size >= MAX_MIRRORS) break;
        if (material?.mode !== 'mirror' || (cube.opacity?.[face] ?? 1) !== 1) continue;
        const key = cube.id + ':' + face;
        used.add(key);
        let mirror = this.#planes.get(key);
        if (!mirror) {
          const normal = new Vector3(...NORMALS[face]);
          mirror = new Reflector(this.#geometry, {textureWidth: 256, textureHeight: 256, multisample: 0, clipBias: .003});
          mirror.position.copy(normal).multiplyScalar(.501);
          mirror.quaternion.setFromUnitVectors(FORWARD, normal);
          const render = mirror.onBeforeRender;
          mirror.onBeforeRender = (renderer, scene, camera) => {
            if (this.#reflecting || camera.isOrthographicCamera) return;
            this.#reflecting = true;
            try { render.call(mirror, renderer, scene, camera); }
            finally { this.#reflecting = false; }
          };
          this.#planes.set(key, mirror);
        }
        if (mirror.parent !== meshes[index]) meshes[index].add(mirror);
      }
    }
    for (const [key, mirror] of this.#planes) if (!used.has(key)) {
      mirror.removeFromParent();
      mirror.dispose();
      this.#planes.delete(key);
    }
  }

  setProjection(camera) {
    for (const mirror of this.#planes.values()) mirror.visible = !camera.isOrthographicCamera;
  }
}
