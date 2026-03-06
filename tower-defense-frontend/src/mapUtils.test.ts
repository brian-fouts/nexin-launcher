import { describe, expect, it } from "vitest";

import {
  countTreeClusters,
  getTreeTilt,
  mapMeetsTreeRequirement,
  type MapDefinition,
} from "./mapUtils";

function makeMap(trees: MapDefinition["trees"]): MapDefinition {
  return {
    width: 120,
    depth: 80,
    groundColor: "#4f8a3f",
    trees,
  };
}

describe("mapUtils", () => {
  it("counts separated groups as distinct clusters", () => {
    const trees = [
      { x: -45, z: -20, trunkHeight: 2.8, crownRadius: 2.4 },
      { x: -40, z: -15, trunkHeight: 2.3, crownRadius: 2.0 },
      { x: 8, z: 24, trunkHeight: 2.5, crownRadius: 2.1 },
      { x: 13, z: 19, trunkHeight: 2.9, crownRadius: 2.4 },
      { x: 48, z: -18, trunkHeight: 2.8, crownRadius: 2.4 },
      { x: 54, z: -22, trunkHeight: 2.7, crownRadius: 2.2 },
    ];

    expect(countTreeClusters(trees)).toBe(3);
  });

  it("requires at least ten trees and three clusters", () => {
    const validMap = makeMap([
      { x: -45, z: -20, trunkHeight: 2.8, crownRadius: 2.4 },
      { x: -40, z: -15, trunkHeight: 2.3, crownRadius: 2.0 },
      { x: -35, z: -22, trunkHeight: 2.9, crownRadius: 2.5 },
      { x: -42, z: -27, trunkHeight: 2.4, crownRadius: 2.1 },
      { x: 6, z: 24, trunkHeight: 2.5, crownRadius: 2.1 },
      { x: 12, z: 18, trunkHeight: 2.9, crownRadius: 2.4 },
      { x: 16, z: 25, trunkHeight: 2.6, crownRadius: 2.0 },
      { x: 9, z: 30, trunkHeight: 3.0, crownRadius: 2.6 },
      { x: 42, z: -24, trunkHeight: 2.4, crownRadius: 2.2 },
      { x: 48, z: -18, trunkHeight: 2.8, crownRadius: 2.4 },
    ]);

    const invalidMap = makeMap([
      { x: -5, z: 0, trunkHeight: 2.2, crownRadius: 2.0 },
      { x: 0, z: 2, trunkHeight: 2.3, crownRadius: 2.1 },
      { x: 5, z: 1, trunkHeight: 2.1, crownRadius: 1.9 },
    ]);

    expect(mapMeetsTreeRequirement(validMap)).toBe(true);
    expect(mapMeetsTreeRequirement(invalidMap)).toBe(false);
  });

  it("returns a consistent slight forward tilt for tree rendering", () => {
    const tree = { x: 12, z: 18, trunkHeight: 2.9, crownRadius: 2.4 };
    const tiltA = getTreeTilt(tree);
    const tiltB = getTreeTilt(tree);

    expect(tiltA).toEqual(tiltB);
    expect(tiltA.x).toBeLessThan(-0.15);
    expect(tiltA.x).toBeGreaterThan(-0.3);
    expect(Math.abs(tiltA.z)).toBeGreaterThan(0.02);
    expect(Math.abs(tiltA.z)).toBeLessThan(0.07);
  });
});
