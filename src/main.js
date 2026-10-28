import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { PlayerControls } from './systems/playerControls.js';
import { AIState } from './systems/aiState.js';
import { SecurityRun } from './systems/securityRun.js';
import { InteractionSystem } from './systems/interaction.js';
import { HUD } from './systems/hud.js';
import { Terminal } from './systems/terminal.js';
import { renderCredits } from './systems/credits.js';
import { sound } from './systems/audio.js';
import { buildLevel1 } from './scenes/level1.js';
import { buildLevel2 } from './scenes/level2.js';
import { buildLevel3 } from './scenes/level3.js';
import { preloadLevel2Models } from './systems/modelCache.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { inventory } from './systems/inventory.js';
import { PickupSystem } from './systems/pickupSystem.js';
import { EquipmentSystem } from './systems/equipment.js';
import { Viewmodel } from './systems/viewmodel.js';
import { BackpackUI } from './systems/backpackUI.js';

// ---------- Renderer / scene / camera ----------
const canvas = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.localClippingEnabled = true;
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

const MIN_CAMERA_PITCH = -0.08;
const MAX_CAMERA_PITCH = 0.15;

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
const loseScreen = el('lose-screen');
const creditsScreen = el('credits-screen');
const hudRoot = el('hud');
const interactPrompt = el('interact-prompt');
const pickupPrompt = el('pickup-prompt');
const hudToast = el('hud-toast');
const terminalOverlay = el('terminal');
const btnAudio = el('btn-audio');
const guidanceModal = el('guidance-modal');
const controlsModal = el('controls-modal');
const backgroundMusic = el('backgroundMusic');

const hud = new HUD();

const gltfLoader = new GLTFLoader();
const fbxLoader = new FBXLoader();
let playerModel = null;

let playerMixer = null;
let playerActions = {};
let activeAction = null;

let previousPlayerPosition = new THREE.Vector3();

let previousCameraMode = "first";

// ---------- Systems ----------
const playerControls = new PlayerControls(camera, renderer.domElement);
const interaction = new InteractionSystem(camera, scene, interactPrompt,
  () => playerControls.isLocked && playerControls.enabled);
const equipment = new EquipmentSystem(camera, flashlight);
const viewmodel = new Viewmodel(camera, flashlight);
equipment.setViewmodel(viewmodel);

const pickupSystem = new PickupSystem(
  () => (playerControls.cameraMode === "third" ? thirdPersonCamera : camera),
  scene,
  pickupPrompt,
  hudToast
);

const backpackUI = new BackpackUI({
  overlayEl: el('backpack-overlay'),
  slotsContainerEl: el('backpack-slots'),
  docReaderEl: el('doc-reader'),
  docContentEl: el('doc-content'),
  equipment,
  playerControls,
});

if (el('btn-close-doc')) {
  el('btn-close-doc').addEventListener('click', () => backpackUI.closeDocReader());
}

const aiState = new AIState((state) => hud.setAIStatus(state));
const terminal = new Terminal({
  overlayEl: terminalOverlay,
  outputEl: el('terminal-output'),
  inputEl: el('terminal-input'),
});

let backpackModelTemplate = null;

