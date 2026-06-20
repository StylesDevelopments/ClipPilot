import { describe, expect, it } from "vitest";
import { buildPlan } from "./plan";
import { withDefaults, getTool } from "./catalog";
import type { PlanContext } from "./types";

function ctx(overrides: Partial<PlanContext> = {}): PlanContext {
  return {
    inputPath: "/storage/uploads/in.mp4",
    outputPath: "/storage/outputs/out.mp4",
    outputName: "out.mp4",
    tmpPrefix: "/storage/tmp/job1",
    durationSec: 10,
    hasAudio: true,
    options: {},
    ...overrides,
  };
}

describe("buildPlan: stabilise", () => {
  it("produces a two-pass plan", () => {
    const tool = getTool("stabilise")!;
    const plan = buildPlan("stabilise", ctx({ options: withDefaults(tool) }));
    expect(plan.steps).toHaveLength(2);
    expect(plan.steps[0].args.join(" ")).toContain("vidstabdetect");
    expect(plan.steps[1].args.join(" ")).toContain("vidstabtransform");
    expect(plan.outputKind).toBe("video");
    expect(plan.cleanup[0]).toContain(".trf");
  });

  it("preserves audio by default and drops it when asked", () => {
    const tool = getTool("stabilise")!;
    const keep = buildPlan("stabilise", ctx({ options: withDefaults(tool) }));
    expect(keep.steps[1].args).toContain("copy");

    const drop = buildPlan(
      "stabilise",
      ctx({ options: withDefaults(tool, { removeAudio: true }) }),
    );
    expect(drop.steps[1].args).toContain("-an");
  });

  it("passes the input path as a single argv element (no shell injection)", () => {
    const tool = getTool("stabilise")!;
    const evil = "/storage/uploads/a; rm -rf ~.mp4";
    const plan = buildPlan("stabilise", ctx({ inputPath: evil, options: withDefaults(tool) }));
    // The dangerous string must appear verbatim as one argument, never split.
    expect(plan.steps[0].args).toContain(evil);
  });
});

describe("buildPlan: trim", () => {
  it("builds seek args from timecodes", () => {
    const tool = getTool("trim")!;
    const plan = buildPlan(
      "trim",
      ctx({ options: withDefaults(tool, { trimStart: "0:02", trimEnd: "0:05" }) }),
    );
    const args = plan.steps[0].args;
    expect(args).toContain("-ss");
    expect(args).toContain("2");
    expect(args).toContain("-t");
    expect(args).toContain("copy");
  });
});

describe("buildPlan: thumbnail", () => {
  it("extracts a single frame as an image", () => {
    const tool = getTool("thumbnail")!;
    const plan = buildPlan("thumbnail", ctx({ options: withDefaults(tool, { time: "3" }) }));
    expect(plan.outputKind).toBe("image");
    expect(plan.steps[0].args).toContain("-frames:v");
    expect(plan.steps[0].args).toContain("1");
  });
});

describe("buildPlan: rotate", () => {
  it("maps direction to the right filter", () => {
    const tool = getTool("rotate")!;
    const cw = buildPlan("rotate", ctx({ options: withDefaults(tool, { direction: "90cw" }) }));
    expect(cw.steps[0].args.join(" ")).toContain("transpose=1");

    const flip = buildPlan("rotate", ctx({ options: withDefaults(tool, { direction: "hflip" }) }));
    expect(flip.steps[0].args).toContain("hflip");
  });
});

describe("buildPlan: gif", () => {
  it("builds a two-pass palette plan", () => {
    const tool = getTool("gif")!;
    const plan = buildPlan("gif", ctx({ options: withDefaults(tool, { fps: "15", width: "320" }) }));
    expect(plan.steps).toHaveLength(2);
    expect(plan.steps[0].args.join(" ")).toContain("palettegen");
    expect(plan.steps[1].args.join(" ")).toContain("paletteuse");
    expect(plan.steps[1].args.join(" ")).toContain("fps=15");
    expect(plan.steps[1].args.join(" ")).toContain("scale=320");
    expect(plan.outputKind).toBe("image");
    expect(plan.cleanup[0]).toContain("palette");
  });
});

describe("buildPlan: compress", () => {
  it("adds a scale filter when downscaling", () => {
    const tool = getTool("compress")!;
    const plan = buildPlan(
      "compress",
      ctx({ options: withDefaults(tool, { resolution: "720" }) }),
    );
    expect(plan.steps[0].args.join(" ")).toContain("scale=-2:720");
  });
});
