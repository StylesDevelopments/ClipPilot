import { describe, expect, it } from "vitest";
import { getExtension, resolveInScope, sanitizeFilename } from "./storage";
import { config } from "./config";

describe("sanitizeFilename", () => {
  it("strips directory components", () => {
    expect(sanitizeFilename("../../etc/passwd")).not.toContain("/");
    expect(sanitizeFilename("/tmp/evil.mov")).toBe("evil.mov");
  });

  it("replaces unsafe characters", () => {
    expect(sanitizeFilename("my video; rm -rf.mp4")).toBe("my_video_rm_-rf.mp4");
  });

  it("never returns empty", () => {
    expect(sanitizeFilename("")).toBe("file");
    expect(sanitizeFilename("???")).toBe("file");
  });
});

describe("getExtension", () => {
  it("lowercases the extension", () => {
    expect(getExtension("CLIP.MOV")).toBe(".mov");
    expect(getExtension("a.b.MP4")).toBe(".mp4");
  });
});

describe("resolveInScope", () => {
  it("resolves a clean name inside the scope", () => {
    const resolved = resolveInScope("uploads", "abc.mp4");
    expect(resolved.startsWith(config.uploadsDir)).toBe(true);
    expect(resolved.endsWith("abc.mp4")).toBe(true);
  });

  it("neutralises traversal attempts", () => {
    // sanitisation strips the traversal, so the file stays in-scope.
    const resolved = resolveInScope("outputs", "../../secret");
    expect(resolved.startsWith(config.outputsDir)).toBe(true);
  });
});
