import { describe, expect, it } from "vitest";

import { worldToBloodPixel } from "./bloodTexture";

describe("worldToBloodPixel", () => {
  it("maps world center to texture center", () => {
    const p = worldToBloodPixel(0, 0, 320, 320, 1024, 1024);
    expect(p.x).toBeGreaterThanOrEqual(510);
    expect(p.x).toBeLessThanOrEqual(513);
    expect(p.y).toBeGreaterThanOrEqual(510);
    expect(p.y).toBeLessThanOrEqual(513);
  });

  it("clamps points outside world bounds", () => {
    const p = worldToBloodPixel(9999, -9999, 320, 320, 1024, 1024);
    expect(p.x).toBe(1023);
    expect(p.y).toBe(1023);
  });
});
