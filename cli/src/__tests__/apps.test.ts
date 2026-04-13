import { describe, expect, test } from "bun:test";
import {
  APP_REGISTRY,
  APP_STACKS,
  APP_CATEGORIES,
  getApp,
  getAppNames,
  getContainerName,
  getAllContainerNames,
  getAppDir,
  getComposePath,
  getConfigPaths,
  filterConflicts,
  getCompanionApps,
  getStackNames,
  getStack,
} from "@/lib/apps.js";
import type { AppDefinition } from "@/types.js";

describe("getApp", () => {
  test("returns correct app by name", () => {
    const app = getApp("sonarr");
    expect(app).toBeDefined();
    expect(app!.name).toBe("sonarr");
    expect(app!.displayName).toBe("Sonarr");
  });

  test("returns undefined for unknown name", () => {
    expect(getApp("nonexistent")).toBeUndefined();
  });
});

describe("getAppNames", () => {
  test("returns all app names", () => {
    const names = getAppNames();
    expect(names.length).toBe(APP_REGISTRY.length);
    expect(names).toContain("sonarr");
    expect(names).toContain("radarr");
    expect(names).toContain("homeassistant");
  });
});

describe("getContainerName", () => {
  test("returns containerName when set", () => {
    const immich = getApp("immich")!;
    expect(getContainerName(immich)).toBe("immich_server");
  });

  test("falls back to name when containerName not set", () => {
    const sonarr = getApp("sonarr")!;
    expect(getContainerName(sonarr)).toBe("sonarr");
  });
});

describe("getAllContainerNames", () => {
  test("includes additional containers for multi-container apps", () => {
    const immich = getApp("immich")!;
    const names = getAllContainerNames(immich);
    expect(names).toEqual([
      "immich_server",
      "immich_machine_learning",
      "immich_redis",
      "immich_postgres",
    ]);
  });

  test("returns single container for simple apps", () => {
    const sonarr = getApp("sonarr")!;
    expect(getAllContainerNames(sonarr)).toEqual(["sonarr"]);
  });

  test("includes additional containers for Penpot", () => {
    const penpot = getApp("penpot")!;
    const names = getAllContainerNames(penpot);
    expect(names).toContain("penpot_frontend");
    expect(names).toContain("penpot_backend");
    expect(names).toContain("penpot_postgres");
    expect(names.length).toBe(6);
  });
});

describe("getAppDir / getComposePath", () => {
  test("constructs correct app directory", () => {
    const sonarr = getApp("sonarr")!;
    expect(getAppDir(sonarr, "/home/user")).toBe("/home/user/sonarr");
  });

  test("constructs correct compose path", () => {
    const sonarr = getApp("sonarr")!;
    expect(getComposePath(sonarr, "/home/user")).toBe(
      "/home/user/sonarr/docker-compose.yml",
    );
  });
});

describe("getConfigPaths", () => {
  test("returns single config dir for standard apps", () => {
    const sonarr = getApp("sonarr")!;
    expect(getConfigPaths(sonarr, "/home/user")).toEqual([
      "/home/user/sonarr/config",
    ]);
  });

  test("returns multiple config dirs for Homarr", () => {
    const homarr = getApp("homarr")!;
    const paths = getConfigPaths(homarr, "/home/user");
    expect(paths).toEqual([
      "/home/user/homarr/configs",
      "/home/user/homarr/icons",
      "/home/user/homarr/data",
    ]);
  });

  test("handles non-standard config subdirs", () => {
    const seerr = getApp("seerr")!;
    expect(getConfigPaths(seerr, "/home/user")).toEqual([
      "/home/user/seerr/app/config",
    ]);
  });
});

describe("filterConflicts", () => {
  test("passes through apps with no conflicts", () => {
    const apps = [getApp("sonarr")!, getApp("radarr")!];
    expect(filterConflicts(apps)).toEqual(apps);
  });

  test("filters conflicting apps keeping first selected", () => {
    const appA: AppDefinition = {
      name: "app-a",
      displayName: "App A",
      description: "",
      image: "test",
      port: 8080,
      configSubdir: "config",
      needsDataDir: false,
      conflictsWith: ["app-b"],
    };
    const appB: AppDefinition = {
      name: "app-b",
      displayName: "App B",
      description: "",
      image: "test",
      port: 8080,
      configSubdir: "config",
      needsDataDir: false,
    };
    const result = filterConflicts([appA, appB]);
    expect(result.length).toBe(1);
    expect(result[0].name).toBe("app-a");
  });
});

