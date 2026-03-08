# completions

Générer les scripts d'autocomplétion shell.

## Utilisation

```sh
mithrandir completions <shell>
```

## Arguments

| Argument | Description |
| --- | --- |
| `shell` | **Requis.** Type de shell : `bash`, `zsh` ou `fish` |

## Exemples

```sh
# Ajouter à votre profil shell pour des complétions persistantes

# Bash
mithrandir completions bash >> ~/.bashrc

# Zsh
mithrandir completions zsh >> ~/.zshrc

# Fish
mithrandir completions fish > ~/.config/fish/completions/mithrandir.fish
```

## Remarques

- Ne nécessite pas les privilèges root
- Les complétions incluent toutes les commandes, noms d'applications, sous-commandes de sauvegarde et options
