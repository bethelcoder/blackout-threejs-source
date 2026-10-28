import * as THREE from 'three';

// Displaced air hanging under a ceiling vent.
//
// There is no light source and no bright core: an open cone acts as the outer
// shell of the plume, and the fragment shader keeps only the parts the eye
// would see through the middle of the cloud (a facing term) while three
// octaves of world-space noise erode the surface into wisps and holes. Because
// the shell is fixed in world space it also renders correctly in the CCTV pass,
// which uses a different camera than the one the player looks through.

const vertexShader = /* glsl */`
  uniform float uTime;
  uniform float uSeed;
  uniform float uHeight;

  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vViewNormal;
  varying vec3 vViewDir;

  void main() {
    vUv = uv;

    // Lean the plume as it falls, so it reads as displaced air instead of a
    // second, greyer light cone standing under the grille.
    float depth = clamp(-position.y / uHeight, 0.0, 1.0);
    vec3 bent = position;
    bent.x += sin(uTime * 0.5 + uSeed) * 0.26 * depth * depth;
    bent.z += cos(uTime * 0.37 + uSeed * 1.3) * 0.20 * depth * depth;

    vec4 world = modelMatrix * vec4(bent, 1.0);
    vWorldPos = world.xyz;
    vec4 view = viewMatrix * world;
    vViewDir = -view.xyz;
    vViewNormal = normalMatrix * normal;
    gl_Position = projectionMatrix * view;
  }
`;

const fragmentShader = /* glsl */`
  uniform float uTime;
  uniform float uIntensity;
  uniform float uSeed;
  uniform vec3 uColor;

  varying vec2 vUv;
  varying vec3 vWorldPos;
  varying vec3 vViewNormal;
  varying vec3 vViewDir;

  float hash31(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }

  float valueNoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(
        mix(hash31(i), hash31(i + vec3(1.0, 0.0, 0.0)), u.x),
        mix(hash31(i + vec3(0.0, 1.0, 0.0)), hash31(i + vec3(1.0, 1.0, 0.0)), u.x),
        u.y
      ),
      mix(
        mix(hash31(i + vec3(0.0, 0.0, 1.0)), hash31(i + vec3(1.0, 0.0, 1.0)), u.x),
        mix(hash31(i + vec3(0.0, 1.0, 1.0)), hash31(i + vec3(1.0, 1.0, 1.0)), u.x),
        u.y
      ),
      u.z
    );
  }

  float fbm(vec3 p) {
    float total = 0.0;
    float amplitude = 0.5;
    for (int octave = 0; octave < 3; octave++) {
      total += valueNoise(p) * amplitude;
      p *= 2.07;
      amplitude *= 0.5;
    }
    return total / 0.875;
  }

  void main() {
    // The shell is hollow: keep the stretches that face the eye and drop the
    // grazing ones, so the cone reads as a soft mass instead of an outline.
    float facing = clamp(abs(dot(normalize(vViewNormal), normalize(vViewDir))), 0.0, 1.0);
    float body = pow(facing, 0.55);

    // Dense at the vent mouth, thinning as the air sinks, and eased off at the
    // very top so the shell's rim never shows up as a hard ring.
    float column = smoothstep(0.02, 0.45, vUv.y) * (1.0 - smoothstep(0.9, 1.0, vUv.y));

    // World-space sampling keeps the billows anchored to the room rather than
    // to the camera. Raising the sample height makes the pattern fall.
    vec3 p = vWorldPos * 1.5 + uSeed;
    p.y += uTime * 0.26;
    p.xz += vec2(sin(uTime * 0.31 + uSeed), cos(uTime * 0.23 + uSeed * 1.7)) * 0.22;

    // Two scales, cross-masked: big gaps in the body of the cloud plus fine
    // curling wisps, so it never resolves into a smooth surface of revolution.
    float fine = smoothstep(0.42, 0.62, fbm(p));
    float patches = smoothstep(0.3, 0.56, fbm(p * 0.42 + 13.0));
    float wisps = fine * patches;
    float breath = 0.9 + 0.1 * sin(uTime * 0.7 + uSeed);

    float density = body * column * wisps * breath * uIntensity;
    gl_FragColor = vec4(uColor * density, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createVentHaze({
  position = new THREE.Vector3(0, 6.64, 0),
  height = 3.0,
  topRadius = 0.4,
  bottomRadius = 1.25,
  color = 0xa9bcc2,
  intensity = 0.05,
  seed = 0,
} = {}) {
  // Top of the cone sits at local y = 0, under the vent grille.
  const geometry = new THREE.CylinderGeometry(topRadius, bottomRadius, height, 40, 10, true);
  geometry.translate(0, -height / 2, 0);

  // Bend the profile so the silhouette is a lumpy cloud rather than a clean
  // cone: two long sine waves around the axis, pinned at the vent mouth.
  const positionAttr = geometry.attributes.position;
  for (let i = 0; i < positionAttr.count; i++) {
    const x = positionAttr.getX(i);
    const y = positionAttr.getY(i);
    const z = positionAttr.getZ(i);
    const angle = Math.atan2(z, x);
    const grip = THREE.MathUtils.clamp(1 + y / height, 0, 1);
    const lump = 1
      + 0.22 * Math.sin(angle * 3.0 + y * 2.1)
      + 0.14 * Math.sin(angle * 5.0 - y * 3.4 + 1.7);
    const scale = 1 + (lump - 1) * (1 - grip * 0.85);
    positionAttr.setX(i, x * scale);
    positionAttr.setZ(i, z * scale);
  }
  geometry.computeVertexNormals();

  const uniforms = {
    uTime: { value: 0 },
    uIntensity: { value: intensity },
    uSeed: { value: seed },
    uHeight: { value: height },
    uColor: { value: new THREE.Color(color) },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const group = new THREE.Group();
  group.name = 'Vent haze plume';
  const shell = new THREE.Mesh(geometry, material);
  group.add(shell);
  group.position.copy(position);

  let elapsed = 0;

  function update(delta) {
    elapsed += delta;
    uniforms.uTime.value = elapsed;
  }

  function dispose() {
    group.removeFromParent();
    geometry.dispose();
    material.dispose();
  }

  return { group, update, dispose };
}
