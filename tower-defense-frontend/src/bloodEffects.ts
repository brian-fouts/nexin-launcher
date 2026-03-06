export type BloodMistSpec = {
  vx: number;
  vy: number;
  vz: number;
  radius: number;
};

export function buildBloodMistSpecs(count: number, randomFn: () => number = Math.random): BloodMistSpec[] {
  const safeCount = Math.max(1, count);
  const specs: BloodMistSpec[] = [];
  for (let i = 0; i < safeCount; i += 1) {
    const theta = randomFn() * Math.PI * 2;
    const speed = 6 + randomFn() * 15;
    const up = 8 + randomFn() * 14;
    specs.push({
      vx: Math.cos(theta) * speed,
      vy: up,
      vz: Math.sin(theta) * speed,
      radius: 0.15 + randomFn() * 0.45,
    });
  }
  return specs;
}
