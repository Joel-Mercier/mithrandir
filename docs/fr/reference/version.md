# version

Afficher la version du CLI et le hash du commit git.

## Utilisation

```sh
mithrandir version
```

## Sortie

```
mithrandir v1.0.0 (abc1234)
```

## Remarques

- Ne nécessite pas les privilèges root
- Lit la version depuis `package.json` et le hash du commit depuis `git rev-parse --short HEAD`
