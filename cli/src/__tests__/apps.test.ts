import { describe, expect, test } from "bun:test";
import {
  APP_REGISTRY,
  APP_STACKS,
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