function attachBackpackToCharacter(characterModel) {
  let targetBone = null;
  characterModel.traverse((child) => {
    if (child.isBone && (child.name === 'Spine2' || child.name === 'Spine1')) {
      if (!targetBone || child.name === 'Spine2') {
        targetBone = child;
      }
    }
  });

  const wrapperGroup = new THREE.Group();
  wrapperGroup.name = 'WornBackpack';

  const applyBackpackModel = (gltfScene) => {
    const model = gltfScene.clone(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);

    const targetHeight = 0.35; // Calibrated tactical gear proportions (~0.42m world height)
    const scaleFactor = targetHeight / (size.y || 1);
    model.scale.set(scaleFactor, scaleFactor, scaleFactor);

    // Center model at volumetric origin (centered horizontally, vertically, and in depth)
    const center = new THREE.Vector3();
    box.getCenter(center);
    model.position.set(
      -center.x * scaleFactor,
      -center.y * scaleFactor,
      -center.z * scaleFactor
    );

    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          const oldMat = child.material;
          child.material = new THREE.MeshStandardMaterial({
            map: oldMat.map,
            color: oldMat.color || 0xffffff,
            roughness: 0.75,
            metalness: 0.1,
          });
        }
      }
    });

    wrapperGroup.add(model);
  };

  if (backpackModelTemplate) {
    applyBackpackModel(backpackModelTemplate);
  } else {
    gltfLoader.load(
      './models/backpack_photogrammetry.glb',
      (gltf) => {
        backpackModelTemplate = gltf.scene;
        applyBackpackModel(backpackModelTemplate);
      },
      undefined,
      (err) => {
        console.warn('Failed to load backpack asset, using procedural fallback', err);
        const bagMat = new THREE.MeshStandardMaterial({ color: 0x33281e, roughness: 0.75, metalness: 0.1 });
        const mainBag = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.34, 0.14), bagMat);
        mainBag.castShadow = true;
        wrapperGroup.add(mainBag);

        const pocket = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.15, 0.08), bagMat);
        pocket.position.set(0, -0.05, -0.10);
        pocket.castShadow = true;
        wrapperGroup.add(pocket);
      }
    );
  }

  if (targetBone) {
    // Calibrated position & orientation for the operative's thoracic spine:
    // Spine2 is upper chest/shoulder-blade level (world Y ~ 1.67m).
    // Offsetting local Y by -0.075 places center at ~1.58m:
    // Top sits at ~1.79m (under collar/shoulder blades, well below ponytail).
    // Bottom sits at ~1.37m (cleanly above waist belt at 1.25m).
    if (targetBone.name === 'Spine2') {
      wrapperGroup.position.set(0, -0.075, -0.085);
      wrapperGroup.rotation.set(0.08, Math.PI, 0);
    } else {
      // Fallback for Spine1 (mid-spine, world Y ~ 1.48m)
      wrapperGroup.position.set(0, 0.085, -0.085);
      wrapperGroup.rotation.set(0.08, Math.PI, 0);
    }
    targetBone.add(wrapperGroup);
  } else {
    // Fallback if armature not found
    wrapperGroup.position.set(0, 1.31, -0.10);
    wrapperGroup.rotation.set(0.08, Math.PI, 0);
    characterModel.add(wrapperGroup);
  }

  return wrapperGroup;
}

