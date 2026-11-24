# Cubicus

Cubicus est un atelier et un lecteur d’énigmes 3D à base de fragments assemblés sur une grille. Les cubes tournent par quarts de tour. Le Studio et le Player partagent le moteur de rendu et les règles de manipulation.

## Développement

Avec Node.js 22 et Python 3, installez les versions épinglées et servez le dépôt.

```bash
npm ci
python3 -m http.server 8080
```

Ouvrez `studio.html` pour créer et `play.html` pour jouer. Le navigateur charge Three.js depuis le dépôt servi localement après installation.

```bash
npm run check
npm test
npx playwright install --with-deps chromium
npm run test:browser
npm run benchmark
```

Le serveur HTTP doit tourner pour les deux dernières commandes. Définissez `CHROMIUM_PATH` pour utiliser un Chromium déjà installé ou `BASE_URL` pour tester un autre port. Définissez `CUBICUS_ARTIFACT_DIR` pour collecter des captures en cas d’échec Chromium.

## Ressources

- [Guide Studio, formats et publication](docs/STUDIO_GUIDE.md)
- [Commandes du Player et migration](docs/PLAYER_CONTROLS.md)
- [Feuille de route des contrôles adaptatifs](docs/ADAPTIVE_CONTROLS_ROADMAP.md)
- [Architecture](docs/ARCHITECTURE.md)
- [État des chantiers V1](docs/STUDIO_V1_ROADMAP.md)
- [Mesures de performance](docs/PERFORMANCES.md)

Le Player ouvre les trois démonstrations techniques existantes. La collection V1 d’énigmes de jeu reste à développer.
