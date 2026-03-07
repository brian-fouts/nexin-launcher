export type Point2 = { x: number; z: number };

export type CircleObstacle = {
  kind: "circle";
  x: number;
  z: number;
  radius: number;
};

export type SquareObstacle = {
  kind: "square";
  x: number;
  z: number;
  halfSize: number;
};

export type NavObstacle = CircleObstacle | SquareObstacle;

type Cell = { cx: number; cz: number };

type GridSpec = {
  originX: number;
  originZ: number;
  width: number;
  depth: number;
  cellSize: number;
  cols: number;
  rows: number;
};

export type AStarOptions = {
  clearanceRadius?: number;
  maxIterations?: number;
};

export type IncrementalAStarResult = {
  status: "searching" | "found" | "failed";
  path?: Point2[];
  iterations: number;
};

export type IncrementalAStarPlanner = {
  readonly start: Point2;
  goal: Point2;
  readonly obstacles: NavObstacle[];
  readonly clearanceRadius: number;
  readonly maxIterations: number;
  readonly grid: GridSpec;
  readonly walkable: boolean[][];
  open: Cell[];
  readonly closed: Set<string>;
  readonly cameFrom: Map<string, string>;
  readonly gScore: Map<string, number>;
  readonly fScore: Map<string, number>;
  startCell: Cell;
  goalCell: Cell;
  iterations: number;
  status: "searching" | "found" | "failed";
  solutionPath?: Point2[];
};

function toCell(p: Point2, g: GridSpec): Cell {
  const cx = Math.floor((p.x - g.originX) / g.cellSize);
  const cz = Math.floor((p.z - g.originZ) / g.cellSize);
  return { cx, cz };
}

function toWorld(c: Cell, g: GridSpec): Point2 {
  return {
    x: g.originX + (c.cx + 0.5) * g.cellSize,
    z: g.originZ + (c.cz + 0.5) * g.cellSize,
  };
}

function cellKey(c: Cell): string {
  return `${c.cx},${c.cz}`;
}

function cellFromKey(key: string): Cell {
  const [cx, cz] = key.split(",").map((n) => Number.parseInt(n, 10));
  return { cx, cz };
}

function heuristic(a: Cell, b: Cell): number {
  const dx = Math.abs(a.cx - b.cx);
  const dz = Math.abs(a.cz - b.cz);
  return dx + dz + (1.41421356237 - 2) * Math.min(dx, dz);
}

function inBounds(c: Cell, g: GridSpec): boolean {
  return c.cx >= 0 && c.cz >= 0 && c.cx < g.cols && c.cz < g.rows;
}

function clampCell(c: Cell, g: GridSpec): Cell {
  return {
    cx: Math.max(0, Math.min(g.cols - 1, c.cx)),
    cz: Math.max(0, Math.min(g.rows - 1, c.cz)),
  };
}

function distanceSqPointToRect(px: number, pz: number, minX: number, minZ: number, maxX: number, maxZ: number): number {
  const dx = px < minX ? minX - px : px > maxX ? px - maxX : 0;
  const dz = pz < minZ ? minZ - pz : pz > maxZ ? pz - maxZ : 0;
  return dx * dx + dz * dz;
}

function isBlockedCell(c: Cell, g: GridSpec, obstacles: NavObstacle[], clearanceRadius: number): boolean {
  const minX = g.originX + c.cx * g.cellSize;
  const minZ = g.originZ + c.cz * g.cellSize;
  const maxX = minX + g.cellSize;
  const maxZ = minZ + g.cellSize;
  for (const o of obstacles) {
    if (o.kind === "circle") {
      const radius = o.radius + clearanceRadius;
      if (distanceSqPointToRect(o.x, o.z, minX, minZ, maxX, maxZ) <= radius * radius) {
        return true;
      }
    } else {
      const inflate = clearanceRadius;
      const oMinX = o.x - o.halfSize - inflate;
      const oMaxX = o.x + o.halfSize + inflate;
      const oMinZ = o.z - o.halfSize - inflate;
      const oMaxZ = o.z + o.halfSize + inflate;
      const intersects = !(oMaxX < minX || oMinX > maxX || oMaxZ < minZ || oMinZ > maxZ);
      if (intersects) return true;
    }
  }
  return false;
}

