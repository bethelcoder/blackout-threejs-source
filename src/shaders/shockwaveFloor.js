import * as THREE from 'three';

export const MAX_WAVES = 3;

// One floor plane draws every shockwave. All the work happens in the
// fragment shader: distance from the core gives the ring, the angle gives
// the safe gap. Uniforms are driven by game state (wave radii, charge).
export function createShockwaveFloorMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uCharge: { value: 0 },          // 0..1 telegraph before a surge
      uThickness: { value: 0.7 },
      uGapWidth: { value: 1.6 },      // radians
      uRadius: { value: new Array(MAX_WAVES).fill(-10) },
      uGapAngle: { value: new Array(MAX_WAVES).fill(0) },
      uDanger: { value: new THREE.Color(0xff3b2b) },
      uSafe: { value: new THREE.Color(0x2bffb0) },
    },
    vertexShader: /* glsl */`
      varying vec2 vWorld;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorld = world.xz;   // world-space floor coords, so the CPU hit test matches
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */`
      #define PI 3.14159265
      #define MAX_WAVES ${MAX_WAVES}

      uniform float uTime;
      uniform float uCharge;
      uniform float uThickness;
      uniform float uGapWidth;
      uniform float uRadius[MAX_WAVES];
      uniform float uGapAngle[MAX_WAVES];
      uniform vec3 uDanger;
      uniform vec3 uSafe;
      varying vec2 vWorld;

      float angDiff(float a, float b) {
        return abs(mod(a - b + PI, 2.0 * PI) - PI);
      }

      void main() {
        float r = length(vWorld);
        float ang = atan(vWorld.y, vWorld.x);   // matches Math.atan2(z, x) on the CPU

        float danger = 0.0;
        float safe = 0.0;
        for (int i = 0; i < MAX_WAVES; i++) {
          float d = abs(r - uRadius[i]);
          float body = 1.0 - smoothstep(0.0, uThickness * 0.5, d);
          float halo = 1.0 - smoothstep(0.0, uThickness * 1.6, d);
          float inGap = 1.0 - smoothstep(uGapWidth * 0.5 - 0.1, uGapWidth * 0.5, angDiff(ang, uGapAngle[i]));
          float crackle = 0.7 + 0.3 * sin(ang * 60.0 + uTime * 25.0 - r * 8.0);
          danger += body * (1.0 - inGap) * crackle;
          safe   += halo * inGap * 0.55;           // glowing "safe lane"
        }

        // Telegraph: a pulsing ring at the pedestal while the core charges
        float rim = smoothstep(1.5, 1.7, r) * (1.0 - smoothstep(1.7, 2.3, r));
        float tele = uCharge * rim * (0.5 + 0.5 * sin(uTime * 28.0));

        vec3 col = uDanger * (danger + tele) + uSafe * safe;
        gl_FragColor = vec4(col, clamp(danger + tele + safe, 0.0, 1.0));
      }
    `,
  });
}