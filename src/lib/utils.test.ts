import { describe, expect, it } from "vitest";
import {
  formatBytes,
  formatDuration,
  parseTimecode,
  sizeDeltaPercent,
} from "./utils";

describe("formatBytes", () => {
  it("handles zero and negatives", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(-5)).toBe("0 B");
  });

  it("formats across units", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});

describe("formatDuration", () => {
  it("formats minutes:seconds", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(75)).toBe("1:15");
  });

  it("adds hours when needed", () => {
    expect(formatDuration(3661)).toBe("1:01:01");
  });

  it("guards invalid input", () => {
    expect(formatDuration(NaN)).toBe("—");
  });
});

describe("parseTimecode", () => {
  it("parses plain seconds", () => {
    expect(parseTimecode("12")).toBe(12);
    expect(parseTimecode("12.5")).toBe(12.5);
  });

  it("parses mm:ss and hh:mm:ss", () => {
    expect(parseTimecode("1:30")).toBe(90);
    expect(parseTimecode("1:00:00")).toBe(3600);
  });

  it("returns NaN for invalid or empty", () => {
    expect(Number.isNaN(parseTimecode(""))).toBe(true);
    expect(Number.isNaN(parseTimecode("abc"))).toBe(true);
  });
});

describe("sizeDeltaPercent", () => {
  it("computes signed change", () => {
    expect(sizeDeltaPercent(100, 50)).toBe(-50);
    expect(sizeDeltaPercent(100, 120)).toBe(20);
    expect(sizeDeltaPercent(0, 50)).toBe(0);
  });
});
