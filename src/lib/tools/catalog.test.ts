import { describe, expect, it } from "vitest";
import { TOOLS, getTool, withDefaults } from "./catalog";

describe("tool catalog", () => {
  it("exposes the expected tools", () => {
    expect(TOOLS.map((t) => t.id).sort()).toEqual([
      "compress",
      "convert",
      "gif",
      "rotate",
      "stabilise",
      "thumbnail",
      "trim",
    ]);
  });

  it("looks up by id", () => {
    expect(getTool("stabilise")?.label).toBe("Stabilise");
    expect(getTool("nope")).toBeUndefined();
  });
});

describe("withDefaults", () => {
  it("fills in defaults for missing options", () => {
    const tool = getTool("stabilise")!;
    const opts = withDefaults(tool, {});
    expect(opts.strength).toBe("medium");
    expect(opts.removeAudio).toBe(false);
  });

  it("keeps supplied values and coerces types", () => {
    const tool = getTool("stabilise")!;
    const opts = withDefaults(tool, { strength: "high", removeAudio: true });
    expect(opts.strength).toBe("high");
    expect(opts.removeAudio).toBe(true);
  });

  it("ignores values of the wrong type", () => {
    const tool = getTool("stabilise")!;
    // a number for a select field should fall back to the default
    const opts = withDefaults(tool, { strength: 5 as unknown as string });
    expect(opts.strength).toBe("medium");
  });
});
