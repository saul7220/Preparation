/* Cinematic scenery in the loaded DEM's coordinate system. All assets are original. */
import * as THREE from 'three';
import { sampleGroundY } from './raycast.js';
import { createIntroAstronaut } from './intro-actor.js';
import { state } from './state.js';

export function createIntroStage(origin) {
  const group = new THREE.Group(); group.position.copy(origin);
  const actor = createIntroAstronaut(); group.add(actor.root);
  const hull = new THREE.MeshStandardMaterial({ color: 0x414949, roughness: 0.72, metalness: 0.65 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x10181b, roughness: 0.8 });
  const edge = new THREE.MeshStandardMaterial({ color: 0xaab2ac, roughness: 0.4, metalness: 0.8 });
  const light = new THREE.MeshBasicMaterial({ color: 0xd7e8d7 });
  const amber = new THREE.MeshBasicMaterial({ color: 0xf9a25b });
  const box = (parent, size, pos, mat) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
    m.position.set(...pos); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  };
  const cabin = new THREE.Group(); group.add(cabin);
  box(cabin, [3.5, 0.12, 5], [0, -0.09, -1.65], hull);
  box(cabin, [3.5, 0.12, 5], [0, 2.9, -1.65], dark);
  box(cabin, [3.5, 3, 0.15], [0, 1.4, -4.1], dark);
  for (const side of [-1, 1]) {
    box(cabin, [0.12, 3, 5], [side * 1.72, 1.4, -1.65], dark);
    for (let i = 0; i < 5; i++) {
      box(cabin, [0.14, 2.8, 0.08], [side * 1.63, 1.4, 0.65 - i * 1.05], hull);
      box(cabin, [0.025, 1.55, 0.035], [side * 1.54, 1.55, 0.6 - i * 1.05], light);
    }
    box(cabin, [0.4, 3.1, 0.4], [side * 1.5, 1.45, 0.95], hull);
    box(cabin, [0.035, 2.7, 0.035], [side * 1.28, 1.4, 1.18], amber);
  }
  box(cabin, [3.35, 0.35, 0.4], [0, 2.85, 0.95], hull);
  for (let i = 0; i < 21; i++) box(cabin, [2.9, 0.008, 0.025], [0, -0.023, -3.9 + i * 0.23], edge);
  const doors = [-1, 1].map(side => {
    const door = new THREE.Group(); cabin.add(door);
    box(door, [1.3, 2.7, 0.14], [side * 0.65, 1.35, 0.95], hull);
    box(door, [1.05, 2.3, 0.03], [side * 0.65, 1.35, 0.86], dark);
    box(door, [0.02, 1.8, 0.04], [side * 0.12, 1.4, 0.84], amber);
    return door;
  });
  // Small ground patch samples the same DEM; granular shading is artistic surface detail.
  const geo = new THREE.PlaneGeometry(100, 100, 80, 80); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, (sampleGroundY(origin.x + pos.getX(i), origin.z + pos.getZ(i)) ?? origin.y) - origin.y + 0.025);
  }
  geo.computeVertexNormals();
  const noise = document.createElement('canvas'); noise.width = noise.height = 128;
  const ctx = noise.getContext('2d'); const pixels = ctx.createImageData(128, 128);
  let seed = 92031;
  const random = () => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) / 4294967296; };
  for (let i = 0; i < pixels.data.length; i += 4) {
    const value = 80 + random() * 100;
    pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value; pixels.data[i + 3] = 255;
  }
  ctx.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(noise); texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(90, 90);
  const soil = new THREE.MeshStandardMaterial({ color: 0x80513a, roughness: 0.98, bumpMap: texture, bumpScale: 0.045 });
  const ground = new THREE.Mesh(geo, soil); ground.receiveShadow = true; group.add(ground);
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  const rocks = new THREE.InstancedMesh(rockGeo, new THREE.MeshStandardMaterial({ color: 0x584536, roughness: 1 }), 180);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 180; i++) {
    let x = (random() - 0.5) * 70, z = (random() - 0.5) * 70;
    if (Math.abs(x) < 2 && z < 5 && z > -5) x += 4;
    const size = 0.04 + random() ** 3 * 0.5;
    dummy.position.set(x, (sampleGroundY(origin.x + x, origin.z + z) ?? origin.y) - origin.y, z);
    dummy.scale.set(size * 1.5, size * 0.55, size);
    dummy.rotation.set(random(), random() * 6, random()); dummy.updateMatrix(); rocks.setMatrixAt(i, dummy.matrix);
  }
  rocks.castShadow = true; rocks.receiveShadow = true; group.add(rocks);
  // Dust is emitted only for the first footfall, then settles with the configured gravity.
  const dustGeo = new THREE.BufferGeometry(); const dustPositions = new Float32Array(72 * 3);
  const velocities = Array.from({ length: 72 }, () => [(random() - .5) * .9, .12 + random() * .4, (random() - .5) * .9]);
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dustMat = new THREE.PointsMaterial({ color: 0xc79d76, size: .035, transparent: true, opacity: 0, depthWrite: false });
  const dust = new THREE.Points(dustGeo, dustMat); dust.frustumCulled = false; group.add(dust);
  const key = new THREE.DirectionalLight(0xffc28b, 3.2);
  key.position.set(-5, 6, 8); key.target.position.set(0, 1, 1); group.add(key, key.target);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 0.1, far: 28 });
  key.shadow.bias = -0.0005; key.shadow.normalBias = 0.025;
  const rim = new THREE.PointLight(0xaac9d5, 12, 7, 2); rim.position.set(-1, 2, -1); group.add(rim);
  const warm = new THREE.PointLight(0xffaf73, 8, 8, 2); warm.position.set(1.1, 1.7, 0.3); group.add(warm);
  let route;
  const activeRoute = state.route?.path_m;
  if (activeRoute?.length > 1) {
    const points = activeRoute.map(([x, z]) => new THREE.Vector3(x - origin.x, (sampleGroundY(x, z) ?? origin.y) - origin.y + .15, z - origin.z));
    const routeGeo = new THREE.BufferGeometry().setFromPoints(points);
    route = new THREE.Line(routeGeo, new THREE.LineBasicMaterial({ color: 0x91e9dd, transparent: true, opacity: .9 }));
    route.visible = false; group.add(route);
  }
  return {
    group, actor, doors, ground, dust, key,
    update(t, gravity) {
      if (route) { route.visible = t >= 17; route.geometry.setDrawRange(0, Math.floor(smoothRoute(t) * activeRoute.length)); }
      const opening = THREE.MathUtils.smoothstep(t, 7, 10.5);
      doors[0].position.x = -opening * 1.32; doors[1].position.x = opening * 1.32;
      const walk = THREE.MathUtils.smoothstep(t, 11.5, 17);
      actor.root.position.z = walk * 2.4;
      actor.root.position.y = (sampleGroundY(origin.x, origin.z + walk * 2.4) ?? origin.y) - origin.y + 0.045;
      actor.pose(t, walk * 2);
      actor.root.visible = t < 24.5;
      const age = t - 15.8;
      dust.visible = age > 0 && age < 1.4;
      if (dust.visible) {
        const landingY = (sampleGroundY(origin.x, origin.z + 2.05) ?? origin.y) - origin.y;
        velocities.forEach((v, i) => {
          dustPositions[i * 3] = -.16 + v[0] * age;
          dustPositions[i * 3 + 1] = landingY + Math.max(.03, v[1] * age - .5 * gravity * age * age);
          dustPositions[i * 3 + 2] = 2.05 + v[2] * age;
        });
        dustGeo.attributes.position.needsUpdate = true; dustMat.opacity = .45 * (1 - age / 1.4);
      }
    },
    dispose() {
      const geometries = new Set(), materials = new Set(), textures = new Set();
      group.traverse(obj => {
        if (obj.geometry) geometries.add(obj.geometry);
        if (obj.material) for (const mat of [obj.material].flat()) materials.add(mat);
      });
      materials.forEach(mat => { for (const value of Object.values(mat)) if (value?.isTexture) textures.add(value); mat.dispose(); });
      geometries.forEach(g => g.dispose()); textures.forEach(t => t.dispose());
      key.shadow.map?.dispose(); group.removeFromParent();
    },
  };
}

function smoothRoute(t) { return THREE.MathUtils.smoothstep(t, 17, 21); }
