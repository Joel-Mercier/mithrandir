# media

Check and fix how qBittorrent and Radarr/Sonarr/Lidarr share the downloads folder, so deleted media actually frees its disk space.

## Usage

```sh
mithrandir media            # Check settings and show unused downloads (read-only)
mithrandir media fix        # Apply the recommended settings (never deletes anything)
mithrandir media prune      # Review and delete downloads the library no longer uses
mithrandir media prune --yes
```

Everything here is also available in the web dashboard: **Media Library → Downloads**.

## How downloads and the library share disk space

Downloads land in `{BASE_DIR}/data/downloads/<movies|tv|music>`. When Radarr, Sonarr or Lidarr imports a download, it creates a **hardlink** in `{BASE_DIR}/data/media/...`. Both names point to the same data on disk, so a movie takes its size once, not twice, while qBittorrent keeps seeding it.

A file's space is only freed once **both** names are gone. Deleting a movie in Radarr removes the library name, so qBittorrent's seeding copy has to go too. Mithrandir handles this with a webhook:

1. Each *arr has a **Mithrandir download cleanup** webhook that calls the web dashboard (`/api/media/arr-webhook`, port 4180) when something is deleted or imported.
2. About 15 seconds after a delete, mithrandir removes the matching torrent and its files from qBittorrent. It only does this when **all** of these are true:
   - the torrent is in an imported category (`movies-imported`, `tv-imported`, `music-imported`),
   - mithrandir has seen it hardlinked into the library before,
   - it has finished downloading,
   - none of its media files are still in the library.

Nothing is ever deleted based on time, ratio or seeding duration. If qBittorrent's seeding limits were set to *remove* torrents, `media fix` changes them to *stop* instead.

## Deleting movies, series and music

Delete in **Radarr, Sonarr or Lidarr**, and tick **Delete files**. The seeding copy in qBittorrent is removed automatically shortly after.

Don't delete in qBittorrent or directly on disk. A torrent removed in qBittorrent only frees its own name. The library copy stays, and the *arr still thinks you have the item.

Some cases are never cleaned up automatically, because only part of the download is unused:

- **Partly deleted season packs.** You deleted some episodes of a season pack but kept others.
- **Downloads that were never imported.** The *arr never picked them up.

These appear in `mithrandir media prune` and in the dashboard's Downloads panel, so you can decide yourself.

::: tip Recycle bin
If a recycle bin is set in Radarr/Sonarr (*Settings → Media Management*), deleted library files are moved there instead of deleted. The space is only freed once the recycle bin is emptied.
:::

## `mithrandir media`

Read-only. Checks the following and lists each problem it finds:

- **qBittorrent**: login works, default save path is `/data/downloads`, automatic torrent management is on, seeding limits don't remove torrents, and the `movies`/`tv`/`music` categories (plus their `-imported` variants) save into the right folder.
- **Radarr/Sonarr/Lidarr download client**: category and post-import category, *Remove completed* off, *Remove failed* on.
- **Media management**: hardlinks enabled, deleted items unmonitored (so they aren't downloaded again).
- **Cleanup webhook**: present, pointing at this server, subscribed to delete and import events.
- **Filesystem**: downloads and media are on the same filesystem (hardlinks are impossible otherwise).

It then scans the downloads folder and shows how many downloads are still used by the library and how much space can be freed.

## `mithrandir media fix`

Applies every fixable setting above:

- Logs in to qBittorrent with `QBITTORRENT_USERNAME`/`QBITTORRENT_PASSWORD` from `.env`. If that fails in a terminal, it asks for the credentials and saves them once they work.
- Creates the categories and moves torrents from the old default categories (`radarr`, `tv-sonarr`, `lidarr`) into the new ones. qBittorrent moves their files into `downloads/movies|tv|music`.
- Generates `MEDIA_WEBHOOK_SECRET` and adds the webhook to each *arr. This needs the web dashboard service; run [`mithrandir ui install`](./ui) first if it isn't installed.
- Opens the webhook port to Docker containers when `ENABLE_FIREWALL=true`.

`media fix` never deletes anything. The setup wizards (CLI and web) and `mithrandir ui install` apply the same settings automatically.

## `mithrandir media prune`

Lists leftovers by group and asks for confirmation for each group:

| Group | Frees space | Included with `--yes` |
| --- | --- | --- |
| Deleted from the library | Yes | Yes |
| Files not tracked by qBittorrent | Yes | Yes |
| Untracked but still in the library | No (the library keeps its copy) | Yes |
| Partly deleted | Only the deleted part (also stops seeding the rest) | No |
| Never imported | Yes | No |

Each item is checked again just before deletion. Only paths inside `{BASE_DIR}/data/downloads` are ever deleted; library files are never touched. Items modified in the last 10 minutes and qBittorrent's incomplete files are skipped. Empty legacy folders (`radarr`, `tv-sonarr`, `lidarr`) are removed afterwards.

Without a terminal and without `--yes`, nothing is deleted.

## Environment Variables

| Variable | Description |
| --- | --- |
| `QBITTORRENT_USERNAME` | qBittorrent WebUI username (saved by the setup wizard or `media fix`) |
| `QBITTORRENT_PASSWORD` | qBittorrent WebUI password |
| `MEDIA_WEBHOOK_SECRET` | Password the *arr webhooks use to authenticate to the dashboard (generated by `media fix`) |

## Notes

- [`mithrandir doctor`](./doctor) reports problems with these settings and unused downloads in its **Media** category.
- Lidarr only has the delete events its version supports; album deletes are cleaned up the same way when available.
