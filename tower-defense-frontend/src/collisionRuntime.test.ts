import { describe, expect, it } from "vitest";

import { circleOverlapsSquare, circlesOverlap, resolveCircleOverlap, resolveCircleSquareOverlap } from "./collisionRuntime";

describe("resolveCircleOverlap", () => {
  it("pushes first circle out of overlap", () => {
    const a = { x: 0, z: 0, radius: 3 };
    const b = { x: 2, z: 0, radius: 3 };
    const out = resolveCircleOverlap(a, b);
    const dist = Math.hypot(out.ax - b.x, out.az - b.z);
    expect(dist).toBeGreaterThanOrEqual(a.radius + b.radius - 0.001);
  });

  it("leaves non-overlapping circles unchanged", () => {
    const a = { x: 0, z: 0, radius: 2 };
    const b = { x: 10, z: 0, radius: 2 };
    const out = resolveCircleOverlap(a, b);
    expect(out.ax).toBe(a.x);
    expect(out.az).toBe(a.z);
  });

  it("detects overlap correctly", () => {
    expect(circlesOverlap({ x: 0, z: 0, radius: 2 }, { x: 3, z: 0, radius: 2 })).toBe(true);
    expect(circlesOverlap({ x: 0, z: 0, radius: 2 }, { x: 5, z: 0, radius: 2 })).toBe(false);
  });

  it("detects circle-square overlap", () => {
    expect(circleOverlapsSquare({ x: 0, z: 0, radius: 2 }, { x: 2.5, z: 0, halfSize: 1.5 })).toBe(true);
    expect(circleOverlapsSquare({ x: 0, z: 0, radius: 1 }, { x: 5, z: 0, halfSize: 1 })).toBe(false);
  });

  it("resolves circle-square overlap", () => {
    const out = resolveCircleSquareOverlap({ x: 0.5, z: 0.2, radius: 1.2 }, { x: 0, z: 0, halfSize: 1 });
    const overlaps = circleOverlapsSquare({ x: out.ax, z: out.az, radius: 1.2 }, { x: 0, z: 0, halfSize: 1 });
    expect(overlaps).toBe(false);
  });
});
