import { describe, expect, it } from "vitest";
import { validateUpload } from "./validation";
import { config } from "./config";

describe("validateUpload", () => {
  it("accepts a valid mp4", () => {
    expect(validateUpload({ name: "clip.mp4", type: "video/mp4", size: 1000 }).ok).toBe(
      true,
    );
  });

  it("accepts mov even with an odd MIME type", () => {
    expect(
      validateUpload({ name: "clip.mov", type: "application/octet-stream", size: 1000 })
        .ok,
    ).toBe(true);
  });

  it("rejects unsupported extensions", () => {
    const result = validateUpload({ name: "clip.avi", type: "video/avi", size: 1000 });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Unsupported/);
  });

  it("rejects empty files", () => {
    expect(validateUpload({ name: "clip.mp4", type: "video/mp4", size: 0 }).ok).toBe(
      false,
    );
  });

  it("rejects files over the size limit", () => {
    const result = validateUpload({
      name: "clip.mp4",
      type: "video/mp4",
      size: config.maxUploadBytes + 1,
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/too large/);
  });
});
