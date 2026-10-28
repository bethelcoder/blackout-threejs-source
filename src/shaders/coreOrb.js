import * as THREE from 'three';

const NOISE = /* glsl */`
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.1));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
          mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
      mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
          mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
`;

// The AI's heart. Vertex stage: noise displacement scaled by uAgitation.
// Fragment stage: fresnel glow + noise dissolve with a burning edge (uDissolve).
export function createCoreOrbMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uAgitation: { value: 0.3 },   // 0 calm .. 1 furious (phase + charge)
      uDissolve: { value: 0 },      // 0 solid .. 1+ gone
      uCore: { value: new THREE.Color(0xff3b3b) },
      uEdge: { value: new THREE.Color(0xffd1a0) },
    },
    vertexShader: /* glsl */`
      uniform float uTime;
      uniform float uAgitation;
      varying vec3 vNormalV;
      varying vec3 vViewDir;
      varying vec3 vObjPos;
      ${NOISE}
      void main() {
        float n = noise(position * 3.0 + uTime * 0.8);
        vec3 p = position + normal * (n - 0.5) * 0.35 * uAgitation;
        vObjPos = position;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vNormalV = normalize(normalMatrix * normal);
        vViewDir = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uTime;
      uniform float uAgitation;
      uniform float uDissolve;
      uniform vec3 uCore;
      uniform vec3 uEdge;
      varying vec3 vNormalV;
      varying vec3 vViewDir;
      varying vec3 vObjPos;
      ${NOISE}
      void main() {
        float n = smoothstep(0.15, 0.85, noise(vObjPos * 4.0 + 3.1));
        if (n < uDissolve) discard;
        float edge = smoothstep(uDissolve, uDissolve + 0.08, n);   // 0 right at the burn line

        float fres = pow(1.0 - max(dot(normalize(vNormalV), normalize(vViewDir)), 0.0), 2.5);
        float pulse = 0.75 + 0.25 * sin(uTime * (4.0 + uAgitation * 8.0));
        vec3 col = mix(uCore, uEdge, fres) * pulse * (1.0 + uAgitation);
        col = mix(uEdge * 3.0, col, edge);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}