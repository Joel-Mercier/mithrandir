# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/bazarr.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Bazarr

Gestionnaire de sous-titres — télécharge automatiquement les sous-titres pour vos bibliothèques Sonarr et Radarr.

| | |
| --- | --- |
| **Image** | `lscr.io/linuxserver/bazarr:latest` |
| **Interface web** | `http://your-server:6767` |
| **Chemin de configuration** | `{BASE_DIR}/bazarr/config` |
| **Données** | `{BASE_DIR}/data` |
| **Site web** | [bazarr.media](https://bazarr.media/) |
| **Code source** | [GitHub](https://github.com/morpheus65535/bazarr) |

## Installation

```sh
mithrandir install bazarr
```

## Configuration

- Allez dans l'interface web de Bazarr et définissez la méthode d'authentification sur "Forms", puis configurez le nom d'utilisateur et le mot de passe avec les valeurs définies lors de l'assistant de configuration.
- Ajoutez un nouveau profil de langue dans **Settings → Languages** avec la langue souhaitée.
- Définissez ce nouveau profil comme profil par défaut pour les films et les séries, puis enregistrez.
- Dans **Settings → Providers**, ajoutez les fournisseurs de sous-titres souhaités et enregistrez.
- Dans **Settings → Sonarr**, connectez votre serveur Sonarr avec la clé API trouvée dans Sonarr sous **Settings → General**.
- Dans **Settings → Radarr**, connectez votre serveur Radarr avec la clé API trouvée dans Radarr sous **Settings → General**.

Un guide supplémentaire pour Bazarr est disponible [ici (Yams)](https://yams.media/config/bazarr/).
