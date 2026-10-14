import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PlayerControls } from './systems/playerControls.js';
import { AIState } from './systems/aiState.js';
import { InteractionSystem } from './systems/interaction.js';
import { HUD } from './systems/hud.js';
import { Terminal } from './systems/terminal.js';
import { renderCredits } from './systems/credits.js';
import { sound } from './systems/audio.js';
import { buildLevel1 } from './scenes/level1.js';
import { buildLevel2 } from './scenes/level2.js';
import { buildLevel3 } from './scenes/level3.js';

// ---------- Renderer / scene / camera ----------
const canvas = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;

// Secondary CCTV Picture-in-Picture Renderer (Viewing rubric)
const cctvCanvas = document.getElementById('cctv-canvas');
const cctvContainer = document.getElementById('cctv-container');
let cctvRenderer = null;
if (cctvCanvas) {
  cctvRenderer = new THREE.WebGLRenderer({ canvas: cctvCanvas, antialias: true });
  cctvRenderer.setSize(240, 135);
  cctvRenderer.outputColorSpace = THREE.SRGBColorSpace;
}

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x1a2634, 0.005);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
const PLAYER_HEIGHT = 1.7;
//3rd person camera

const thirdPersonCamera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);

// Player flashlight / headlamp
const flashlight = new THREE.SpotLight(0xffffff, 8, 28, Math.PI / 4, 0.4, 1.0);
flashlight.position.set(0, 0, 0);
camera.add(flashlight);
const flashlightTarget = new THREE.Object3D();
flashlightTarget.position.set(0, 0, -2);
camera.add(flashlightTarget);
flashlight.target = flashlightTarget;
scene.add(camera);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  thirdPersonCamera.aspect = window.innerWidth / window.innerHeight;
  thirdPersonCamera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- UI elements ----------
const el = (id) => document.getElementById(id);
const loadingScreen = el('loading-screen');
const loadingBarFill = el('loading-bar-fill');
const loadingLabel = el('loading-label');
const mainMenu = el('main-menu');
const pauseMenu = el('pause-menu');
const creditsScreen = el('credits-screen');
const hudRoot = el('hud');
const interactPrompt = el('interact-prompt');
const terminalOverlay = el('terminal');
const btnAudio = el('btn-audio');

const hud = new HUD();

const gltfLoader = new GLTFLoader();
let playerModel = null;

let previousPlayerPosition = new THREE.Vector3();

let previousCameraMode = "first";

// ---------- Systems ----------
const playerControls = new PlayerControls(camera, renderer.domElement);
const interaction = new InteractionSystem(camera, scene, interactPrompt,
  () => playerControls.isLocked && playerControls.enabled);
const aiState = new AIState((state) => hud.setAIStatus(state));
const terminal = new Terminal({
  overlayEl: terminalOverlay,
  outputEl: el('terminal-output'),
  inputEl: el('terminal-input'),
});

function loadPlayerModel() {

  if (playerModel) {
    scene.remove(playerModel);
    playerModel = null;
  }

  gltfLoader.load(
    '/models/player.glb',

    (gltf) => {
      playerModel = gltf.scene;

      playerModel.scale.set(1.2, 1.2, 1.2);

      // Start at the player's feet.
      playerModel.position.copy(camera.position);
      playerModel.position.y = 0;

      // Face the same direction as the player.
      playerModel.rotation.y = 0;

      // Hide it by default because we start in first person.
      playerModel.visible = false;

      scene.add(playerModel);

      console.log("🎉 Player model loaded!");
    },

    undefined,

    (error) => {
      console.error("Failed to load player model:", error);
    }
  );
}

// ---------- Level manager ----------
const LEVEL_BUILDERS = [buildLevel1, buildLevel2, buildLevel3];
let currentLevel = null;
let currentLevelIndex = 0;
let gameEnded = false;
let advanceTimeout = null;

function clearScene() {
  clearTimeout(advanceTimeout);
  interaction.reset();
  playerControls.enabled = true;
  currentLevel?.dispose?.();
  // Remove everything except camera and its attached components
  for (let i = scene.children.length - 1; i >= 0; i--) {
    const obj = scene.children[i];
    if (obj !== camera) scene.remove(obj);
  }
}

