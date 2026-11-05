/* Primer paso: a 26-second, interruptible prologue in the loaded Mars scene. */
import * as THREE from 'three';
import { scene, camera, renderer, sun, fill, hemiLight, skydome, stars } from './scene.js';
import { state } from './state.js';
import { CONFIG } from './config.js';
import { enableLocalPatch, disableLocalPatch } from './terrain.js';
import { sampleGroundY } from './raycast.js';
import { spawnAstronaut } from './astronaut.js';
import { enterFirstPerson, leaveFirstPerson } from './controls.js';
import { createIntroStage } from './intro-stage.js';
import { createIntroAudio } from './intro-audio.js';

export const INTRO_DURATION_S = 26;
const SEEN_KEY = 'marswalk.primer-paso.v1';
const chapters = [
  { start: 0, title: 'Antes de salir.', label: '01 / EL TRAJE', line: 'Una respiración. Un mundo por explorar.' },
  { start: 3, title: 'Todo comienza contigo.', label: '02 / PREPARACIÓN', line: 'ARES · Sistemas listos. Entorno cargado.' },
  { start: 7, title: 'Al otro lado, Marte.', label: '03 / LA ESCLUSA', line: 'El horizonte está esperando.' },
  { start: 12, title: 'El primer paso.', label: '04 / CONTACTO', line: 'ARES · Cada paso tiene un costo.' },
  { start: 17, title: 'Tu próxima frontera.', label: '05 / EXPLORACIÓN', line: 'ARES · Elige hasta dónde explorar.' },
  { start: 22, title: 'El siguiente paso es tuyo.', label: '06 / TU MISIÓN', line: 'Cada paso es una decisión.' },
];
let active = false, elapsed_s = 0, paused = false, snapshot, stage, audio, envTarget, lastChapter = -1;
let restoreFocus, hiddenNodes = [], savedObjects = [], origin, ui, horizon;
const localPosition = new THREE.Vector3(), localTarget = new THREE.Vector3();
const interpolationTarget = new THREE.Vector3();
const smooth = (t, a, b) => THREE.MathUtils.smoothstep(t, a, b);
const lerp3 = (a, b, p, out) => out.set(...a).lerp(interpolationTarget.set(...b), p);

export const isIntroCinematicActive = () => active;

export function initIntroCinematic() {
  const overlay = document.getElementById('intro-cinematic');
  ui = {
    overlay, skip: document.getElementById('cinematic-skip-btn'),
    pause: document.getElementById('intro-pause'), sound: document.getElementById('intro-sound'),
    phase: document.getElementById('intro-phase'), title: document.getElementById('intro-title'),
    subtitle: document.getElementById('intro-subtitle'), dataset: document.getElementById('intro-dataset'),
    source: document.getElementById('intro-source'), timer: document.getElementById('intro-timer'),
    progress: document.getElementById('intro-progress'), curtain: document.getElementById('intro-curtain'),
    end: document.getElementById('intro-end'), start: document.getElementById('intro-start'),
  };
  ui.skip.addEventListener('click', () => stopIntroCinematic());
  ui.pause.addEventListener('click', togglePause);
  ui.sound.addEventListener('click', async () => {
    const current = audio;
    const on = await current?.toggle();
    if (!active || current !== audio) return;
    ui.sound.textContent = on ? 'SONIDO ACTIVADO' : 'ACTIVAR SONIDO';
    ui.sound.setAttribute('aria-pressed', String(!!on));
  });
  ui.start.addEventListener('click', startEVA);
  document.getElementById('intro-map').addEventListener('click', () => stopIntroCinematic());
  document.getElementById('intro-again').addEventListener('click', () => {
    elapsed_s = 0; lastChapter = -1; paused = false; ui.end.hidden = true;
    ui.overlay.classList.remove('is-ready'); ui.pause.hidden = false; ui.pause.textContent = 'PAUSAR';
    ui.pause.setAttribute('aria-pressed', 'false'); ui.pause.focus();
  });
  document.getElementById('replay-cinematic-btn')?.addEventListener('click', () => startIntroCinematic(true));
  window.addEventListener('keydown', e => {
    if (!active) return;
    if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); stopIntroCinematic(); return; }
    if (e.code === 'Space' && e.target.tagName !== 'BUTTON') { e.preventDefault(); e.stopImmediatePropagation(); togglePause(); }
    if (e.key === 'Tab') {
      const buttons = [...ui.overlay.querySelectorAll('button')].filter(b => !b.disabled && b.getClientRects().length);
      const first = buttons[0], last = buttons.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, true);
  // A background tab pauses the story instead of jumping past the first step.
  document.addEventListener('visibilitychange', () => {
    if (active && document.hidden && elapsed_s < INTRO_DURATION_S && !paused) togglePause();
  });
  const params = new URLSearchParams(location.search);
  if (params.get('nointro') !== '1') startIntroCinematic(params.get('intro') === '1');
}

