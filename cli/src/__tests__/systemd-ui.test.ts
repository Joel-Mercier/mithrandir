import { describe, expect, test } from "bun:test";
import { generateUiServiceUnit } from "@/lib/systemd-ui.js";

describe("generateUiServiceUnit", () => {
  const unit = generateUiServiceUnit("/home/user/homelab", "/home/user");

  test("contains correct Description", () => {
    expect(unit).toContain("Description=Mithrandir UI Dashboard");
  });

  test("depends on docker.service (wants, not requires)", () => {
    expect(unit).toContain("After=network.target docker.service");
    expect(unit).toContain("Wants=docker.service");
    expect(unit).not.toContain("Requires=docker.service");
  });

  test("uses simple type (long-running process)", () => {
    expect(unit).toContain("Type=simple");
  });

  test("starts Nitro server", () => {
    expect(unit).toContain("ExecStart=/usr/local/bin/bun run .deployments/current/server/index.mjs");
  });

  test("sets working directory to ui/", () => {
    expect(unit).toContain("WorkingDirectory=/home/user/homelab/ui");
  });

  test("sets production environment", () => {
    expect(unit).toContain('Environment="NODE_ENV=production"');
    expect(unit).toContain('Environment="PORT=4180"');
    expect(unit).toContain('Environment="HOME=/home/user"');
  });

  test("loads env files", () => {
    expect(unit).toContain("EnvironmentFile=-/home/user/homelab/.env");
    expect(unit).toContain("EnvironmentFile=/home/user/homelab/ui/.env.local");
  });

  test("restarts on failure", () => {
    expect(unit).toContain("Restart=on-failure");
    expect(unit).toContain("RestartSec=5");
  });

  test("logs to journal", () => {
    expect(unit).toContain("StandardOutput=journal");
    expect(unit).toContain("StandardError=journal");
  });

  test("has Install section", () => {
    expect(unit).toContain("[Install]");
    expect(unit).toContain("WantedBy=multi-user.target");
  });

  test("snapshot", () => {
    expect(unit).toMatchSnapshot();
  });
});
