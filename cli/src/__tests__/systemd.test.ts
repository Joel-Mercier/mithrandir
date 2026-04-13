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

  test("has [Unit] section", () => {
    expect(unit).toContain("[Unit]");
  });

  test("has [Service] section", () => {
    expect(unit).toContain("[Service]");
  });

  test("sections appear in correct order", () => {
    const unitIdx = unit.indexOf("[Unit]");
    const serviceIdx = unit.indexOf("[Service]");
    const installIdx = unit.indexOf("[Install]");
    expect(unitIdx).toBeLessThan(serviceIdx);
    expect(serviceIdx).toBeLessThan(installIdx);
  });
});

describe("generateTimerUnit", () => {
  const unit = generateTimerUnit();

  test("defaults to 2 AM daily", () => {
    expect(unit).toContain("OnCalendar=*-*-* 02:00:00");
  });

  test("accepts custom hour", () => {
    expect(generateTimerUnit(5)).toContain("OnCalendar=*-*-* 05:00:00");
    expect(generateTimerUnit(14)).toContain("OnCalendar=*-*-* 14:00:00");
    expect(generateTimerUnit(0)).toContain("OnCalendar=*-*-* 00:00:00");
    expect(generateTimerUnit(23)).toContain("OnCalendar=*-*-* 23:00:00");
  });

  test("clamps out-of-range hours", () => {
    expect(generateTimerUnit(-1)).toContain("OnCalendar=*-*-* 00:00:00");
    expect(generateTimerUnit(25)).toContain("OnCalendar=*-*-* 23:00:00");
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

  test("has [Unit] section", () => {
    expect(unit).toContain("[Unit]");
  });

  test("has [Timer] section", () => {
    expect(unit).toContain("[Timer]");
  });

  test("single-digit hours are zero-padded", () => {
    expect(generateTimerUnit(5)).toContain("05:00:00");
    expect(generateTimerUnit(0)).toContain("00:00:00");
    expect(generateTimerUnit(9)).toContain("09:00:00");
  });

  test("double-digit hours are not padded", () => {
    expect(generateTimerUnit(14)).toContain("14:00:00");
    expect(generateTimerUnit(23)).toContain("23:00:00");
  });
});