function loadPlayerModel() {
  const modelGeneration = loadGeneration;
  // Clean up the previous model and its animation mixer.
  if (playerMixer) {
    playerMixer.stopAllAction();
    playerMixer = null;
  }

  if (playerModel) {
    scene.remove(playerModel);
    playerModel = null;
  }

  playerActions = {};
  activeAction = null;

  gltfLoader.load(
    './models/player.glb', // CHANGED: was '/models/player.glb' (absolute path 404s when hosted in a subfolder)

    (gltf) => {
      if (modelGeneration !== loadGeneration) return;
      const model = gltf.scene;

      model.traverse((object) => {
        if (object.isBone && (
          object.name === 'Hips' ||
          object.name === 'LeftUpLeg' ||
          object.name === 'LeftLeg' ||
          object.name === 'RightUpLeg' ||
          object.name === 'RightLeg'
        )) {
          console.log(
            'Player bone:',
            object.name,
            'rotation:',
            object.rotation.toArray(),
            'position:',
            object.position.toArray()
          );
        }
      });


      playerModel = model;
      model.userData.ignoreInteraction = true;

      model.scale.set(1.2, 1.2, 1.2);
      model.position.copy(camera.position);
      model.position.y = 0;
      model.rotation.y = 0;
      model.visible = playerControls.cameraMode === "third";

      // Attach worn backpack so character wears it in 3rd person
      attachBackpackToCharacter(model);


      scene.add(model);

      // One mixer controls all animations for this character.
      const mixer = new THREE.AnimationMixer(model);
      playerMixer = mixer;

      // CHANGED: all paths are now relative ('./models/...') so they work when hosted in a subfolder
      const animations = {
        idle: './models/animations/idle.fbx',
        walk: './models/animations/walking.fbx',
        run: './models/animations/running.fbx',
        jump: './models/animations/jumping-up.fbx',
        crouchIdle: './models/animations/crouching-idle.fbx',
        crouchWalk: './models/animations/crouched-walking.fbx',
      };

      const boneNames = new Set();

      model.traverse((object) => {
        boneNames.add(object.name);
      });

      for (const [name, path] of Object.entries(animations)) {
        fbxLoader.load(
          path,

          (fbx) => {
            // Ignore animations belonging to a model that was replaced.
            if (playerModel !== model) return;

            const sourceClip = fbx.animations[0];

            if (!sourceClip) {
              console.error(`No animation clip found in ${path}`);
              return;
            }

            // Keep the working fix: exclude Armature and Hips tracks.

            if (name === 'crouchIdle') {
              console.log(
                'Crouch idle tracks:',
                sourceClip.tracks.map((track) => track.name)
              );
            }

            console.log(
              'Crouch foot position tracks:',
              sourceClip.tracks
                .filter((track) =>
                  /Foot|Toe/i.test(track.name) &&
                  /\.position$/.test(track.name)
                )
                .map((track) => track.name)
            );

            const validTracks = sourceClip.tracks.filter((track) => {
              const parts = track.name.split('.');
              const nodeName = parts[0];
              const property = parts[1];

              const isCrouchAnimation =
                name === 'crouchIdle' || name === 'crouchWalk';

              const isVerticalPositionTrack =
                property === 'position' &&
                isCrouchAnimation;


              const isHipsTrack = nodeName === 'Hips';

              // Keep the existing Hips exclusion for other animations,
              // but allow Hips rotation during crouching.
              return (
                boneNames.has(nodeName) &&
                nodeName !== 'Armature' &&
                nodeName !== 'Hips' &&
                !isVerticalPositionTrack
              );

            });




            if (validTracks.length === 0) {
              console.error(`No compatible tracks found for ${name}`);
              return;
            }

            const clip = new THREE.AnimationClip(
              name,
              sourceClip.duration,
              validTracks
            );

            const action = mixer.clipAction(clip);
            action.setLoop(THREE.LoopRepeat, Infinity);

            playerActions[name] = action;

            console.log(
              `${name} animation loaded:`,
              validTracks.length,
              'tracks'
            );

            // Start idle once it is available, unless another
            // animation has already started.
            if (name === 'idle' && !activeAction) {
              action.play();
              activeAction = action;
            }
          },

          undefined,

          (error) => {
            console.error(`Failed to load ${name} animation:`, error);
          }
        );
      }

      console.log('🎉 Player model loaded!');
    },

    undefined,

    (error) => {
      console.error('Failed to load player model:', error);
    }
  );
}


function playPlayerAnimation(name) {
  const nextAction = playerActions[name];

  // The requested animation may still be loading.
  if (!nextAction || activeAction === nextAction) return;

  nextAction.reset();
  nextAction.enabled = true;
  nextAction.setEffectiveTimeScale(1);
  nextAction.setEffectiveWeight(1);
  nextAction.play();

  if (activeAction) {
    activeAction.crossFadeTo(nextAction, 0.25, false);
  }

  activeAction = nextAction;
}