function loadLevel(index, entry = 'door') {
  clearScene();
  gameEnded = false;
  hud.resetLevelComplete();

  const builder = LEVEL_BUILDERS[index];
  const args = { scene, aiState, hud, terminalUI: terminal, onEnding: playEnding,
    onShock: (position) => playerControls.teleport(position),
    onVentEnter: () => { playerControls.enabled = false; interaction.reset(); },
    onVentExit: () => loadLevel(1, 'vent') };
  currentLevel = builder(args);
  currentLevelIndex = index;

  playerControls.setColliders(currentLevel.colliders, currentLevel.walkableSurfaces);
  camera.position.copy(currentLevel.spawn);

  camera.rotation.set(0, 0, 0);
  if (entry === 'vent' && currentLevel.serviceSpawn) {
    camera.position.copy(currentLevel.serviceSpawn);
    camera.rotation.y = Math.PI / 2;
  }

  previousPlayerPosition.copy(camera.position);

  aiState.reset();

  loadPlayerModel();

  hud.setObjective(currentLevel.objective);
  hud.showLevelBanner(currentLevel.title, currentLevel.subtitle);

  // Show or hide CCTV PiP feed depending on whether this level provides a CCTV camera
  if (currentLevel.cctvCamera && cctvContainer) {
    cctvContainer.classList.remove('hidden');
  } else if (cctvContainer) {
    cctvContainer.classList.add('hidden');
  }
}

function playEnding() {
  gameEnded = true;
  terminal.close();
  playerControls.unlock();

  setTimeout(() => {
    terminal.show();
    terminal.outputEl.textContent =
`==================================================
  JHB SUBSTATION 07 — FACILITY SYSTEM STATUS
==================================================
MUNICIPAL POWER: RESTORED [100%]
WATER INFRASTRUCTURE: STABILIZED [100%]

AI CONTROLLER:
OFFLINE

`;
    sound.playGlitch();

    setTimeout(() => {
      terminal.outputEl.textContent += `[CRITICAL WARNING: SYSTEM MEMORY FLICKER DETECTED]\n\n`;
      sound.playGlitch();

      setTimeout(() => {
        terminal.outputEl.textContent +=
`AI CONTROLLER:
ONLINE

"Directive maintained. Human intervention contained."

[CUT TO BLACK]`;
        sound.playDetectionWarning(1.0);

        setTimeout(() => {
          terminal.close();
          renderCredits(el('credits-list'));
          showOnly(creditsScreen);
        }, 3500);
      }, 1500);
    }, 1500);
  }, 800);
}

function advanceLevel() {
  if (currentLevelIndex + 1 < LEVEL_BUILDERS.length) {
    loadLevel(currentLevelIndex + 1);
  } else if (!gameEnded) {
    playEnding();
  }
}

// ---------- Menu state machine ----------
function showOnly(...visibleEls) {
  [mainMenu, pauseMenu, creditsScreen].forEach((e) => e.classList.add('hidden'));
  visibleEls.forEach((e) => e?.classList.remove('hidden'));
}

el('btn-play').addEventListener('click', () => {
  sound.init();
  showOnly();
  hudRoot.classList.remove('hidden');
  loadLevel(0);
  playerControls.lock();
});

el('btn-credits').addEventListener('click', () => {
  renderCredits(el('credits-list'));
  showOnly(creditsScreen);
});
el('btn-credits-close').addEventListener('click', () => showOnly(mainMenu));

el('btn-resume').addEventListener('click', () => {
  showOnly();
  playerControls.lock();
});

if (btnAudio) {
  btnAudio.addEventListener('click', () => {
    const muted = sound.toggleMute();
    btnAudio.textContent = muted ? 'AUDIO: MUTED' : 'AUDIO: ON';
  });
}

el('btn-restart').addEventListener('click', () => {
  showOnly();
  hudRoot.classList.remove('hidden');
  loadLevel(0);
  playerControls.lock();
});
el('btn-quit-menu').addEventListener('click', () => {
  clearScene();
  hudRoot.classList.add('hidden');
  if (cctvContainer) cctvContainer.classList.add('hidden');
  showOnly(mainMenu);
});

