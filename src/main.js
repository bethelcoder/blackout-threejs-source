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
import { attachHardHat } from './scenes/hardHat.js';
import { preloadLevel2Models } from './systems/modelCache.js';
import { createShockOverlay } from './shaders/shockOverlay.js';
import { createCctvFeed } from './shaders/cctvFeed.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { inventory } from './systems/inventory.js';
import { PickupSystem } from './systems/pickupSystem.js';
import { EquipmentSystem } from './systems/equipment.js';
import { Viewmodel } from './systems/viewmodel.js';
import { CharacterGrip } from './systems/characterGrip.js';
import { BackpackUI } from './systems/backpackUI.js';
import { buildHeldTool } from './systems/heldTools.js';
import { RenderQuality } from './systems/renderQuality.js';

// ---------- Renderer / scene / camera ----------
const canvas = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
const renderQuality = new RenderQuality(renderer);
renderQuality.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio);
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
let cctvFeed = null;
if (cctvCanvas) {
  cctvRenderer = new THREE.WebGLRenderer({ canvas: cctvCanvas, antialias: false });
  cctvRenderer.setSize(240, 135);
  cctvRenderer.outputColorSpace = THREE.SRGBColorSpace;
  cctvRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  cctvRenderer.toneMappingExposure = 1.35;
  cctvFeed = createCctvFeed({ width: 240, height: 135 });
}

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x1a2634, 0.005);

// Full-screen electrical hit feedback, drawn over whichever camera is active.
const shockOverlay = createShockOverlay();

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
const PLAYER_HEIGHT = 1.7;
//3rd person camera

const thirdPersonCamera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);

const MIN_CAMERA_PITCH = -0.08;
const MAX_CAMERA_PITCH = 0.15;

// Player flashlight / headlamp
// Short, soft-edged beam for finding nearby controls in an unlit room.
const flashlight = new THREE.SpotLight(0xfff1db, 3.5, 7, Math.PI / 7, 0.75, 1.5);
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

  renderQuality.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio);
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

// Third-person hand attachment: one anchor on the avatar's right-hand bone.
// Declared before the subscription below because onEquipChange fires immediately.
let handAnchor = null;
const handToolMeshes = new Map();

// Rebuilt with every avatar load; the mixer overwrites finger poses each frame,
// so the grip is re-applied in tick right after the mixer runs.
let characterGrip = null;

equipment.onEquipChange((itemId) => syncHeldTool(itemId));

const pickupSystem = new PickupSystem(
  () => (playerControls.cameraMode === "third" ? thirdPersonCamera : camera),
  scene,
  pickupPrompt,
  hudToast,
  (itemId) => equipment.equipTool(itemId)
);

// Level 2's carry slot only hides the world prop. Mirroring it into the hand
// keeps the pickup visible without putting it in the bag, and hands back
// whatever the player was holding once the prop is put down again.
let carriedItemId = null;
let handBeforeCarry = null;
function setCarryHand(itemId) {
  if (itemId === carriedItemId) return;
  if (!itemId) {
    const previous = handBeforeCarry;
    const wasInHand = carriedItemId !== null && equipment.isEquipped(carriedItemId);
    carriedItemId = null;
    handBeforeCarry = null;
    if (wasInHand) {
      if (previous) equipment.equipTool(previous);
      else equipment.unequipTool();
    }
    return;
  }
  if (carriedItemId === null) handBeforeCarry = equipment.equippedTool;
  carriedItemId = itemId;
  equipment.equipTool(itemId);
}

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

