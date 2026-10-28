import * as THREE from 'three';

// Prototype: floor-projected routing schematic for the control room.
//
// The deck itself is the display: polar coordinates turn the plane into rings
// and spokes, a pulse travels outward along them, and the lines brighten where
// a rotating sweep lobe passes. Everything is drawn procedurally in the
// fragment shader, so there is no texture to author and the whole thing scales
// with the mesh.
//
// Additive blending keeps it reading as projected light: it lifts the floor but
// never darkens anything sitting on it.

const vertexShader = /* glsl */`
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */`
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3 uColor;
  uniform float uSpokes;

  varying vec2 vUv;

  float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  // Distance to a line of width w, softened so the line never aliases away.
  float lineMask(float d, float w) {
    return 1.0 - smoothstep(w, w + 0.006, abs(d));
  }

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;

    float ang = atan(p.y, p.x);
    float seg = 6.2831853 / uSpokes;
    // Arc length from the nearest spoke, so spokes keep a constant width.
    float dTh = abs(mod(ang + seg * 0.5, seg) - seg * 0.5) * r;

    float spokes = lineMask(dTh, 0.005);
    float rings = lineMask(r - 0.30, 0.004)
      + lineMask(r - 0.60, 0.004)
      + lineMask(r - 0.94, 0.005) * 0.8;

    // Data runs outward along the spokes in travelling dashes.
    float dash = 0.5 + 0.5 * sin(r * 26.0 - uTime * 5.0 + floor(ang / seg) * 2.3);
    dash = smoothstep(0.55, 1.0, dash) * smoothstep(0.12, 0.28, r);

    // A ring pulse expands every 2.6 s and lights the whole schematic as it
    // passes over it.
    float pulse = exp(-pow((r - mod(uTime * 0.62, 1.35)) * 22.0, 2.0));

    // Rotating sweep lobe, like the beam of a projector.
    float sweep = pow(max(0.0, cos(ang - uTime * 0.8)), 24.0);

    float lines = rings * (0.30 + 0.55 * dash) + spokes * (0.20 + 0.45 * dash);
    float glow = lines + pulse * (0.35 + 0.65 * lines) + sweep * 0.22 * (0.35 + lines);

    // Fade the rim so the projection melts into the deck instead of ending in
    // a hard circle, and add a little noise so it reads as projected light.
    float rim = 1.0 - smoothstep(0.82, 1.0, r);
    float grain = 0.94 + 0.06 * hash21(floor(vUv * 220.0) + floor(uTime * 24.0));

    vec3 color = mix(uColor, vec3(1.0), pulse * 0.45 + sweep * 0.15);
    gl_FragColor = vec4(color * glow * rim * grain * uIntensity, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createRoutingHologram({
  position = new THREE.Vector3(0, 0.015, 0),
  radius = 2.1,
  color = 0x3dffa0,
  intensity = 1,
  spokes = 12,
} = {}) {
  const geometry = new THREE.PlaneGeometry(radius * 2, radius * 2);
  geometry.rotateX(-Math.PI / 2);

  const uniforms = {
    uTime: { value: 0 },
    uIntensity: { value: intensity },
    uColor: { value: new THREE.Color(color) },
    uSpokes: { value: spokes },
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

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'Routing hologram';
  mesh.position.copy(position);
  mesh.renderOrder = 2;

  let elapsed = 0;
  function update(delta) {
    elapsed += delta;
    uniforms.uTime.value = elapsed;
  }

  function dispose() {
    mesh.removeFromParent();
    geometry.dispose();
    material.dispose();
  }

  return { group: mesh, uniforms, update, dispose };
}
