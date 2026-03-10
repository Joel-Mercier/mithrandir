# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/your-spotify.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Your Spotify

Statistiques d'écoute et historique Spotify — visualisez vos habitudes d'écoute avec des analyses détaillées.

| | |
| --- | --- |
| **Images** | `yooooomi/your_spotify_server`, `yooooomi/your_spotify_client`, `mongo:6` |
| **Interface web** | `http://your-server:3456` |
| **API** | `http://your-server:8085` |
| **Chemin de configuration** | `{BASE_DIR}/yourspotify/db` |
| **Site web** | [your-spotify](https://github.com/Yooooomi/your_spotify) |
| **Code source** | [GitHub](https://github.com/Yooooomi/your_spotify) |

## Impact sur les ressources

| | |
| --- | --- |
| **Performance** | Low — Suivi de l'historique et analyses |
| **Stockage** | Medium — La base de données MongoDB grandit avec l'historique d'écoute |

## Installation

```sh
mithrandir install yourspotify
```

## Secrets requis

| Variable | Description |
| --- | --- |
| `YOURSPOTIFY_CLIENT_ID` | Identifiant client de l'application Spotify |
| `YOURSPOTIFY_CLIENT_SECRET` | Secret client de l'application Spotify |

## Prérequis : Application Spotify Developer

Avant d'installer Your Spotify, vous devez créer une application Spotify Developer :

1. Allez sur le [Tableau de bord Spotify Developer](https://developer.spotify.com/dashboard)
2. Connectez-vous avec votre compte Spotify
3. Cliquez sur **Create app**
4. Remplissez le nom de l'application (ex : "Your Spotify") et la description
5. Définissez l'**URI de redirection** vers votre endpoint API suivi de `/oauth/spotify/callback` :
   - Sans HTTPS : `http://ip-de-votre-serveur:8085/oauth/spotify/callback`
   - Avec HTTPS : `https://yourspotify-api.votredomaine.duckdns.org/oauth/spotify/callback`
6. Cochez la case **Web API**
7. Enregistrez l'application et notez le **Client ID** et le **Client Secret**

## Configuration

1. Après l'installation, ouvrez l'interface web à `http://your-server:3456`
2. Connectez-vous avec votre compte Spotify
3. Your Spotify commencera à suivre votre historique d'écoute

## HTTPS

Lorsque HTTPS est activé, Your Spotify utilise deux sous-domaines :
- `yourspotify.votredomaine.duckdns.org` — Interface web (port 3456)
- `yourspotify-api.votredomaine.duckdns.org` — Serveur API (port 8085)

Assurez-vous de mettre à jour l'URI de redirection de votre application Spotify Developer pour utiliser l'endpoint API HTTPS.
