# Cubicus

Cubicus est un atelier et un lecteur d’énigmes 3D à base de fragments assemblés sur une grille. Les cubes tournent par quarts de tour. Le Studio et le Player partagent le moteur de rendu et les règles de manipulation.

## Essayer Cubicus

- [Ouvrir le Studio](https://glloq.github.io/cubicus/studio.html) pour créer et tester une énigme.
- [Jouer à la démo](https://glloq.github.io/cubicus/play.html) dans le Player. Le menu **Démo** propose trois assemblages techniques de 1, 4 et 18 cubes.

Ces liens ouvrent la version publiée sur GitHub Pages. Pour essayer les changements de cette branche, lancez Cubicus en local.

## Fonctionnalités de la branche

- **Studio** · Assemblez des fragments, éditez les faces et les calques, créez des volumes creux ou perforés et composez des fresques, projections, superpositions ou effets d’ombre. Les projets et la bibliothèque de ressources sont conservés dans le navigateur.
- **Préparation** · Configurez les contrôles avec un profil ou règle par règle, appliquez des contraintes aux cubes et aux groupes, puis mélangez l’assemblage avec les opérations autorisées. Testez l’énigme dans le Studio ou dans un nouvel onglet.
- **Player** · Ouvrez un fichier `.puzzle` ou une démo. Les commandes s’adaptent aux règles, à l’assemblage et à la sélection. Le fichier privé `.cubicus` conserve les calques et les références de création. L’export public contient l’état initial, les textures finales et les règles de jeu.

## Développement local

Avec Node.js 22 et Python 3, installez les versions épinglées et servez le dépôt.

```bash
npm ci
python3 -m http.server 8080
```

Ouvrez [le Studio en local](http://localhost:8080/studio.html) ou [la démo en local](http://localhost:8080/play.html). Le navigateur charge Three.js depuis le dépôt servi localement après installation.

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
