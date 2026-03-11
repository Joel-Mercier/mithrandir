# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/cookcli.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> CookCLI

Recipe manager using the [Cooklang](https://cooklang.org/) markup language — write recipes as plain text and browse them through a web interface. CookCLI also handles grocery list generation and pantry management, helping you track what you need to buy and what you already have on hand.

| | |
| --- | --- |
| **Image** | `ghcr.io/cooklang/cookcli:0.25.1` |
| **Web UI** | `http://your-server:9080` |
| **Config path** | `{BASE_DIR}/cookcli/recipes` |
| **Website** | [cooklang.org](https://cooklang.org/) |
| **Source code** | [GitHub](https://github.com/cooklang/cookcli) |

## Resource Impact

| | |
| --- | --- |
| **Performance** | Low — Lightweight recipe server |
| **Storage** | Low — Plain text recipe files |

## Installation

```sh
mithrandir install cookcli
```

## Setup

Place your `.cook` recipe files in the `{BASE_DIR}/cookcli/recipes` directory. The web server will automatically pick them up.

### Cooklang Markup Language

CookCLI uses the [Cooklang specification](https://cooklang.org/docs/spec/) to define recipes as plain text files. The syntax is designed to be human-readable while encoding ingredients, cookware, and timers:

```
Crack the @eggs{3} into a bowl.
Whisk with a #whisk{} until smooth.
Cook for ~{5%minutes}.
```

Learn more about the syntax in the [official documentation](https://cooklang.org/docs/spec/).

## Importing Recipes

[cook.md](https://cook.md/) is an online tool that converts any recipe webpage into a Cooklang-formatted `.cook` file. Paste a URL from your favorite cooking website and it will extract ingredients, steps, and timers into the Cooklang syntax, ready to drop into your recipes directory.

## Mobile Apps

Cooklang has companion mobile apps for managing and viewing your recipes on the go:

- **iOS**: [CooklangApp on the App Store](https://apps.apple.com/us/app/cooklangapp/id1598799259)
- **Android**: [CooklangApp on Google Play](https://play.google.com/store/apps/details?id=md.cook.android)