// ---------- Level manager ----------
const LEVEL_BUILDERS = [buildLevel1, buildLevel2, buildLevel3];
let currentLevel = null;
let currentLevelIndex = 0;
let gameEnded = false;
let advanceTimeout = null;
let levelLoading = false;
let loadGeneration = 0;
const securityRun = new SecurityRun({
  onChange: ({ strikes, exposure }) => {
    el('security-strikes').textContent = `STRIKES: ${strikes} / 3`;
    const warning = el('camera-exposure');
    warning.classList.toggle('hidden', exposure === 0);
    warning.textContent = `CAMERA EXPOSURE: ${exposure.toFixed(1)} / 3.0 s — find cover!`;
  },
  onStrike: (source) => {
    playerControls.teleport(currentLevel.spawn);
    previousPlayerPosition.copy(camera.position);
    aiState.reset();
    interaction.reset();
    // CHANGED: added the 'surge' case for the Level 3 core shockwaves
    const reason = source.endsWith('-pin') ? 'Four incorrect PINs'
      : source === 'camera' ? 'Camera detected you'
      : source === 'surge' ? 'Core shockwave hit you'
      : 'Laser triggered';
    hud.setObjective(`${reason} — strike ${securityRun.strikes} of 3. Back at the entrance; 3 seconds to recover. ${currentLevel.objective}`);
  },
  onLose: (source) => {
    gameEnded = true;
    clearTimeout(advanceTimeout);
    hud.resetLevelComplete();
    terminal.close();
    interaction.reset();
    playerControls.enabled = false;
    playerControls.unlock();
    // CHANGED: added the 'surge' case for the Level 3 core shockwaves
    el('lose-reason').textContent = source.endsWith('-pin')
      ? 'Four incorrect PIN attempts caused your third strike. Check the clues before submitting another code.'
      : source === 'camera'
      ? 'Three seconds in camera view caused your third strike. Break line of sight to reset the exposure timer.'
      : source === 'surge'
      ? 'The core\'s shockwaves caused your third strike. Jump the ring or run through the safe gap.'
      : 'A laser caused your third strike. Jump low beams and duck under high beams.';
    showOnly(loseScreen);
    el('btn-retry-level').focus();
  },
});

