import { describe, expect, it } from "vitest";

import { generateGroundLayout, quantizedDuplicateRatio, seedFromMap } from "./groundGeneration";
import type { MapDefinition } from "./mapUtils";

const map: MapDefinition = {
  width: 120,
  depth: 80,
  groundColor: "#4f8a3f",
  trees: [
    { x: -45, z: -20, trunkHeight: 2.8, crownRadius: 2.4 },
    { x: -40, z: -15, trunkHeight: 2.3, crownRadius: 2.0 },
    { x: 12, z: 18, trunkHeight: 2.9, crownRadius: 2.4 },
  ],
};

describe("groundGeneration", () => {
  it("creates bounded sticks and leaves", () => {
    const seed = seedFromMap(map);
    const layout = generateGroundLayout(320, 320, seed);
    expect(layout.sticks.length).toBeGreaterThan(100);
    expect(layout.leaves.length).toBeGreaterThan(150);

    for (const point of [...layout.sticks, ...layout.leaves]) {
      expect(point.x).toBeGreaterThanOrEqual(-160);
      expect(point.x).toBeLessThanOrEqual(160);
      expect(point.z).toBeGreaterThanOrEqual(-160);
      expect(point.z).toBeLessThanOrEqual(160);
    }
  });

  it("avoids obvious repeating placement patterns", () => {
    const seed = seedFromMap(map) ^ 1337;
    const layout = generateGroundLayout(320, 320, seed);
    const stickDupRatio = quantizedDuplicateRatio(layout.sticks);
    const leafDupRatio = quantizedDuplicateRatio(layout.leaves);
    expect(stickDupRatio).toBeLessThan(0.12);
    expect(leafDupRatio).toBeLessThan(0.12);
  });
});
