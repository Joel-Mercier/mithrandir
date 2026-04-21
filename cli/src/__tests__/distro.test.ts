import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { detectDistro, extractLocalIp, parseOsRelease } from "@/lib/distro.js";

const tmpDirs: string[] = [];

function writeOsRelease(content: string): string {
  const dir = mkdtempSync(join(tmpdir(), "distro-test-"));
  tmpDirs.push(dir);
  const path = join(dir, "os-release");
  writeFileSync(path, content);
  return path;
}

afterEach(() => {
  for (const dir of tmpDirs) rmSync(dir, { recursive: true, force: true });
  tmpDirs.length = 0;
});

describe("parseOsRelease", () => {
  test("parses KEY=VALUE pairs", () => {
    expect(parseOsRelease("ID=debian\nVERSION_CODENAME=trixie\n")).toEqual({
      ID: "debian",
      VERSION_CODENAME: "trixie",
    });
  });

  test("strips surrounding double quotes", () => {
    expect(parseOsRelease('PRETTY_NAME="Debian GNU/Linux 13 (trixie)"')).toEqual(
      { PRETTY_NAME: "Debian GNU/Linux 13 (trixie)" },
    );
  });

  test("strips surrounding single quotes", () => {
    expect(parseOsRelease("VERSION_CODENAME='noble'")).toEqual({
      VERSION_CODENAME: "noble",
    });
  });

  test("ignores blank lines, comments, and non KEY=VALUE lines", () => {
    const content = [
      "# a comment",
      "",
      "ID=debian",
      "not a pair",
      "VERSION_CODENAME=trixie",
    ].join("\n");

    expect(parseOsRelease(content)).toEqual({
      ID: "debian",
      VERSION_CODENAME: "trixie",
    });
  });
});

describe("detectDistro", () => {
  test("parses a quoted Debian os-release", async () => {
    const path = writeOsRelease(
      [
        'PRETTY_NAME="Debian GNU/Linux 13 (trixie)"',
        'NAME="Debian GNU/Linux"',
        "ID=debian",
        "VERSION_CODENAME=trixie",
        "",
      ].join("\n"),
    );

    expect(await detectDistro(path)).toEqual({
      id: "debian",
      versionCodename: "trixie",
      prettyName: "Debian GNU/Linux 13 (trixie)",
    });
  });

  test("parses an Ubuntu os-release", async () => {
    const path = writeOsRelease(
      [
        "ID=ubuntu",
        "VERSION_CODENAME='noble'",
        "PRETTY_NAME='Ubuntu 24.04 LTS'",
      ].join("\n"),
    );

    const info = await detectDistro(path);
    expect(info.id).toBe("ubuntu");
    expect(info.versionCodename).toBe("noble");
    expect(info.prettyName).toBe("Ubuntu 24.04 LTS");
  });

  test("lowercases the distro ID", async () => {
    const path = writeOsRelease("ID=Debian\nVERSION_CODENAME=trixie\n");
    expect((await detectDistro(path)).id).toBe("debian");
  });

  test("defaults missing VERSION_CODENAME and PRETTY_NAME to empty string", async () => {
    const path = writeOsRelease("ID=debian\n");
    const info = await detectDistro(path);
    expect(info.versionCodename).toBe("");
    expect(info.prettyName).toBe("");
  });

  test("throws when the os-release file is absent", async () => {
    await expect(detectDistro("/tmp/does-not-exist-os-release")).rejects.toThrow(
      /os-release not found/,
    );
  });

  test("throws for unsupported distros", async () => {
    const path = writeOsRelease("ID=fedora\nVERSION_CODENAME=rawhide\n");
    await expect(detectDistro(path)).rejects.toThrow(
      /Unsupported distro: fedora/,
    );
  });

  test("reports 'unknown' when ID is missing", async () => {
    const path = writeOsRelease("PRETTY_NAME=Mystery\n");
    await expect(detectDistro(path)).rejects.toThrow(
      /Unsupported distro: unknown/,
    );
  });
});

describe("extractLocalIp", () => {
  test("extracts the IP after 'src' from ip route output", () => {
    expect(
      extractLocalIp(
        "1.1.1.1 via 192.168.1.1 dev eth0 src 192.168.1.100 uid 1000\n",
      ),
    ).toBe("192.168.1.100");
  });

  test("returns 'localhost' when output has no 'src' field", () => {
    expect(extractLocalIp("1.1.1.1 via 192.168.1.1 dev eth0\n")).toBe(
      "localhost",
    );
  });

  test("returns 'localhost' for empty input", () => {
    expect(extractLocalIp("")).toBe("localhost");
  });

  test("handles IPv6-style 'src' values", () => {
    expect(
      extractLocalIp(
        "1.1.1.1 via fe80::1 dev eth0 src fd00::abcd metric 100\n",
      ),
    ).toBe("fd00::abcd");
  });
});
