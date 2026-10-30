import * as THREE from 'three';

// Screen-space electrical shock.
//
// A single full-screen quad drawn after the scene with additive blending, so it
// only ever adds light. The bolts are drawn in polar coordinates: each angular
// sector owns one branch whose path wanders with radius, which gives the
// zig-zag of a discharge without any line geometry. A short flash, an expanding
// ring and resampled static make up the rest of the hit.

const vertexShader = /* glsl */`
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */`
  uniform float uTime;
  uniform float uAspect;
  uniform float uSeed;

  varying vec2 vUv;

  const float TAU = 6.2831853;

  float hash11(float n) {
    return fract(sin(n * 127.1) * 43758.5453123);
  }

  float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  // One branch of the discharge. The path lives in angle space: each band of
  // radius gets its own angular offset, so joining them gives a straight,
  // jagged segment rather than a smooth wave. Distance is converted back to
  // screen units so the stroke keeps a constant thickness as it spreads.
  float branch(float across, float radius, float sectors, float seed) {
    float band = floor(radius * 7.0);
    float blend = fract(radius * 7.0);
    float a0 = (hash11(band + seed * 31.0) - 0.5) * 0.26;
    float a1 = (hash11(band + 1.0 + seed * 31.0) - 0.5) * 0.26;
    float path = mix(a0, a1, blend);

    float screenDistance = abs(across - path) * TAU * radius / sectors;
    float width = 0.0030 + 0.0025 * radius;
    float line = 1.0 - smoothstep(width * 0.3, width, screenDistance);

    // A soft glow either side of the core stroke.
    line += (1.0 - smoothstep(width, width * 5.0, screenDistance)) * 0.18;

    // Some segments of a bolt are dimmer than others.
    line *= 0.35 + 0.65 * hash11(band * 5.7 + seed * 17.0);
    return line;
  }

  void main() {
    vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0) * 2.0;
    float radius = length(p);
    float angle = atan(p.y, p.x);
    float t = uTime;

    float flash = exp(-t * 26.0);
    float envelope = exp(-t * 4.4);

    // Arcs restrike several times a second instead of holding one shape.
    float strike = floor(t * 14.0) * 0.53;

    // Two sector counts layered so the crackle has coarse and fine branches.
    float bolts = 0.0;
    for (int i = 0; i < 2; i++) {
      float sectors = i == 0 ? 11.0 : 7.0;
      float a = (angle / TAU + 0.5) * sectors;
      float id = floor(a);
      float across = fract(a) - 0.5;
      float seed = hash11(id * 3.17 + float(i) * 11.0 + uSeed + strike);
      float reach = 0.55 + 0.75 * hash11(id * 9.1 + uSeed);
      float lengthFade = smoothstep(reach, reach * 0.55, radius);
      float on = step(0.42, seed);
      bolts += branch(across, radius, sectors, seed) * lengthFade * on * (i == 0 ? 1.0 : 0.6);
    }

    float ring = smoothstep(0.025, 0.0, abs(radius - t * 4.2)) * exp(-t * 4.0) * 0.45;

    // 2 px static, resampled a few times a second.
    vec2 cell = floor(gl_FragCoord.xy * 0.5);
    float noise = step(0.985, hash21(cell + floor(t * 30.0) * 13.0));

    float core = flash * exp(-radius * 8.0) * 0.7;

    float strength = bolts * envelope * 1.1 + ring + noise * envelope * 0.55 + core + flash * 0.025;

    vec3 color = mix(vec3(0.35, 0.82, 1.0), vec3(1.0), clamp(bolts * 1.2 + flash, 0.0, 1.0));
    gl_FragColor = vec4(color * strength, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const DURATION = 0.8;

export function createShockOverlay() {
  const geometry = new THREE.PlaneGeometry(2, 2);
  const uniforms = {
    uTime: { value: 0 },
    uAspect: { value: 1 },
    uSeed: { value: 0 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;

  const scene = new THREE.Scene();
  scene.add(mesh);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  let elapsed = 0;
  let remaining = 0;

  function trigger() {
    elapsed = 0;
    remaining = DURATION;
    uniforms.uSeed.value = Math.random() * 100;
  }

  function update(delta) {
    if (remaining <= 0) return;
    elapsed += delta;
    remaining -= delta;
    uniforms.uTime.value = elapsed;
  }

  function render(renderer) {
    if (remaining <= 0) return;
    uniforms.uAspect.value = renderer.domElement.width / Math.max(1, renderer.domElement.height);
    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.render(scene, camera);
    renderer.autoClear = autoClear;
  }

  return { trigger, update, render };
}
