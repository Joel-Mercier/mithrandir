import { describe, expect, test } from "bun:test";
import {
  ARR_PROFILES,
  type ArrProviderResource,
  applyDownloadClientSettings,
  applyMediaManagementSettings,
  buildCleanupWebhook,
  downloadClientCategoryFields,
  downloadClientIssues,
  findCleanupWebhook,
  getArrProfile,
  getMediaWebhookUrl,
  isMediaFile,
  legacyMigrationCategory,
  MANAGED_DOWNLOAD_DIRS,
  MEDIA_WEBHOOK_NAME,
  MEDIA_WEBHOOK_USERNAME,
  mediaManagementIssues,
  qbittorrentPreferenceIssues,
  recommendedQbittorrentPreferences,
  summarizeLinks,
  toHostPath,
  webhookEventKeys,
  webhookIssues,
} from "../lib/media-downloads";

const radarr = getArrProfile("radarr");
const sonarr = getArrProfile("sonarr");

function fieldValue(resource: ArrProviderResource, name: string): unknown {
  return resource.fields?.find((f) => f.name === name)?.value;
}

function radarrClient(overrides: Record<string, unknown> = {}): ArrProviderResource {
  return {
    id: 1,
    name: "qBittorrent",
    implementation: "QBittorrent",
    removeCompletedDownloads: true,
    removeFailedDownloads: true,
    fields: [
      { name: "host", value: "qbittorrent" },
      { name: "port", value: 8080 },
      { name: "username", value: "" },
      { name: "password", value: "" },
      { name: "movieCategory", value: "radarr" },
      { name: "movieImportedCategory", value: "" },
    ],
    ...overrides,
  };
}

describe("profiles", () => {
  test("each arr downloads into the folder matching its library", () => {
    expect(ARR_PROFILES.map((p) => [p.name, p.dir, p.category, p.importedCategory])).toEqual([
      ["radarr", "movies", "movies", "movies-imported"],
      ["sonarr", "tv", "tv", "tv-imported"],
      ["lidarr", "music", "music", "music-imported"],
    ]);
  });

  test("legacy category folders are managed too", () => {
    expect(MANAGED_DOWNLOAD_DIRS).toEqual(["movies", "radarr", "tv", "tv-sonarr", "music", "lidarr"]);
  });

  test("downloadClientCategoryFields uses the arr-specific field names", () => {
    expect(downloadClientCategoryFields("sonarr").map((f) => [f.name, f.value])).toEqual([
      ["tvCategory", "tv"],
      ["tvImportedCategory", "tv-imported"],
    ]);
    expect(downloadClientCategoryFields("lidarr").map((f) => f.name)).toEqual([
      "musicCategory",
      "musicImportedCategory",
    ]);
  });
});

describe("toHostPath", () => {
  test("maps container /data paths into BASE_DIR/data", () => {
    expect(toHostPath("/data/downloads/movies/Film", "/home/joel")).toBe("/home/joel/data/downloads/movies/Film");
    expect(toHostPath("/data", "/srv")).toBe("/srv/data");
  });

  test("rejects paths outside /data, including traversal", () => {
    expect(toHostPath("/config/file", "/srv")).toBeNull();
    expect(toHostPath("/data/../etc/passwd", "/srv")).toBeNull();
    expect(toHostPath("/database", "/srv")).toBeNull();
  });
});

describe("download client", () => {
  test("reports default categories and remove-completed", () => {
    const issues = downloadClientIssues(radarrClient(), radarr);
    expect(issues).toHaveLength(3);
    expect(issues[0]).toContain('"radarr" instead of "movies"');
    expect(issues[1]).toContain("post-import category");
    expect(issues[2]).toContain("Remove completed");
  });

  test("apply sets categories, keeps other fields and disables remove-completed", () => {
    const updated = applyDownloadClientSettings(radarrClient(), radarr, {
      credentials: { username: "joel", password: "secret" },
    });
    expect(fieldValue(updated, "movieCategory")).toBe("movies");
    expect(fieldValue(updated, "movieImportedCategory")).toBe("movies-imported");
    expect(fieldValue(updated, "host")).toBe("qbittorrent");
    expect(fieldValue(updated, "username")).toBe("joel");
    expect(fieldValue(updated, "password")).toBe("secret");
    expect(updated.removeCompletedDownloads).toBe(false);
    expect(updated.removeFailedDownloads).toBe(true);
    expect(downloadClientIssues(updated, radarr)).toEqual([]);
  });

  test("does not mutate the original resource", () => {
    const original = radarrClient();
    applyDownloadClientSettings(original, radarr);
    expect(fieldValue(original, "movieCategory")).toBe("radarr");
    expect(original.removeCompletedDownloads).toBe(true);
  });

  test("older arrs without an imported-category field only check the category", () => {
    const client = radarrClient({
      removeCompletedDownloads: false,
      fields: [{ name: "movieCategory", value: "movies" }],
    });
    expect(downloadClientIssues(client, radarr)).toEqual([]);
  });
});

