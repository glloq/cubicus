# Mesures de rendu

Le banc `npm run benchmark` instancie le moteur partagé dans Chromium sans interface Studio. La surface principale mesure 640 × 480, avec pixels à l’échelle 1 et SwiftShader. Les fragments sont des cubes unis, sans texture ni ombre. Le temps de rendu est la médiane de cinq rendus synchronisés avec `gl.finish()`. Ce protocole mesure le chemin simple de rendu sur la machine cloud et ne caractérise pas les scénarios lourds.

| Cubes | Appels avant | Appels après | Triangles | Rendu après, ms |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 6 | 1 | 12 | 0,2 |
| 4 | 24 | 4 | 48 | 0,1 |
| 8 | 48 | 8 | 96 | 0,2 |
| 18 | 108 | 18 | 216 | 0,3 |
| 27 | 162 | 27 | 324 | 0,3 |
| 64 | 384 | 64 | 768 | 0,4 |
| 125 | 750 | 125 | 1 500 | 1,0 |
| 512 | 3 072 | 512 | 6 144 | 1,7 |

À 512 cubes, la médiane avant ce changement était de 16,6 ms. Cette comparaison repose sur un passage avant et un passage après dans le même environnement. Le cube de navigation était présent dans les deux exécutions. Son coût propre, les scènes texturées, les ombres et les miroirs restent à mesurer séparément.