document.addEventListener('keydown', (e) => {
  if (e.code !== 'Escape') return;
  if (terminal.open) return;
  if (playerControls.isLocked) {
    playerControls.unlock();
  }
});

document.addEventListener('security-keypad-close', () => {
  if (mainMenu.classList.contains('hidden') && creditsScreen.classList.contains('hidden')) {
    showOnly(pauseMenu);
  }
});

playerControls.controls.addEventListener('unlock', () => {
  if (document.getElementById('security-keypad-overlay')) return;
  if (!mainMenu.classList.contains('hidden')) return;
  if (!creditsScreen.classList.contains('hidden')) return;
  showOnly(pauseMenu);
});

// Auto-advance when a level marks itself complete
setInterval(() => {
  if (hud.levelComplete && !gameEnded) {
    hud.resetLevelComplete();
    advanceTimeout = setTimeout(advanceLevel, 1500);
  }
}, 250);

// ---------- Loading sequence ----------
function bootSequence() {
  let progress = 0; 
  const iv = setInterval(() => {
    progress += 8 + Math.random() * 12;
    if (progress >= 100) {
      progress = 100;
      clearInterval(iv);
      loadingLabel.textContent = 'Substation systems ready.';
      setTimeout(() => {
        loadingScreen.style.opacity = '0';
        setTimeout(() => {
          loadingScreen.classList.add('hidden');
          showOnly(mainMenu);
        }, 600);
      }, 250);
    }
    loadingBarFill.style.width = `${progress}%`;
  }, 100);
}
bootSequence();

// ---------- Game loop ----------
const clock = new THREE.Clock();
function tick() {
  const delta = Math.min(clock.getDelta(), 0.05);

  if (playerControls.isLocked) {
    playerControls.update(delta);
    interaction.update(delta);
    currentLevel?.update?.(delta, camera);

    if (playerModel) {
      playerModel.visible = playerControls.cameraMode === "third";

      // Keep the character on the ground and follow the player.
      playerModel.position.x = camera.position.x;
      playerModel.position.z = camera.position.z;
      playerModel.position.y = 0;

      // Detect switching from first person to third person.
      if (
        playerControls.cameraMode === "third" &&
        previousCameraMode === "first"
      ) {
        const cameraDirection = new THREE.Vector3();

        camera.getWorldDirection(cameraDirection);
        cameraDirection.y = 0;
        cameraDirection.normalize();

        const angle = Math.atan2(
          cameraDirection.x,
          cameraDirection.z
        );

        playerModel.rotation.y = angle;
      }

      // Work out which direction the player moved.
      const movement = camera.position.clone().sub(previousPlayerPosition);
      movement.y = 0;

      if (movement.lengthSq() > 0.0001) {
        // When moving, face the direction of movement.
        const angle = Math.atan2(movement.x, movement.z);
        playerModel.rotation.y = angle;
      }

      previousPlayerPosition.copy(camera.position);
    }

    // Make the third-person camera follow behind the player.
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);

    direction.y = 0;
    direction.normalize();

    const thirdPersonPosition = camera.position
      .clone()
      .addScaledVector(direction, -2.8)
      .add(new THREE.Vector3(0.8, 1.6, 0));

    thirdPersonCamera.position.lerp(thirdPersonPosition, 0.10);

    const lookTarget = camera.position.clone();
    lookTarget.y -= 0.4;

    thirdPersonCamera.lookAt(lookTarget);
  }

  previousCameraMode = playerControls.cameraMode;

  const activeCamera =
    playerControls.cameraMode === "third" ? thirdPersonCamera : camera;

  // Render primary camera view.
  renderer.render(scene, activeCamera);

  // Render secondary CCTV Camera PiP view if active.
  if (currentLevel?.cctvCamera && cctvRenderer) {
    cctvRenderer.render(scene, currentLevel.cctvCamera);
  }

  requestAnimationFrame(tick);
}

tick();
