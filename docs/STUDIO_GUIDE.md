# Guide du Studio

1. Dans **Assemblage**, créez une grille ou ajoutez des cubes à un assemblage existant. Sélectionnez un cube, une ligne ou une couche pour tourner, déplacer ou copier les fragments.
2. Dans **Faces**, utilisez le patron et les outils 2D. Définissez les textures, la matière et la géométrie. Une grille interne marquée cellule par cellule donne une véritable surface tridimensionnelle.
3. Dans **Optique**, générez une fresque, une projection, une superposition ou un masque volumique. Observez le résultat dans la scène et mémorisez une référence privée.
4. Dans **Préparer**, choisissez les outils du Player et mélangez avec les opérations disponibles. Mémorisez explicitement la vue initiale si nécessaire. Testez avec **Tester ici** ou **Tester en onglet**, puis téléchargez l’énigme publique.

Le gestionnaire local enregistre vos projets dans IndexedDB. **Enregistrer** crée un point de restauration, avec trois versions antérieures conservées. **Télécharger .cubicus** permet de conserver une copie indépendante du navigateur. La bibliothèque partagée est indépendante des projets. L’import d’une sauvegarde de bibliothèque ajoute ses ressources à celles déjà enregistrées.

## Outils optiques

- La fresque crée une plaque XY, XZ ou YZ à partir d’une image. Ajustez son remplissage, sa rotation et son décalage avant génération.
- L’anamorphose échantillonne l’image depuis la caméra actuelle et l’inscrit sur les faces choisies. Les occultations et les surfaces internes des maillages personnalisés demandent un contrôle visuel. Les calques de projection peuvent préserver l’édition précédente.
- Les superpositions séparent l’image en pixels, bandes ou régions sur des plaques disposées en profondeur. Les couches restent interchangeables depuis la direction orthographique de recomposition et leurs données publiques peuvent permettre une reconstruction algorithmique.
- Le masque d’ombre échantillonne une silhouette sombre sur une grille. Il produit des volumes répartis en hauteur pour une lumière verticale. Le masque d’espace négatif retire des colonnes traversantes sur l’axe Z. Une résolution plus fine améliore le contour et peut augmenter le coût du maillage.
- Une face miroir fonctionne sur un cube plein en perspective. Deux faces miroir opaques au maximum utilisent chacune une cible 256 × 256. En orthographique, la face matérielle ordinaire est affichée. Les passes récursives sont désactivées.

## Données privées et publiques

Le fichier privé V2 `.cubicus` contient l’assemblage éditable, les calques, la bibliothèque interne, les références, les réglages du Studio et la vue explicitement choisie pour le démarrage. Conservez-le hors du dépôt public. Les projets V1 restent lisibles.

Le fichier `.puzzle` V1 contient les poses initiales, les matériaux, les volumes, les textures finales et les autorisations publiques. Une vue initiale optionnelle contient uniquement les paramètres de rendu autorisés. L’export reconstruit le document via une liste de champs explicites, renouvelle les identifiants et réencode les textures PNG. Le Player ne reçoit ni références, ni notes, ni calques, ni paramètres privés, ni historique de mélange. Une texture finale peut elle-même contenir un indice ou un motif reconnaissable. L’audit manuel reste indispensable. Le test intégré utilise le même Player à la même origine web que le Studio. Cette séparation de données ne constitue pas une isolation entre scripts d’une même origine.

## Publication

Dans GitHub, sélectionnez **Settings → Pages → Build and deployment → GitHub Actions**. Sur `main`, le déploiement attend la validation de la syntaxe, des unités et du parcours Chromium. L’artefact publie les pages et ressources statiques aux chemins `/`, `/studio.html` et `/play.html` sous le préfixe du dépôt. Vérifiez que les archives de travail, réponses et images sources privées sont absentes de tout commit destiné à être publié.

## Préparer les contrôles adaptatifs

