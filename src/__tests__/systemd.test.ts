import { describe, expect, test } from "bun:test";
import { generateServiceUnit, generateTimerUnit } from "@/lib/systemd.js";

describe("generateServiceUnit", () => {
  const unit = generateServiceUnit();

  test("contains correct Description", () => {
    expect(unit).toContain("Description=Mithrandir Backup Service");
  });

  test("depends on docker.service", () => {
    expect(unit).toContain("After=docker.service");
    expect(unit).toContain("Requires=docker.service");
  });

  test("uses oneshot type", () => {
    expect(unit).toContain("Type=oneshot");
  });

  test("runs mithrandir backup", () => {
    expect(unit).toContain("ExecStart=/usr/local/bin/mithrandir backup");
  });

  test("sets PATH environment", () => {
    expect(unit).toContain("Environment=\"PATH=");
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

describe("generateTimerUnit", () => {
  const unit = generateTimerUnit();

  test("contains correct Description", () => {
    expect(unit).toContain("Description=Mithrandir Backup Timer");
  });

  test("fires at 2 AM daily", () => {
    expect(unit).toContain("OnCalendar=*-*-* 02:00:00");
  });

  test("has randomized delay", () => {
    expect(unit).toContain("RandomizedDelaySec=1800");
  });

  test("is persistent (runs missed timers on boot)", () => {
    expect(unit).toContain("Persistent=true");
  });

  test("targets timers.target", () => {
    expect(unit).toContain("WantedBy=timers.target");
  });

  test("snapshot", () => {
    expect(unit).toMatchSnapshot();
  });
});
