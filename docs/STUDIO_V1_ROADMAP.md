# Feuille de route du Studio V1.0

Point de départ : `20fa65e` (Studio V0.9). Les 12 tests unitaires et la vérification de syntaxe passent localement. La page GitHub Actions confirme le succès des exécutions [Validate Cubicus](https://github.com/glloq/cubicus/actions/runs/45492510390), [Browser smoke](https://github.com/glloq/cubicus/actions/runs/45492510449) et [Deploy Cubicus](https://github.com/glloq/cubicus/actions/runs/45492510285) pour ce commit. Sur main à ce commit, le workflow Pages ignorait Chromium. La branche fait désormais dépendre le déploiement des deux validations.

États : TODO, IN_PROGRESS, IMPLEMENTED, TESTED, QUALIFIED, BLOCKED. TESTED indique que les contrôles ciblés ont été exécutés. QUALIFIED exige la satisfaction des critères d’acceptation, y compris les contrôles navigateur, visuels ou de performance applicables.

## Livraison sur la branche V1

Les états décrivent l’avancement du chantier entier. Un chantier IN_PROGRESS peut contenir des fonctionnalités testées. Aucun état QUALIFIED n’est attribué à la V1 complète.

| Chantier | État livré | Résultat et reste à faire |
| --- | --- | --- |
| S01 | IN_PROGRESS | Modules privés pour projets, dessin, volumes, bibliothèques et références. Extraction de l’orchestration restante et validation unifiée encore partielles. |
| S02 | IN_PROGRESS | Actions globales et test intégré en en-tête. Panneaux redimensionnables et qualification sur petits écrans à compléter. |
| S03 | IN_PROGRESS | Zoom, panoramique, plein écran, grille réglable, coordonnées, lignes contraintes, ellipse et triangle. Guides, courbes, sélection, remplissage intelligent et pipette à compléter. |
| S04 | IN_PROGRESS | Calques matriciels renommables, dupliqués, verrouillables et fusionnables. Vecteurs, groupes et masques éditables à faire. |
| S05 | IN_PROGRESS | PNG, JPEG, WebP avec aperçu, ajustement, remplissage, position, zoom, rotation, retournement et alpha. SVG assaini et suppression d’une couleur de fond à faire. |
| S06 | IN_PROGRESS | Bibliothèque IndexedDB partagée pour cubes, faces, matériaux, volumes et assemblages, avec recherche et sauvegarde/restauration additive. Symboles et modèles d’énigmes dédiés à faire. |
| S07 | IN_PROGRESS | Maillages creux, parois, cadre, plaque, tunnels rectangulaires. Normales, UV et passages testés. Ouvertures circulaires et polygonales exactes à faire. |
| S08 | IN_PROGRESS | Grilles 2, 4, 8 et 16 par axe, édition individuelle par couche et regroupement des surfaces coplanaires. Édition régionale, symétrie et extrusion à faire. |
| S09 | IN_PROGRESS | Teinte, opacité, alpha mélangé ou découpé, éclairé, émissif, neutre et miroir. Tri des transparences complexes et ombres partielles à approfondir. |
| S10 | IN_PROGRESS | Translation et duplication atomiques de la sélection. Placement direct et catalogue complet de contraintes publiques à faire. |
| S11 | IN_PROGRESS | Fresques XY, XZ et YZ, avec rotation, découpe et transparence. Projection sur un assemblage existant et aperçu du découpage à faire. |
| S12 | IN_PROGRESS | Projections sur sélection, face désignée et calque privé. Analyse d’occultation, masques et aperçu des pertes à faire. |
| S13 | IN_PROGRESS | Pixels, bandes, régions et profondeur variable. Analyse des couches et géométries libres à faire. |
| S14 | IN_PROGRESS | Génération inverse limitée à une lumière directionnelle verticale et au récepteur horizontal. Spots, lumière ponctuelle et comparaison visuelle quantitative à faire. |
| S15 | IN_PROGRESS | Génération d’évidements internes traversants à partir d’un masque. Construction multi-profondeur entre fragments à compléter. |
| S16 | TESTED | Deux faces planes et opaques sur cubes pleins, réflexion perspective 256 × 256 et une passe par miroir au maximum par rendu principal. Qualification visuelle de scénarios à plusieurs miroirs à faire. |
| S17 | IN_PROGRESS | Références nommées et annotées, duplication, suppression, restauration et comparaison par poses. Les dimensions du plan de réception restent hors schéma. |
| S18 | IN_PROGRESS | Opérations réversibles selon les autorisations de permutation et de rotation, axes et nombre d’opérations, vue initiale explicite. Mélange par groupe et diagnostics de contraintes à faire. |
| S19 | IN_PROGRESS | Autorisations d’observation, zoom et projection et contrôles de groupe masqués à un cube. Granularité des rotations, déplacements et sélections à compléter. |
| S20 | IN_PROGRESS | Onglet et fenêtre intégrée, rechargement et réinitialisation via le Player. Comparaison visuelle privée côte à côte à faire. |
| S21 | IN_PROGRESS | Projets nommés, versions restaurables, autosave, copie et concurrence par révision. Miniatures de projets et tests de récupération forcée à compléter. |
| S22 | IN_PROGRESS | Historique commun des cubes, calques, géométries et écartements, 40 entrées. Optimisation de la mémoire et couverture de l’ensemble des métadonnées privées à faire. |
| S23 | IN_PROGRESS | Audit du schéma public, réencodage des textures, statistiques instantanées du rendu et contrôle des poses. Randomisation du repère et étude de fuite visuelle à faire. |
| S24 | TODO | Trois démos techniques existantes pour 1, 4 et 18 cubes. Les dix énigmes de jeu restent à créer et qualifier. |
| S25 | IN_PROGRESS | Mesures de 1 à 512 cubes unis et réduction de six à un appel par cube uni. Campagne avec textures, ombres, miroirs et navigation secondaire à compléter. |
| S26 | IN_PROGRESS | Suites unitaires étendues et parcours Chromium avec assertions d’état, pixels et captures d’échec. Couverture complète des gestes et des tailles de fenêtre à faire. |
| S27 | IN_PROGRESS | Guide Studio, formats, mesures documentées et Pages conditionné par les tests. Exécution distante et déploiement final à vérifier. |

Ordre de livraison : consolidation (S01, S02, S21, S22), création graphique (S03–S06), géométrie et assemblage (S07–S10), optique (S11–S16), préparation (S17–S20, S23), qualification (S24–S27).

La [feuille de route des contrôles adaptatifs](ADAPTIVE_CONTROLS_ROADMAP.md) suit les évolutions de S10, S18 et S19 sur la même branche.
