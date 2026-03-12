# Référence CLI

Mithrandir s'invoque avec `mithrandir <commande> [options]`.

## Options globales

| Option | Description |
| --- | --- |
| `--yes`, `-y` | Ignorer les invites de confirmation |
| `--help` | Afficher l'aide |

## Commandes

### Installation et configuration

| Commande | Description |
| --- | --- |
| [`setup`](./setup) | Assistant de configuration interactif |
| [`config`](./config) | Afficher les paramètres .env actuels |
| [`doctor`](./doctor) | Diagnostiquer les problèmes de configuration |

### Gestion des applications

| Commande | Description |
| --- | --- |
| [`install`](./install) | Installer une application ou un composant système |
| [`uninstall`](./uninstall) | Désinstaller une application ou le système complet |
| [`reinstall`](./reinstall) | Réinstaller une application de zéro |
| [`start`](./start) | Démarrer une application arrêtée |
| [`stop`](./stop) | Arrêter une application en cours d'exécution |
| [`restart`](./restart) | Redémarrer une application en cours d'exécution |
| [`update`](./update) | Mettre à jour les images de conteneurs |

### Sauvegarde et restauration

| Commande | Description |
| --- | --- |
| [`backup`](./backup) | Sauvegarder les applications (avec sous-commandes pour lister, supprimer, vérifier) |
| [`restore`](./restore) | Restaurer une ou plusieurs applications depuis une sauvegarde |
| [`recover`](./recover) | Reprise après sinistre complète depuis une sauvegarde distante |

### Surveillance

| Commande | Description |
| --- | --- |
| [`status`](./status) | Afficher les applications installées et l'état du système |
| [`health`](./health) | Vérifier la santé du système |
| [`log`](./log) | Consulter les journaux des conteneurs |
| [`graph`](./graph) | Afficher l'arbre de dépendances inter-applications |
| [`capacity`](./capacity) | Afficher la capacité du système et les scores de ressources |

### Maintenance

| Commande | Description |
| --- | --- |
| [`self-update`](./self-update) | Mettre à jour la CLI depuis git |
| [`version`](./version) | Afficher la version et le hash du commit git |
| [`docs`](./docs) | Construire et servir le site de documentation |
| [`completions`](./completions) | Générer les scripts d'autocomplétion shell |
