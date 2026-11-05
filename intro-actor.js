/* Original, articulated EVA suit. Dimensions in metres; no external model assets. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function createIntroAstronaut() {
  const root = new THREE.Group();
  const suit = new THREE.MeshStandardMaterial({ color: 0xe0dccb, roughness: 0.76 });
  const fabric = document.createElement('canvas'); fabric.width = fabric.height = 64;
  const weave = fabric.getContext('2d');
  weave.fillStyle = '#888'; weave.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 2) for (let x = 0; x < 64; x += 2) {
    weave.fillStyle = (x + y) % 4 === 0 ? '#b4b4b4' : '#686868'; weave.fillRect(x, y, 1, 2);
  }
  const fabricMap = new THREE.CanvasTexture(fabric); fabricMap.wrapS = fabricMap.wrapT = THREE.RepeatWrapping;
  fabricMap.repeat.set(8, 8); suit.bumpMap = fabricMap; suit.bumpScale = .0015;
  const trim = new THREE.MeshStandardMaterial({ color: 0x20282b, roughness: 0.58 });
  const metal = new THREE.MeshStandardMaterial({ color: 0x939b98, metalness: 0.8, roughness: 0.3 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xb84523, roughness: 0.63 });
  const glass = new THREE.MeshStandardMaterial({ color: 0xdaa35e, metalness: 1, roughness: 0.12, envMapIntensity: 1.7 });
  const cyan = new THREE.MeshStandardMaterial({ color: 0xa9eee2, emissive: 0x75c9bf, emissiveIntensity: 1.8 });
  const mesh = (parent, geometry, material, pos, scale) => {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(...pos);
    if (scale) m.scale.set(...scale);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const ball = (parent, material, pos, scale) => mesh(parent, new THREE.SphereGeometry(1, 28, 20), material, pos, scale);
  const box = (parent, material, pos, size) => mesh(parent, new RoundedBoxGeometry(...size, 2, Math.min(...size) * .22), material, pos);
  const ring = (parent, pos, radius, tube, material, horizontal = true) => {
    const m = mesh(parent, new THREE.TorusGeometry(radius, tube, 8, 32), material, pos);
    if (horizontal) m.rotation.x = Math.PI / 2;
    return m;
  };
  const torso = new THREE.Group();
  root.add(torso);
  ball(torso, suit, [0, 1.16, 0], [0.32, 0.43, 0.22]);
  box(torso, trim, [0, 0.91, 0], [0.55, 0.12, 0.37]);
  box(torso, metal, [0, 0.91, 0.204], [0.13, 0.075, 0.035]);
  box(torso, suit, [0, 1.21, -0.29], [0.57, 0.68, 0.25]);
  box(torso, trim, [0, 1.23, -0.425], [0.43, 0.48, 0.025]);
  for (let i = 0; i < 7; i++) box(torso, metal, [0, 1.06 + i * 0.045, -0.445], [0.34, 0.012, 0.012]);
  for (const x of [-0.23, 0.23]) {
    box(torso, orange, [x, 1.25, -0.43], [0.035, 0.5, 0.025]);
    box(torso, trim, [x, 1.3, 0.185], [0.035, 0.38, 0.028]);
  }
  box(torso, metal, [0, 1.25, 0.214], [0.32, 0.23, 0.05]);
  box(torso, trim, [0, 1.28, 0.247], [0.27, 0.11, 0.02]);
  for (let i = 0; i < 3; i++) box(torso, cyan, [-0.085 + i * 0.08, 1.29, 0.262], [0.045, 0.012, 0.008]);
  for (const x of [-0.1, 0.1]) ring(torso, [x, 1.18, 0.26], 0.025, 0.009, trim, false);
  // Original mission patch, readable in the close-up rather than a borrowed insignia.
  const label = document.createElement('canvas'); label.width = 256; label.height = 96;
  const ctx = label.getContext('2d');
  ctx.fillStyle = '#ded9c7'; ctx.fillRect(0, 0, 256, 96);
  ctx.fillStyle = '#253032'; ctx.font = 'bold 28px monospace'; ctx.fillText('MARSWALK', 17, 39);
  ctx.font = '20px monospace'; ctx.fillText('EVA / 01', 18, 72);
  const labelTex = new THREE.CanvasTexture(label); labelTex.colorSpace = THREE.SRGBColorSpace;
  mesh(torso, new THREE.PlaneGeometry(0.25, 0.094), new THREE.MeshStandardMaterial({ map: labelTex, roughness: 0.8 }), [0, 1.46, 0.205]);
  ring(torso, [0, 1.52, 0], 0.235, 0.045, metal);
  const head = new THREE.Group(); head.position.y = 1.73; torso.add(head);
  ball(head, suit, [0, 0, 0], [0.3, 0.3, 0.28]);
  ball(head, trim, [0, 0.005, 0.115], [0.277, 0.255, 0.218]);
  const visor = ball(head, glass, [0, 0.01, 0.142], [0.251, 0.224, 0.212]);
  for (const side of [-1, 1]) {
    ball(head, metal, [side * 0.278, 0, 0], [0.04, 0.1, 0.1]);
    box(head, trim, [side * 0.22, 0.21, 0.12], [0.085, 0.055, 0.07]);
    box(head, cyan, [side * 0.22, 0.21, 0.16], [0.055, 0.018, 0.012]);
  }
  const arms = [], legs = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(side * 0.345, 1.4, 0); torso.add(arm);
    ball(arm, suit, [0, -0.15, 0], [0.14, 0.24, 0.14]);
    ring(arm, [0, -0.055, 0], 0.137, 0.018, orange);
    const forearm = new THREE.Group(); forearm.position.y = -0.31; arm.add(forearm);
    ball(forearm, trim, [0, 0, 0], [0.105, 0.1, 0.11]);
    ball(forearm, suit, [0, -0.15, 0], [0.115, 0.185, 0.115]);
    for (let i = 0; i < 3; i++) ring(forearm, [0, -0.027 * i, 0], 0.105, 0.012, trim);
    ring(forearm, [0, -0.28, 0], 0.1, 0.025, metal);
    ball(forearm, suit, [0, -0.37, 0.025], [0.093, 0.13, 0.075]);
    ball(forearm, trim, [-side * 0.075, -0.34, 0.065], [0.04, 0.075, 0.045]);
    if (side === -1) {
      box(forearm, trim, [0, -0.21, 0.115], [0.15, 0.13, 0.045]);
      box(forearm, cyan, [0, -0.21, 0.14], [0.11, 0.075, 0.008]);
    }
    arms.push({ arm, forearm });
    const leg = new THREE.Group(); leg.position.set(side * 0.165, 0.87, 0); root.add(leg);
    ball(leg, suit, [0, -0.18, 0], [0.157, 0.26, 0.16]);
    box(leg, suit, [side * 0.1, -0.18, 0.11], [0.14, 0.19, 0.1]);
    const shin = new THREE.Group(); shin.position.y = -0.37; leg.add(shin);
    ball(shin, trim, [0, 0, 0], [0.13, 0.105, 0.13]);
    box(shin, metal, [0, 0, 0.12], [0.17, 0.12, 0.05]);
    ball(shin, suit, [0, -0.17, 0], [0.13, 0.21, 0.13]);
    for (let i = 0; i < 3; i++) ring(shin, [0, -0.27 - i * 0.025, 0], 0.12, 0.014, trim);
    const boot = box(shin, trim, [0, -0.39, 0.065], [0.27, 0.15, 0.38]);
    box(shin, suit, [0, -0.32, 0.055], [0.25, 0.13, 0.31]);
    for (let i = 0; i < 5; i++) box(shin, metal, [0, -0.467, -0.07 + i * 0.065], [0.26, 0.012, 0.025]);
    legs.push({ leg, shin, boot });
  }
  const hose = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.22, 1.06, 0.19), new THREE.Vector3(0.39, 0.99, 0.18),
    new THREE.Vector3(0.4, 0.88, -0.12), new THREE.Vector3(0.23, 1.08, -0.38),
  ]);
  mesh(torso, new THREE.TubeGeometry(hose, 24, 0.035, 8, false), trim, [0, 0, 0]);
  return {
    root, visor,
    pose(t, step) {
      const breathing = Math.sin(t * 1.65) * 0.006;
      torso.position.y = breathing;
      torso.rotation.z = Math.sin(step * Math.PI * 2) * 0.025;
      head.rotation.y = t < 7 ? -0.16 * Math.sin(Math.max(0, t - 3) * 0.7) : 0.12 * Math.sin(t * 0.35);
      head.rotation.x = t > 3 && t < 7 ? 0.14 * Math.sin((t - 3) / 4 * Math.PI) : 0;
      const check = t > 3 && t < 7 ? Math.sin((t - 3) / 4 * Math.PI) : 0;
      arms.forEach(({ arm, forearm }, i) => {
        arm.rotation.x = (i ? -1 : 1) * Math.sin(step * Math.PI * 2) * 0.16 - (i === 0 ? check * 0.55 : 0);
        arm.rotation.z = (i ? 1 : -1) * 0.09;
        forearm.rotation.x = -0.12 - (i === 0 ? check * 1.2 : 0);
      });
      legs.forEach(({ leg, shin }, i) => {
        const cycle = Math.sin(step * Math.PI * 2 + i * Math.PI);
        leg.rotation.x = -cycle * 0.34;
        shin.rotation.x = Math.max(0, cycle) * 0.48;
      });
    },
  };
}
