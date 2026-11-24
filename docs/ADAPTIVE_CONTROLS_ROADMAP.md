# Contrôles adaptatifs

Base : `a88f8bb`, branche Studio V1 existante, seule branche de travail distante. Les 28 tests locaux passent. Les derniers workflows de main à `20fa65e` ont réussi. La V1 dispose déjà de cinq outils, d’un contrôleur partagé, d’une vue de test isolée et d’opérations exactes sur grille. Les booléens actuels filtrent surtout l’interface et les chemins de manipulation restent dispersés.

| Phase | Chantiers | Acceptation |
| --- | --- | --- |
| Architecture | CT01–03, CT16 | Règles migrées, capacités calculées et validation partagée entre interface, scène et mélange. |
| Création | CT04–05, CT10–11 | Profils, test sans modifier le projet, verrouillages et groupes privés éditables. |
| Manipulation | CT06–09, CT12 | Outils adaptés à la structure, destinations et poignées filtrées, transformations atomiques. |
| Entrées | CT13–14, CT17–18 | Autorisations caméra, éclairage, gestes et historique cohérents. |
| Préparation | CT15, CT19–20 | Mélange réversible, diagnostic et sérialisation publique explicite. |
| Qualification | CT21–23 | Tests de migration, contraintes, parcours Chromium et coût jusqu’à 512 cubes. |

## État sur la branche Studio V1

TESTED indique que la fonctionnalité livrée a été exercée par un contrôle automatisé. PARTIEL signale un critère de qualification ou une fonction encore ouverte.

| Chantier | État | Livraison et limites |
| --- | --- | --- |
| CT01 | TESTED | Schéma, index d’occupation, sélection, capacités et API d’action partagés. Le contrôleur orchestre le DOM et les entrées. |
| CT02 | TESTED | `controls.version = 2`, migration des booléens, plages et axes normalisés. Le conteneur public V1 reste lisible. |
| CT03 | TESTED | Outils selon structure et autorisations, choix contextuels et commandes désactivées. Les collisions collectives sont validées à chaque action. |
| CT04 | TESTED | Neuf profils, édition par catégorie, rétablissement du dernier profil appliqué et suggestion sur validation explicite. |
| CT05 | PARTIEL | Résumé adaptatif en direct et Player intégré sur une copie publique. Le test intégré recharge la copie à la demande. |
| CT06 | TESTED | Cinq outils, catégories secondaires et vue minimale en observation. |
| CT07 | TESTED | Cube, ligne, couche, groupe défini, multiple et ensemble, contours au survol et compteur. |
| CT08 | PARTIEL | Axes et sens légaux, rotations simultanées ou collectives et contrôle de collisions. L’aperçu de pose avant une rotation collective reste à faire. |
| CT09 | TESTED | Permutations atomiques, cases libres en 3D, translation, cycle, échange de couches et échange par glissement de groupes compatibles. |
| CT10 | TESTED | Verrouillages, axes, places et restrictions par cube, édition par sélection. Indicateur permanent de verrouillage encore absent. |
| CT11 | PARTIEL | Création, renommage, copie avec fragments, dissolution et solidarité. Un groupe par cube et pivot automatique au centre de l’enveloppe. Axes définis par intersection des contraintes des membres. |
| CT12 | TESTED | Global, par axe, pas et bornes, poignées et repli sur le mouvement vertical lorsque la projection écran est trop courte. |
| CT13 | TESTED | Orbite, zoom, translation, projections, vues, navigation, recentrage et roulis. Les limites facultatives d’orbite angulaire restent à faire. |
| CT14 | PARTIEL | Directionnelle, ponctuelle et spot, geste ou saisie pour position et orientation, intensité, angle et ombres. Récepteur au sol fixe. |
| CT15 | TESTED | Mélange partiel reproductible avec une graine privée. Les transformations de mélange passent par l’API de validation. |
| CT16 | TESTED | Préparation atomique des rotations et mouvements avant commit. Les gestes et raccourcis utilisent le contrôleur partagé. |
| CT17 | PARTIEL | Souris et clavier testés dans Chromium. Gestes tactiles reliés aux contrôles et interruption traitée, sans qualification sur appareil. |
| CT18 | TESTED | Historique commun et réinitialisation de la pose, de l’écartement, de la caméra, de la projection et de l’éclairage. |
| CT19 | PARTIEL | Compteurs, avertissements, erreurs bloquant l’export. La détection exhaustive des fragments inaccessibles reste ouverte. |
| CT20 | TESTED | Règles et contraintes allowlistées. Identifiants de groupes renouvelés, profils, graine et vues de référence privés. |
| CT21 | TESTED | Index reconstruit à la mutation, commandes DOM réutilisées et empreinte des poignées. Calcul mesuré jusqu’à 512 cubes. |
| CT22 | PARTIEL | Fixtures unitaires et scénarios Chromium sur les actions réelles. Qualification tactile et matrice complète sur appareil encore ouvertes. |
| CT23 | TESTED | Guide Player, schéma, migration, performances et liens d’architecture documentés. |
