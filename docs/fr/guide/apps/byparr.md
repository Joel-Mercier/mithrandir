# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/byparr.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Byparr

Serveur proxy compatible FlareSolverr pour contourner la protection Cloudflare. Prowlarr l'utilise pour accéder aux indexeurs placés derrière Cloudflare.

| | |
| --- | --- |
| **Image** | `ghcr.io/thephaseless/byparr:latest` |
| **Port** | 8192 (port du conteneur : 8191) |
| **Documentation de l'API** | `http://your-server:8192/docs` |
| **Chemin de configuration** | `{BASE_DIR}/byparr/config` |
| **Code source** | [GitHub](https://github.com/ThePhaseless/Byparr) |

## Impact sur les ressources

| | |
| --- | --- |
| **Performance** | Medium — Firefox headless (Camoufox) |
| **Stockage** | Low — Aucune donnée persistante (l'image elle-même pèse ~2,3 Go) |

## Installation

Byparr est installé automatiquement en tant que compagnon de [Prowlarr](./prowlarr). Pour l'ajouter à une installation existante (par exemple une installation qui utilise encore [FlareSolverr](./flaresolverr)), exécutez :

```sh
mithrandir install byparr
```

## Configuration dans Prowlarr

Byparr implémente l'API de FlareSolverr : le proxy d'indexeur **FlareSolverr** intégré à Prowlarr fonctionne donc avec lui sans modification.

Le proxy est ajouté pour vous : l'assistant de configuration et `mithrandir install byparr` (lorsque Prowlarr est installé) créent un proxy de type FlareSolverr nommé `Byparr`, pointant vers `http://<local ip>:8192`, avec le tag `byparr`. Le relancer ne crée pas de doublon. Il ne reste qu'à **ajouter le tag `byparr` à chaque indexeur placé derrière un challenge Cloudflare**.

Si le proxy n'a pas pu être ajouté automatiquement (l'installation affiche alors un avertissement), ajoutez-le manuellement :

1. Allez dans **Settings → Indexers**, cliquez sur le signe "+" et choisissez `FlareSolverr`.
2. Définissez le nom `Byparr`, le tag `byparr` et l'hôte `http://<local ip>:8192`.
3. Cliquez sur **Test**, puis sur **Save**.
4. Ajoutez le tag `byparr` à chaque indexeur placé derrière un challenge Cloudflare.

::: tip Passer de FlareSolverr à Byparr
L'installation de Byparr ajoute le proxy `Byparr` à côté de votre proxy FlareSolverr existant, qui n'est pas modifié. Remplacez le tag du proxy FlareSolverr par `byparr` sur vos indexeurs protégés par Cloudflare, puis supprimez l'ancien proxy dans Prowlarr. Une fois que tout fonctionne, vous pouvez supprimer FlareSolverr avec `mithrandir uninstall flaresolverr`.
:::

## Notes

- Le fichier compose généré alloue 1 Go de mémoire partagée au conteneur (`shm_size`) et garde `/tmp` en RAM (`tmpfs`), comme le recommande le projet. Cela évite les plantages du navigateur et réduit l'usure du disque.
- `/cache` n'est pas placé dans un tmpfs, contrairement à la suggestion du projet. Le binaire du navigateur est stocké dans `/cache` à l'intérieur de l'image : un tmpfs à cet endroit obligerait Byparr à le télécharger de nouveau à chaque démarrage.
- Byparr n'effectue que des requêtes GET. Il ignore la commande `request.post` de FlareSolverr : les indexeurs qui nécessitent une connexion POST via le proxy ne fonctionneront pas.
- Le contournement d'un challenge n'est pas garanti. Cloudflare évalue aussi la réputation de votre adresse IP publique.
- La valeur `TZ` du fichier `.env` sert de fuseau horaire de secours. Sinon, Byparr déduit le fuseau horaire et la langue du navigateur à partir de votre adresse IP publique.