function togglePause() {
  if (!active || elapsed_s >= INTRO_DURATION_S) return;
  paused = !paused; ui.pause.textContent = paused ? 'CONTINUAR' : 'PAUSAR';
  ui.pause.setAttribute('aria-pressed', String(paused));
  if (paused) audio.silence();
}

export function startIntroCinematic(forceFull = false) {
  if (!ui || active || state.mode === 'fp' || !state.terrainMesh || state.transition) return;
  restoreFocus = document.activeElement;
  snapshot = {
    position: camera.position.clone(), quaternion: camera.quaternion.clone(), up: camera.up.clone(),
    fov: camera.fov, near: camera.near, target: state.orbitControls.target.clone(), orbitEnabled: state.orbitControls.enabled,
    sun: sun.intensity, fill: fill.intensity, hemi: hemiLight.intensity,
    shadow: renderer.shadowMap.enabled, shadowType: renderer.shadowMap.type,
    tone: renderer.toneMapping, exposure: renderer.toneMappingExposure,
    fog: scene.fog, skyPosition: skydome.position.clone(),
    skySide: skydome.material.side, skyOpacity: skydome.material.uniforms.opacity.value, starsOpacity: stars.material.opacity,
  };
  origin = state.astronautPosition.clone();
  origin.x = THREE.MathUtils.clamp(origin.x, -state.boundsX + 5, state.boundsX - 5);
  origin.z = THREE.MathUtils.clamp(origin.z, -state.boundsZ + 5, state.boundsZ - 5);
  origin.y = sampleGroundY(origin.x, origin.z) ?? 0;
  active = true; elapsed_s = 0; paused = false; lastChapter = -1;
  document.body.classList.add('intro-playing');
  for (const el of document.body.children) {
    if (el !== ui.overlay && !['SCRIPT', 'STYLE'].includes(el.tagName)) {
      hiddenNodes.push([el, el.inert]); el.inert = true;
    }
  }
  state.orbitControls.enabled = false;
  enableLocalPatch(origin.x, origin.z);
  // Keep distant mountains without letting the coarse global mesh cover the precise local DEM.
  horizon = state.terrainMesh.clone(); horizon.visible = true;
  horizon.material = state.terrainMesh.material.clone();
  horizon.material.onBeforeCompile = shader => {
    shader.uniforms.introCenter = { value: new THREE.Vector2(origin.x, origin.z) };
    shader.uniforms.introHalfPatch = { value: CONFIG.PATCH_SIZE_M * .495 };
    shader.vertexShader = 'varying vec2 introWorldXZ;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nintroWorldXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
    shader.fragmentShader = 'varying vec2 introWorldXZ;\nuniform vec2 introCenter;\nuniform float introHalfPatch;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (all(lessThan(abs(introWorldXZ - introCenter), vec2(introHalfPatch)))) discard;');
  };
  scene.add(horizon);
  savedObjects = [state.astronautGroup, state.poiGroup, state.routeGroup].filter(Boolean).map(o => [o, o.visible]);
  savedObjects.forEach(([o]) => { o.visible = false; });
  stage = createIntroStage(origin); scene.add(stage.group);
  camera.up.set(0, 1, 0); camera.near = .025; camera.fov = 48; camera.updateProjectionMatrix();
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .9;
  sun.intensity = .45; fill.intensity = .22; hemiLight.intensity = .5;
  scene.fog = new THREE.Fog(0x735340, 180, 3500);
  skydome.position.copy(origin);
  // This project's sky geometry is already inverted: view its inward faces for the film.
  skydome.material.side = THREE.FrontSide; skydome.material.needsUpdate = true;
  skydome.material.uniforms.opacity.value = 1; stars.material.opacity = .025;
  // Capture the loaded landscape in the visor once, rather than rendering six views per frame.
  envTarget = new THREE.WebGLCubeRenderTarget(128);
  const cube = new THREE.CubeCamera(.1, camera.far, envTarget);
  cube.position.copy(origin).add(new THREE.Vector3(0, 1.73, 4)); scene.add(cube);
  stage.actor.root.visible = false; cube.update(renderer, scene); stage.actor.root.visible = true;
  cube.removeFromParent(); stage.actor.visor.material.envMap = envTarget.texture;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  audio = createIntroAudio();
  ui.dataset.textContent = state.metadata?.label || 'Terreno de exploración';
  ui.source.textContent = `${state.metadata?.source || 'DEM'} · ${state.metadata?.resolution_m ?? '—'} m/px · SIMULACIÓN EVA`;
  ui.sound.textContent = 'ACTIVAR SONIDO'; ui.sound.setAttribute('aria-pressed', 'false');
  ui.pause.textContent = 'PAUSAR'; ui.pause.hidden = false; ui.pause.setAttribute('aria-pressed', 'false');
  ui.end.hidden = true; ui.overlay.classList.remove('hidden', 'is-ready');
  let seen = false; try { seen = sessionStorage.getItem(SEEN_KEY) === 'seen'; } catch { /* storage optional */ }
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || (seen && !forceFull)) elapsed_s = INTRO_DURATION_S;
  ui.skip.focus({ preventScroll: true });
  tickIntroCinematic(0);
}

