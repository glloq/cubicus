# Audit UX du Studio et du Player

L’audit a suivi la création d’un assemblage, l’édition d’une face, le choix d’un effet optique, la préparation du départ, le test et l’ouverture dans le Player. Les contrôles ont été relevés sur ordinateur et avec un viewport mobile de 390 px.

| Friction observée | Évolution |
| --- | --- |
| Les choix de matière et de géométrie repoussaient le dessin sous la ligne de flottaison. | L’inspecteur regroupe Dessin, Matière et Volume. Le raccourci de la scène ouvre le dessin de la face sélectionnée. |
| Les commandes de projet et de sortie se disputaient le même espace. | Les actions secondaires sont dans Projets. Enregistrer, Annuler, Rétablir, Tester et Exporter restent accessibles depuis l’en-tête. |
| Le créateur devait connaître le nom d’un générateur pour le trouver. | Les parcours de création ouvrent directement le panneau et le réglage concernés, en conservant l’assemblage. |
| Les commandes de manipulation détournaient l’attention du travail en cours. | Le Studio affiche les contrôles de l’outil actif sous la scène. Le panneau Préparer réunit les repères du départ et la vérification de l’export. |
| L’import et le mode observation du Player donnaient peu de contexte. | Le titre, le nombre de fragments et une aide liée aux commandes autorisées apparaissent dans le Player. Un import invalide conserve l’énigme ouverte et indique l’erreur. |
| En portrait, le cadrage pouvait couper les fragments et les panneaux repousser la scène. | La grille place la scène avant les réglages, la navigation par étapes reste accessible et le recentrage tient compte de la largeur. |

Les parcours couvrent le cube illustré, la fresque, l’anamorphose, la superposition, l’ombre, l’espace négatif, le miroir et l’inscription cachée. Ils permettent de combiner plusieurs mécanismes dans la limite du moteur. L’éditeur dispose maintenant de formes vectorielles simples, d’un import SVG rasterisé et de dix modèles de mécanismes. La qualification optique complète et l’édition vectorielle avancée restent ouvertes. Un parcours guidé facilite l’accès aux outils existants. Les générateurs signalés comme remplaçant l’assemblage continuent à le faire lorsque l’utilisateur les applique.

Le test Chromium `workspace.mjs` couvre l’ordre visuel mobile, le passage vers l’anamorphose, les sections de l’inspecteur, une modification de volume et la récupération après un import invalide dans le Player.