function buildWalkabilityGrid(g: GridSpec, obstacles: NavObstacle[], clearanceRadius: number): boolean[][] {
  const walkable: boolean[][] = [];
  for (let cz = 0; cz < g.rows; cz += 1) {
    const row: boolean[] = [];
    for (let cx = 0; cx < g.cols; cx += 1) {
      row.push(!isBlockedCell({ cx, cz }, g, obstacles, clearanceRadius));
    }
    walkable.push(row);
  }
  return walkable;
}

function isWalkable(c: Cell, walkable: boolean[][]): boolean {
  if (c.cz < 0 || c.cz >= walkable.length) return false;
  const row = walkable[c.cz];
  return c.cx >= 0 && c.cx < row.length ? row[c.cx] : false;
}

function nearestWalkableCell(seed: Cell, g: GridSpec, walkable: boolean[][]): Cell | null {
  const start = clampCell(seed, g);
  if (isWalkable(start, walkable)) return start;
  const maxRing = Math.max(g.cols, g.rows);
  for (let ring = 1; ring <= maxRing; ring += 1) {
    const minX = start.cx - ring;
    const maxX = start.cx + ring;
    const minZ = start.cz - ring;
    const maxZ = start.cz + ring;
    for (let cx = minX; cx <= maxX; cx += 1) {
      const top = { cx, cz: minZ };
      const bottom = { cx, cz: maxZ };
      if (inBounds(top, g) && isWalkable(top, walkable)) return top;
      if (inBounds(bottom, g) && isWalkable(bottom, walkable)) return bottom;
    }
    for (let cz = minZ + 1; cz <= maxZ - 1; cz += 1) {
      const left = { cx: minX, cz };
      const right = { cx: maxX, cz };
      if (inBounds(left, g) && isWalkable(left, walkable)) return left;
      if (inBounds(right, g) && isWalkable(right, walkable)) return right;
    }
  }
  return null;
}

function distanceSqPointToSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const abx = bx - ax;
  const abz = bz - az;
  const apx = px - ax;
  const apz = pz - az;
  const abLenSq = abx * abx + abz * abz;
  if (abLenSq < 1e-8) {
    const dx = px - ax;
    const dz = pz - az;
    return dx * dx + dz * dz;
  }
  const t = Math.max(0, Math.min(1, (apx * abx + apz * abz) / abLenSq));
  const qx = ax + abx * t;
  const qz = az + abz * t;
  const dx = px - qx;
  const dz = pz - qz;
  return dx * dx + dz * dz;
}

function segmentIntersectsAabb(a: Point2, b: Point2, minX: number, minZ: number, maxX: number, maxZ: number): boolean {
  let tMin = 0;
  let tMax = 1;
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const checks: Array<{ p: number; q: number }> = [
    { p: -dx, q: a.x - minX },
    { p: dx, q: maxX - a.x },
    { p: -dz, q: a.z - minZ },
    { p: dz, q: maxZ - a.z },
  ];
  for (const c of checks) {
    if (Math.abs(c.p) < 1e-9) {
      if (c.q < 0) return false;
      continue;
    }
    const t = c.q / c.p;
    if (c.p < 0) {
      tMin = Math.max(tMin, t);
    } else {
      tMax = Math.min(tMax, t);
    }
    if (tMin > tMax) return false;
  }
  return true;
}

function segmentHasClearance(a: Point2, b: Point2, obstacles: NavObstacle[], clearanceRadius: number): boolean {
  for (const o of obstacles) {
    if (o.kind === "circle") {
      const radius = o.radius + clearanceRadius;
      if (distanceSqPointToSegment(o.x, o.z, a.x, a.z, b.x, b.z) <= radius * radius) {
        return false;
      }
    } else {
      const minX = o.x - o.halfSize - clearanceRadius;
      const maxX = o.x + o.halfSize + clearanceRadius;
      const minZ = o.z - o.halfSize - clearanceRadius;
      const maxZ = o.z + o.halfSize + clearanceRadius;
      if (segmentIntersectsAabb(a, b, minX, minZ, maxX, maxZ)) {
        return false;
      }
    }
  }
  return true;
}