export function tickIntroCinematic(dt) {
  if (!active) return;
  if (!paused) elapsed_s = Math.min(INTRO_DURATION_S, elapsed_s + Math.min(dt, .1));
  const t = elapsed_s;
  stage.update(t, state.fisio.gravity_ms2);
  const wide = camera.aspect < 1 ? 1.4 : 1;
  // Six deliberate shots: visor, wrist, threshold, boot, reveal, and visor handoff.
  if (t < 3) {
    lerp3([.16, 1.76, .74], [.23, 1.73, .8], smooth(t, 0, 3), localPosition);
    localTarget.set(-.1, 1.73, .05);
  } else if (t < 7) {
    lerp3([1.35 * wide, 1.55, .65], [1.5 * wide, 1.35, .72], smooth(t, 3, 7), localPosition);
    localTarget.set(0, 1.33, 0);
  } else if (t < 12) {
    lerp3([-.85, 1.68, -2.5], [-.55, 1.65, -1.5], smooth(t, 7, 12), localPosition);
    localTarget.set(.15, 1.35, 3.8);
  } else if (t < 17) {
    const z = stage.actor.root.position.z;
    localPosition.set(.85 * wide, .34, z + 1.25); localTarget.set(-.08, .22, z);
  } else if (t < 22) {
    lerp3([-5.8 * wide, 3.2, 8], [-3.2 * wide, 2.6, 6.5], smooth(t, 17, 22), localPosition);
    localTarget.set(.5, 1.25, 1.6);
  } else if (t < 24.5) {
    lerp3([-.9, 1.8, 4.4], [0, 1.76, 2.7], smooth(t, 22, 24.5), localPosition);
    localTarget.set(0, 1.72, 2.4);
  } else {
    const y = (sampleGroundY(origin.x, origin.z + 2.4) ?? origin.y) - origin.y;
    localPosition.set(0, y + state.fisio.eye_height_m, 2.4);
    localTarget.set(0, y + state.fisio.eye_height_m, 40);
  }
  camera.position.copy(localPosition).add(origin);
  // Keep the lens above the actual DEM when a replay begins on a slope.
  camera.position.y = Math.max(camera.position.y, (sampleGroundY(camera.position.x, camera.position.z) ?? origin.y) + .13);
  localTarget.add(origin); camera.lookAt(localTarget);
  camera.fov = THREE.MathUtils.lerp(48, snapshot.fov, smooth(t, 24.5, 26)); camera.updateProjectionMatrix();
  skydome.position.copy(camera.position);
  let blackout = 1 - smooth(t, 0, 1.5);
  if (t > 24) blackout = t < 24.5 ? smooth(t, 24, 24.5) : 1 - smooth(t, 24.5, 25.4);
  ui.curtain.style.opacity = String(blackout);
  ui.progress.style.transform = `scaleX(${t / INTRO_DURATION_S})`;
  ui.timer.textContent = `${String(Math.floor(t)).padStart(2, '0')} / 26`;
  ui.overlay.dataset.shot = String(chapters.findLastIndex(c => t >= c.start));
  const chapter = chapters.findLastIndex(c => t >= c.start);
  if (chapter !== lastChapter) {
    lastChapter = chapter;
    ui.phase.textContent = chapters[chapter].label;
    ui.title.textContent = chapters[chapter].title;
    ui.subtitle.textContent = chapters[chapter].line;
  }
  audio.update(t, paused || t >= INTRO_DURATION_S);
  if (t >= INTRO_DURATION_S && ui.end.hidden) {
    ui.end.hidden = false; ui.pause.hidden = true; ui.overlay.classList.add('is-ready');
    ui.start.focus({ preventScroll: true });
    try { sessionStorage.setItem(SEEN_KEY, 'seen'); } catch { /* storage optional */ }
  }
}

