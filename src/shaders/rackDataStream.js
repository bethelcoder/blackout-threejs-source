import * as THREE from 'three';

// Prototype: server data-traffic panel.
//
// The surface is divided into a grid of cells. Each column picks its own scroll
// speed from a hash of its index, so the columns never sync up; a cell's
// brightness comes from how close it sits behind that column's moving head.
// Inside each cell a hashed bit picks one of two bar orientations, which reads
// as a stream of glyphs without needing a font or a texture.
//
// A slow scan band sweeps down the panel so the whole surface pulses, and the
// head of each stream is pushed toward white while the tail stays in the panel
// colour.

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
  uniform vec2 uGrid;

  varying vec2 vUv;

  float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    vec2 g = vUv * uGrid;
    vec2 cell = floor(g);
    vec2 f = fract(g);

    // Per-column identity: scroll speed, phase and character.
    float colH = hash21(vec2(cell.x, 3.0));
    float phase = fract(cell.y / uGrid.y + uTime * (0.10 + colH * 0.26) + colH * 7.0);

    // Cells just behind the head are lit; the tail fades out above it.
    float trail = smoothstep(0.34, 0.0, phase);

    // One of two bar orientations per cell, picked by a hash of the cell.
    float bit = hash21(cell + 17.3);
    float horizontal = step(abs(f.y - 0.5), 0.045) * step(abs(f.x - 0.5), 0.20);
    float vertical = step(abs(f.x - 0.5), 0.045) * step(abs(f.y - 0.5), 0.20);
    float glyph = mix(horizontal, vertical, step(0.5, bit));

    float on = step(0.35, hash21(cell + 99.1));
    float traffic = trail * (0.22 + 0.78 * glyph) * (0.4 + 0.6 * on);

    // Idle cells keep the panel alive between passes.
    float idle = glyph * 0.07 * step(0.55, hash21(cell + 41.9));

    // Slow sweep down the whole face.
    float band = exp(-pow(fract(vUv.y - uTime * 0.11) * 13.0, 2.0));

    // Bezel: a thin frame plus longer ticks at the corners, so the effect
    // reads as a screen mounted on the rack rather than rack texture.
    vec2 dist = min(vUv, 1.0 - vUv);
    float frame = 1.0 - smoothstep(0.004, 0.008, min(dist.x, dist.y));
    float lineH = 1.0 - smoothstep(0.006, 0.010, dist.y);
    float lineV = 1.0 - smoothstep(0.006, 0.010, dist.x);
    float tick = max(lineH * step(dist.x, 0.10), lineV * step(dist.y, 0.10));

    // Content fades out before it reaches the bezel; the frame does not.
    float inset = smoothstep(0.02, 0.05, min(dist.x, dist.y));
    float content = traffic * (1.0 + band * 0.8) + idle + band * 0.03;

    float glow = content * inset + frame * 0.9 + tick * 0.9;

    vec3 color = mix(uColor, vec3(1.0), clamp(trail * 0.35 + band * 0.1, 0.0, 1.0));
    gl_FragColor = vec4(color * glow * uIntensity, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createRackDataStream({
  position = new THREE.Vector3(0, 1.8, 0),
  rotationY = 0,
  width = 2.2,
  height = 1.4,
  color = 0x35ff9a,
  intensity = 1,
  columns = 26,
  rows = 40,
} = {}) {
  const geometry = new THREE.PlaneGeometry(width, height);
  geometry.rotateY(rotationY);

  // A dark plate behind the glow: additive blending can only add light, so the
  // panel needs its own backing to read as a screen instead of rack texture.
  const normal = new THREE.Vector3(Math.sin(rotationY), 0, Math.cos(rotationY));
  const backGeometry = geometry.clone();
  const backMaterial = new THREE.MeshBasicMaterial({
    color: 0x05090b,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });

  const uniforms = {
    uTime: { value: 0 },
    uIntensity: { value: intensity },
    uColor: { value: new THREE.Color(color) },
    uGrid: { value: new THREE.Vector2(columns, rows) },
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
  group.name = 'Rack data traffic';
  group.position.copy(position);

  const back = new THREE.Mesh(backGeometry, backMaterial);
  back.position.copy(normal).multiplyScalar(-0.004);
  back.renderOrder = 1;

  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 2;

  group.add(back, mesh);

  let elapsed = 0;
  function update(delta) {
    elapsed += delta;
    uniforms.uTime.value = elapsed;
  }

  function dispose() {
    group.removeFromParent();
    geometry.dispose();
    backGeometry.dispose();
    material.dispose();
    backMaterial.dispose();
  }

  return { group, uniforms, update, dispose };
}
