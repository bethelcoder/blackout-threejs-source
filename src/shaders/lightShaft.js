import * as THREE from 'three';

// Volumetric light shaft cast from a ceiling diffuser.
//
// A cone/frustum mesh stands in for the volume of dusty air. Per pixel the
// fragment shader intersects the view ray with that frustum, measures how much
// of the ray is inside it, and multiplies by a density falloff (soft at the
// silhouette, dimmer toward the floor, drifting noise for the motes). The
// result is added to the frame, so it brightens the dark corridor without
// occluding anything.
//
// cameraPosition is a built-in ShaderMaterial uniform that three.js sets from
// whichever camera is rendering, so this stays correct in first person, in
// third person and in the CCTV picture-in-picture pass without extra wiring.

const vertexShader = /* glsl */`
  varying vec3 vLocalPos;

  void main() {
    vLocalPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */`
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3 uColor;
  uniform float uHeight;
  uniform float uTopRadius;
  uniform float uSlope;
  uniform mat4 uWorldToLocal;

  varying vec3 vLocalPos;

  float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
      mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  void main() {
    vec3 camLocal = (uWorldToLocal * vec4(cameraPosition, 1.0)).xyz;
    bool insideCone = camLocal.y <= 0.0
      && camLocal.y >= -uHeight
      && length(camLocal.xz) <= uTopRadius + uSlope * (-camLocal.y);

    // Draw exactly one fragment per pixel: the near surface while the camera
    // is outside, the far surface once it stands inside the shaft.
    #ifdef IS_CAP
      // The cap only closes the top of the volume, so it counts only from
      // inside; from outside the side wall already covers those pixels.
      if (!insideCone) discard;
    #else
      if (insideCone) {
        if (gl_FrontFacing) discard;
      } else if (!gl_FrontFacing) {
        discard;
      }
    #endif

    vec3 dir = normalize(vLocalPos - camLocal);

    // Slab that bounds the frustum along its own axis (local y in [-h, 0]).
    float slabNear = -1e20;
    float slabFar = 1e20;
    if (abs(dir.y) > 1e-5) {
      float ta = (-uHeight - camLocal.y) / dir.y;
      float tb = (-camLocal.y) / dir.y;
      slabNear = min(ta, tb);
      slabFar = max(ta, tb);
    } else if (camLocal.y < -uHeight || camLocal.y > 0.0) {
      discard;
    }
    slabNear = max(slabNear, 0.0);

    // Frustum side x^2 + z^2 = (r0 + m * -y)^2, expanded along the ray into a
    // quadratic a*t^2 + b*t + c = 0.
    float a = dir.x * dir.x + dir.z * dir.z - uSlope * uSlope * dir.y * dir.y;
    float b = 2.0 * (
      camLocal.x * dir.x + camLocal.z * dir.z
      - uSlope * uSlope * camLocal.y * dir.y
      + uTopRadius * uSlope * dir.y
    );
    float c = camLocal.x * camLocal.x + camLocal.z * camLocal.z
      - uSlope * uSlope * camLocal.y * camLocal.y
      + 2.0 * uTopRadius * uSlope * camLocal.y
      - uTopRadius * uTopRadius;

    if (abs(a) < 1e-5) a = a < 0.0 ? -1e-5 : 1e-5;

    float disc = b * b - 4.0 * a * c;
    float chordLength = 0.0;
    float chordMid = 0.0;

    if (disc < 0.0) {
      // No side hit: a ray steep enough to stay inside the whole way through.
      if (a < 0.0) {
        chordLength = max(0.0, slabFar - slabNear);
        chordMid = 0.5 * (slabNear + slabFar);
      }
    } else {
      float root = sqrt(disc);
      float lo = (-b - root) / (2.0 * a);
      float hi = (-b + root) / (2.0 * a);
      if (lo > hi) {
        float swap = lo;
        lo = hi;
        hi = swap;
      }

      if (a > 0.0) {
        float near = max(lo, slabNear);
        float far = min(hi, slabFar);
        if (far > near) {
          chordLength = far - near;
          chordMid = 0.5 * (near + far);
        }
      } else {
        // Steeper than the cone: inside lies outside the roots, so both
        // branches are candidates and the longer one wins.
        float nearA = slabNear;
        float farA = min(lo, slabFar);
        if (farA > nearA) {
          chordLength = farA - nearA;
          chordMid = 0.5 * (nearA + farA);
        }
        float nearB = max(hi, slabNear);
        float farB = slabFar;
        if (farB > nearB && (farB - nearB) > chordLength) {
          chordLength = farB - nearB;
          chordMid = 0.5 * (nearB + farB);
        }
      }
    }

    // Inside the volume the ray already starts in the dust, so the visible
    // stretch is the distance to whichever boundary it leaves through. The
    // side quadratic can degenerate here (looking up the axis exits through
    // the open top), which would otherwise read as a dark hole in the beam.
    if (insideCone) {
      float exitT = slabFar;
      if (disc >= 0.0) {
        float root = sqrt(disc);
        float sideExit = max((-b - root) / (2.0 * a), (-b + root) / (2.0 * a));
        if (sideExit > 1e-4) exitT = min(exitT, sideExit);
      }
      chordLength = max(0.0, exitT);
      chordMid = 0.5 * chordLength;
    }

    if (chordLength <= 1e-4) discard;

    // Density at the middle of the chord: this is what makes grazing rays dim.
    vec3 mid = camLocal + dir * chordMid;
    float heightN = clamp(-mid.y / uHeight, 0.0, 1.0);
    float radiusAt = uTopRadius + uSlope * (-mid.y);
    // Measured in world units rather than as a fraction of the radius, so the
    // narrow top of the cone fades out instead of ending in a hard strip.
    float edge = 1.0 - smoothstep(radiusAt * 0.25, radiusAt, length(mid.xz));
    float falloff = mix(1.0, 0.45, heightN);

    // Scrolling noise layers break the haze into drifting motes.
    vec2 dustUv = vec2(mid.x * 3.4 + mid.z * 2.2, mid.y * 3.0 - uTime * 0.4);
    float dust = valueNoise(dustUv) * 0.55
      + valueNoise(dustUv * 2.9 + 7.3) * 0.30
      + valueNoise(dustUv * 6.3 + 3.7) * 0.15;

    float density = edge * falloff * (0.45 + 0.55 * dust);
    float flicker = 0.93 + 0.07 * sin(uTime * 9.0) * sin(uTime * 4.3 + 1.7);

    // Standing in the beam fills the whole view, so damp the haze from inside.
    float insideDamp = insideCone ? 0.28 : 1.0;

    // Beer-Lambert: light scattered toward the eye out of the dust it passed.
    float opticalDepth = chordLength * density * flicker * 0.18 * uIntensity;
    float glow = (1.0 - exp(-opticalDepth)) * insideDamp;

    gl_FragColor = vec4(uColor * glow, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createLightShaft({
  position = new THREE.Vector3(0, 6.86, 0),
  height = 6.84,
  topRadius = 0.45,
  bottomRadius = 1.35,
  color = 0xc6dcff,
  intensity = 1,
} = {}) {
  // Apex at local y = 0, opening downward to y = -height.
  const geometry = new THREE.CylinderGeometry(topRadius, bottomRadius, height, 48, 1, true);
  geometry.translate(0, -height / 2, 0);

  // Cap the top opening. Seen from inside, a ray leaving through it misses the
  // side surface entirely and would punch a hole in the middle of the beam.
  // It sits just below the ceiling panels, which would otherwise occlude it.
  const capDrop = 0.15;
  const capGeometry = new THREE.CircleGeometry(
    topRadius + capDrop * (bottomRadius - topRadius) / height, 48);
  capGeometry.rotateX(Math.PI / 2);
  capGeometry.translate(0, -capDrop, 0);

  const uniforms = {
    uTime: { value: 0 },
    uIntensity: { value: intensity },
    uColor: { value: new THREE.Color(color) },
    uHeight: { value: height },
    uTopRadius: { value: topRadius },
    uSlope: { value: (bottomRadius - topRadius) / height },
    uWorldToLocal: { value: new THREE.Matrix4() },
  };

  const materialOptions = {
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  };
  const material = new THREE.ShaderMaterial(materialOptions);
  const capMaterial = new THREE.ShaderMaterial({ ...materialOptions, defines: { IS_CAP: 1 } });

  const group = new THREE.Group();
  const shell = new THREE.Mesh(geometry, material);
  const cap = new THREE.Mesh(capGeometry, capMaterial);
  shell.renderOrder = 2;
  cap.renderOrder = 2;
  group.add(shell, cap);
  group.name = 'Volumetric light shaft';
  group.position.copy(position);

  // Valid before the first update() call too, so the shaft is correct on the
  // first frame after the level is built.
  group.updateWorldMatrix(true, false);
  uniforms.uWorldToLocal.value.copy(group.matrixWorld).invert();

  let elapsed = 0;

  function update(delta) {
    elapsed += delta;
    uniforms.uTime.value = elapsed;
    group.updateWorldMatrix(true, false);
    uniforms.uWorldToLocal.value.copy(group.matrixWorld).invert();
  }

  function dispose() {
    group.removeFromParent();
    geometry.dispose();
    capGeometry.dispose();
    material.dispose();
    capMaterial.dispose();
  }

  return { group, uniforms, update, dispose };
}
