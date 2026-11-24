# Architecture V0.1

## Principles
- Arbitrary occupancy of an integer 3D grid. The initial grid generator supports 1–8 cells per axis, up to 512 cubes.
- Cube orientation is an exact signed permutation matrix (24 valid orientations), world-axis quarter-turns only.
- Camera orbit and directional lighting remain continuous, independently of cubes.
- Line and layer selection currently rotate each member around its own center; collective permutation of positions is a separate future operation.
- Spacing modifies displayed positions, not logical slots.
- No answer input, solution checking, target detection or reveal triggers in Player. External server is responsible for validation.

## Studio
Generate a grid, add/duplicate/delete cubes, select a face in 3D or via the face selector, paint or import an image. Save a private reference arrangement, shuffle the current arrangement, and export or open playtest. Images are flattened to 512px PNG. Private projects are downloaded as .cubicus; public exports as .puzzle. The latter use an explicit field allowlist. The playtest bridge uses IndexedDB; it is not a security boundary between scripts on the same origin.

## Security
Never publish private project files or answer data to the public repository. The public model contains geometry and initial state only. Random UUIDs are not a guarantee against algorithmic solving. Export does not yet randomize face-local coordinate systems or audit visual leakage. A server is needed for secure validation. No server implementation in this version.

## Deployment
Enable Settings > Pages > Build and deployment > Source: GitHub Actions. Run Deploy Cubicus. Pages artifact is limited to the three HTML pages and src. Three.js 0.180.0 is pinned via CDN; network access is required. No bundler in V0.1.

## Remaining work
Dedicated reusable cube library, vector editing and non-destructive drawing layers, movement into empty cells, rigid layer rotation and collision checking, per-level public control flags, orthographic camera, shadow receiver and transparency, browser integration tests, texture memory optimization, private project autosave, export security audit. No real puzzle content yet.
