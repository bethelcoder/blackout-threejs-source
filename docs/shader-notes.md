# Custom shaders — notes for the critical evaluation

Seven hand-written `ShaderMaterial`s ship in the build. Six are original to this
project; `electricCorruption` came from the scaffold and is retained because it
drives the Level 3 set-piece. None of them use a texture: every pattern is
generated from the fragment's coordinates and a time uniform, so there is
nothing to author, nothing to load, and the effects stay sharp at any distance.

They fall into two groups:

| Shader | Kind | Where |
| --- | --- | --- |
| `ventHaze` | in-scene volume | Level 1 ceiling vents |
| `routingHologram` | in-scene projection | Level 2 control-room floor |
| `rackDataStream` | in-scene screen | Level 2 server rack face |
| `electrifiedWater` | in-scene surface | Level 1 hazard puddle |
| `electricCorruption` | in-scene surface | Level 3 corrupted panel |
| `shockOverlay` | full-screen pass | every level, on electrical contact |
| `cctvFeed` | full-screen pass | CCTV picture-in-picture |

## Shared techniques

**Time is accumulated, not read from a clock.** Every module keeps `elapsed +=
delta` and writes it into `uTime`. Driving animation from delta means the
effects pause when the game is paused instead of snapping forward on resume.

**Additive blending for anything that represents light.** Vent haze, the floor
projection, the rack screen, the shock overlay and the CCTV fringe corrections
all use `THREE.AdditiveBlending` with `depthWrite: false`. Additive can only
brighten what is behind it, which is what scattered light actually does, and it
avoids sorting artefacts against the dozens of opaque props in the rooms. The
one case where it is not enough is the rack screen: additive glow cannot darken
the rack behind it, so it gets its own near-black backing plate (see below).

**Tone mapping and colour space are included explicitly.** The renderer uses
ACES filmic tone mapping at exposure 1.35 and the sRGB output colour space.
A raw `ShaderMaterial` bypasses both, so its output would be the only thing in
the frame that is not tone-mapped — it reads as flat and over-saturated next to
everything else. The world-facing shaders therefore end their fragment `main()`
with:

```glsl
#include <tonemapping_fragment>
#include <colorspace_fragment>
```

**Hash noise instead of textures.** All procedural detail comes from one-line
hashes (`fract(sin(dot(p, k)) * 43758.5453)` and a 3D variant). Values are
turned into shapes with `step`, `smoothstep` or `pow`, which is what makes the
patterns resolution-independent: the same shader is legible at 240 × 135 in the
CCTV feed and on a 4K display.

---

## 1. Vent haze — Level 1

`src/shaders/ventHaze.js`

**What it does.** Three faint plumes hang under the ceiling vents. Each is
denser at the grille, thins as it sinks, drifts down, and leans slowly from side
to side.

**How.** An open cone mesh stands in for the outer shell of the plume, and the
fragment shader decides which fragments of that shell survive:

- a facing term, `pow(abs(dot(N, V)), 0.55)`, keeps the stretches of surface
  pointing at the camera and discards the grazing ones, so the cone never draws
  an outline;
- two scales of 3D value-noise in **world** space are cross-masked with
  `smoothstep` — a broad set punches gaps in the body of the cloud, a fine set
  curls the edges into wisps;
- a vertical envelope keeps it dense at the mouth and thins it downward, with a
  small fade in the top 10% so the shell's rim never shows as a hard ring;
- the vertex shader bends the plume as it falls (`x += sin(t)·0.26·depth²`).

The silhouette is lumpy before the shader even runs: the cone's vertices are
displaced by two sine waves around its axis on the CPU, pinned at the top so it
still meets the grille cleanly.

**Why it fits.** Level 1's ceiling has three extractor grilles that were purely
decorative. Adding moving air means the room reads as a working industrial space
and gives the eye something to follow while walking. Sampling the noise in world
space rather than UV keeps the billows anchored to the room, so nothing swims
when the camera moves.

