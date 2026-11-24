# Cubicus

Browser-based 3D cube puzzle authoring and playtesting. No answer input or validation in the player; validation belongs to an external server.

Studio: `studio.html`. Player: `play.html`. Serve the repository with a static HTTP server. GitHub Pages can publish the root of main. Three.js is loaded as a pinned ES module from a CDN for the initial prototype.

Private authoring projects must never be committed. Public puzzle exports contain only initial poses, flattened face images and public controls, never target poses or answers.
