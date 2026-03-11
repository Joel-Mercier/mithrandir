# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/cookcli.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> CookCLI

Gestionnaire de recettes utilisant le langage de balisage [Cooklang](https://cooklang.org/) — ecrivez vos recettes en texte brut et parcourez-les via une interface web. CookCLI gere egalement la generation de listes de courses et la gestion du garde-manger, vous aidant a suivre ce que vous devez acheter et ce que vous avez deja sous la main.

| | |
| --- | --- |
| **Image** | `mithrandir/cookcli:latest` (construite depuis les [sources](https://github.com/cooklang/cookcli)) |
| **Interface web** | `http://your-server:9080` |
| **Chemin de configuration** | `{BASE_DIR}/cookcli/recipes` |
| **Site web** | [cooklang.org](https://cooklang.org/) |
| **Code source** | [GitHub](https://github.com/cooklang/cookcli) |

## Impact sur les ressources

| | |
| --- | --- |
| **Performance** | Low — Serveur de recettes leger |
| **Stockage** | Low — Fichiers de recettes en texte brut |

## Installation

```sh
mithrandir install cookcli
```

## Configuration

Placez vos fichiers de recettes `.cook` dans le repertoire `{BASE_DIR}/cookcli/recipes`. Le serveur web les detectera automatiquement.

### Langage de balisage Cooklang

CookCLI utilise la [specification Cooklang](https://cooklang.org/docs/spec/) pour definir des recettes sous forme de fichiers texte. La syntaxe est concue pour etre lisible tout en encodant les ingredients, les ustensiles et les minuteries :

```
Crack the @eggs{3} into a bowl.
Whisk with a #whisk{} until smooth.
Cook for ~{5%minutes}.
```

En savoir plus sur la syntaxe dans la [documentation officielle](https://cooklang.org/docs/spec/).

## Importer des recettes

[cook.md](https://cook.md/) est un outil en ligne qui convertit n'importe quelle page web de recette en un fichier `.cook` au format Cooklang. Collez une URL de votre site de cuisine prefere et il extraira les ingredients, les etapes et les minuteries dans la syntaxe Cooklang, pret a etre depose dans votre repertoire de recettes.

## Applications mobiles

Cooklang dispose d'applications mobiles pour gerer et consulter vos recettes en deplacement :

- **iOS** : [CooklangApp sur l'App Store](https://apps.apple.com/us/app/cooklangapp/id1598799259)
- **Android** : [CooklangApp sur Google Play](https://play.google.com/store/apps/details?id=md.cook.android)