// The equipped tool is parented to the avatar's right hand so third person
// shows the same tool the first-person viewmodel is holding.
function attachHeldToolToCharacter(characterModel) {
  let handBone = null;
  characterModel.traverse((child) => {
    if (child.isBone && child.name === 'RightHand') handBone = child;
  });

  const anchor = new THREE.Group();
  anchor.name = 'HeldToolAnchor';
  // Mixamo hand bones run +Y from wrist to fingertips: the tool's grip follows
  // that. The offset seats it against the palm, and ZYX order lets the last
  // rotation tip the working end forward. With the arms hanging at the sides a
  // vertical tool is swallowed by the hip pouch, so the tool is tipped forward
  // and scaled up slightly to stay readable from the third-person camera.
  anchor.position.set(0, 0.045, 0.024);
  anchor.rotation.order = 'ZYX';
  anchor.rotation.set(0.9, 0, -0.45);
  anchor.scale.setScalar(1.15);
  (handBone ?? characterModel).add(anchor);
  handAnchor = anchor;

  // Tool meshes outlive a model reload; move them under the new anchor.
  for (const mesh of handToolMeshes.values()) anchor.add(mesh);
  syncHeldTool(equipment.equippedTool);
}

function syncHeldTool(itemId) {
  if (!handAnchor) return;
  if (itemId && !handToolMeshes.has(itemId)) {
    const mesh = buildHeldTool(itemId);
    if (mesh) {
      mesh.traverse((object) => {
        if (object.isMesh) { object.castShadow = true; object.receiveShadow = true; }
      });
      handToolMeshes.set(itemId, mesh);
      handAnchor.add(mesh);
    }
  }
  for (const [id, mesh] of handToolMeshes) mesh.visible = id === itemId;
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
    characterGrip = null;
  }

  playerActions = {};
  activeAction = null;

  gltfLoader.load(
    // CHANGED: was '/models/player.glb' (absolute path 404s when hosted in a subfolder).
    // ?v= is manual cache-busting: public/ files are served under their original
    // name, so Vite never hashes them and browsers keep the old avatar after deploy.
    // Bump it whenever player.glb changes.
    './models/player.glb?v=2',

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

      // Rigid hat, bone-parented before the model is scaled/moved so the offsets
      // stay in the avatar's own metres.
      attachHardHat(model);

      // The clips rotate the armature -90 degrees, which leaves every skinned
      // mesh's bounding volume lying on the floor while the body renders upright.
      // Frustum culling then hides parts individually (the head most visibly).
      model.traverse((object) => {
        if (object.isMesh) object.frustumCulled = false;
      });

      model.scale.set(1.2, 1.2, 1.2);
      model.position.copy(camera.position);
      model.position.y = 0;
      model.rotation.y = 0;
      model.visible = playerControls.cameraMode === "third";

      // Attach worn backpack so character wears it in 3rd person
      attachBackpackToCharacter(model);
      attachHeldToolToCharacter(model);
      characterGrip = new CharacterGrip(model);


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

            console.log('Loaded animation:', name, path);
            console.log('Animation clips:', fbx.animations.map(clip => clip.name));

            const sourceClip = fbx.animations[0];

            if (!sourceClip) {
              console.error(`No animation clip found in ${path}`);
              return;
            }

            // Every Mixamo clip rotates its Armature node -90 degrees about X and
            // authors the bone rotations in that space, so the Armature track must be
            // kept; dropping it tips the whole character onto the floor.
            const validTracks = sourceClip.tracks
              .filter((track) => boneNames.has(track.name.split('.')[0]))
              .map((track) => {
                if (track.name !== 'Hips.position') return track;

                // The clips travel through world space while the game drives movement,
                // so pin the hips' horizontal components to the first keyframe.
                // In that -90 degree armature space, local X/Y are horizontal and
                // local Z is height, which must stay for crouching and jumping.
                const values = track.values;
                const startX = values[0];
                const startY = values[1];

                for (let i = 0; i < values.length; i += 3) {
                  values[i] = startX;
                  values[i + 1] = startY;
                }

                return track;
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
// Designated interior room boundary constraints (prevents cameras from escaping into the void)
const LEVEL_BOUNDS = [
  // Level 1: width 14 (±7), depth 20 (±10), height 6.8
  { minX: -6.70, maxX: 6.70, minZ: -9.70, maxZ: 9.70, minY: 0.35, maxY: 6.50 },
  // Level 2: width 14 (±7), depth 16 (±8), height 4.2
  { minX: -6.70, maxX: 6.70, minZ: -7.70, maxZ: 7.70, minY: 0.35, maxY: 3.90 },
  // Level 3: width 14 (±7), depth 14 (±7), height 5.5
  { minX: -6.70, maxX: 6.70, minZ: -6.70, maxZ: 6.70, minY: 0.35, maxY: 5.20 },
];

function snapThirdPersonCamera() {
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  const horizontalDirection = direction.clone();
  horizontalDirection.y = 0;
  horizontalDirection.normalize();

  const cameraAnchor = camera.position.clone().add(new THREE.Vector3(0, -0.25, 0));
  const desiredTarget = camera.position.clone()
    .addScaledVector(horizontalDirection, -1.8)
    .add(new THREE.Vector3(0, 0.45, 0));

  const toCameraVec = desiredTarget.clone().sub(cameraAnchor);
  const desiredDist = toCameraVec.length();
  const rayDir = toCameraVec.clone().normalize();

  let safeDistance = desiredDist;
  const cameraRay = new THREE.Ray(cameraAnchor, rayDir);
  const hitPoint = new THREE.Vector3();

  if (currentLevel?.colliders) {
    for (const box of currentLevel.colliders) {
      if (!box || box.isEmpty()) continue;
      if (cameraRay.intersectBox(box, hitPoint)) {
        const hitDist = cameraAnchor.distanceTo(hitPoint);
        if (hitDist < safeDistance) safeDistance = hitDist;
      }
    }
  }

  const buffer = Math.min(0.20, safeDistance * 0.4);
  const finalDist = safeDistance < desiredDist ? Math.max(0.05, safeDistance - buffer) : desiredDist;
  const targetPos = cameraAnchor.clone().addScaledVector(rayDir, finalDist);

  const bounds = LEVEL_BOUNDS[currentLevelIndex] || LEVEL_BOUNDS[0];
  targetPos.x = THREE.MathUtils.clamp(targetPos.x, bounds.minX, bounds.maxX);
  targetPos.y = THREE.MathUtils.clamp(targetPos.y, bounds.minY, bounds.maxY);
  targetPos.z = THREE.MathUtils.clamp(targetPos.z, bounds.minZ, bounds.maxZ);

  thirdPersonCamera.position.copy(targetPos);
}

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
    snapThirdPersonCamera();
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
  terminal.close();
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
  const needsLoadingScreen = index === 1 || index === 2;
  const roomName = index === 2 ? 'AI core' : 'control room';
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
    loadingLabel.textContent = `Preparing the ${roomName}...`;
    loadingBarFill.style.width = '0%';
    // Paint the transition before any cached geometry is prepared on the main thread.
    await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
    if (generation !== loadGeneration) return;
    if (index === 1) {
      await preloadLevel2Models((finished, total) => {
        if (generation === loadGeneration) loadingBarFill.style.width = `${Math.round(finished / total * 75)}%`;
      });
    }
    if (generation !== loadGeneration) return;
    loadingLabel.textContent = `Setting up the ${roomName}...`;
  }

  const builder = LEVEL_BUILDERS[index];
  const args = { scene, aiState, hud, terminalUI: terminal, onEnding: playEnding,
    onCameraExposure: (delta, visible) => securityRun.cameraExposure(delta, visible),
    onPinStrike: (source) => securityRun.strike(source),
    onSecurityHit: () => securityRun.strike('laser'),
    onSurgeHit: () => securityRun.strike('surge'), // CHANGED: new callback used by Level 3's shockwaves
    onShock: (position) => {
      playerControls.teleport(position);
      snapThirdPersonCamera();
      shockOverlay.trigger();
    },
    onChairSit: ({ position, target, onStand }) => playerControls.sit(position, target, onStand),
    isPlayerSeated: () => playerControls.isSeated,
    onVentEnter: () => { playerControls.enabled = false; interaction.reset(); },
    onVentExit: () => loadLevel(1, 'vent'),
    // Level 1's toolbox hands a tool straight to the bag and the hand, so the
    // vent gating reads the same state that draws the tool in both views.
    onToolTaken: (itemId) => {
      if (!inventory.hasItem(itemId)) inventory.addItem(itemId);
      equipment.equipTool(itemId);
    },
    getHeldToolId: () => equipment.equippedTool,
    onCarryChange: setCarryHand };
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
  snapThirdPersonCamera();

  aiState.reset();

  // A carried puzzle prop belongs to the level it came from.
  if (carriedItemId && equipment.isEquipped(carriedItemId)) equipment.equipTool('torch');
  carriedItemId = null;
  handBeforeCarry = null;

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

function isGameActive() {
  return currentLevel !== null && hudRoot && !hudRoot.classList.contains('hidden');
}

function openGuidanceModal() {
  const btnStart = el('btn-start-infiltration');
  const btnClose = el('btn-guidance-close');
  const textSpan = btnStart?.querySelector('.btn-text');
  const closeTextSpan = btnClose?.querySelector('.btn-text');

  if (isGameActive()) {
    // In-game mode: User opened guidance with [H] or clicked objective panel
    if (textSpan) {
      textSpan.textContent = 'RESUME INFILTRATION [ENTER]';
    } else if (btnStart) {
      btnStart.innerHTML = '<span class="btn-arrow">&#9658;</span> <span class="btn-text">RESUME INFILTRATION [ENTER]</span>';
    }
    btnStart?.classList.remove('primary');
    btnStart?.classList.add('resume-start');

    if (closeTextSpan) {
      closeTextSpan.textContent = 'CLOSE DOSSIER [ESC]';
    } else if (btnClose) {
      btnClose.innerHTML = '<span class="btn-arrow">&#9658;</span> <span class="btn-text">CLOSE DOSSIER [ESC]</span>';
    }
  } else {
    // Main menu mode: User clicked "MISSION DOSSIER" or pressed Enter on title screen
    if (textSpan) {
      textSpan.textContent = 'COMMENCE INFILTRATION [ENTER]';
    } else if (btnStart) {
      btnStart.innerHTML = '<span class="btn-arrow">&#9658;</span> <span class="btn-text">COMMENCE INFILTRATION [ENTER]</span>';
    }
    btnStart?.classList.add('primary');
    btnStart?.classList.remove('resume-start');

    if (closeTextSpan) {
      closeTextSpan.textContent = 'BACK TO MENU';
    } else if (btnClose) {
      btnClose.innerHTML = '<span class="btn-arrow">&#9658;</span> <span class="btn-text">BACK TO MENU</span>';
    }
  }

  showOnly(guidanceModal);
}

function closeGuidanceModal() {
  guidanceModal?.classList.add('hidden');
  if (isGameActive()) {
    playerControls.lock();
  } else {
    showOnly(mainMenu);
  }
}

// Start game triggers: Click opens the tactical guidance screen
el('btn-play')?.addEventListener('click', (e) => {
  e.preventDefault();
  openGuidanceModal();
});
el('btn-hero-play')?.addEventListener('click', (e) => {
  e.preventDefault();
  openGuidanceModal();
});

// Guidance modal action triggers
el('btn-start-infiltration')?.addEventListener('click', () => {
  if (isGameActive()) {
    closeGuidanceModal();
  } else {
    startFacilityGame();
  }
});

el('btn-guidance-close')?.addEventListener('click', () => {
  closeGuidanceModal();
});

// Real video game UI hover sound effects
document.querySelectorAll('.game-menu-btn, .btn-guidance-start, .tactical-btn').forEach((btn) => {
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
  openGuidanceModal();
});

el('btn-hero-brief')?.addEventListener('click', (e) => {
  e.preventDefault();
  openGuidanceModal();
});

el('objective-panel')?.addEventListener('click', () => {
  if (playerControls.isLocked) {
    playerControls.unlock();
  }
  openGuidanceModal();
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
    openGuidanceModal();
    return;
  }
  // If Lose screen is showing, pressing [R] or Enter restarts the level immediately
  if (loseScreen && !loseScreen.classList.contains('hidden') && (e.code === 'KeyR' || e.code === 'Enter')) {
    showOnly();
    loadLevel(currentLevelIndex, 'door', true);
    playerControls.lock();
    return;
  }
  // If Guidance modal is showing, pressing [Enter] commences or resumes infiltration
  if (guidanceModal && !guidanceModal.classList.contains('hidden') && (e.code === 'Enter' || e.code === 'NumpadEnter')) {
    if (isGameActive()) {
      closeGuidanceModal();
    } else {
      startFacilityGame();
    }
    return;
  }
  // In-game: Press [H] to toggle Guidance & Riddle modal
  if (e.code === 'KeyH' && !e.repeat) {
    if (guidanceModal && !guidanceModal.classList.contains('hidden')) {
      closeGuidanceModal();
    } else if (isGameActive()) {
      if (playerControls.isLocked) playerControls.unlock();
      openGuidanceModal();
    }
    return;
  }
  if (e.code !== 'Escape') return;
  if (guidanceModal && !guidanceModal.classList.contains('hidden')) {
    closeGuidanceModal();
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
  if (terminal.open || currentLevel?.panelOpen) return;
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
document.addEventListener('robot-repair-close', resumeAfterPanel);

playerControls.controls.addEventListener('unlock', () => {
  if (levelLoading || gameEnded) return;
  if (document.getElementById('security-keypad-overlay')) return;
  if (document.getElementById('wiring-panel-overlay')) return;
  if (backpackUI.isOpen) return;
  if (terminal.open || currentLevel?.panelOpen) return;
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
        loadingScreen.style.pointerEvents = 'none';
        setTimeout(() => {
          loadingScreen.classList.add('hidden');
          loadingScreen.style.display = 'none';
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
let cctvRefreshIn = 0;
function tick() {
  requestAnimationFrame(tick);

  // If on the landing page menu or initial boot loader, pause Three.js rendering
  // to eliminate GPU/CPU contention with the interactive Spline robot viewer and landing audio.
  const isLandingMenu = !mainMenu.classList.contains('hidden');
  const isInitialBoot = !currentLevel && loadingScreen && !loadingScreen.classList.contains('hidden');
  if (isLandingMenu || isInitialBoot || levelLoading) {
    clock.getDelta();
    renderQuality.reset();
    return;
  }

  const frameSeconds = clock.getDelta();
  const delta = Math.min(frameSeconds, 0.05);
  if (playerControls.isLocked && !document.hidden) renderQuality.update(frameSeconds);
  else renderQuality.reset();

  if (playerMixer) {
    playerMixer.update(delta);
  }
  if (characterGrip) {
    const heldMesh = handToolMeshes.get(equipment.equippedTool);
    characterGrip.update(Boolean(heldMesh?.visible));
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



    // Make the third-person camera follow behind the player with spring-arm obstacle avoidance.
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);

    // Keep the camera behind the player based on horizontal look direction.
    const horizontalDirection = direction.clone();
    horizontalDirection.y = 0;
    horizontalDirection.normalize();

    // The anchor point on the player (head/chest level)
    const cameraAnchor = camera.position.clone().add(new THREE.Vector3(0, -0.25, 0));

    // Desired camera target in open space (1.8m back, 0.45m up)
    const desiredTarget = camera.position.clone()
      .addScaledVector(horizontalDirection, -1.8)
      .add(new THREE.Vector3(0, 0.45, 0));

    // Vector from anchor to desired camera position
    const toCameraVec = desiredTarget.clone().sub(cameraAnchor);
    const desiredDist = toCameraVec.length();
    const rayDir = toCameraVec.clone().normalize();

    // Check collision against all level colliders (walls, cupboards, shelves, server racks)
    let safeDistance = desiredDist;
    const cameraRay = new THREE.Ray(cameraAnchor, rayDir);
    const hitPoint = new THREE.Vector3();

    if (currentLevel?.colliders) {
      for (const box of currentLevel.colliders) {
        if (!box || box.isEmpty()) continue;
        if (cameraRay.intersectBox(box, hitPoint)) {
          const hitDist = cameraAnchor.distanceTo(hitPoint);
          if (hitDist < safeDistance) {
            safeDistance = hitDist;
          }
        }
      }
    }

    // Maintain a safe buffer in front of any hit surface so camera near plane never clips into obstacles
    let finalDist = desiredDist;
    if (safeDistance < desiredDist) {
      const buffer = Math.min(0.20, safeDistance * 0.4);
      finalDist = Math.max(0.05, safeDistance - buffer);
    }
    const thirdPersonPosition = cameraAnchor.clone().addScaledVector(rayDir, finalDist);

    // Hard clamp within designated room space for the active level
    const bounds = LEVEL_BOUNDS[currentLevelIndex] || LEVEL_BOUNDS[0];
    thirdPersonPosition.x = THREE.MathUtils.clamp(thirdPersonPosition.x, bounds.minX, bounds.maxX);
    thirdPersonPosition.y = THREE.MathUtils.clamp(thirdPersonPosition.y, bounds.minY, bounds.maxY);
    thirdPersonPosition.z = THREE.MathUtils.clamp(thirdPersonPosition.z, bounds.minZ, bounds.maxZ);

    if (playerControls.cameraMode === "third" && previousCameraMode === "first") {
      thirdPersonCamera.position.copy(thirdPersonPosition);
    } else {
      thirdPersonCamera.position.lerp(thirdPersonPosition, 0.25);
    }

    // Hard clamp thirdPersonCamera.position after lerping so it can NEVER leave designated room space
    thirdPersonCamera.position.x = THREE.MathUtils.clamp(thirdPersonCamera.position.x, bounds.minX, bounds.maxX);
    thirdPersonCamera.position.y = THREE.MathUtils.clamp(thirdPersonCamera.position.y, bounds.minY, bounds.maxY);
    thirdPersonCamera.position.z = THREE.MathUtils.clamp(thirdPersonCamera.position.z, bounds.minZ, bounds.maxZ);

    // If camera is squeezed very close to player against a wall, hide player model so it doesn't obstruct view
    // When in first-person mode, player model must remain hidden to avoid first-person clipping
    if (playerModel) {
      playerModel.visible = playerControls.cameraMode === "third" && finalDist > 0.45;
    }

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

  // Ensure first-person camera / player position stays within interior level bounds
  const currentBounds = LEVEL_BOUNDS[currentLevelIndex] || LEVEL_BOUNDS[0];
  const clampedX = THREE.MathUtils.clamp(camera.position.x, currentBounds.minX, currentBounds.maxX);
  const clampedY = THREE.MathUtils.clamp(camera.position.y, currentBounds.minY, currentBounds.maxY);
  const clampedZ = THREE.MathUtils.clamp(camera.position.z, currentBounds.minZ, currentBounds.maxZ);

  if (clampedX !== camera.position.x) {
    camera.position.x = clampedX;
    playerControls.velocity.x = 0;
  }
  if (clampedY !== camera.position.y) {
    camera.position.y = clampedY;
    playerControls.fallSpeed = 0;
  }
  if (clampedZ !== camera.position.z) {
    camera.position.z = clampedZ;
    playerControls.velocity.z = 0;
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

  shockOverlay.update(delta);
  shockOverlay.render(renderer);

  // Render secondary CCTV Camera PiP view if active.
  const cctvEnabled = !!currentLevel?.cctvCamera && currentLevel.cctvEnabled !== false;
  cctvContainer?.classList.toggle('hidden', !cctvEnabled);
  cctvRefreshIn -= frameSeconds;
  if (!cctvEnabled) cctvRefreshIn = 0;
  if (cctvEnabled && cctvRenderer && cctvRefreshIn <= 0) {
    cctvRefreshIn = 1 / 15;
    // CCTV sees the character even when the first-person view hides their body.
    const wasVisible = playerModel?.visible;
    if (playerModel) playerModel.visible = true;
    try {
      cctvFeed.render(cctvRenderer, scene, currentLevel.cctvCamera, delta);
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