Dans **Préparer → Outils du joueur**, choisissez un profil, ou demandez une suggestion puis appliquez-la explicitement. Les sections Caméra, Rotation, Déplacement, Sélection, Écartement, Éclairage et Historique règlent les droits. L’aperçu textuel se recalcule depuis l’assemblage. **Tester ici** charge exactement la vue publique du Player.

Dans **Assemblage**, sélectionnez les cubes concernés avant d’appliquer les contraintes. Une case autorisée s’écrit `X,Y,Z` sur sa propre ligne. Les coordonnées actuelles doivent figurer dans les places autorisées. Dans **Groupes définis**, sélectionnez, renommez, copiez ou dissolvez les groupes. Une copie utilise le décalage configuré pour la sélection et crée un groupe distinct.

Le mode création peut déplacer des cubes que le joueur verra verrouillés. Vérifiez ensuite les avertissements de cohérence. Le mélange peut utiliser la sélection seule et une graine privée. Ses opérations sont validées avec les droits du Player. [Guide des commandes](PLAYER_CONTROLS.md)

## Se repérer dans l’atelier

Les parcours dans **Assemblage** ouvrent directement un outil d’édition ou un générateur. **Inspecter la face** ouvre le dessin depuis la scène. L’inspecteur sépare **Dessin**, **Matière** et **Volume**. Dans **Préparer**, utilisez **Contrôler l’export** pour vérifier le fichier public avant de le télécharger. Dans **Projets → Importer .cubicus ou .puzzle**, ouvrez un projet privé ou créez un projet éditable à partir d’une énigme publiée. Le fichier public fournit les textures composées et les réglages du joueur. Le fichier privé conserve aussi les calques, les références et le parcours de test.

## Dessiner sur les six faces

Dans **Cubes et faces**, choisissez ou nommez un cube, puis sélectionnez l’une de ses six vignettes. L’en-tête indique la face locale et le cadre dans la scène suit son orientation. **Patron déplié et raccords** affiche les faces à plat. En plein écran, les vignettes et les commandes d’annulation restent dans l’inspecteur.

**Importer une image** affiche le cube et la face de destination et ajoute un calque par défaut. Vous pouvez aussi remplacer le contenu actif, répéter une image sur les faces cochées ou répartir une bande sur **Avant → Droite → Arrière → Gauche**. L’aperçu de la bande affiche les limites des faces. Pour retoucher la face, sélectionnez le calque dans **Calques de la face**. **Aperçu composé** montre le résultat envoyé à la scène. Le mode **Déplacer la vue** permet de parcourir le canevas zoomé au doigt.

## Intégrer une énigme sur un autre site

Le bouton **Intégrer au site** prépare le même état public que l’export `.puzzle` et y ajoute le lecteur, Three.js et les styles. Le fichier `cubicus-enigme.html` peut être ouvert seul ou publié sur un hébergement statique. Copiez la ligne iframe dans la div voulue. Le chemin proposé fonctionne quand les deux pages sont dans le même dossier. Si le fichier est hébergé ailleurs, adaptez le chemin ou entrez son URL publique dans le Studio.

Pour une intégration sans deuxième fichier, copiez la ligne autonome. Cette variante embarque le document entier dans `srcdoc` et peut être volumineuse. Elle dépend des règles de sécurité de la page qui l’accueille. Les deux variantes isolent le Player dans une iframe et chargent directement l’énigme. Les notes, les calques éditables et les références restent dans le projet privé.

## Concevoir une énigme à états

Dans **Mécanismes**, chargez un des onze modèles pour examiner ses cubes, ses règles et son parcours privé. Les modèles couvrent la serrure à séquence, les rails, les miroirs, le contact, les connecteurs solidaires, la charnière, la fresque, la fenêtre traversante, le double relais, la source commutée et la porte à deux plaques. La consigne publique est affichée dans **Aide de jeu** dans le Player.

