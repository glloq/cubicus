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
