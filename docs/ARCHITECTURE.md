# Architecture V0.1

## Principles
- Arbitrary occupancy of an integer 3D grid. The initial grid generator supports 1–8 cells per axis, up to 512 cubes.
- Cube orientation is an exact signed permutation matrix (24 valid orientations), world-axis quarter-turns only.
- Camera orbit and directional lighting remain continuous, independently of cubes.
- Line and layer selection support per-cube rotation or optional rigid group rotation; invalid grid positions and collisions reject the whole operation.
- Spacing modifies displayed positions, not logical slots.
- No answer input, solution checking, target detection or reveal triggers in Player. External server is responsible for validation.

## Studio
Generate a grid, add/duplicate/delete cubes, select a face in 3D or via the face selector, paint or import an image. Save a private reference arrangement, shuffle the current arrangement, and export or open playtest. Images are flattened to 512px PNG. Private projects are downloaded as .cubicus; public exports as .puzzle. The latter use an explicit field allowlist. The playtest bridge uses IndexedDB; it is not a security boundary between scripts on the same origin.

## Security
Never publish private project files or answer data to the public repository. The public model contains geometry and initial state only. Random UUIDs are not a guarantee against algorithmic solving. Export does not yet randomize face-local coordinate systems or audit visual leakage. A server is needed for secure validation. No server implementation in this version.

## Deployment
Enable Settings > Pages > Build and deployment > Source: GitHub Actions. Run Deploy Cubicus. Pages artifact is limited to the three HTML pages and src. Three.js 0.180.0 is pinned via CDN; network access is required. No bundler in V0.1.

## Remaining work
Persistent reusable library across projects, vector editing and non-destructive drawing layers, per-level public control flags, orthographic camera, shadow receiver and transparency, browser integration tests, texture memory optimization, private project autosave, export security audit. Textured 1/4/18-cube manipulation demos are available; they are not authored riddles yet.

## V0.2 playtest
Studio includes a six-face thumbnail net, text stamping, project-local reusable cube models, and movement by one cell along each axis. Player includes textured demos. Public exports randomize array order and IDs. Enable GitHub Pages manually if configure-pages fails. The prior CI passed; browser validation remains pending.

## V0.3 direct manipulation
The shared viewport uses Three.js raycasting for selection and drag/drop swaps. Rotation handles are actual 3D meshes, with color-coded world axes and signed quarter-turns. Rotate, Move and Observe modes isolate pointer interactions. Right drag orbits; wheel zooms. View shortcuts orient the camera to six faces or an oblique view. Group rotations use the existing exact grid model. Light still uses independent azimuth/elevation sliders. Browser acceptance remains required; no solution logic has been added.

## V0.4 interaction and acceptance
- Fixed scene initialization ordering. Retained meshes and shared geometry reduce GPU churn; face textures are cached and unused textures released.
- Player has a floating contextual dock, animated quarter-turns and swap destination outline. Observe mode uses left drag as well as the permanent right-drag orbit. Orthographic projection is available from view shortcuts.
- Light mode: drag in viewport to change azimuth/elevation; optional real shadow receiver. Shadows are off by default.
- Studio > Outils du joueur configures public boolean capabilities. Export allowlists these booleans. They are interaction settings, not a security boundary.
- Chromium smoke workflow exercises Studio opening, face text, shuffle, popup playtest, lighting, projection, demo selection, rotations, undo and reset. Unit tests still cover the integer pose model. Browser CI is separate from Pages deploy and requires CDN connectivity.
- Outstanding: true drag along 3D empty slots, orientation cube, per-axis spacing handles, authored puzzle examples, project autosave, stronger export audits, optical projection authoring and mobile usability qualification.

## V0.5 authoring generators
Studio supports raster mural slicing, a separate local IndexedDB draft, and camera-space texture baking for up to 64 cubes. The projection uses the current world matrices and camera to sample the input image onto outward-facing surfaces; it supports perspective and orthographic cameras, including cube quarter-turns. Hidden/occluded surfaces facing the camera are also baked; gaps remain gaps, and arbitrary assemblies may not form a legible continuous image. The reference pose and camera/spacing are private authoring data and excluded by public export. The source image is not exported. Projected textures remain editable through the raster face editor. The method does not prevent computational recovery of a projected image. No automatic solution detection. Browser smoke now includes image slicing, projection and draft recovery; visual quality remains a manual check.

## V0.6 optical materials and spatial movement
Optional public cube fields opacity (six clamped numbers) and alphaFaces (six booleans) control rendering. Alpha cutout uses a 0.5 threshold; translucent faces use standard blending and do not write depth. Transparent cubes do not cast shadows in this version. The Studio overlay generator partitions source pixels randomly among 2–8 single-face layers, with other faces invisible. Orthographic alignment recombines the image; this is not cryptographic protection and layers are interchangeable in depth. Move mode exposes adjacent free grid slots while dragging and accepts a swap or a free slot. Visual and pointer interaction acceptance remain pending. New tests cover material export and overlay generation.

## V0.7 viewport tools
Spacing mode exposes three axis-colored 3D arrow handles (only axes with multiple occupied coordinates). Drag projects pointer displacement onto the screen-space axis; spacing stays within 0–2 and does not modify logical positions. A second small on-demand WebGL view renders a clickable navigation cube with the current camera orientation. Direct face clicks orient the main camera. The group selection shows a fragment count and hides its axis selector for single/all scope. Browser smoke covers the spacing mode, navigation cube and line selector; direct drag geometry and visual quality still need manual acceptance.

## V0.8 private raster layers
Each face optionally has up to 16 editable raster layers, with visibility, opacity and order. The active layer is edited on Canvas 2D and asynchronously flattened into the public face texture. The private project reader validates layer images separately; the public model allowlist excludes layers. Export and playtest refuse while composition is pending. Projection can skip already-textured faces for multi-view authoring; it does not yet combine independent projections on the same face. Browser selectors distinguish the two WebGL canvases. Layer UI smoke tests do not establish pixel-perfect composition or visual quality.

## V0.9 Studio authoring utilities
Eight procedural raster stamps support size, fill, color, width, quarter-turn orientation and optional 32px coordinate snapping. Shuffle positions and rotations can be enabled independently. Project diagnostics check the public schema, size, face count and equality to the reference pose; they do not prove solvability or confidentiality. Open-face controls use existing face opacity to remove walls visually, not actual thick-walled or perforated geometry. Cube picker allows selecting invisible cubes. Browser tests exercise stamps, audit and open/close presets. Real perforated geometry remains future work.
