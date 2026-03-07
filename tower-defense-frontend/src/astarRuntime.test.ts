import { describe, expect, it } from "vitest";

import {
  createIncrementalAStarPlanner,
  findAStarPath,
  stepIncrementalAStarPlanner,
  updateIncrementalAStarGoal,
} from "./astarRuntime";

function distanceSqPointToSegment(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number
): number {
  const abx = bx - ax;
  const abz = bz - az;
  const apx = px - ax;
  const apz = pz - az;
  const abLenSq = abx * abx + abz * abz;
  if (abLenSq < 1e-8) return (px - ax) ** 2 + (pz - az) ** 2;
  const t = Math.max(0, Math.min(1, (apx * abx + apz * abz) / abLenSq));
  const qx = ax + abx * t;
  const qz = az + abz * t;
  return (px - qx) ** 2 + (pz - qz) ** 2;
}

describe("findAStarPath", () => {
  it("returns path ending at goal", () => {
    const path = findAStarPath({ x: -20, z: -20 }, { x: 20, z: 20 }, 120, 120, 6, []);
    expect(path.length).toBeGreaterThan(0);
    const end = path[path.length - 1];
    expect(end.x).toBeCloseTo(20, 0);
    expect(end.z).toBeCloseTo(20, 0);
  });

  it("detours around blocking obstacle", () => {
    const path = findAStarPath(
      { x: -30, z: 0 },
      { x: 30, z: 0 },
      140,
      140,
      5,
      [{ kind: "circle", x: 0, z: 0, radius: 16 }],
      { clearanceRadius: 2 }
    );
    expect(path.length).toBeGreaterThan(2);
    const minDistSq = path
      .slice(0, -1)
      .reduce((best, p, i) => Math.min(best, distanceSqPointToSegment(0, 0, p.x, p.z, path[i + 1].x, path[i + 1].z)), Infinity);
    expect(minDistSq).toBeGreaterThan((16 + 2) ** 2);
  });

  it("applies grid-based clearance for narrow corridors", () => {
    const path = findAStarPath(
      { x: -30, z: 0 },
      { x: 30, z: 0 },
      120,
      120,
      4,
      [
        { kind: "circle", x: 0, z: 7, radius: 6.8 },
        { kind: "circle", x: 0, z: -7, radius: 6.8 },
      ],
      { clearanceRadius: 1.8 }
    );
    // Corridor centerline is blocked once inflated; path must route around.
    const nearCenterline = path.some((p) => Math.abs(p.z) < 0.6 && Math.abs(p.x) < 10);
    expect(nearCenterline).toBe(false);
  });

  it("routes around square tree cell obstacle", () => {
    const path = findAStarPath(
      { x: -20, z: 0 },
      { x: 20, z: 0 },
      100,
      100,
      5,
      [{ kind: "square", x: 0, z: 0, halfSize: 2.5 }],
      { clearanceRadius: 1 }
    );
    const cutsThroughCell = path.some((p) => Math.abs(p.x) <= 3.5 && Math.abs(p.z) <= 3.5);
    expect(cutsThroughCell).toBe(false);
  });
});

describe("incremental planner", () => {
  it("builds path incrementally across steps", () => {
    const planner = createIncrementalAStarPlanner(
      { x: -24, z: -18 },
      { x: 26, z: 20 },
      140,
      140,
      5,
      [{ kind: "circle", x: 0, z: 0, radius: 14 }],
      { clearanceRadius: 1.5, maxIterations: 20000 }
    );

    let status: "searching" | "found" | "failed" = "searching";
    let pathLength = 0;
    for (let i = 0; i < 300 && status === "searching"; i += 1) {
      const result = stepIncrementalAStarPlanner(planner, 20);
      status = result.status;
      pathLength = result.path?.length ?? pathLength;
    }
    expect(status).toBe("found");
    expect(pathLength).toBeGreaterThan(2);
  });

  it("keeps planning after goal update while in progress", () => {
    const planner = createIncrementalAStarPlanner(
      { x: -18, z: -20 },
      { x: 20, z: 20 },
      120,
      120,
      4,
      [{ kind: "square", x: 0, z: 0, halfSize: 8 }],
      { clearanceRadius: 1 }
    );

    for (let i = 0; i < 20; i += 1) {
      stepIncrementalAStarPlanner(planner, 8);
    }
    updateIncrementalAStarGoal(planner, { x: 30, z: 24 });

    let result = stepIncrementalAStarPlanner(planner, 1);
    for (let i = 0; i < 500 && result.status === "searching"; i += 1) {
      result = stepIncrementalAStarPlanner(planner, 12);
    }
    expect(result.status).toBe("found");
    const path = result.path ?? [];
    const end = path[path.length - 1];
    expect(end.x).toBeCloseTo(30, 0);
    expect(end.z).toBeCloseTo(24, 0);
  });
});