function clearScene() {
  loadGeneration++;
  levelLoading = false;
  loadingScreen.classList.add('hidden');
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

async function loadLevel(index, entry = 'door', resetStrikes = false) {
  clearScene();
  const generation = loadGeneration;
  const needsLoadingScreen = index === 1;
  gameEnded = false;
  if (resetStrikes) securityRun.reset();
  else {
    securityRun.exposure = 0;
    securityRun.grace = 0;
    securityRun.notify();
  }
  hud.resetLevelComplete();

  if (needsLoadingScreen) {
    levelLoading = true;
    playerControls.enabled = false;
    showOnly();
    loadingScreen.style.transition = 'none';
    loadingScreen.style.opacity = '1';
    loadingScreen.classList.remove('hidden');
    loadingLabel.textContent = 'Preparing the control room...';
    loadingBarFill.style.width = '0%';
    // Paint the transition before any cached geometry is prepared on the main thread.
    await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
    if (generation !== loadGeneration) return;
    await preloadLevel2Models((finished, total) => {
      if (generation === loadGeneration) loadingBarFill.style.width = `${Math.round(finished / total * 75)}%`;
    });
    if (generation !== loadGeneration) return;
    loadingLabel.textContent = 'Setting up the control room...';
  }

  const builder = LEVEL_BUILDERS[index];
  const args = { scene, aiState, hud, terminalUI: terminal, onEnding: playEnding,
    onCameraExposure: (delta, visible) => securityRun.cameraExposure(delta, visible),
    onPinStrike: (source) => securityRun.strike(source),
    onSecurityHit: () => securityRun.strike('laser'),
    onSurgeHit: () => securityRun.strike('surge'), // CHANGED: new callback used by Level 3's shockwaves
    onShock: (position) => playerControls.teleport(position),
    onChairSit: ({ position, target, onStand }) => playerControls.sit(position, target, onStand),
    isPlayerSeated: () => playerControls.isSeated,
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

  if (needsLoadingScreen) {
    await currentLevel.ready;
    if (generation !== loadGeneration) return;
    loadingBarFill.style.width = '90%';
    loadingLabel.textContent = 'Finishing room lighting...';
    // Upload textures and compile materials behind the transition, before play resumes.
    const textures = new Set();
    scene.traverse(object => {
      if (object.material) {
        for (const value of Object.values(object.material)) if (value?.isTexture) textures.add(value);
      }
    });
    textures.forEach(texture => renderer.initTexture(texture));
    try { await renderer.compileAsync(scene, camera); }
    catch (error) { console.warn('Room lighting preparation will finish on first render.', error); }
    if (generation !== loadGeneration) return;
    renderer.render(scene, camera);
    await new Promise(resolve => requestAnimationFrame(resolve));
    if (generation !== loadGeneration) return;
    loadingBarFill.style.width = '100%';
    loadingScreen.classList.add('hidden');
    levelLoading = false;
    playerControls.enabled = true;
    // Keep the existing pointer lock across transitions. If Escape released it,
    // Resume provides the fresh click the browser requires to capture the mouse.
    if (playerControls.isLocked) showOnly();
    else showOnly(pauseMenu);
  }

  loadPlayerModel();

  hud.setObjective(currentLevel.objective);
  hud.showLevelBanner(currentLevel.title, currentLevel.subtitle);
  if (index === 0) {
    // Defer Level 2 background model caching until Level 1 has stabilized and player is playing
    const deferPreload = () => {
      if (generation === loadGeneration && !gameEnded) {
        void preloadLevel2Models();
      }
    };
    if (window.requestIdleCallback) {
      setTimeout(() => window.requestIdleCallback(deferPreload, { timeout: 10000 }), 6000);
    } else {
      setTimeout(deferPreload, 8000);
    }
  }

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
  [mainMenu, pauseMenu, creditsScreen, loseScreen, guidanceModal, controlsModal].forEach((e) => e?.classList.add('hidden'));
  visibleEls.forEach((e) => e?.classList.remove('hidden'));
}

function pauseSplineViewer() {
  const spline = document.querySelector('spline-viewer');
  if (spline) {
    spline.style.display = 'none';
    spline.style.visibility = 'hidden';
    try { spline.stop?.(); } catch (_) {}
  }
}

function resumeSplineViewer() {
  const spline = document.querySelector('spline-viewer');
  if (spline) {
    spline.style.display = 'block';
    spline.style.visibility = 'visible';
    try { spline.play?.(); } catch (_) {}
  }
}

function startFacilityGame() {
  if (backgroundMusic) {
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
  }
  pauseSplineViewer();
  sound.init();
  showOnly();
  hudRoot.classList.remove('hidden');
  inventory.clear();
  equipment.equipTool('torch');

  // CHANGED: dev-only shortcut. Open http://localhost:5173/?level=2 to start on Level 3.
  // import.meta.env.DEV is false in production builds, so this is ignored once deployed.
  const startLevel = import.meta.env.DEV
    ? Number(new URLSearchParams(location.search).get('level') ?? 0)
    : 0;
  loadLevel(startLevel, 'door', true);

  playerControls.lock();
}

// Start game triggers: Click opens the tactical guidance screen
el('btn-play')?.addEventListener('click', (e) => {
  e.preventDefault();
  showOnly(guidanceModal);
});
el('btn-hero-play')?.addEventListener('click', (e) => {
  e.preventDefault();
  showOnly(guidanceModal);
});

// Guidance modal action triggers
el('btn-start-infiltration')?.addEventListener('click', () => {
  startFacilityGame();
});

el('btn-guidance-close')?.addEventListener('click', () => {
  if (currentLevel && hudRoot && !hudRoot.classList.contains('hidden')) {
    guidanceModal?.classList.add('hidden');
    playerControls.lock();
  } else {
    showOnly(mainMenu);
  }
});

// Real video game UI hover sound effects
document.querySelectorAll('.game-menu-btn, .btn-guidance-start').forEach((btn) => {
  btn.addEventListener('mouseenter', () => {
    sound.playKeypadBeep();
  });
});

// Navigation Bar & Modal Listeners
el('nav-home')?.addEventListener('click', (e) => {
  e.preventDefault();
  guidanceModal?.classList.add('hidden');
  controlsModal?.classList.add('hidden');
  creditsScreen?.classList.add('hidden');
  showOnly(mainMenu);
});

// Background music auto-start on user gesture
const tryPlayMusic = () => {
  if (backgroundMusic && backgroundMusic.paused && !mainMenu.classList.contains('hidden')) {
    backgroundMusic.volume = 0.4;
    backgroundMusic.play().catch(() => {});
  }
};
window.addEventListener('click', tryPlayMusic, { once: true });
window.addEventListener('keydown', tryPlayMusic, { once: true });

// Navigation Bar & Modal Listeners
el('nav-mission')?.addEventListener('click', (e) => {
  e.preventDefault();
  showOnly(guidanceModal);
});

el('btn-hero-brief')?.addEventListener('click', (e) => {
  e.preventDefault();
  showOnly(guidanceModal);
});

el('objective-panel')?.addEventListener('click', () => {
  if (playerControls.isLocked) {
    playerControls.unlock();
  }
  showOnly(guidanceModal);
});

el('nav-controls')?.addEventListener('click', (e) => {
  e.preventDefault();
  showOnly(controlsModal);
});

el('btn-controls-close')?.addEventListener('click', () => {
  if (currentLevel && hudRoot && !hudRoot.classList.contains('hidden')) {
    controlsModal?.classList.add('hidden');
    playerControls.lock();
  } else {
    showOnly(mainMenu);
  }
});

el('nav-credits')?.addEventListener('click', (e) => {
  e.preventDefault();
  renderCredits(el('credits-list'));
  showOnly(creditsScreen);
});

el('btn-credits')?.addEventListener('click', () => {
  renderCredits(el('credits-list'));
  showOnly(creditsScreen);
});
el('btn-credits-close')?.addEventListener('click', () => showOnly(mainMenu));

el('btn-resume')?.addEventListener('click', () => {
  showOnly();
  playerControls.lock();
});

if (btnAudio) {
  btnAudio.addEventListener('click', () => {
    const muted = sound.toggleMute();
    btnAudio.textContent = muted ? 'AUDIO: MUTED' : 'AUDIO: ON';
  });
}

el('btn-restart')?.addEventListener('click', () => {
  startFacilityGame();
});

el('btn-quit-menu')?.addEventListener('click', () => {
  clearScene();
  hudRoot.classList.add('hidden');
  if (cctvContainer) cctvContainer.classList.add('hidden');
  resumeSplineViewer();
  showOnly(mainMenu);
  if (backgroundMusic) {
    backgroundMusic.currentTime = 0;
    backgroundMusic.play().catch(() => {});
  }
});

el('btn-retry-level')?.addEventListener('click', () => {
  showOnly();
  loadLevel(currentLevelIndex, 'door', true);
  playerControls.lock();
});
el('btn-lose-menu')?.addEventListener('click', () => {
  clearScene();
  hudRoot.classList.add('hidden');
  if (cctvContainer) cctvContainer.classList.add('hidden');
  resumeSplineViewer();
  showOnly(mainMenu);
  if (backgroundMusic) {
    backgroundMusic.currentTime = 0;
    backgroundMusic.play().catch(() => {});
  }
});

document.addEventListener('keydown', (e) => {
  // If on main menu, Enter opens guidance modal
  if (!mainMenu.classList.contains('hidden') && e.code === 'Enter') {
    showOnly(guidanceModal);
    return;
  }
  // If Lose screen is showing, pressing [R] or Enter restarts the level immediately
  if (loseScreen && !loseScreen.classList.contains('hidden') && (e.code === 'KeyR' || e.code === 'Enter')) {
    showOnly();
    loadLevel(currentLevelIndex, 'door', true);
    playerControls.lock();
    return;
  }
  // If Guidance modal is showing, pressing [Enter] commences infiltration
  if (guidanceModal && !guidanceModal.classList.contains('hidden') && (e.code === 'Enter' || e.code === 'NumpadEnter')) {
    startFacilityGame();
    return;
  }
  // In-game: Press [H] to toggle Guidance & Riddle modal
  if (e.code === 'KeyH' && !e.repeat) {
    if (guidanceModal && !guidanceModal.classList.contains('hidden')) {
      guidanceModal.classList.add('hidden');
      if (currentLevel) playerControls.lock();
    } else if (playerControls.isLocked) {
      playerControls.unlock();
      showOnly(guidanceModal);
    }
    return;
  }
  if (e.code !== 'Escape') return;
  if (guidanceModal && !guidanceModal.classList.contains('hidden')) {
    guidanceModal.classList.add('hidden');
    if (currentLevel && hudRoot && !hudRoot.classList.contains('hidden')) {
      playerControls.lock();
    } else {
      showOnly(mainMenu);
    }
    return;
  }
  if (controlsModal && !controlsModal.classList.contains('hidden')) {
    controlsModal.classList.add('hidden');
    if (currentLevel && hudRoot && !hudRoot.classList.contains('hidden')) {
      playerControls.lock();
    } else {
      showOnly(mainMenu);
    }
    return;
  }
  if (creditsScreen && !creditsScreen.classList.contains('hidden')) {
    showOnly(mainMenu);
    return;
  }
  if (terminal.open) return;
  if (backpackUI.isOpen) return;
  if (playerControls.isLocked) {
    playerControls.unlock();
  }
});

function resumeAfterPanel(event) {
  if (levelLoading || gameEnded) return;
  if (mainMenu.classList.contains('hidden') && creditsScreen.classList.contains('hidden')) {
    showOnly(pauseMenu);
    // The keypad's Continue click/Enter supplies the gesture needed to
    // recapture the mouse. Keep Resume visible if capture is declined.
    if (event.detail?.resume) playerControls.lock();
  }
}
document.addEventListener('security-keypad-close', resumeAfterPanel);
document.addEventListener('wiring-panel-close', resumeAfterPanel);

playerControls.controls.addEventListener('unlock', () => {
  if (levelLoading || gameEnded) return;
  if (document.getElementById('security-keypad-overlay')) return;
  if (document.getElementById('wiring-panel-overlay')) return;
  if (backpackUI.isOpen) return;
  if (terminal.open) return;
  if (!mainMenu.classList.contains('hidden')) return;
  if (!creditsScreen.classList.contains('hidden')) return;
  if (guidanceModal && !guidanceModal.classList.contains('hidden')) return;
  if (loseScreen && !loseScreen.classList.contains('hidden')) return;
  if (controlsModal && !controlsModal.classList.contains('hidden')) return;
  showOnly(pauseMenu);
});

playerControls.controls.addEventListener('lock', () => {
  if (!levelLoading && mainMenu.classList.contains('hidden')) pauseMenu.classList.add('hidden');
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
  // Pre-load and cache the backpack model during boot sequence
  // so that character spawn into 3D gameplay has zero GLTF parsing stutter.
  gltfLoader.load(
    './models/backpack_photogrammetry.glb',
    (gltf) => {
      backpackModelTemplate = gltf.scene;
    },
    undefined,
    (err) => console.warn('Early backpack pre-cache failed:', err)
  );

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
  requestAnimationFrame(tick);

  // If on the landing page menu or initial boot loader, pause Three.js rendering
  // to eliminate GPU/CPU contention with the interactive Spline robot viewer and landing audio.
  const isLandingMenu = !mainMenu.classList.contains('hidden');
  const isInitialBoot = !currentLevel && loadingScreen && !loadingScreen.classList.contains('hidden');
  if (isLandingMenu || isInitialBoot) {
    return;
  }

  const delta = Math.min(clock.getDelta(), 0.05);

  if (playerMixer) {
    playerMixer.update(delta);
  }


  if (playerControls.isLocked && !levelLoading && !gameEnded) {

    securityRun.update(delta);

    playerControls.update(delta);

    const controls = playerControls.move;

    const isMoving =
      controls.forward ||
      controls.back ||
      controls.left ||
      controls.right;

    let animationName;

    if (!playerControls.grounded) {
      animationName = 'jump';
    } else if (playerControls.height < PLAYER_HEIGHT) {
      animationName = isMoving ? 'crouchWalk' : 'crouchIdle';
    } else if (isMoving && controls.sprint) {
      animationName = 'run';
    } else if (isMoving) {
      animationName = 'walk';
    } else {
      animationName = 'idle';
    }

    playPlayerAnimation(animationName);



    interaction.update(delta);
    pickupSystem.update(delta);

    currentLevel?.update?.(delta, camera);

    if (playerModel) {
      playerModel.visible = playerControls.cameraMode === "third";

      // Keep the character on the ground and follow the player.
      playerModel.position.x = camera.position.x;
      playerModel.position.z = camera.position.z;

      playerModel.position.y = camera.position.y - playerControls.height;

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

    // Keep the camera behind the player based on horizontal look direction.
    const horizontalDirection = direction.clone();
    horizontalDirection.y = 0;
    horizontalDirection.normalize();

    // Follow the physical eye height; PlayerControls applies crouch once.
    const thirdPersonPosition = camera.position.clone()
      .addScaledVector(horizontalDirection, -1.8)
      .add(new THREE.Vector3(0, 0.5, 0));

    thirdPersonCamera.position.lerp(thirdPersonPosition, 0.10);

    // Preserve the existing limited mouse-look angle.
    const horizontalAngle = Math.atan2(direction.x, direction.z);
    const pitch = Math.asin(
      THREE.MathUtils.clamp(direction.y, -1, 1)
    );

    const limitedPitch = THREE.MathUtils.clamp(
      pitch,
      MIN_CAMERA_PITCH,
      MAX_CAMERA_PITCH
    );

    const lookDirection = new THREE.Vector3(
      Math.sin(horizontalAngle) * Math.cos(limitedPitch),
      Math.sin(limitedPitch),
      Math.cos(horizontalAngle) * Math.cos(limitedPitch)
    );

    // Aim at the player's normal reference height, not the lowered
    // first-person camera height.
    const lookTarget = new THREE.Vector3(
      camera.position.x,
      camera.position.y - 0.5,
      camera.position.z
    ).addScaledVector(lookDirection, 5);


    thirdPersonCamera.lookAt(lookTarget);
    }

  // Animate viewmodel sway & breathing in first person mode
  const isMoving =
    playerControls.move.forward ||
    playerControls.move.back ||
    playerControls.move.left ||
    playerControls.move.right;
  const isFirstPerson = playerControls.cameraMode !== "third";
  viewmodel.update(delta, playerControls.isLocked && isMoving, playerControls.move.sprint, isFirstPerson);

  previousCameraMode = playerControls.cameraMode;

  const activeCamera =
    playerControls.cameraMode === "third" ? thirdPersonCamera : camera;

  // Render primary camera view.
  renderer.render(scene, activeCamera);

  // Render secondary CCTV Camera PiP view if active.
  const cctvEnabled = !!currentLevel?.cctvCamera && currentLevel.cctvEnabled !== false;
  cctvContainer?.classList.toggle('hidden', !cctvEnabled);
  if (cctvEnabled && cctvRenderer) {
    // CCTV sees the character even when the first-person view hides their body.
    const wasVisible = playerModel?.visible;
    if (playerModel) playerModel.visible = true;
    try {
      cctvRenderer.render(scene, currentLevel.cctvCamera);
    } finally {
      if (playerModel) playerModel.visible = wasVisible;
    }
  }
}

tick();

// Window bindings for debug and cinematic trailer captures
window.loadLevel = loadLevel;
window.playerControls = playerControls;
window.toggleCamera = () => {
  playerControls.cameraMode = playerControls.cameraMode === "first" ? "third" : "first";
  if (playerModel) playerModel.visible = playerControls.cameraMode === "third";
};