function smoothPath(path: Point2[], obstacles: NavObstacle[], clearanceRadius: number): Point2[] {
  if (path.length <= 2) return path;
  const out: Point2[] = [path[0]];
  let anchor = 0;
  while (anchor < path.length - 1) {
    let furthest = anchor + 1;
    for (let i = anchor + 2; i < path.length; i += 1) {
      if (!segmentHasClearance(path[anchor], path[i], obstacles, clearanceRadius)) break;
      furthest = i;
    }
    out.push(path[furthest]);
    anchor = furthest;
  }
  return out;
}

function buildGrid(width: number, depth: number, cellSize: number): GridSpec {
  const safeCellSize = Math.max(1, cellSize);
  const safeWidth = Math.max(safeCellSize, width);
  const safeDepth = Math.max(safeCellSize, depth);
  const cols = Math.max(1, Math.floor(safeWidth / safeCellSize));
  const rows = Math.max(1, Math.floor(safeDepth / safeCellSize));
  return {
    originX: -safeWidth / 2,
    originZ: -safeDepth / 2,
    width: safeWidth,
    depth: safeDepth,
    cellSize: safeCellSize,
    cols,
    rows,
  };
}

function buildSolutionPath(planner: IncrementalAStarPlanner, reached: Cell): Point2[] {
  const out: Point2[] = [planner.goal];
  let k = cellKey(reached);
  while (planner.cameFrom.has(k)) {
    const prev = planner.cameFrom.get(k) as string;
    out.push(toWorld(cellFromKey(prev), planner.grid));
    k = prev;
  }
  out.reverse();
  if (out.length === 0 || Math.hypot(out[0].x - planner.start.x, out[0].z - planner.start.z) > 0.01) {
    out.unshift(planner.start);
  }
  if (!segmentHasClearance(out[out.length - 1], planner.goal, planner.obstacles, planner.clearanceRadius)) {
    out.push(toWorld(planner.goalCell, planner.grid));
  }
  return smoothPath(out, planner.obstacles, planner.clearanceRadius);
}

function refreshOpenFScoreForGoal(planner: IncrementalAStarPlanner): void {
  for (const c of planner.open) {
    const k = cellKey(c);
    const g = planner.gScore.get(k) ?? Number.POSITIVE_INFINITY;
    planner.fScore.set(k, g + heuristic(c, planner.goalCell));
  }
}

export function createIncrementalAStarPlanner(
  start: Point2,
  goal: Point2,
  width: number,
  depth: number,
  cellSize: number,
  obstacles: NavObstacle[],
  options: AStarOptions = {}
): IncrementalAStarPlanner {
  const grid = buildGrid(width, depth, cellSize);
  const clearanceRadius = Math.max(0, options.clearanceRadius ?? 0);
  const walkable = buildWalkabilityGrid(grid, obstacles, clearanceRadius);
  const startCell = nearestWalkableCell(toCell(start, grid), grid, walkable);
  const goalCell = nearestWalkableCell(toCell(goal, grid), grid, walkable);

  if (!startCell || !goalCell) {
    return {
      start,
      goal,
      obstacles,
      clearanceRadius,
      maxIterations: Math.max(500, options.maxIterations ?? 12000),
      grid,
      walkable,
      open: [],
      closed: new Set<string>(),
      cameFrom: new Map<string, string>(),
      gScore: new Map<string, number>(),
      fScore: new Map<string, number>(),
      startCell: startCell ?? { cx: 0, cz: 0 },
      goalCell: goalCell ?? { cx: 0, cz: 0 },
      iterations: 0,
      status: "failed",
      solutionPath: [start, goal],
    };
  }

  const startKey = cellKey(startCell);
  return {
    start,
    goal,
    obstacles,
    clearanceRadius,
    maxIterations: Math.max(500, options.maxIterations ?? 12000),
    grid,
    walkable,
    open: [startCell],
    closed: new Set<string>(),
    cameFrom: new Map<string, string>(),
    gScore: new Map<string, number>([[startKey, 0]]),
    fScore: new Map<string, number>([[startKey, heuristic(startCell, goalCell)]]),
    startCell,
    goalCell,
    iterations: 0,
    status: "searching",
  };
}

export function updateIncrementalAStarGoal(planner: IncrementalAStarPlanner, goal: Point2): void {
  planner.goal = goal;
  const nextGoalCell = nearestWalkableCell(toCell(goal, planner.grid), planner.grid, planner.walkable);
  if (!nextGoalCell) {
    planner.status = "failed";
    planner.solutionPath = [planner.start, goal];
    return;
  }
  planner.goalCell = nextGoalCell;
  if (planner.status === "searching") {
    refreshOpenFScoreForGoal(planner);
  } else if (planner.status === "found" && planner.solutionPath) {
    // Keep old route alive while the caller schedules a new search.
    planner.solutionPath = [...planner.solutionPath.slice(0, -1), goal];
  }
}

