import * as THREE from 'three';

export function createPowerFlowMaterial(length) {
  return new THREE.ShaderMaterial({
    name: 'Puzzle power flow',
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uLength: { value: length },
      uPower: { value: 0 },
      uStable: { value: 0 },
    },
    vertexShader: /* glsl */`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform float uTime;
      uniform float uLength;
      uniform float uPower;
      uniform float uStable;
      varying vec2 vUv;
      void main() {
        float across = abs(vUv.y * 2.0 - 1.0);
        float edge = 1.0 - smoothstep(0.65, 1.0, across);
        float filament = 1.0 - smoothstep(0.08, 0.3, across);
        float distanceAlong = vUv.x * uLength;
        // Metres rather than normalized UVs keep packet speed equal on every route.
        float phase = fract((distanceAlong - uTime * 1.6) / 1.8);
        float packet = smoothstep(0.55, 0.82, phase) * (1.0 - smoothstep(0.88, 1.0, phase));
        float power = smoothstep(0.0, 1.0, uPower);
        float brightness = mix(0.13, 0.38 + packet * 0.85 + filament * 0.22, power);
        brightness = mix(brightness, 0.65 + filament * 0.18, uStable);
        vec3 color = mix(vec3(0.08, 0.35, 0.45), vec3(0.12, 0.8, 1.0), power);
        color = mix(color, vec3(0.25, 1.0, 0.65), uStable);
        gl_FragColor = vec4(color * brightness, edge * 0.85);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}
