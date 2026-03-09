# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/actual-budget.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Actual Budget

Application de finances personnelles et de budget axée sur la confidentialité, avec stockage local des données, budget par enveloppes et synchronisation bancaire.

| | |
| --- | --- |
| **Image** | `docker.io/actualbudget/actual-server:latest` |
| **Interface web** | `http://your-server:5006` |
| **Chemin de configuration** | `{BASE_DIR}/actualbudget/data` |
| **Site web** | [actualbudget.org](https://actualbudget.org/) |
| **Code source** | [GitHub](https://github.com/actualbudget/actual) |

## Impact sur les ressources

| | |
| --- | --- |
| **Performance** | Low — Application web |
| **Stockage** | Low — Petite base de données |

## Installation

```sh
mithrandir install actualbudget
```

Voir aussi [Sure](./sure) pour une alternative de suivi financier.

## Configuration

- Ouvrez l'interface web à l'adresse `http://your-server:5006`
- Créez un mot de passe pour votre serveur
- Créez un nouveau budget ou importez-en un existant
- Configurez optionnellement la synchronisation bancaire via GoCardless ou SimpleFIN

## Clients

Des clients pour Windows, macOS et Linux sont disponibles [ici](https://github.com/actualbudget/actual/releases).
