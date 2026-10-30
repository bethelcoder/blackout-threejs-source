import * as THREE from 'three';

// A single transparent shell: no scene capture, textures or extra lights.
export function createCoreContainmentMaterial() {
  return new THREE.ShaderMaterial({
    name: 'Core containment field',
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uInstability: { value: 0 },
      uCollapse: { value: 0 },
    },
    vertexShader: /* glsl */`
      uniform float uTime;
      uniform float uInstability;
      varying vec3 vLocal;
      varying vec3 vNormalV;
      varying vec3 vViewDir;
      void main() {
        vLocal = position;
        float wobble = sin(position.y * 13.0 + uTime * 5.0)
          * sin(position.x * 11.0 - uTime * 3.0);
        vec3 p = position + normal * wobble * 0.018 * uInstability;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vNormalV = normalMatrix * normal;
        vViewDir = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uTime;
      uniform float uInstability;
      uniform float uCollapse;
      varying vec3 vLocal;
      varying vec3 vNormalV;
      varying vec3 vViewDir;

      float hexGrid(vec2 p) {
        vec2 spacing = vec2(1.0, 1.7320508);
        vec2 a = mod(p, spacing) - spacing * 0.5;
        vec2 b = mod(p - spacing * 0.5, spacing) - spacing * 0.5;
        vec2 cell = dot(a, a) < dot(b, b) ? a : b;
        vec2 q = abs(cell);
        float edge = 0.5 - max(q.x, dot(q, vec2(0.5, 0.8660254)));
        float aa = max(fwidth(edge), 0.002);
        return 1.0 - smoothstep(0.018 - aa, 0.018 + aa, edge);
      }

      void main() {
        vec3 n = normalize(vLocal);
        // Three planar projections avoid a longitude seam and stretched polar cells.
        vec3 weights = pow(abs(n), vec3(8.0));
        weights /= max(weights.x + weights.y + weights.z, 0.0001);
        vec3 p = vLocal * 5.0;
        float grid = dot(weights, vec3(hexGrid(p.yz), hexGrid(p.xz), hexGrid(p.xy)));
        float fresnel = pow(1.0 - abs(dot(normalize(vNormalV), normalize(vViewDir))), 3.0);

        // A circular wave expands from the north pole along the shell every 3 seconds.
        float latitude = acos(clamp(n.y, -1.0, 1.0));
        float phase = fract(uTime / 3.0);
        float ripple = exp(-pow((latitude - phase * 3.6) / 0.085, 2.0));
        ripple *= smoothstep(0.0, 0.08, phase) * (1.0 - smoothstep(0.85, 1.0, phase));
        float interference = sin(vLocal.y * 38.0 - uTime * 12.0)
          * sin(uTime * 7.0 + vLocal.x * 9.0);
        float flicker = 1.0 - uInstability * (0.18 + 0.18 * interference);
        float fade = 1.0 - smoothstep(0.0, 1.0, uCollapse);
        vec3 color = mix(vec3(0.12, 0.65, 1.0), vec3(1.0, 0.25, 0.12), uInstability);
        float glow = fresnel * 0.48 + grid * (0.13 + fresnel * 0.16) + ripple * (0.3 + grid * 0.4);
        gl_FragColor = vec4(color * (1.0 + ripple * 0.6), glow * flicker * fade);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}
