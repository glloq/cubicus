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