describe("getCompanionApps", () => {
  test("returns FlareSolverr for Prowlarr", () => {
    const companions = getCompanionApps("prowlarr");
    expect(companions.length).toBe(1);
    expect(companions[0].name).toBe("flaresolverr");
  });

  test("returns empty for apps without companions", () => {
    expect(getCompanionApps("sonarr")).toEqual([]);
  });
});

describe("getStackNames / getStack", () => {
  test("returns all stack names", () => {
    const names = getStackNames();
    expect(names).toContain("media");
    expect(names).toContain("security");
    expect(names.length).toBe(APP_STACKS.length);
  });

  test("returns correct stack by name", () => {
    const stack = getStack("media");
    expect(stack).toBeDefined();
    expect(stack!.apps).toContain("sonarr");
    expect(stack!.apps).toContain("radarr");
  });

  test("returns undefined for unknown stack", () => {
    expect(getStack("nonexistent")).toBeUndefined();
  });
});

describe("registry integrity", () => {
  test("every app has required fields", () => {
    for (const app of APP_REGISTRY) {
      expect(app.name).toBeTruthy();
      expect(app.displayName).toBeTruthy();
      expect(app.image).toBeTruthy();
      expect(app.configSubdir).toBeTruthy();
      expect(typeof app.needsDataDir).toBe("boolean");
    }
  });

  test("no duplicate app names", () => {
    const names = getAppNames();
    const unique = new Set(names);
    expect(unique.size).toBe(names.length);
  });

  test("all stacks reference valid app names", () => {
    const validNames = new Set(getAppNames());
    for (const stack of APP_STACKS) {
      for (const appName of stack.apps) {
        expect(validNames.has(appName)).toBe(true);
      }
    }
  });
});