describe("media management", () => {
  test("flags monitored deletes and disabled hardlinks", () => {
    const config = { autoUnmonitorPreviouslyDownloadedEpisodes: false, copyUsingHardlinks: false };
    expect(mediaManagementIssues(config, sonarr)).toHaveLength(2);
    expect(mediaManagementIssues(applyMediaManagementSettings(config, sonarr), sonarr)).toEqual([]);
  });

  test("uses the arr-specific unmonitor key", () => {
    const fixed = applyMediaManagementSettings<Record<string, unknown>>({ id: 1 }, radarr);
    expect(fixed).toEqual({ id: 1, autoUnmonitorPreviouslyDownloadedMovies: true, copyUsingHardlinks: true });
  });
});

describe("webhook", () => {
  const schema: ArrProviderResource = {
    implementation: "Webhook",
    name: "",
    fields: [
      { name: "url", value: "" },
      { name: "method", value: 1 },
      { name: "username", value: "" },
      { name: "password", value: "" },
    ],
    presets: [],
    onGrab: false,
    onDownload: false,
    onUpgrade: false,
    onRename: false,
    onMovieAdded: false,
    onMovieDelete: false,
    onMovieFileDelete: false,
    onMovieFileDeleteForUpgrade: false,
    onHealthIssue: false,
    onManualInteractionRequired: false,
    supportsOnGrab: true,
    supportsOnDownload: true,
    supportsOnUpgrade: true,
    supportsOnRename: true,
    supportsOnMovieAdded: true,
    supportsOnMovieDelete: true,
    supportsOnMovieFileDelete: true,
    supportsOnMovieFileDeleteForUpgrade: false,
    supportsOnHealthIssue: true,
  };
  const url = getMediaWebhookUrl("192.168.1.15");

  test("url points at the UI service", () => {
    expect(url).toBe("http://192.168.1.15:4180/api/media/arr-webhook");
  });

  test("subscribes to supported delete and import events only", () => {
    expect(webhookEventKeys(schema).sort()).toEqual(
      ["onDownload", "onMovieDelete", "onMovieFileDelete", "onUpgrade"].sort(),
    );
  });

  test("build fills url/auth, enables events and drops presets", () => {
    const hook = buildCleanupWebhook(schema, schema, url, "s3cret");
    expect(hook.name).toBe(MEDIA_WEBHOOK_NAME);
    expect(fieldValue(hook, "url")).toBe(url);
    expect(fieldValue(hook, "username")).toBe(MEDIA_WEBHOOK_USERNAME);
    expect(fieldValue(hook, "password")).toBe("s3cret");
    expect(hook.onMovieDelete).toBe(true);
    expect(hook.onGrab).toBe(false);
    expect(hook.onHealthIssue).toBe(false);
    expect(hook.presets).toBeUndefined();
    expect(webhookIssues(hook, schema, url)).toEqual([]);
  });

  test("issues for missing or outdated webhooks", () => {
    expect(webhookIssues(undefined, schema, url)).toEqual(["download cleanup webhook is missing"]);
    const stale = buildCleanupWebhook(schema, schema, "http://10.0.0.2:4180/api/media/arr-webhook", "x");
    stale.onMovieDelete = false;
    const issues = webhookIssues(stale, schema, url);
    expect(issues).toHaveLength(2);
    expect(issues[1]).toContain("onMovieDelete");
  });

  test("finds the cleanup webhook by name or url, ignoring other webhooks", () => {
    const other: ArrProviderResource = { id: 1, implementation: "Webhook", name: "Discord", fields: [] };
    const byUrl: ArrProviderResource = {
      id: 2,
      implementation: "Webhook",
      name: "renamed",
      fields: [{ name: "url", value: url }],
    };
    expect(findCleanupWebhook([other])).toBeUndefined();
    expect(findCleanupWebhook([other, byUrl])?.id).toBe(2);
  });
});