export function stepIncrementalAStarPlanner(
  planner: IncrementalAStarPlanner,
  iterationBudget: number
): IncrementalAStarResult {
  if (planner.status !== "searching") {
    return { status: planner.status, path: planner.solutionPath, iterations: planner.iterations };
  }

  const dirs = [
    { cx: 1, cz: 0 },
    { cx: -1, cz: 0 },
    { cx: 0, cz: 1 },
    { cx: 0, cz: -1 },
    { cx: 1, cz: 1 },
    { cx: 1, cz: -1 },
    { cx: -1, cz: 1 },
    { cx: -1, cz: -1 },
  ];
  const stepLimit = Math.max(1, Math.floor(iterationBudget));
  let steps = 0;
  while (planner.open.length > 0 && steps < stepLimit && planner.iterations < planner.maxIterations) {
    steps += 1;
    planner.iterations += 1;
    let bestIndex = 0;
    let bestF = planner.fScore.get(cellKey(planner.open[0])) ?? Number.POSITIVE_INFINITY;
    for (let i = 1; i < planner.open.length; i += 1) {
      const f = planner.fScore.get(cellKey(planner.open[i])) ?? Number.POSITIVE_INFINITY;
      if (f < bestF) {
        bestF = f;
        bestIndex = i;
      }
    }

    const current = planner.open.splice(bestIndex, 1)[0];
    planner.closed.add(cellKey(current));
    if (current.cx === planner.goalCell.cx && current.cz === planner.goalCell.cz) {
      planner.solutionPath = buildSolutionPath(planner, current);
      planner.status = "found";
      return { status: planner.status, path: planner.solutionPath, iterations: planner.iterations };
    }

    for (const d of dirs) {
      const next: Cell = { cx: current.cx + d.cx, cz: current.cz + d.cz };
      if (!inBounds(next, planner.grid) || !isWalkable(next, planner.walkable)) continue;
      const nk = cellKey(next);
      if (planner.closed.has(nk)) continue;

      if (d.cx !== 0 && d.cz !== 0) {
        const sideA: Cell = { cx: current.cx + d.cx, cz: current.cz };
        const sideB: Cell = { cx: current.cx, cz: current.cz + d.cz };
        if (!isWalkable(sideA, planner.walkable) || !isWalkable(sideB, planner.walkable)) {
          continue;
        }
      }

      const ck = cellKey(current);
      const stepCost = d.cx !== 0 && d.cz !== 0 ? 1.414 : 1;
      const tentative = (planner.gScore.get(ck) ?? Number.POSITIVE_INFINITY) + stepCost;
      if (tentative < (planner.gScore.get(nk) ?? Number.POSITIVE_INFINITY)) {
        planner.cameFrom.set(nk, ck);
        planner.gScore.set(nk, tentative);
        planner.fScore.set(nk, tentative + heuristic(next, planner.goalCell));
        if (!planner.open.some((c) => c.cx === next.cx && c.cz === next.cz)) {
          planner.open.push(next);
        }
      }
    }
  }

  if (planner.open.length === 0 || planner.iterations >= planner.maxIterations) {
    planner.status = "failed";
    planner.solutionPath = [planner.start, planner.goal];
    return { status: "failed", path: planner.solutionPath, iterations: planner.iterations };
  }
  return { status: "searching", iterations: planner.iterations };
}

export function findAStarPath(
  start: Point2,
  goal: Point2,
  width: number,
  depth: number,
  cellSize: number,
  obstacles: NavObstacle[],
  options: AStarOptions = {}
): Point2[] {
  const planner = createIncrementalAStarPlanner(start, goal, width, depth, cellSize, obstacles, options);
  let result: IncrementalAStarResult = { status: planner.status, path: planner.solutionPath, iterations: planner.iterations };
  let guard = 0;
  while (result.status === "searching" && guard < 1000) {
    guard += 1;
    result = stepIncrementalAStarPlanner(planner, 300);
  }
  return result.path ?? [start, goal];
}
