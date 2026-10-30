import * as THREE from 'three';

// Surveillance-feed treatment for the CCTV picture-in-picture.
//
// The room is rendered into a small offscreen target first, then that image is
// resampled through this pass so the effects are measured in feed pixels rather
// than window pixels. Barrel curvature, per-channel fringe, scanlines, a
// rolling sync band and grain all live in this one full-screen quad.

const vertexShader = /* glsl */`
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */`
  uniform sampler2D tFeed;
  uniform float uTime;
  uniform vec2 uResolution;

  varying vec2 vUv;

  float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  void main() {
    vec2 centered = vUv - 0.5;
    float radius = length(centered);

    // Sync band: a soft bright roll that also nudges the image sideways, so it
    // reads as a timing fault rather than a moving gradient.
    float bandPos = fract(uTime * 0.11);
    float bandDistance = abs(fract(vUv.y - bandPos + 0.5) - 0.5);
    float band = exp(-pow(bandDistance * 26.0, 2.0));

    // Occasional horizontal tear across a slice of the frame.
    float tearCell = floor(vUv.y * 90.0);
    float tear = step(0.997, hash21(vec2(tearCell, floor(uTime * 10.0)))) * 0.004;

    // Barrel curvature: sample further out toward the edges of the tube face.
    vec2 uv = 0.5 + centered * (1.0 + dot(centered, centered) * 0.05);
    uv.x += band * 0.0022 + tear;

    // Colour fringing grows with distance from the optical axis.
    vec2 fringe = centered * dot(centered, centered) * 0.02;
    vec3 colour = vec3(
      texture2D(tFeed, uv + fringe).r,
      texture2D(tFeed, uv).g,
      texture2D(tFeed, uv - fringe).b
    );

    // Scanlines measured in feed pixels, not screen pixels.
    float scanline = 0.5 + 0.5 * sin(vUv.y * uResolution.y * 3.1415927);
    colour *= 0.82 + 0.18 * scanline;

    colour += band * vec3(0.05, 0.075, 0.085);

    // Sensor grain, resampled 30 times a second.
    float grain = hash21(floor(gl_FragCoord.xy * 0.75) + floor(uTime * 30.0) * 13.1);
    colour += (grain - 0.5) * 0.035;

    // Lens falloff, which also hides the corners the curvature pulls in.
    colour *= mix(0.45, 1.0, 1.0 - smoothstep(0.32, 1.0, radius));

    // Cheap sensor response: a touch more contrast, then a cool bias. The lift
    // stays small because a few hundredths in linear is a lot of grey in sRGB.
    colour = max(colour * 1.08 - 0.005, 0.0) * vec3(0.94, 1.0, 1.03);

    gl_FragColor = vec4(colour, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createCctvFeed({ width = 240, height = 135 } = {}) {
  const target = new THREE.WebGLRenderTarget(width, height, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: true,
    stencilBuffer: false,
  });

  const uniforms = {
    tFeed: { value: target.texture },
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(width, height) },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    depthTest: false,
    depthWrite: false,
  });

  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;

  const scene = new THREE.Scene();
  scene.add(quad);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  let elapsed = 0;

  function render(renderer, source, viewCamera, delta) {
    elapsed += delta;
    uniforms.uTime.value = elapsed;

    renderer.setRenderTarget(target);
    renderer.render(source, viewCamera);
    renderer.setRenderTarget(null);
    renderer.render(scene, camera);
  }

  return { render };
}
