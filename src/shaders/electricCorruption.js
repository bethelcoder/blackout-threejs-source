import * as THREE from 'three';

// Custom ShaderMaterial for wall panels/conduits the AI has corrupted.
// Not achievable with a built-in material: procedural scanline + vein noise,
// driven by uTime and uIntensity (tied to AI suspicion level), plus a
// vertex displacement "flicker" so the panel visibly reacts rather than
// sitting static. Explainable line-by-line in the demo per the rubric.
export function createElectricCorruptionMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 0.25 },       // 0 = dormant, 1 = full lockdown corruption
      uColorLow: { value: new THREE.Color(0x0a2a3a) },
      uColorHigh: { value: new THREE.Color(0xff2b2b) },
    },
    vertexShader: /* glsl */`
      uniform float uTime;
      uniform float uIntensity;
      varying vec2 vUv;
      varying float vFlicker;

      // cheap hash for pseudo-random flicker timing
      float hash(float n) { return fract(sin(n) * 43758.5453123); }

      void main() {
        vUv = uv;
        float flickerSeed = floor(uTime * 6.0);
        vFlicker = step(0.85, hash(flickerSeed)) * uIntensity;

        vec3 displaced = position;
        displaced += normal * vFlicker * 0.015 * sin(uTime * 40.0 + position.x * 10.0);

        gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uTime;
      uniform float uIntensity;
      uniform vec3 uColorLow;
      uniform vec3 uColorHigh;
      varying vec2 vUv;
      varying float vFlicker;

      // Simple 2D noise for corruption "veins"
      float rand(vec2 co) { return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453); }

      void main() {
        // Scanlines
        float scan = sin((vUv.y * 220.0) - uTime * 4.0) * 0.5 + 0.5;
        scan = smoothstep(0.6, 1.0, scan);

        // Vein noise, animated
        float n = rand(floor(vUv * vec2(40.0, 20.0)) + floor(uTime * 3.0));
        float veins = smoothstep(0.9 - uIntensity * 0.4, 1.0, n);

        float glow = clamp(scan * 0.5 + veins * 0.8 + vFlicker, 0.0, 1.0);
        vec3 color = mix(uColorLow, uColorHigh, glow * uIntensity + veins * 0.3);

        gl_FragColor = vec4(color, 0.85);
      }
    `,
    transparent: true,
  });
}
