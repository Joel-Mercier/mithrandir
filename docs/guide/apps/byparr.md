# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/byparr.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Byparr

FlareSolverr-compatible proxy server to bypass Cloudflare protection. Prowlarr uses it to reach indexers that sit behind Cloudflare.

| | |
| --- | --- |
| **Image** | `ghcr.io/thephaseless/byparr:latest` |
| **Port** | 8192 (container port 8191) |
| **API docs** | `http://your-server:8192/docs` |
| **Config path** | `{BASE_DIR}/byparr/config` |
| **Source code** | [GitHub](https://github.com/ThePhaseless/Byparr) |

## Resource Impact

| | |
| --- | --- |
| **Performance** | Medium — Headless Firefox (Camoufox) |
| **Storage** | Low — No persistent data (the image itself is ~2.3 GB) |

## Installation

Byparr is installed automatically as a companion to [Prowlarr](./prowlarr). To add it to an existing install (for example one that still uses [FlareSolverr](./flaresolverr)), run:

```sh
mithrandir install byparr
```

## Setup in Prowlarr

Byparr implements the FlareSolverr API, so Prowlarr's built-in **FlareSolverr** indexer proxy works with it as-is.

The proxy is added for you: the setup wizard and `mithrandir install byparr` (when Prowlarr is installed) create a FlareSolverr-type proxy named `Byparr`, pointing at `http://<local ip>:8192`, with the tag `byparr`. Running it again doesn't create duplicates. The only thing left to do is to **add the `byparr` tag to every indexer that is behind a Cloudflare challenge**.

If the proxy couldn't be added automatically (the install prints a warning in that case), add it manually:

1. Go to **Settings → Indexers**, click the "+" sign and choose `FlareSolverr`.
2. Set the name to `Byparr`, the tag to `byparr` and the host to `http://<local ip>:8192`.
3. Click **Test**, then **Save**.
4. Add the `byparr` tag to every indexer that is behind a Cloudflare challenge.

::: tip Switching from FlareSolverr
Installing Byparr adds the `Byparr` proxy next to your existing FlareSolverr proxy, which is left untouched. Move your Cloudflare-protected indexers from the FlareSolverr proxy's tag to `byparr`, then delete the old proxy in Prowlarr. Once everything works, you can remove FlareSolverr with `mithrandir uninstall flaresolverr`.
:::

## Notes

- The generated compose file gives the container 1 GB of shared memory (`shm_size`) and keeps `/tmp` in RAM (`tmpfs`), as upstream recommends. This avoids browser crashes and reduces disk wear.
- `/cache` is not put in a tmpfs, even though upstream suggests it. The browser binary is stored in `/cache` inside the image, so a tmpfs there would make Byparr download it again at every start.
- Byparr only performs GET requests. It ignores FlareSolverr's `request.post` command, so indexers that need a POST login through the proxy won't work.
- Bypassing a challenge isn't guaranteed. Cloudflare also scores the reputation of your public IP.
- The `TZ` value from `.env` is used as a fallback timezone. Byparr otherwise derives the browser's timezone and locale from your public IP.
