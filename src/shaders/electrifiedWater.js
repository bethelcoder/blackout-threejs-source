import * as THREE from 'three';
import { puddleShapeGLSL } from '../systems/puddleShape.js';

export function createElectrifiedWaterMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { uTime: { value: 0 }, uLive: { value: 0 } },
    vertexShader: `
      uniform float uTime;
      varying vec2 vUv;
      varying float vRipple;
      void main() {
        vUv = uv;
        vec3 p = position;
        // The subdivided plane physically ripples along its local surface normal.
        vRipple = sin(p.x * 15.0 + uTime * 4.0) * cos(p.y * 11.0 - uTime * 3.0);
        p.z += vRipple * 0.006;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      ${puddleShapeGLSL}
      uniform float uTime;
      uniform float uLive;
      varying vec2 vUv;
      varying float vRipple;
      void main() {
        float edge = puddleDistance(vUv * 2.0 - 1.0);
        float coverage = 1.0 - smoothstep(0.78, 0.9, edge);
        if (coverage < 0.01) discard;
        vec2 p = vUv * vec2(2.45, 4.8);
        float ripple = sin(length(p - vec2(0.25, 2.4)) * 28.0 - uTime * 8.0);
        float arc = abs(sin(p.y * 8.0 + sin(p.x * 17.0 + uTime * 12.0) * 2.0));
        float filaments = pow(1.0 - arc, 22.0);
        float flicker = 0.75 + 0.25 * sin(uTime * 43.0);
        vec3 water = vec3(0.055, 0.15, 0.18) + vec3(0.035, 0.055, 0.065) * (ripple + vRipple);
        water += uLive * flicker * (vec3(0.05, 0.2, 0.3) + filaments * vec3(0.5, 0.9, 1.0));
        // Thin translucent edges blend into the deck instead of ending in a box.
        gl_FragColor = vec4(water, coverage * 0.8);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}
