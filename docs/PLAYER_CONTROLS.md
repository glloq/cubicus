# Contrôles du Player

La barre propose au plus Observer, Tourner, Déplacer, Écarter et Lumière. L’auteur autorise les familles et les axes. Le moteur masque les outils que l’assemblage ne peut pas utiliser et désactive les actions que la sélection actuelle ne permet pas. Les contours de survol indiquent les fragments de la prochaine sélection.

| Action | Commande |
| --- | --- |
| Observer | Glisser à gauche en observation, à droite dans la scène pour orbiter, molette pour zoomer, bouton central pour translater. |
| Sélectionner | Cliquer ou toucher un cube. Le menu choisit la sélection individuelle, ligne, couche, groupe, multiple ou ensemble si autorisés. |
| Tourner | Choisir une poignée ou un bouton d’axe. En sélection collective, la rotation s’effectue autour d’un pivot commun. En mode simultané, chacun tourne autour de son centre. |
| Déplacer | Glisser vers un cube permutable ou vers une case libre affichée. Les autres opérations sont dans Déplacements précis. Les permutations de groupes compatibles utilisent le glissement. |
| Écarter | Poignées ou curseurs. Les axes sans variation de coordonnées sont retirés. Le mouvement vertical prend le relais si la direction d’une poignée est presque invisible. |
| Lumière | Glisser pour orienter ou déplacer selon la source et l’autorisation. Pour une position, Maj + glisser change l’altitude. Les réglages précis autorisés restent accessibles. |

Avec la scène au focus, `O`, `R`, `D`, `E`, `L` choisissent un outil autorisé. `X`, `Y`, `Z` tournent de 90° en mode rotation, avec Maj pour inverser le sens. `Échap` efface la sélection, `F` recentre, `Ctrl/Cmd+Z` annule et Maj avec ce raccourci rétablit.

La réinitialisation revient au démarrage public. Elle remet en place l’assemblage, la caméra, la projection, l’éclairage et l’écartement.

## Format et migration

Le document `.puzzle` garde son enveloppe V1. Les nouvelles règles sont dans `controls.version: 2` et les catégories `camera`, `rotation`, `movement`, `selection`, `spacing`, `lighting` et `history`. Les anciens booléens sont migrés à l’ouverture. Les axes sont normalisés à partir de X, Y et Z. Les écarts restent dans la plage moteur 0–2. Le schéma de référence est `src/control-rules.js`.

Un cube peut contenir `constraints` avec verrouillage, axes, restrictions de permutation, cases publiques et un identifiant de groupe. Les groupes solidaires se déplacent ensemble. Les permutations de groupes ou de couches exigent des empreintes compatibles. Les noms des groupes sont remplacés par des identifiants aléatoires lors de l’export.

Le Player reçoit exclusivement l’état initial et les règles publiques. Les noms de profils, la graine, les notes, les références et le diagnostic de conception restent dans le Studio. Les règles servent à maintenir la cohérence dans le client, où les réponses ne sont jamais validées.
