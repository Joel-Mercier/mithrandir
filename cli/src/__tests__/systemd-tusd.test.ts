import { describe, expect, test } from "bun:test";
import { generateTusdServiceUnit, TUSD_PORT } from "@/lib/systemd-tusd.js";

describe("generateTusdServiceUnit", () => {
  const unit = generateTusdServiceUnit("/home/user/homelab", "/data/uploads");

  test("contains correct Description", () => {
    expect(unit).toContain("Description=Mithrandir tusd Upload Server");
  });

  test("depends on network.target", () => {
    expect(unit).toContain("After=network.target");
  });

  test("starts before UI service", () => {
    expect(unit).toContain("Before=mithrandir-ui.service");
  });

  test("uses simple type", () => {
    expect(unit).toContain("Type=simple");
  });

  test("runs tusd binary from repo ui/.tusd/ directory", () => {
    expect(unit).toContain("ExecStart=/home/user/homelab/ui/.tusd/tusd");
  });

  test("uses provided upload directory", () => {
    expect(unit).toContain("-upload-dir /data/uploads");
  });

  test("uses correct port", () => {
    expect(unit).toContain(`-port ${TUSD_PORT}`);
  });

  test("configures tus base path for API routing", () => {
    expect(unit).toContain("-base-path /api/media/upload/tus");
  });

  test("configures HTTP hooks to UI server", () => {
    expect(unit).toContain("-hooks-http http://localhost:4180/api/media/upload/hooks");
    expect(unit).toContain("-hooks-http-forward-headers Cookie,Authorization");
    expect(unit).toContain("-hooks-enabled-events pre-create,post-finish");
  });

  test("runs behind proxy", () => {
    expect(unit).toContain("-behind-proxy");
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

describe("generateTusdServiceUnit with different paths", () => {
  test("embeds repo root and upload dir correctly", () => {
    const unit = generateTusdServiceUnit("/opt/homelab", "/mnt/storage/uploads");
    expect(unit).toContain("ExecStart=/opt/homelab/ui/.tusd/tusd");
    expect(unit).toContain("-upload-dir /mnt/storage/uploads");
  });
});

describe("TUSD_PORT", () => {
  test("is 1080", () => {
    expect(TUSD_PORT).toBe(1080);
  });
});

describe("generateTusdServiceUnit structure", () => {
  const unit = generateTusdServiceUnit("/home/user/homelab", "/data/uploads");

  test("has all three sections", () => {
    expect(unit).toContain("[Unit]");
    expect(unit).toContain("[Service]");
    expect(unit).toContain("[Install]");
  });

  test("TUSD_PORT is used in service unit", () => {
    expect(unit).toContain(`-port ${TUSD_PORT}`);
  });

  test("handles paths with special characters", () => {
    const u = generateTusdServiceUnit("/opt/home lab", "/data/up loads");
    expect(u).toContain("/opt/home lab/ui/.tusd/tusd");
    expect(u).toContain("-upload-dir /data/up loads");
  });
});