Cliquez sur **Créer un verrou par rotation** et choisissez le cube à tourner et le cube à libérer. Le Studio crée ensemble la règle, l’état et le verrou. Pour une logique personnalisée, cliquez sur **Créer une règle** et configurez le déclencheur, les conditions facultatives et les effets. Le résumé se met à jour pendant la saisie. Retrouvez les états, capteurs et autres composants dans **Composants et réglages avancés**. Les règles évaluent leurs conditions au début de chaque action validée et appliquent leurs effets dans l’ordre affiché. Un capteur nouvellement éclairé par l’activation d’un émetteur peut servir de condition à l’action suivante. Annuler, rétablir et réinitialiser restaurent également les états.

Les rails utilisent les cases autorisées d’un cube. Les connecteurs s’assemblent lorsque les deux faces désignées se touchent et se font face. Les cubes reliés sont solidaires. Pour construire une charnière, appliquez le même pivot X,Y,Z aux cubes d’un groupe. La rotation se fait par quarts de tour. Le contrôle de l’arc échantillonne les enveloppes unitaires des cubes. Les faisceaux utilisent les axes de la grille, traversent les cases libres et sont bloqués par les cubes ordinaires. Les miroirs de circuit relient deux faces perpendiculaires et sont distincts du rendu par réflexion planaire.

Enregistrez des manipulations puis arrêtez l’enregistrement pour revenir aux poses de départ. **Vérifier le parcours depuis le départ** rejoue les actions avec les droits publics et signale le premier blocage. Ce contrôle ne recherche pas toutes les solutions. Pour les énigmes avec des verrous ou des connecteurs, placez le départ manuellement avant de vérifier le parcours.

Dans **Cubes et faces**, créez un calque vectoriel avec une forme, sa position, ses dimensions et sa couleur. L’import de SVG prend en charge les formes et tracés simples et les rasterise. Les repères axiaux du canevas aident à aligner les motifs. Dans **Volume**, vous pouvez remplir ou évider une région entre deux coins de la grille interne.

Les consignes publiées, les appareils et leurs règles sont lisibles dans l’export. Le parcours enregistré reste dans le projet privé.

## Tutoriel à l’ouverture

Le Player affiche une fenêtre d’aide à chaque ouverture d’énigme. Elle réunit la consigne publique, les commandes disponibles et les mécanismes présents. **Jouer** ferme la fenêtre et **Aide de jeu** permet de la rouvrir. L’export HTML autonome conserve ce tutoriel.

Dans **Préparer → Thèmes du tutoriel**, ajoutez les effets dont l’origine est invisible dans le fichier final, comme une anamorphose peinte sur des textures. Les générateurs renseignent ces thèmes et les mécanismes structurés sont expliqués automatiquement.

## Combiner des conditions dans une énigme

Dans **Mécanismes**, utilisez **Compteurs et zones** pour définir des valeurs de départ et des régions de la grille. Le contour d’une zone peut être visible dans la scène. Une règle peut réagir à l’entrée ou à la sortie d’un cube et combiner des états, des compteurs, des zones occupées, des capteurs et les cubes impliqués dans l’action. Choisissez **ET** ou **OU** pour l’ensemble et cochez **NON** pour inverser une condition. L’effet peut modifier un état et fixer ou incrémenter un compteur.

Les conditions lisent les états et compteurs avant l’application des effets, avec les nouvelles positions des cubes. Si plusieurs règles s’appliquent, leurs effets sont exécutés dans l’ordre de la liste. Le modèle **Porte à deux plaques et compteur** illustre les voyants de présence et la remise à zéro après une action incompatible.

Les états peuvent piloter un voyant, révéler une face, changer la couleur du faisceau ou libérer la position d’un cube sur son rail. Pour dupliquer un bloc dans le même projet, cochez ses règles, préparez les raccordements, attribuez les cubes de la copie et indiquez un préfixe distinct. Les zones peuvent être décalées. Les émetteurs, miroirs et capteurs se configurent séparément.

**Vérifier le parcours depuis le départ** affiche dans le Studio un journal privé des règles rencontrées, de leurs conditions et de leur résultat. Les exports incluent les règles nécessaires au jeu et excluent le journal et le parcours enregistré.
