import * as THREE from 'three';

export const MAX_WAVES = 3;

// One floor plane draws every shockwave. All the work happens in the
// fragment shader: distance from the core gives the ring, the angle gives
// the safe gap. Uniforms are driven by game state (wave radii, charge).
//
// Look of a wave (all of it is visual only - level3.js still does the hit test with the same numbers):
//   * a white-hot core inside a red-orange band exactly as wide as the lethal zone (uThickness),
//     with a jagged, flickering edge that stays far inside that width
//   * a brighter leading edge and a dim, scorched ember trail behind it
//   * crackling sparks that fly off the ring
//   * bright flares on both edges of the safe gap so the way through is readable
//   * a green "safe lane" glow inside the gap
//   * a charge-up telegraph: a faster-pulsing rim, ripples racing outward and a red glow on the floor
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

      float hash(float n) {
        return fract(sin(n) * 43758.5453);
      }

      // Smooth 1D value noise, used to make the ring edge jagged and alive.
      float noise1(float x) {
        float i = floor(x);
        float f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(hash(i), hash(i + 1.0), f);
      }

      void main() {
        float r = length(vWorld);
        float ang = atan(vWorld.y, vWorld.x);   // matches Math.atan2(z, x) on the CPU
        float hw = uThickness * 0.5;            // half-width of the lethal band

        float body = 0.0;      // red-orange lethal band
        float heat = 0.0;      // white-hot core
        float ember = 0.0;     // scorched trail behind the wave
        float sparks = 0.0;    // crackling arcs flying off the ring
        float lane = 0.0;      // green safe-lane glow
        float flare = 0.0;     // bright edges of the safe gap

        for (int i = 0; i < MAX_WAVES; i++) {
          if (uRadius[i] < 0.0) continue;       // inactive wave

          // Jagged edge. Max displacement is 0.06 m, far inside the 0.25 m lethal half-width.
          float wobble = (noise1(ang * 14.0 + uTime * 6.0 + float(i) * 7.0) - 0.5) * 0.12;
          float d = (r - uRadius[i]) + wobble;  // > 0 ahead of the wave, < 0 behind it
          float ad = abs(d);

          float gapDist = angDiff(ang, uGapAngle[i]);
          float inGap = 1.0 - smoothstep(uGapWidth * 0.5 - 0.1, uGapWidth * 0.5, gapDist);
          float solid = 1.0 - inGap;

          // Lethal band: fully solid to 55% of the half-width, fading out at the hit-test edge.
          float band = 1.0 - smoothstep(hw * 0.55, hw, ad);
          float core = 1.0 - smoothstep(0.0, hw * 0.4, ad);
          float lead = 0.65 + 0.35 * smoothstep(-hw, hw, d);          // leading edge burns brighter
          float crackle = 0.75 + 0.25 * sin(ang * 60.0 + uTime * 25.0 - r * 8.0);

          body += band * solid * crackle * lead;
          heat += core * solid * (0.8 + 0.2 * sin(uTime * 40.0 + float(i)));

          // Dim ember trail behind the wave (visual only, not lethal).
          float behind = (1.0 - smoothstep(hw, uThickness * 2.6, -d)) * step(hw, -d);
          float cracks = 0.5 + 0.5 * sin(ang * 90.0 + r * 12.0 - uTime * 8.0);
          ember += behind * solid * (0.25 + 0.35 * cracks);

          // Sparks: thin bright spikes that flicker in and out around the ring.
          float spike = pow(abs(sin(ang * 55.0 + float(i) * 3.0 + uTime * 40.0)), 30.0);
          float flicker = step(0.45, noise1(ang * 9.0 + uTime * 18.0 + float(i) * 13.0));
          sparks += spike * flicker * solid * (1.0 - smoothstep(hw * 0.6, hw * 2.6, ad));

          // Safe lane glow (wider than the band so the gap reads clearly).
          float halo = 1.0 - smoothstep(0.0, uThickness * 1.6, ad);
          lane += halo * inGap * (0.5 + 0.1 * sin(uTime * 6.0));

          // Flares on both edges of the gap: bright where the danger stops.
          float edge = inGap * (1.0 - inGap) * 4.0;
          flare += edge * (1.0 - smoothstep(0.0, hw * 1.8, ad)) * 1.2;
        }

        // Telegraph: pulsing rim, ripples racing outward and a red floor glow while the core charges.
        float rim = smoothstep(1.4, 1.7, r) * (1.0 - smoothstep(1.7, 2.3, r));
        float pulse = 0.5 + 0.5 * sin(uTime * (18.0 + uCharge * 30.0));
        float tele = uCharge * rim * (0.6 + 0.9 * pulse);
        float ripple = uCharge * pow(max(0.0, sin(r * 5.0 - uTime * 14.0)), 6.0)
                     * smoothstep(1.7, 2.1, r) * (1.0 - smoothstep(2.1, 6.5, r)) * 0.5;
        float glow = uCharge * uCharge * smoothstep(1.4, 1.9, r) * (1.0 - smoothstep(1.9, 5.2, r))
                   * (0.18 + 0.1 * pulse);

        vec3 hot = vec3(1.0, 0.92, 0.7);       // white-hot
        vec3 spark = vec3(1.0, 0.75, 0.35);    // arc colour
        vec3 warn = vec3(1.0, 0.85, 0.3);      // gap edge flare

        vec3 col = uDanger * (body * 1.5 + ember * 0.6 + tele + ripple + glow)
                 + hot * heat * 0.9
                 + spark * sparks * 1.4
                 + warn * flare
                 + uSafe * lane;

        float alpha = body + heat + ember * 0.5 + sparks + flare * 0.6 + lane + tele + ripple + glow;
        gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
      }
    `,
  });
}