describe("qBittorrent preferences", () => {
  test("recommended settings resolve every issue", () => {
    const prefs = {
      save_path: "/downloads/",
      auto_tmm_enabled: false,
      max_ratio_enabled: true,
      max_ratio_act: 1,
    };
    expect(qbittorrentPreferenceIssues(prefs)).toHaveLength(3);
    const update = recommendedQbittorrentPreferences(prefs);
    expect(update).toEqual({ save_path: "/data/downloads", auto_tmm_enabled: true, max_ratio_act: 0 });
    expect(qbittorrentPreferenceIssues({ ...prefs, ...update })).toEqual([]);
  });

  test("seeding limits that pause are left alone", () => {
    const prefs = { save_path: "/data/downloads/", auto_tmm_enabled: true, max_ratio_enabled: true, max_ratio_act: 0 };
    expect(qbittorrentPreferenceIssues(prefs)).toEqual([]);
    expect(recommendedQbittorrentPreferences(prefs).max_ratio_act).toBeUndefined();
  });

  test("removing actions are harmless while limits are disabled", () => {
    expect(
      qbittorrentPreferenceIssues({ save_path: "/data/downloads", auto_tmm_enabled: true, max_ratio_act: 3 }),
    ).toEqual([]);
  });
});

describe("isMediaFile", () => {
  test("recognizes video and audio", () => {
    expect(isMediaFile("Movie (2020)/Movie.2020.1080p.mkv")).toBe(true);
    expect(isMediaFile("Album/01 - Track.FLAC")).toBe(true);
  });

  test("ignores extras and samples", () => {
    expect(isMediaFile("Movie/movie.nfo")).toBe(false);
    expect(isMediaFile("Movie/poster.jpg")).toBe(false);
    expect(isMediaFile("Movie/Sample/movie-sample.mkv")).toBe(false);
    expect(isMediaFile("Movie/sample.mkv")).toBe(false);
  });
});

describe("summarizeLinks", () => {
  test("linked when every media file has another hard link", () => {
    const s = summarizeLinks([
      { path: "a.mkv", size: 100, nlink: 2 },
      { path: "a.nfo", size: 1, nlink: 1 },
    ]);
    expect(s.state).toBe("linked");
    expect(s.reclaimableBytes).toBe(1);
    expect(s.totalBytes).toBe(101);
  });

  test("partial when some episodes were deleted", () => {
    const s = summarizeLinks([
      { path: "S01E01.mkv", size: 100, nlink: 2 },
      { path: "S01E02.mkv", size: 100, nlink: 1 },
    ]);
    expect(s).toEqual({ state: "partial", mediaFiles: 2, linkedMediaFiles: 1, totalBytes: 200, reclaimableBytes: 100 });
  });

  test("unlinked when the library copy is gone", () => {
    expect(summarizeLinks([{ path: "a.mkv", size: 100, nlink: 1 }]).state).toBe("unlinked");
  });

  test("missing files are ignored; nothing present is empty", () => {
    expect(summarizeLinks([{ path: "a.mkv", size: 100, nlink: 0 }]).state).toBe("empty");
    expect(summarizeLinks([]).state).toBe("empty");
  });

  test("downloads without media extensions are judged on all files", () => {
    expect(summarizeLinks([{ path: "game.bin", size: 5, nlink: 2 }]).state).toBe("linked");
  });
});

describe("legacyMigrationCategory", () => {
  test("only complete, imported torrents move to the imported category", () => {
    expect(legacyMigrationCategory(sonarr, true, true)).toBe("tv-imported");
    expect(legacyMigrationCategory(sonarr, true, false)).toBe("tv");
    expect(legacyMigrationCategory(sonarr, false, true)).toBe("tv");
  });
});