describe("APP_CATEGORIES integrity", () => {
  test("every category has required fields", () => {
    for (const cat of APP_CATEGORIES) {
      expect(cat.label).toBeTruthy();
      expect(cat.value).toBeTruthy();
      expect(cat.description).toBeTruthy();
      expect(cat.apps.length).toBeGreaterThan(0);
    }
  });

  test("no duplicate category values", () => {
    const values = APP_CATEGORIES.map((c) => c.value);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  test("all category apps reference valid app names", () => {
    const validNames = new Set(getAppNames());
    for (const cat of APP_CATEGORIES) {
      for (const appName of cat.apps) {
        expect(validNames.has(appName)).toBe(true);
      }
    }
  });

  test("every non-hidden non-companion app appears in at least one category", () => {
    const categorized = new Set(APP_CATEGORIES.flatMap((c) => c.apps));
    const nonHidden = APP_REGISTRY.filter(
      (app) => !app.hidden && !app.companionOf,
    );
    for (const app of nonHidden) {
      expect(categorized.has(app.name)).toBe(true);
    }
  });
});

describe("registry field constraints", () => {
  test("apps with rawCompose and additionalContainers have containerName set", () => {
    const rawComposeApps = APP_REGISTRY.filter((app) => app.rawCompose);
    for (const app of rawComposeApps) {
      if (app.additionalContainers) {
        expect(app.containerName).toBeTruthy();
      }
    }
  });

  test("apps with requiresHttps have ports", () => {
    const httpsApps = APP_REGISTRY.filter((app) => app.requiresHttps);
    for (const app of httpsApps) {
      expect(app.port).toBeTruthy();
    }
  });

  test("hidden apps are caddy and companion apps", () => {
    const hidden = APP_REGISTRY.filter((app) => app.hidden);
    expect(hidden.length).toBeGreaterThanOrEqual(1);
    const hiddenNames = hidden.map((a) => a.name);
    expect(hiddenNames).toContain("caddy");
    for (const app of hidden) {
      expect(app.name === "caddy" || !!app.companionOf).toBe(true);
    }
  });

  test("all conflictsWith references are valid app names", () => {
    const validNames = new Set(getAppNames());
    for (const app of APP_REGISTRY) {
      if (app.conflictsWith) {
        for (const conflict of app.conflictsWith) {
          expect(validNames.has(conflict)).toBe(true);
        }
      }
    }
  });

  test("all companionOf references are valid app names", () => {
    const validNames = new Set(getAppNames());
    const companions = APP_REGISTRY.filter((app) => app.companionOf);
    for (const app of companions) {
      expect(validNames.has(app.companionOf!)).toBe(true);
    }
  });

  test("companion apps are not in any category", () => {
    const categorized = new Set(APP_CATEGORIES.flatMap((c) => c.apps));
    const companions = APP_REGISTRY.filter((app) => app.companionOf);
    for (const app of companions) {
      expect(categorized.has(app.name)).toBe(false);
    }
  });

  test("no app has port 0", () => {
    for (const app of APP_REGISTRY) {
      if (app.port !== null) {
        expect(app.port).toBeGreaterThan(0);
      }
    }
  });

  test("no duplicate ports among non-conflicting apps", () => {
    const portMap = new Map<number, string[]>();
    for (const app of APP_REGISTRY) {
      if (app.port === null || app.hidden || app.companionOf) continue;
      const existing = portMap.get(app.port) || [];
      existing.push(app.name);
      portMap.set(app.port, existing);
    }

    for (const [port, apps] of portMap) {
      if (apps.length > 1) {
        const appDefs = apps.map((name) => getApp(name)!);
        for (let i = 0; i < appDefs.length; i++) {
          for (let j = i + 1; j < appDefs.length; j++) {
            const a = appDefs[i];
            const b = appDefs[j];
            const conflicts =
              a.conflictsWith?.includes(b.name) ||
              b.conflictsWith?.includes(a.name);
            expect(conflicts).toBe(true);
          }
        }
      }
    }
  });

  test("extraPorts have valid protocol values", () => {
    for (const app of APP_REGISTRY) {
      if (app.extraPorts) {
        for (const port of app.extraPorts) {
          if (port.protocol) {
            expect(["tcp", "udp"]).toContain(port.protocol);
          }
          expect(port.host).toBeGreaterThan(0);
          expect(port.container).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe("getConfigPaths edge cases", () => {
  test("handles apps with data subdirectory (uptime-kuma)", () => {
    const uptimeKuma = getApp("uptimekuma");
    if (uptimeKuma) {
      const paths = getConfigPaths(uptimeKuma, "/home/user");
      expect(paths[0]).toContain("data");
    }
  });

  test("handles apps with app/config subdirectory (seerr)", () => {
    const seerr = getApp("seerr")!;
    const paths = getConfigPaths(seerr, "/home/user");
    expect(paths).toEqual(["/home/user/seerr/app/config"]);
  });
});

describe("getCompanionApps additional", () => {
  test("returns companions for apps that have them", () => {
    const appsWithCompanions = APP_REGISTRY.filter((app) => {
      const companions = getCompanionApps(app.name);
      return companions.length > 0;
    });

    for (const parent of appsWithCompanions) {
      const companions = getCompanionApps(parent.name);
      for (const companion of companions) {
        expect(companion.companionOf).toBe(parent.name);
      }
    }
  });
});

describe("APP_STACKS additional integrity", () => {
  test("each stack apps list is non-empty", () => {
    for (const stack of APP_STACKS) {
      expect(stack.apps.length).toBeGreaterThan(0);
    }
  });

  test("no duplicate stack values", () => {
    const values = APP_STACKS.map((s) => s.value);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  test("stack descriptions mention included apps", () => {
    for (const stack of APP_STACKS) {
      const appDisplayNames = stack.apps.map(
        (name) => getApp(name)?.displayName ?? "",
      );
      const hasMatch = appDisplayNames.some((displayName) =>
        stack.description.includes(displayName),
      );
      expect(hasMatch).toBe(true);
    }
  });
});

describe("OAuth configuration integrity", () => {
  test("apps with oauth have valid clientId", () => {
    const oauthApps = APP_REGISTRY.filter((app) => app.oauth);
    for (const app of oauthApps) {
      expect(app.oauth!.clientId).toBeTruthy();
      expect(app.oauth!.displayName).toBeTruthy();
    }
  });

  test("apps with oauth have envMapping with required fields", () => {
    const oauthApps = APP_REGISTRY.filter((app) => app.oauth);
    for (const app of oauthApps) {
      const mapping = app.oauth!.envMapping;
      expect(mapping.issuerUrl).toBeTruthy();
      expect(mapping.clientId).toBeTruthy();
      expect(mapping.clientSecret).toBeTruthy();
    }
  });

  test("apps with oauth have redirectUris function", () => {
    const oauthApps = APP_REGISTRY.filter((app) => app.oauth);
    for (const app of oauthApps) {
      const uris = app.oauth!.redirectUris("test.duckdns.org");
      expect(Array.isArray(uris)).toBe(true);
      expect(uris.length).toBeGreaterThan(0);
      const hasDomainUri = uris.some((uri) => uri.includes("test.duckdns.org"));
      expect(hasDomainUri).toBe(true);
    }
  });

  test("no duplicate oauth clientIds", () => {
    const oauthApps = APP_REGISTRY.filter((app) => app.oauth);
    const clientIds = oauthApps.map((app) => app.oauth!.clientId);
    const unique = new Set(clientIds);
    expect(unique.size).toBe(clientIds.length);
  });
});