export function stopIntroCinematic() {
  if (!active) return;
  active = false; audio?.dispose(); audio = null;
  // envTarget owns this texture; avoid double disposal from the material traversal.
  stage.actor.visor.material.envMap = null; stage.dispose(); stage = null;
  envTarget.dispose(); envTarget = null;
  horizon.removeFromParent(); horizon.material.dispose(); horizon = null;
  disableLocalPatch();
  savedObjects.forEach(([o, visible]) => { o.visible = visible; }); savedObjects = [];
  camera.position.copy(snapshot.position); camera.quaternion.copy(snapshot.quaternion); camera.up.copy(snapshot.up);
  camera.fov = snapshot.fov; camera.near = snapshot.near; camera.updateProjectionMatrix();
  state.orbitControls.target.copy(snapshot.target); state.orbitControls.enabled = snapshot.orbitEnabled;
  sun.intensity = snapshot.sun; fill.intensity = snapshot.fill; hemiLight.intensity = snapshot.hemi;
  renderer.shadowMap.enabled = snapshot.shadow; renderer.shadowMap.type = snapshot.shadowType;
  renderer.toneMapping = snapshot.tone; renderer.toneMappingExposure = snapshot.exposure;
  scene.fog = snapshot.fog; skydome.position.copy(snapshot.skyPosition);
  skydome.material.side = snapshot.skySide; skydome.material.needsUpdate = true;
  skydome.material.uniforms.opacity.value = snapshot.skyOpacity; stars.material.opacity = snapshot.starsOpacity;
  hiddenNodes.forEach(([el, inert]) => { el.inert = inert; }); hiddenNodes = [];
  document.body.classList.remove('intro-playing'); ui.overlay.classList.add('hidden');
  (restoreFocus?.tagName === 'BUTTON' ? restoreFocus : document.getElementById('mode-btn'))?.focus({ preventScroll: true });
  try { sessionStorage.setItem(SEEN_KEY, 'seen'); } catch { /* storage optional */ }
}

function startEVA() {
  if (!active || elapsed_s < INTRO_DURATION_S) return;
  const x = origin.x, z = origin.z + 2.4;
  stopIntroCinematic();
  spawnAstronaut(x, z);
  // Pointer lock must be requested synchronously from this explicit button click.
  const onError = () => {
    document.removeEventListener('pointerlockchange', onLock);
    if (state.mode === 'fp') leaveFirstPerson();
    const message = document.getElementById('intro-feedback');
    message.textContent = 'No se pudo activar el ratón. Pulsa «Explorar» para volver a intentarlo.';
    message.hidden = false;
  };
  const onLock = () => {
    if (document.pointerLockElement === renderer.domElement) {
      document.removeEventListener('pointerlockerror', onError);
      document.removeEventListener('pointerlockchange', onLock);
      document.getElementById('intro-feedback').hidden = true;
    }
  };
  document.addEventListener('pointerlockerror', onError, { once: true });
  document.addEventListener('pointerlockchange', onLock);
  enterFirstPerson({ x, z: z + 40 });
}