**Cost and limits.** About 400 triangles per plume and two 3-octave noise
evaluations per fragment; only the on-screen area matters. The shell is
infinitely thin — the volume is implied by the facing falloff and noise, not
integrated, so it holds up from most angles but is not a true participating
medium.

## 2. CCTV feed — screen pass

`src/shaders/cctvFeed.js`

**What it does.** The picture-in-picture view is no longer a direct render of
the room with a CSS stripe over it; it is treated like a cheap analogue camera.

**How.** The room is rendered into a 240 × 135 `WebGLRenderTarget`, then that
image is drawn to the quarter-size canvas through a full-screen quad. Per
fragment the pass:

- samples the image three times, once per channel, each offset along the radius,
  producing colour fringing toward the corners;
- bends the UVs with `centered * (1 + r² · 0.05)` for barrel curvature;
- draws scanlines from `sin(vUv.y · uResolution.y · π)`, so they are locked to
  feed pixels rather than window pixels;
- adds a soft sync band that rolls down the image and nudges it sideways as it
  passes, plus rare horizontal tears;
- adds 30 Hz sensor grain, a vignette, and a slight cool bias.

**Why it fits.** The PiP is a gameplay mechanic (the camera sees the player when
their back is turned), so it needs to look like a device, not a second window.
Rendering to an offscreen target is what makes the effect believable: the image
is genuinely low-resolution, so the grain and scanlines sit at the same scale as
the detail instead of floating over it.

**Render-pipeline detail worth stating in the report.** Three.js only applies
tone mapping when rendering to the default framebuffer, so a render-target pass
stores linear values. That means the CCTV pass applies ACES exactly once, in its
own fragment shader — applying it on the renderer *and* in the pass would double
it. The PiP renderer is set to the same ACES/exposure settings as the main
renderer so the two views cannot drift apart in brightness.

**Constraint.** The CCTV camera is kept at an aspect ratio of 1.0 even though
the canvas is 16:9. The security sweep builds its detection frustum from that
camera's projection matrix, so changing the aspect to fill the PiP would
silently change the gameplay detection volume.

## 3. Shock overlay — screen pass

`src/shaders/shockOverlay.js`

**What it does.** On contact with the electrical hazard, the screen fills with
arcs radiating from the centre of the view, a single flash, a thin expanding
ring and a burst of sensor noise, all gone in 0.8 s.

**How.** A full-screen quad, drawn after the scene with additive blending and
`depthTest`/`depthWrite` off. The arcs live in polar coordinates: the screen is
split into 11 sectors, each ring samples two hashed angular offsets and
interpolates between them, so the path to the centre is a jagged piecewise
linear line rather than a smooth curve. Screen-space distance is recovered with
`abs(across − path) · τ · radius / sectors`, which keeps line width constant in
pixels. A second sector layer at a different count crosses the first. The arc
seeds are re-drawn every 1/14 s, so the bolts visibly restrike instead of
holding a static shape.

**Why it fits.** The hazard already teleported the player back and played a
beep, but the hit itself had no visual confirmation. Doing it in-engine rather
than as a DOM flash means it covers the first- and third-person views correctly,
is included in screenshots, and cannot be left visible over the HUD.

**Cost and limits.** One draw call, a handful of hashes per fragment, only
active during the 0.8 s envelope. The arcs are a screen-space approximation —
there is no 3D lightning volume — which is invisible in practice because the
effect never outlives a blink.

## 4. Routing hologram — Level 2

`src/shaders/routingHologram.js`

**What it does.** A cyan schematic is projected onto the control-room floor:
concentric rings, radial spokes, dashes of data travelling outward along them, an
expanding ring pulse every ~2.6 s and a rotating sweep lobe.

**How.** Polar coordinates turn the plane into rings and spokes. Spoke width is
measured as arc length (`Δθ · r`) so the lines do not thicken toward the rim.
Travelling dashes come from a sine of radius and time, thresholded; the pulse is
a gaussian in `r` whose centre advances with time; the sweep is
`cos(angle − t)²⁴`. A rim fade and a little noise stop it reading as a sticker on
the floor.

