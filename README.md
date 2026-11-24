# Cubicus

Browser-based 3D cube puzzle authoring and playtesting. No answer input or validation in the player; validation belongs to an external server.

Studio: `studio.html`. Player: `play.html`. Serve the repository with a static HTTP server. GitHub Pages can publish the root of main. Three.js is loaded as a pinned ES module from a CDN for the initial prototype.

Private authoring projects must never be committed. Public puzzle exports contain only initial poses, flattened face images and public controls, never target poses or answers.

## Quick test
Visit https://glloq.github.io/cubicus/play.html and choose 1, 4 or 18 cubes. Observe: left or right drag; other modes: right drag. Rotate: click a cube and its colored arrow. Move: drag cube onto another. Light: drag in viewport. Studio: https://glloq.github.io/cubicus/studio.html — create a grid, select a face, draw/import, shuffle and Test. No answer input.

Local: `python3 -m http.server 8080` then open http://localhost:8080/studio.html. Unit checks: `npm run check && npm test`. Browser smoke: install playwright@1.51.1 and Chromium, then run `node browser-tests/smoke.mjs` against the local server.
