# Feuille de route du Studio V1.0

Point de départ : `20fa65e` (Studio V0.9). Les 12 tests unitaires et la vérification de syntaxe passent localement. L’API GitHub Actions est inaccessible via le proxy de cet environnement (HTTP 403). Le workflow Pages vérifie la syntaxe et les unités, mais ne dépend pas du contrôle Chromium.

États : TODO, IN_PROGRESS, IMPLEMENTED, TESTED, QUALIFIED, BLOCKED. TESTED indique que les contrôles ciblés ont été exécutés. QUALIFIED exige la satisfaction des critères d’acceptation, y compris les contrôles navigateur, visuels ou de performance applicables.

| Chantier | État | Existant et critère d’acceptation |
| --- | --- | --- |
| S01 Architecture | IN_PROGRESS | Moteur partagé, orchestration Studio dense. Extraire des modules privés sans cycle et préserver les parcours existants. |
| S02 Interface | TODO | Quatre étapes et scène centrale. Regrouper les actions globales et vérifier panneaux, contexte et états actifs sur plusieurs dimensions. |
| S03 Éditeur 2D | TODO | Canevas, patron, six outils. Vérifier navigation indépendante, guides, accrochage et création des formes demandées. |
| S04 Calques | TODO | Calques matriciels privés. Vérifier l’édition individuelle, la migration des calques et l’aplatissement public. |
| S05 Import | TODO | Import bitmap avec ajustement centré. Vérifier transformations, alpha, recadrage, aperçu et rasterisation de SVG assainis. |
| S06 Bibliothèque | TODO | Modèles de cubes par projet. Sauvegarder, restaurer et réutiliser des ressources indépendantes dans plusieurs projets. |
| S07 Géométrie | TODO | Boîtes pleines et faces masquées. Vérifier les ouvertures réelles, normales, UV, raycasting et ombres dans les deux interfaces. |
| S08 Sous-volumes | TODO | Ajouter l’édition par couche et région puis vérifier que le maillage omet les surfaces internes. |
| S09 Matériaux | TODO | Opacité et découpe alpha. Vérifier les modes d’éclairage et distinguer matière transparente, maillage absent et ouverture. |
| S10 Assemblage | TODO | Sélections par ligne/couche, permutations et cases voisines. Vérifier opérations de groupe et contraintes atomiques. |
| S11 Fresques | TODO | Découpage XY créant une plaque. Vérifier plans, masques, aperçu et conservation des faces existantes. |
| S12 Anamorphose | TODO | Projection selon matrices et caméra courante. Vérifier la visibilité, les pertes et la composition sans révélation dynamique. |
| S13 Superpositions | TODO | Partition par pixels en profondeur. Vérifier les autres répartitions, la recomposition et documenter les ambiguïtés. |
| S14 Ombres | TODO | Lumière directionnelle et récepteur. Produire et comparer une silhouette via un maillage projeté réellement. |
| S15 Espaces négatifs | TODO | Écartements par axe. Vérifier les découpes et le vide inter-cubes depuis une référence privée. |
| S16 Miroirs | TODO | Vérifier une réflexion planaire dynamique, son coût et ses occultations. |
| S17 Références | TODO | Une référence et une vue privées. Vérifier plusieurs états indépendants de l’état initial public. |
| S18 Mélange | TODO | Permutation et rotations facultatives, indépendantes des règles. Vérifier les mélanges par opérations légales et leurs diagnostics. |
| S19 Outils Player | TODO | Six autorisations publiques. Vérifier leur application au contrôleur et la réduction des commandes en observation seule. |
| S20 Test intégré | TODO | Onglet Player alimenté par un export public IndexedDB. Vérifier vue intégrée, réinitialisation et absence de données privées dans le Player. |
| S21 Projets | IN_PROGRESS | Brouillon unique et fichier privé V1. Vérifier la migration, l’isolation des projets, les écritures concurrentes et la composition avant sauvegarde. |
| S22 Historique | TODO | Instantanés de cubes bornés en nombre. Vérifier le retour arrière sur les calques, poses et écartements, et mesurer le coût mémoire. |
| S23 Diagnostic | TODO | Contrôle du format, du volume et des poses. Vérifier les mesures de rendu et l’audit de l’export, textures incluses. |
| S24 Démonstrations | TODO | Trois démos techniques de manipulation. Qualifier dix énigmes reproductibles et leurs indices visuels. |
| S25 Performance | TODO | Maillages retenus, caches et rendu à la demande. Mesurer de 1 à 512 cubes avant et après optimisation. |
| S26 Tests | TODO | 12 tests unitaires et un parcours Chromium. Vérifier état, géométrie, pixels, gestes, tailles de fenêtre et captures d’échec. |
| S27 Documentation | TODO | Pages publie les entrées et les sources. Vérifier chemins relatifs, documentation et blocage du déploiement après un échec Chromium. |

Ordre de livraison : consolidation (S01, S02, S21, S22), création graphique (S03–S06), géométrie et assemblage (S07–S10), optique (S11–S16), préparation (S17–S20, S23), qualification (S24–S27).
