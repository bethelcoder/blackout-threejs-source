import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
const source = fs.readFileSync('src/main.js', 'utf8');
const code = source.slice(source.indexOf('const LEVEL_BUILDERS'), source.indexOf('\nfunction playEnding()'));
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
function harness() {
  const downloads = deferred();
  const models = deferred();
  const shaders = deferred();
  const hidden = new Set(['hidden']);
  const loadingScreen = { style: {}, classList: { add: key => hidden.add(key), remove: key => hidden.delete(key) } };
  const state = { builds: 0, renders: 0, locks: 0, compilations: 0 };
  const playerControls = { enabled: true, isLocked: true, isSeated: false, unlock() {}, lock() { state.locks++; }, setColliders() {}, teleport() {} };
  const hud = { resetLevelComplete() {}, setObjective() {}, showLevelBanner() {} };
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  scene.add(camera);
  const level = { ready: models.promise, colliders: [], spawn: new THREE.Vector3(0, 1.7, 6), dispose() {} };
  const builder = () => { state.builds++; return level; };
  const args = {
    buildLevel1: builder, buildLevel2: builder, buildLevel3: builder,
    loadingScreen, loadingLabel: {}, loadingBarFill: { style: {} },
    playerControls, interaction: { reset() {} }, hud, scene, camera,
    aiState: { reset() {} }, terminal: {}, previousPlayerPosition: new THREE.Vector3(),
    playEnding() {}, showOnly() {}, pauseMenu: {}, cctvContainer: null,
    loadPlayerModel() {}, preloadLevel2Models: () => downloads.promise,
    requestAnimationFrame: callback => queueMicrotask(callback),
    setTimeout: (callback, delay) => { if (delay === 0) queueMicrotask(callback); return 1; }, clearTimeout() {},
    renderer: { compileAsync() { state.compilations++; return shaders.promise; }, render() { state.renders++; } },
  };
  const app = new Function(...Object.keys(args), code + '\nreturn { loadLevel, clearScene, isLoading: () => levelLoading };')(...Object.values(args));
  return { ...args, ...app, downloads, models, shaders, hidden, state };
}
const app = harness();
const ready = app.loadLevel(1);
assert.equal(app.isLoading(), true);
assert.equal(app.playerControls.enabled, false);
assert.equal(app.hidden.has('hidden'), false);
await flush();
assert.equal(app.state.builds, 0, 'Room waits for downloads/decode');
app.downloads.resolve([]);
await flush();
assert.equal(app.state.builds, 1);
assert.equal(app.playerControls.enabled, false, 'Player cannot move while models are assembled');
app.models.resolve();
await flush();
assert.equal(app.state.compilations, 1);
assert.equal(app.isLoading(), true, 'Overlay remains while GPU materials prepare');
app.shaders.resolve();
await ready;
assert.equal(app.isLoading(), false);
assert.equal(app.playerControls.enabled, true);
assert.equal(app.hidden.has('hidden'), true);
assert.equal(app.state.renders, 1, 'Warm render happens before entry');
assert.equal(app.state.locks, 0, 'Existing pointer lock is preserved without a new browser permission gesture');
const cancelled = harness();
const old = cancelled.loadLevel(1);
await flush();
cancelled.clearScene();
cancelled.downloads.resolve([]);
await old;
assert.equal(cancelled.state.builds, 0, 'A cancelled transition cannot restore an old level');
assert.equal(cancelled.hidden.has('hidden'), true);
console.log('Level-loading checks passed: downloads, model assembly and GPU readiness gate entry; cancellation cannot restore stale scenes.');
