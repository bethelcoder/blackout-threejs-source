import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { TextureLoader } from 'three';

const cache = new Map();
const textureCache = new Map();
const decodedTextures = new Map();
export const LEVEL2_MODEL_URLS = [
  new URL('../assets/models/venator-room-modules.glb', import.meta.url).href,
  new URL('../assets/models/terminal-desk.glb', import.meta.url).href,
  new URL('../assets/models/retro-computer.glb', import.meta.url).href,
  new URL('../assets/models/office-chair.glb', import.meta.url).href,
  new URL('../assets/models/data-center-server-rack.glb', import.meta.url).href,
  new URL('../assets/models/server-racking-system.glb', import.meta.url).href,
  new URL('../assets/models/venator-small-door.glb', import.meta.url).href,
  new URL('../assets/models/vent.glb', import.meta.url).href,
  new URL('../assets/models/modern_clock.glb', import.meta.url).href,
  new URL('../assets/models/bolt_cutter_low-poly.glb', import.meta.url).href,
  new URL('../assets/models/claw_hammer.glb', import.meta.url).href,
  new URL('../assets/models/free_screwdriver.glb', import.meta.url).href,
  new URL('../assets/models/vintage_pliers.glb', import.meta.url).href,
];
export const LEVEL2_TEXTURE_URLS = [
  new URL('../assets/models/button/Scene_-_Root_baseColor.jpg', import.meta.url).href,
  new URL('../assets/models/button/Scene_-_Root_metallicRoughness_metal.jpg', import.meta.url).href,
  new URL('../assets/models/button/Scene_-_Root_metallicRoughness_rough.jpg', import.meta.url).href,
  new URL('../assets/models/button/Scene_-_Root_normal.jpg', import.meta.url).href,
];

export const LEVEL3_MODEL_URLS = [
  './models/core-platform.glb', './models/core-ceiling.glb',
  './models/core-lamp.glb', './models/core-pillar.glb',
  './models/right-supercomputer.glb', './models/wooden-crates.glb',
  './models/earth-hologram.glb', './models/sci-fi-office-desk.glb',
  './models/left-personal-computer.glb', './models/drawer-keypad.glb',
  './models/engineer-logbook.glb', './models/monitor-sticky-note.glb',
  './models/uv-flashlight.glb', './models/metal-storage-cabinet.glb',
  './models/office-drawer.glb', './models/sci-fi-crate-pile.glb',
  './models/radiation-wall-sign.glb', '/models/core-wet-floor-sign.glb',
  new URL('../assets/models/core-office-chair.glb', import.meta.url).href,
  new URL('../assets/models/core-toolbox.glb', import.meta.url).href,
  new URL('../assets/models/core-fire-extinguisher.glb', import.meta.url).href,
  new URL('../assets/models/core-first-aid-box.glb', import.meta.url).href,
  new URL('../assets/models/core-display-terminal.glb', import.meta.url).href,
  new URL('../assets/models/core-kitchen-bot.glb', import.meta.url).href,
];

function cachedTexture(url) {
  if (!textureCache.has(url)) {
    textureCache.set(url, new TextureLoader().loadAsync(url).then(texture => {
      decodedTextures.set(url, texture);
      return texture;
    }).catch(error => { textureCache.delete(url); throw error; }));
  }
  return textureCache.get(url);
}

// Keep synchronous prop construction while reusing pre-decoded button images.
export function loadTexture(url) {
  return decodedTextures.has(url) ? decodedTextures.get(url).clone() : new TextureLoader().load(url);
}

function cachedModel(url) {
  if (!cache.has(url)) {
    const pending = new GLTFLoader().loadAsync(url).catch(error => {
      cache.delete(url); // A failed background request must remain retryable.
      throw error;
    });
    cache.set(url, pending);
  }
  return cache.get(url);
}

/** Cache decoded assets; each level owns its transforms and disposable GPU resources. */
export async function loadModel(url) {
  const gltf = await cachedModel(url);
  const scene = gltf.scene.clone(true);
  const geometries = new Map();
  const materials = new Map();
  const textures = new Map();
  function ownTexture(texture) {
    if (!textures.has(texture)) textures.set(texture, texture.clone());
    return textures.get(texture);
  }
  scene.traverse(object => {
    if (object.geometry) {
      if (!geometries.has(object.geometry)) geometries.set(object.geometry, object.geometry.clone());
      object.geometry = geometries.get(object.geometry);
    }
    if (object.material) {
      const original = object.material;
      if (!materials.has(original)) {
        const material = original.clone();
        for (const [key, value] of Object.entries(material)) if (value?.isTexture) material[key] = ownTexture(value);
        materials.set(original, material);
      }
      object.material = materials.get(original);
    }
  });
  return { ...gltf, scene, parser: {
    async getDependency(type, index) {
      const dependency = await gltf.parser.getDependency(type, index);
      return type === 'texture' ? ownTexture(dependency) : dependency;
    },
  } };
}

/** Share background/entry requests and limit decoding to two assets at a time. */
function createPreloader(modelUrls, textureUrls = []) {
  let pending = null, finished = 0;
  const listeners = new Set();
  const jobs = [
    ...modelUrls.map(url => () => cachedModel(url)),
    ...textureUrls.map(url => () => cachedTexture(url)),
  ];
  async function run() {
    let next = 0;
    const errors = [];
    async function worker() {
      while (next < jobs.length) {
        const job = jobs[next++];
        try { await job(); } catch (error) { errors.push(error); }
        finished++;
        for (const listener of listeners) listener(finished, jobs.length);
        // Let input and rendering run between background jobs.
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    await Promise.all([worker(), worker()]);
    if (errors.length) pending = null;
    return errors;
  }
  return async (onProgress = () => {}) => {
    listeners.add(onProgress);
    if (!pending) { finished = 0; pending = run(); }
    onProgress(finished, jobs.length);
    try { return await pending; }
    finally { listeners.delete(onProgress); }
  };
}

export const preloadLevel2Models = createPreloader(LEVEL2_MODEL_URLS, LEVEL2_TEXTURE_URLS);
export const preloadLevel3Models = createPreloader(LEVEL3_MODEL_URLS);