**Why it fits.** The room is about routing power and water, so the floor display
turns the puzzle's subject into architecture. Additive blending keeps it reading
as projected light: it lifts the deck but never darkens anything crossing it.

## 5. Rack data stream — Level 2

`src/shaders/rackDataStream.js`

**What it does.** A server rack face shows columns of data scrolling at
different speeds, with a bright head and a fading tail, under a slow sweep band.

**How.** The UV is divided into a 26 × 40 grid of cells. Each column hashes its
index into its own scroll speed and phase, so columns never sync. A cell's
brightness is `smoothstep` of its distance behind that column's moving head. Each
cell hashes to one of two bar orientations, which reads as a stream of glyphs
without a font. A thin bezel is drawn in the shader with corner ticks, and
content is inset so nothing collides with the frame.

**Design note.** The first version was too wide and sat across two racks, and
because additive light cannot darken its background it simply disappeared into
the rack's own LEDs. It was narrowed to a single 0.82 × 1.5 m rack face and given
a near-black backing plate at −4 mm, which is what makes the glow read as a
screen.

## 6. Electrified water — Level 1 hazard

`src/shaders/electrifiedWater.js`

**What it does.** The puddle under the leaking pipe ripples, and when it is live
it runs with crawling electrical filaments and a 43 Hz flicker.

**How.** The puddle's outline is a signed-distance function shared with the rest
of the hazard system (`src/systems/puddleShape.js`), so the shader discards
outside the same shape the gameplay uses. The plane's vertices are displaced in Z
by a travelling sine product for the ripple; filaments come from
`pow(1 − abs(sin(...)), 22)` — thin bright ridges where the sine crosses zero —
and `uLive` switches them on without rebuilding the material.

## 7. Electric corruption — Level 3

`src/shaders/electricCorruption.js` (from the scaffold)

Scanlines plus cell-hashed "veins", with a vertex-displacement flicker, on the
panel behind the AI core. `uIntensity` is interpolated toward
`0.35 + suspicion / 120` every frame, so the corruption visibly grows as the AI
escalates. It is retained as the Level 3 set-piece and as the rubric's baseline
"hand-written ShaderMaterial" item.

---

## Iteration notes (useful for the evaluation section)

**The Level 1 light beam was removed.** An early version ray-marched the view
ray through a cone under one diffuser, accumulating optical depth. It was
technically the most involved shader in the set, but once the room was dressed it
read as a random spotlight: the beam sat under a single fixture with no light
source justifying it, and the eye went straight to it. It was taken out after the
vent haze landed, because that gives the room moving air without inventing a
light that is not there. The lesson worth writing up is that technical complexity
is not the same as suitability — the effect was correct and still made the room
worse.

**The CSS scanline overlay on the CCTV was replaced.** The PiP originally had a
`linear-gradient` stripe div on top of the canvas. It never moved with the
picture and doubled up with the real scanlines once the feed treatment existed,
so it was deleted rather than layered.

**The hazard's feedback moved from DOM to GPU.** A radial CSS gradient flash sat
over the HUD. It covered the HUD as well as the world, was invisible to the CCTV
view and to screenshots of the render, and could not show direction. The shock
overlay does all three.

**Tuning was done from renders, not from the code.** The vent haze went through
three passes: tall and bright (looked like a second light beam), short and faint
(looked like a smudge on the ceiling) and finally moderately tall, lumpy and
leaning with a patch mask. Each decision came from a rendered frame at a fixed
camera position, which is the only way to judge additive effects against a
specific room's lighting.

## Limitations to acknowledge

- Additive blending is an approximation: none of these effects are lit by the
  scene's actual lights, so they cannot go dark when a light is switched off.
- The vent haze has no true volume; the facing term fakes thickness.
- Grain and scanlines are computed in linear space before tone mapping, so very
  bright areas compress the effect more than dark ones — realistic for a sensor,
  but worth knowing if it is tuned further.
- The CCTV treatment is tuned for 240 × 135. Raising the PiP resolution would
  require re-scaling the scanline and grain frequencies, which is why they are
  expressed against `uResolution` rather than in fixed pixel values.
