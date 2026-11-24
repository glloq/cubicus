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
