import { afterAll, afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

type ShellResult = { stdout: string; stderr: string; exitCode: number };
type ShellCall = { cmd: string; args: string[] };

const realShell = await import("@/lib/shell.js");

const shellCalls: ShellCall[] = [];
let shellImpl: (cmd: string, args: string[]) => Promise<ShellResult> = async () =>
  ({ stdout: "", stderr: "", exitCode: 0 });

mock.module("@/lib/shell.js", () => ({
  ...realShell,
  shell: (cmd: string, args: string[]) => {
    shellCalls.push({ cmd, args });
    return shellImpl(cmd, args);
  },
}));

const { resolveOwnership } = await import("@/lib/tar.js");

const originalSudoUser = process.env.SUDO_USER;

beforeEach(() => {
  shellCalls.length = 0;
  shellImpl = async () => ({ stdout: "", stderr: "", exitCode: 0 });
  delete process.env.SUDO_USER;
});

afterEach(() => {
  if (originalSudoUser === undefined) delete process.env.SUDO_USER;
  else process.env.SUDO_USER = originalSudoUser;
});

afterAll(() => {
  // Restore real shell module so the mock doesn't leak into other test files.
  mock.module("@/lib/shell.js", () => realShell);
});

describe("resolveOwnership", () => {
  test("uses SUDO_USER and resolves primary group via getent", async () => {
    process.env.SUDO_USER = "alice";

    shellImpl = async (cmd, args) => {
      if (cmd === "getent" && args[0] === "passwd" && args[1] === "alice") {
        return {
          stdout: "alice:x:1001:1002:Alice:/home/alice:/bin/bash\n",
          stderr: "",
          exitCode: 0,
        };
      }
      if (cmd === "getent" && args[0] === "group" && args[1] === "1002") {
        return {
          stdout: "developers:x:1002:alice\n",
          stderr: "",
          exitCode: 0,
        };
      }
      throw new Error(`unexpected shell call: ${cmd} ${args.join(" ")}`);
    };

    expect(await resolveOwnership()).toBe("alice:developers");
  });

  test("falls back to user:user when passwd lookup fails", async () => {
    process.env.SUDO_USER = "bob";

    shellImpl = async () => ({ stdout: "", stderr: "", exitCode: 2 });

    expect(await resolveOwnership()).toBe("bob:bob");
  });

  test("falls back to user:user when passwd output is empty", async () => {
    process.env.SUDO_USER = "carol";

    shellImpl = async () => ({ stdout: "", stderr: "", exitCode: 0 });

    expect(await resolveOwnership()).toBe("carol:carol");
  });

  test("falls back to gid as group name when getent group fails", async () => {
    process.env.SUDO_USER = "dave";

    shellImpl = async (cmd, args) => {
      if (cmd === "getent" && args[0] === "passwd") {
        return {
          stdout: "dave:x:1010:1011::/home/dave:/bin/bash\n",
          stderr: "",
          exitCode: 0,
        };
      }
      return { stdout: "", stderr: "", exitCode: 2 };
    };

    expect(await resolveOwnership()).toBe("dave:1011");
  });

  test("without SUDO_USER, uses `id -un` and `id -gn`", async () => {
    shellImpl = async (cmd, args) => {
      if (cmd === "id" && args[0] === "-un") {
        return { stdout: "eve\n", stderr: "", exitCode: 0 };
      }
      if (cmd === "id" && args[0] === "-gn") {
        return { stdout: "staff\n", stderr: "", exitCode: 0 };
      }
      throw new Error(`unexpected shell call: ${cmd} ${args.join(" ")}`);
    };

    expect(await resolveOwnership()).toBe("eve:staff");
  });

  test("trims whitespace from id output", async () => {
    shellImpl = async (cmd, args) => {
      if (cmd === "id" && args[0] === "-un") {
        return { stdout: "frank   \n", stderr: "", exitCode: 0 };
      }
      return { stdout: "   wheel\n", stderr: "", exitCode: 0 };
    };

    expect(await resolveOwnership()).toBe("frank:wheel");
  });
});
