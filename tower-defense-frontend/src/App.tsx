import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  countTreeClusters,
  getTreeTilt,
  mapMeetsTreeRequirement,
  type MapDefinition,
  type TreeDefinition,
} from "./mapUtils";
import { stepToward } from "./movement";
import { generateGroundLayout, seedFromMap } from "./groundGeneration";
import {
  TOWER_DEFINITIONS,
  TOWER_ORDER,
  getEmblazeDurationOnFireHit,
  isFlamethrowerActive,
  type TowerType,
} from "./towerTypes";
import { appendTower, buildPlacedTower } from "./towerPlacement";
import { getTowerVisualScale, getWorldScale } from "./scaling";
import {
  buildEnemySpawns,
  getEnemyHatProfile,
  getHatScaleForHealth,
  getTowerRange,
  shouldRespawnEnemy,
  type HatVariant,
} from "./enemyRuntime";
import { buildBloodMistSpecs } from "./bloodEffects";
import { colorFromHslDegrees } from "./colorUtils";
import { worldToBloodPixel } from "./bloodTexture";

type Tower = {
  id: string;
  towerType: TowerType | string;
  x: number;
  z: number;
};

type Enemy = {
  id: string;
  progress: number;
};

type GameState = {
  wave: number;
  gold: number;
  lives: number;
  towers: Tower[];
  enemies: Enemy[];
  map: MapDefinition;
};

const DEFAULT_MAP: MapDefinition = {
  width: 120,
  depth: 80,
  groundColor: "#4f8a3f",
  trees: [],
};

const INITIAL_STATE: GameState = {
  wave: 1,
  gold: 300,
  lives: 20,
  towers: [],
  enemies: [],
  map: DEFAULT_MAP,
};

type WorldMenuState = {
  open: boolean;
  x: number;
  y: number;
};

type EnemyRuntime = {
  id: string;
  mesh: THREE.Group;
  hat: THREE.Group;
  baseHatScale: number;
  spawn: { x: number; z: number };
  health: number;
  maxHealth: number;
  dead: boolean;
  slowUntil: number;
  dotUntil: number;
  dotDps: number;
  oilSaturated: boolean;
  emblazeUntil: number;
  emblazeDps: number;
  respawnAt: number | null;
  nextHitByTower: Record<string, number>;
};

type ParticleRuntime = {
  mesh: THREE.Object3D;
  velocity: THREE.Vector3;
  life: number;
  gravity?: number;
  drag?: number;
  settleToStain?: boolean;
  stainRadius?: number;
};

const PARTICLE_SIZE_MULTIPLIER = 5;
const HAT_SIZE_MULTIPLIER = 5 / 3;
const MAX_ACTIVE_PARTICLES = 900;

type GroundBloodSurface = {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  worldWidth: number;
  worldDepth: number;
};

function makeTree(tree: TreeDefinition): THREE.Group {
  const group = new THREE.Group();
  group.position.set(tree.x, 0, tree.z);

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.52, tree.trunkHeight * 1.65, 10),
    new THREE.MeshStandardMaterial({ color: "#6b4423" })
  );
  const trunkHeight = tree.trunkHeight * 1.65;
  trunk.position.y = trunkHeight / 2;
  trunk.castShadow = true;
  group.add(trunk);

  const crownMaterial = new THREE.MeshStandardMaterial({ color: "#2f8d3b" });
  const crownLower = new THREE.Mesh(
    new THREE.ConeGeometry(tree.crownRadius * 0.9, tree.crownRadius * 1.25, 12),
    crownMaterial
  );
  crownLower.position.y = trunkHeight + tree.crownRadius * 0.55;
  crownLower.castShadow = true;
  group.add(crownLower);

  const crownUpper = new THREE.Mesh(
    new THREE.ConeGeometry(tree.crownRadius * 0.68, tree.crownRadius * 1.15, 12),
    crownMaterial
  );
  crownUpper.position.y = trunkHeight + tree.crownRadius * 1.22;
  crownUpper.castShadow = true;
  group.add(crownUpper);

  const tilt = getTreeTilt(tree);
  group.rotation.x = tilt.x;
  group.rotation.z = tilt.z;
  group.scale.setScalar(getWorldScale());

  return group;
}

function makeCharacter(): THREE.Group {
  const character = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(4.5, 10.5, 4, 8),
    new THREE.MeshStandardMaterial({ color: "#2563eb", emissive: "#0f2a6a", emissiveIntensity: 0.3 })
  );
  body.position.y = 9.5;
  body.castShadow = true;
  character.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(2.75, 14, 12),
    new THREE.MeshStandardMaterial({ color: "#f8c9a1" })
  );
  head.position.y = 18;
  head.castShadow = true;
  character.add(head);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(6.5, 8.2, 40),
    new THREE.MeshStandardMaterial({ color: "#ef4444", side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  ring.receiveShadow = true;
  character.add(ring);

  character.position.set(0, 0, 0);
  character.scale.setScalar(getWorldScale());
  return character;
}

function makeDumbHat(variant: HatVariant, dumbness: number, enemyIndex: number): THREE.Group {
  const hat = new THREE.Group();
  const hue = (enemyIndex * 37) % 360;
  const accent = colorFromHslDegrees(hue, 85, 60);
  const accentAlt = colorFromHslDegrees((hue + 120) % 360, 80, 58);

  if (variant === "tiny-cap") {
    const cap = new THREE.Mesh(
      new THREE.ConeGeometry(1.2, 1.6, 14),
      new THREE.MeshStandardMaterial({ color: accent })
    );
    cap.position.y = 0.5;
    cap.rotation.z = -0.5;
    hat.add(cap);
    return hat;
  }

  if (variant === "cone-party") {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(1.4, 3.6, 12),
      new THREE.MeshStandardMaterial({ color: accent })
    );
    cone.position.y = 1.4;
    cone.rotation.z = 0.35;
    const pom = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 10, 8),
      new THREE.MeshStandardMaterial({ color: accentAlt })
    );
    pom.position.y = 3.2;
    hat.add(cone, pom);
    return hat;
  }

  if (variant === "propeller") {
    const beanie = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: accent })
    );
    beanie.rotation.x = Math.PI;
    beanie.position.y = 0.2;
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 0.9, 8),
      new THREE.MeshStandardMaterial({ color: "#94a3b8" })
    );
    stem.position.y = 1.1;
    const bladeA = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.08, 0.25),
      new THREE.MeshStandardMaterial({ color: accentAlt })
    );
    bladeA.position.y = 1.55;
    bladeA.rotation.y = 0.35;
    const bladeB = bladeA.clone();
    bladeB.rotation.y += Math.PI / 2;
    (bladeB.material as THREE.MeshStandardMaterial).color = accent;
    hat.add(beanie, stem, bladeA, bladeB);
    return hat;
  }

  if (variant === "bucket") {
    const bucket = new THREE.Mesh(
      new THREE.CylinderGeometry(1.55, 1.2, 2.1, 16, 1, true),
      new THREE.MeshStandardMaterial({ color: accent.clone().lerp(new THREE.Color("#ffffff"), 0.35), side: THREE.DoubleSide })
    );
    bucket.position.y = 0.9;
    bucket.rotation.z = 0.22;
    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(1.1, 0.08, 8, 20, Math.PI),
      new THREE.MeshStandardMaterial({ color: "#cbd5e1" })
    );
    handle.rotation.x = Math.PI / 2;
    handle.position.y = 2;
    hat.add(bucket, handle);
    return hat;
  }

  // satellite-dish (dumbest)
  const dish = new THREE.Mesh(
    new THREE.ConeGeometry(2 + dumbness * 0.15, 1.6, 22, 1, true),
    new THREE.MeshStandardMaterial({ color: accent.clone().lerp(new THREE.Color("#e2e8f0"), 0.5), side: THREE.DoubleSide })
  );
  dish.rotation.x = -Math.PI / 2;
  dish.position.y = 1.1;
  const antenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 2, 10),
    new THREE.MeshStandardMaterial({ color: "#64748b" })
  );
  antenna.position.set(0.2, 0.7, -0.4);
  antenna.rotation.x = 0.4;
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 10, 8),
    new THREE.MeshStandardMaterial({ color: accentAlt })
  );
  ball.position.set(0.45, 1.55, -0.95);
  hat.add(dish, antenna, ball);
  return hat;
}

function makeEnemyCharacter(hatVariant: HatVariant, dumbness: number, enemyIndex: number): {
  enemy: THREE.Group;
  hat: THREE.Group;
} {
  const enemy = new THREE.Group();
  const bodyHue = (enemyIndex * 47) % 360;
  const bodyColor = colorFromHslDegrees(bodyHue, 70, 52);
  const bodyDark = bodyColor.clone().offsetHSL(0, -0.1, -0.2);

  let body: THREE.Mesh;
  const kind = enemyIndex % 5;
  if (kind === 0) {
    body = new THREE.Mesh(
      new THREE.CapsuleGeometry(4.4, 10.2, 4, 8),
      new THREE.MeshStandardMaterial({ color: bodyColor, emissive: bodyDark, emissiveIntensity: 0.35 })
    );
    body.position.y = 9.3;
  } else if (kind === 1) {
    body = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 4.6, 13.5, 14),
      new THREE.MeshStandardMaterial({ color: bodyColor, emissive: bodyDark, emissiveIntensity: 0.3 })
    );
    body.position.y = 8.2;
  } else if (kind === 2) {
    body = new THREE.Mesh(
      new THREE.SphereGeometry(4.8, 16, 12),
      new THREE.MeshStandardMaterial({ color: bodyColor, emissive: bodyDark, emissiveIntensity: 0.28 })
    );
    body.scale.y = 1.6;
    body.position.y = 9.2;
  } else if (kind === 3) {
    body = new THREE.Mesh(
      new THREE.ConeGeometry(4.6, 13.2, 14),
      new THREE.MeshStandardMaterial({ color: bodyColor, emissive: bodyDark, emissiveIntensity: 0.3 })
    );
    body.position.y = 7.2;
    body.rotation.z = 0.08;
  } else {
    body = new THREE.Mesh(
      new THREE.TorusKnotGeometry(3.2, 1.25, 96, 12, 2, 3),
      new THREE.MeshStandardMaterial({ color: bodyColor, emissive: bodyDark, emissiveIntensity: 0.35 })
    );
    body.position.y = 8.8;
    body.rotation.x = Math.PI / 2;
  }
  body.castShadow = true;
  enemy.add(body);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(2.7, 14, 12),
    new THREE.MeshStandardMaterial({
      color: bodyColor.clone().lerp(new THREE.Color("#f8c9a1"), 0.45),
      emissive: bodyDark,
      emissiveIntensity: 0.2,
    })
  );
  head.position.y = 17.5;
  head.castShadow = true;
  enemy.add(head);

  // Angry face
  const eyeL = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 10, 8),
    new THREE.MeshStandardMaterial({ color: "#111827", emissive: "#450a0a", emissiveIntensity: 0.3 })
  );
  eyeL.position.set(-0.6, 17.8, 2.1);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.6;
  const browL = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.12, 0.1),
    new THREE.MeshStandardMaterial({ color: "#1f2937" })
  );
  browL.position.set(-0.65, 18.35, 2.15);
  browL.rotation.z = -0.45;
  const browR = browL.clone();
  browR.position.x = 0.65;
  browR.rotation.z = 0.45;
  const mouth = new THREE.Mesh(
    new THREE.TorusGeometry(0.46, 0.06, 8, 16, Math.PI),
    new THREE.MeshStandardMaterial({ color: "#7f1d1d" })
  );
  mouth.position.set(0, 17.2, 2.2);
  mouth.rotation.z = Math.PI;
  enemy.add(eyeL, eyeR, browL, browR, mouth);

  const hat = makeDumbHat(hatVariant, dumbness, enemyIndex);
  hat.position.y = 19.4;
  const baseHatScale = (2.1 + dumbness * 0.33 + (enemyIndex % 3) * 0.17) * HAT_SIZE_MULTIPLIER;
  hat.scale.setScalar(baseHatScale);
  enemy.add(hat);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(6.3, 7.9, 40),
    new THREE.MeshStandardMaterial({ color: "#a855f7", side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  ring.receiveShadow = true;
  enemy.add(ring);

  enemy.position.set(0, 0, 0);
  enemy.scale.setScalar(getWorldScale());
  return { enemy, hat };
}

function makeTowerModel(towerType: TowerType | string): THREE.Group {
  const finishTower = (model: THREE.Group) => {
    model.scale.setScalar(getTowerVisualScale());
    return model;
  };

  const group = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.4, 1.9, 1.2, 12),
    new THREE.MeshStandardMaterial({ color: "#475569" })
  );
  base.position.y = 0.6;
  base.castShadow = true;
  group.add(base);

  if (towerType === "machine_gun") {
    const top = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.2, 1.4),
      new THREE.MeshStandardMaterial({ color: "#334155" })
    );
    top.position.y = 1.8;
    const barrelA = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.16, 3.4, 8),
      new THREE.MeshStandardMaterial({ color: "#cbd5e1" })
    );
    barrelA.rotation.x = Math.PI / 2;
    barrelA.position.set(-0.4, 1.9, 2);
    const barrelB = barrelA.clone();
    barrelB.position.x = 0.4;
    group.add(top, barrelA, barrelB);
    return finishTower(group);
  }

  if (towerType === "flamethrower") {
    const top = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 1.1, 1.3, 10),
      new THREE.MeshStandardMaterial({ color: "#7c2d12" })
    );
    top.position.y = 1.8;
    const nozzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.33, 2.1, 10),
      new THREE.MeshStandardMaterial({ color: "#f97316" })
    );
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.set(0, 2, 1.8);
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(1.2, 3.2, 18),
      new THREE.MeshStandardMaterial({
        color: "#fb923c",
        emissive: "#ea580c",
        emissiveIntensity: 0.45,
        transparent: true,
        opacity: 0.5,
      })
    );
    cone.rotation.x = Math.PI / 2;
    cone.position.set(0, 2, 3.8);
    cone.userData = { effectMesh: true };
    group.add(top, nozzle, cone);
    return finishTower(group);
  }

  if (towerType === "cannon") {
    const top = new THREE.Mesh(
      new THREE.SphereGeometry(0.95, 12, 10),
      new THREE.MeshStandardMaterial({ color: "#1f2937" })
    );
    top.position.y = 2;
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.46, 2.6, 10),
      new THREE.MeshStandardMaterial({ color: "#111827" })
    );
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 2, 1.9);
    group.add(top, barrel);
    return finishTower(group);
  }

  if (towerType === "laser") {
    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.15, 0),
      new THREE.MeshStandardMaterial({ color: "#38bdf8", emissive: "#0ea5e9", emissiveIntensity: 0.7 })
    );
    crystal.position.y = 2.2;
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.05, 0.18, 8, 22),
      new THREE.MeshStandardMaterial({ color: "#7dd3fc" })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 1.4;
    group.add(crystal, ring);
    return finishTower(group);
  }

  if (towerType === "rocket") {
    const silo = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 1, 2.4, 10),
      new THREE.MeshStandardMaterial({ color: "#334155" })
    );
    silo.position.y = 1.8;
    const rocket = new THREE.Mesh(
      new THREE.ConeGeometry(0.45, 1.6, 10),
      new THREE.MeshStandardMaterial({ color: "#ef4444" })
    );
    rocket.position.y = 3.4;
    group.add(silo, rocket);
    return finishTower(group);
  }

  if (towerType === "slime") {
    const vat = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1.1, 1.8, 16),
      new THREE.MeshStandardMaterial({ color: "#1e293b" })
    );
    vat.position.y = 1.5;
    const goo = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 12, 10),
      new THREE.MeshStandardMaterial({ color: "#84cc16", emissive: "#65a30d", emissiveIntensity: 0.4 })
    );
    goo.position.y = 2.2;
    group.add(vat, goo);
    return finishTower(group);
  }

  if (towerType === "oil") {
    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.25, 2.1, 14),
      new THREE.MeshStandardMaterial({ color: "#111827" })
    );
    tank.position.y = 1.6;
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.45, 0.45, 12),
      new THREE.MeshStandardMaterial({ color: "#9ca3af" })
    );
    cap.position.y = 2.9;
    const puddle = new THREE.Mesh(
      new THREE.CircleGeometry(5.4, 28),
      new THREE.MeshStandardMaterial({
        color: "#0b1220",
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
      })
    );
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.y = 0.025;
    puddle.userData = { effectMesh: true };
    group.add(tank, cap, puddle);
    return finishTower(group);
  }

  const fallback = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.4, 2.6, 10),
    new THREE.MeshStandardMaterial({ color: "#22c55e" })
  );
  fallback.position.y = 1.4;
  group.add(fallback);
  return finishTower(group);
}

function disposeGroup(group: THREE.Group) {
  for (const child of group.children) {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((material) => material.dispose());
      } else {
        mesh.material.dispose();
      }
    }
  }
  group.clear();
}

function makeGrassTexture(
  baseColor: string,
  seed: number
): { texture: THREE.CanvasTexture; canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Unable to create 2D canvas context for ground texture.");
  }

  const rng = (() => {
    let t = seed >>> 0;
    return () => {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  })();

  const base = new THREE.Color(baseColor);
  const light = base.clone().lerp(new THREE.Color("#9bd37a"), 0.22);
  const dark = base.clone().lerp(new THREE.Color("#2f5a25"), 0.35);

  ctx.fillStyle = `#${base.getHexString()}`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 14000; i += 1) {
    const x = rng() * canvas.width;
    const y = rng() * canvas.height;
    const blend = rng();
    const shade = dark.clone().lerp(light, blend);
    ctx.fillStyle = `rgba(${Math.round(shade.r * 255)}, ${Math.round(shade.g * 255)}, ${Math.round(
      shade.b * 255
    )}, ${0.18 + rng() * 0.28})`;
    const size = 0.6 + rng() * 2.8;
    ctx.fillRect(x, y, size, size);
  }

  // Short blade strokes to break up large smooth regions.
  for (let i = 0; i < 5200; i += 1) {
    const x = rng() * canvas.width;
    const y = rng() * canvas.height;
    const len = 3 + rng() * 9;
    const angle = -Math.PI / 2 + (rng() - 0.5) * 1.2;
    const shade = dark.clone().lerp(light, 0.25 + rng() * 0.75);
    ctx.strokeStyle = `rgba(${Math.round(shade.r * 255)}, ${Math.round(shade.g * 255)}, ${Math.round(
      shade.b * 255
    )}, ${0.22 + rng() * 0.22})`;
    ctx.lineWidth = 0.7 + rng() * 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return { texture, canvas, ctx };
}

function disposeRenderable(object: THREE.Object3D): void {
  const mesh = object as THREE.Mesh;
  if (mesh.geometry) mesh.geometry.dispose();
  if (mesh.material) {
    if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose());
    else mesh.material.dispose();
  }
}

function stampBloodOnGround(surface: GroundBloodSurface | null, worldX: number, worldZ: number, radiusWorld: number): void {
  if (!surface) return;
  const { canvas, ctx, texture, worldWidth, worldDepth } = surface;
  const p = worldToBloodPixel(worldX, worldZ, worldWidth, worldDepth, canvas.width, canvas.height);
  const radiusPx = Math.max(3, Math.round((radiusWorld / worldWidth) * canvas.width));
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  for (let i = 0; i < 3; i += 1) {
    const jitterX = (Math.random() - 0.5) * radiusPx * 1.5;
    const jitterY = (Math.random() - 0.5) * radiusPx * 1.5;
    const r = radiusPx * (0.55 + Math.random() * 0.75);
    ctx.fillStyle = `rgba(120, 18, 18, ${0.28 + Math.random() * 0.32})`;
    ctx.beginPath();
    ctx.arc(p.x + jitterX, p.y + jitterY, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  texture.needsUpdate = true;
}

function pushParticle(
  particles: ParticleRuntime[],
  particleGroup: THREE.Group,
  particle: ParticleRuntime
): void {
  if (particles.length >= MAX_ACTIVE_PARTICLES) {
    const oldest = particles.shift();
    if (oldest) {
      particleGroup.remove(oldest.mesh);
      disposeRenderable(oldest.mesh);
    }
  }
  particles.push(particle);
}

function App() {
  const [status, setStatus] = useState("Disconnected");
  const [gameState, setGameState] = useState<GameState>(INITIAL_STATE);
  const [isConnected, setIsConnected] = useState(false);
  const [worldMenu, setWorldMenu] = useState<WorldMenuState>({ open: false, x: 0, y: 0 });
  const [pendingTowerType, setPendingTowerType] = useState<TowerType | null>(null);
  const [enemiesAlive, setEnemiesAlive] = useState(0);

  const socketRef = useRef<WebSocket | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const groundRef = useRef<THREE.Mesh | null>(null);
  const mapGroupRef = useRef<THREE.Group | null>(null);
  const towerGroupRef = useRef<THREE.Group | null>(null);
  const enemyGroupRef = useRef<THREE.Group | null>(null);
  const particleGroupRef = useRef<THREE.Group | null>(null);
  const bloodSurfaceRef = useRef<GroundBloodSurface | null>(null);
  const playerRef = useRef<THREE.Group | null>(null);
  const playerTargetRef = useRef<THREE.Vector3 | null>(null);
  const worldMenuRef = useRef(worldMenu);
  const pendingTowerRef = useRef<TowerType | null>(pendingTowerType);
  const isConnectedRef = useRef(isConnected);
  const enemiesRef = useRef<EnemyRuntime[]>([]);
  const particlesRef = useRef<ParticleRuntime[]>([]);
  const towerNextFireRef = useRef<Record<string, number>>({});
  const towerMeshesRef = useRef<Record<string, THREE.Group>>({});
  const towersRef = useRef(gameState.towers);

  const wsUrl = useMemo(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}/ws/tower-defense/?room=dev`;
  }, []);

  useEffect(() => {
    let disposed = false;
    fetch("/api/config/")
      .then((res) => res.json())
      .then((config) => {
        if (disposed) return;
        const serverMap = (config?.map as MapDefinition | undefined) ?? DEFAULT_MAP;
        setGameState((prev) => ({
          ...prev,
          map: serverMap,
          gold: config?.player?.startingGold ?? prev.gold,
          lives: config?.player?.startingLives ?? prev.lives,
          wave: config?.waves?.startingWave ?? prev.wave,
        }));
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
    };
  }, []);

  useEffect(() => {
    worldMenuRef.current = worldMenu;
  }, [worldMenu]);

  useEffect(() => {
    pendingTowerRef.current = pendingTowerType;
  }, [pendingTowerType]);

  useEffect(() => {
    isConnectedRef.current = isConnected;
  }, [isConnected]);

  useEffect(() => {
    towersRef.current = gameState.towers;
  }, [gameState.towers]);

  useEffect(() => {
    if (!worldMenu.open) return;
    const closeOnRightClick = (event: MouseEvent) => {
      event.preventDefault();
      setWorldMenu({ open: false, x: 0, y: 0 });
      setPendingTowerType(null);
    };
    window.addEventListener("contextmenu", closeOnRightClick);
    return () => window.removeEventListener("contextmenu", closeOnRightClick);
  }, [worldMenu.open]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(DEFAULT_MAP.groundColor);
    scene.fog = new THREE.Fog(DEFAULT_MAP.groundColor, 220, 520);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(52, mount.clientWidth / mount.clientHeight, 0.1, 500);
    camera.position.set(0, 140, 0);
    camera.up.set(0, 0, -1);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight("#f4f5ff", 0.8);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight("#ffffff", 1.1);
    sun.position.set(36, 85, 22);
    sun.castShadow = true;
    scene.add(sun);

    const mapGroup = new THREE.Group();
    const towerGroup = new THREE.Group();
    const enemyGroup = new THREE.Group();
    const particleGroup = new THREE.Group();
    const player = makeCharacter();
    mapGroupRef.current = mapGroup;
    towerGroupRef.current = towerGroup;
    enemyGroupRef.current = enemyGroup;
    particleGroupRef.current = particleGroup;
    playerRef.current = player;
    scene.add(mapGroup, towerGroup, enemyGroup, particleGroup, player);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const clock = new THREE.Clock();

    const onPointerDown = (event: PointerEvent) => {
      if (!cameraRef.current || !groundRef.current) return;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, cameraRef.current);
      const hit = raycaster.intersectObject(groundRef.current)[0];
      if (!hit) return;
      const x = Number(hit.point.x.toFixed(2));
      const z = Number(hit.point.z.toFixed(2));

      if (event.button === 2) {
        event.preventDefault();
        if (worldMenuRef.current.open || pendingTowerRef.current) {
          setWorldMenu({ open: false, x: 0, y: 0 });
          setPendingTowerType(null);
          return;
        }
        playerTargetRef.current = new THREE.Vector3(x, 0, z);
        return;
      }

      if (event.button !== 0) return;
      const pending = pendingTowerRef.current;
      if (!pending) {
        setWorldMenu({ open: true, x: event.clientX, y: event.clientY });
        return;
      }
      setWorldMenu({ open: false, x: 0, y: 0 });
      setPendingTowerType(null);
      setGameState((prev) => ({
        ...prev,
        towers: appendTower(prev.towers, buildPlacedTower(pending, x, z)),
      }));

      if (!isConnectedRef.current) return;
      const ws = socketRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      ws.send(JSON.stringify({ type: "place_tower", towerType: pending, x, z }));
    };
    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
    };
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("contextmenu", onContextMenu);

    const onResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      rendererRef.current.setSize(width, height);
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    let animationFrame = 0;
    const animate = () => {
      animationFrame = window.requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.elapsedTime;
      const playerMesh = playerRef.current;
      const target = playerTargetRef.current;
      if (playerMesh && target) {
        const result = stepToward(
          { x: playerMesh.position.x, z: playerMesh.position.z },
          { x: target.x, z: target.z },
          20,
          delta
        );
        playerMesh.position.set(result.x, 0, result.z);
        if (result.reached) {
          playerTargetRef.current = null;
        }
      }

      const enemies = enemiesRef.current;
      if (playerMesh) {
        for (const enemy of enemies) {
          if (enemy.dead) {
            if (shouldRespawnEnemy(enemy.dead, enemy.respawnAt, elapsed)) {
              enemy.dead = false;
              enemy.respawnAt = null;
              enemy.health = enemy.maxHealth;
              enemy.slowUntil = 0;
              enemy.dotUntil = 0;
              enemy.dotDps = 0;
              enemy.oilSaturated = false;
              enemy.emblazeUntil = 0;
              enemy.nextHitByTower = {};
              enemy.mesh.visible = true;
              enemy.mesh.position.set(enemy.spawn.x, 0, enemy.spawn.z);
              enemy.hat.scale.setScalar(enemy.baseHatScale);
            }
            continue;
          }
          if (enemy.health <= 0) {
            enemy.dead = true;
            enemy.respawnAt = elapsed + 0.2;
            enemy.mesh.visible = false;
            const mistSpecs = buildBloodMistSpecs(26);
            for (const spec of mistSpecs) {
              const droplet = new THREE.Mesh(
                new THREE.SphereGeometry(spec.radius * PARTICLE_SIZE_MULTIPLIER, 8, 8),
                new THREE.MeshStandardMaterial({
                  color: "#b91c1c",
                  transparent: true,
                  opacity: 0.56,
                })
              );
              droplet.position.set(enemy.mesh.position.x, 2.2 + Math.random() * 2.4, enemy.mesh.position.z);
              particleGroup.add(droplet);
              pushParticle(particlesRef.current, particleGroup, {
                mesh: droplet,
                velocity: new THREE.Vector3(spec.vx, spec.vy, spec.vz),
                life: 3.8,
                gravity: 24,
                drag: 0.9,
                settleToStain: true,
                stainRadius: 0.7 + Math.random() * 1.4,
              });
            }
            continue;
          }

          for (const tower of towersRef.current) {
            if ((tower.towerType as TowerType) !== "oil") continue;
            const dist = Math.hypot(enemy.mesh.position.x - tower.x, enemy.mesh.position.z - tower.z);
            if (dist <= 6.2) {
              enemy.oilSaturated = true;
              const splashKey = `${tower.id}:oil-splash`;
              const nextSplash = enemy.nextHitByTower[splashKey] ?? 0;
              if (elapsed >= nextSplash) {
                enemy.nextHitByTower[splashKey] = elapsed + 0.18;
                const oilDrop = new THREE.Mesh(
                  new THREE.SphereGeometry(0.18 * PARTICLE_SIZE_MULTIPLIER, 8, 8),
                  new THREE.MeshStandardMaterial({ color: "#111827", transparent: true, opacity: 0.85 })
                );
                oilDrop.position.set(enemy.mesh.position.x, 0.5, enemy.mesh.position.z);
                particleGroup.add(oilDrop);
                const jitter = new THREE.Vector3((Math.random() - 0.5) * 1.4, 1.6, (Math.random() - 0.5) * 1.4);
                pushParticle(particlesRef.current, particleGroup, {
                  mesh: oilDrop,
                  velocity: jitter,
                  life: 0.22,
                });
              }
            }
          }

          const enemySpeed = elapsed < enemy.slowUntil ? 2.6 / 3 : 5.2 / 3;
          const moveStep = stepToward(
            { x: enemy.mesh.position.x, z: enemy.mesh.position.z },
            { x: playerMesh.position.x, z: playerMesh.position.z },
            enemySpeed,
            delta
          );
          enemy.mesh.position.set(moveStep.x, 0, moveStep.z);
          if (elapsed < enemy.dotUntil) {
            enemy.health = Math.max(0, enemy.health - enemy.dotDps * delta);
          }
          if (elapsed < enemy.emblazeUntil) {
            enemy.health = Math.max(0, enemy.health - enemy.emblazeDps * delta);
          }
          enemy.hat.scale.setScalar(getHatScaleForHealth(enemy.health, enemy.maxHealth, enemy.baseHatScale));

          enemy.mesh.traverse((obj) => {
            const mesh = obj as THREE.Mesh;
            if (!mesh.material) return;
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            for (const mat of materials) {
              const std = mat as THREE.MeshStandardMaterial;
              if (!std.emissive) continue;
              if (enemy.emblazeUntil > elapsed) {
                std.emissive.set("#dc2626");
                std.emissiveIntensity = 0.6;
              } else if (enemy.oilSaturated) {
                std.emissive.set("#1f2937");
                std.emissiveIntensity = 0.25;
              } else {
                std.emissiveIntensity = Math.max(0.2, std.emissiveIntensity * 0.75);
              }
            }
          });
        }

        for (const tower of towersRef.current) {
          const type = tower.towerType as TowerType;
          const def = TOWER_DEFINITIONS[type];
          if (!def) continue;

          let nearest: EnemyRuntime | null = null;
          let nearestDist = Number.POSITIVE_INFINITY;
          for (const enemy of enemies) {
            if (enemy.health <= 0 || enemy.dead) continue;
            const dist = Math.hypot(enemy.mesh.position.x - tower.x, enemy.mesh.position.z - tower.z);
            if (dist > getTowerRange(type)) continue;
            if (dist < nearestDist) {
              nearestDist = dist;
              nearest = enemy;
            }
          }
          if (!nearest) continue;

          const towerMesh = towerMeshesRef.current[tower.id];
          if (towerMesh) {
            towerMesh.lookAt(nearest.mesh.position.x, 0, nearest.mesh.position.z);
          }

          const towerNextKey = `${tower.id}:${type}`;
          const nextAt = towerNextFireRef.current[towerNextKey] ?? 0;
          if (type !== "laser" && elapsed < nextAt) continue;
          if (type === "flamethrower" && !isFlamethrowerActive(elapsed)) continue;

          const from = new THREE.Vector3(tower.x, 2.4, tower.z);
          const to = new THREE.Vector3(nearest.mesh.position.x, 3.6, nearest.mesh.position.z);

          if (type === "oil") continue;
          if (type === "laser") {
            nearest.health = Math.max(0, nearest.health - def.damage * delta);
            const dir = to.clone().sub(from);
            const beamLength = dir.length();
            const beam = new THREE.Mesh(
              new THREE.CylinderGeometry(
                0.08 * PARTICLE_SIZE_MULTIPLIER,
                0.08 * PARTICLE_SIZE_MULTIPLIER,
                beamLength,
                8
              ),
              new THREE.MeshBasicMaterial({ color: "#a5f3fc", transparent: true, opacity: 0.95 })
            );
            beam.position.copy(from.clone().add(to).multiplyScalar(0.5));
            beam.quaternion.setFromUnitVectors(
              new THREE.Vector3(0, 1, 0),
              dir.clone().normalize()
            );
            particleGroup.add(beam);
            pushParticle(particlesRef.current, particleGroup, {
              mesh: beam,
              velocity: new THREE.Vector3(),
              life: 0.05,
            });
            continue;
          }

          nearest.health = Math.max(0, nearest.health - def.damage);
          towerNextFireRef.current[towerNextKey] = elapsed + def.fireInterval;
          if (type === "flamethrower") {
            const duration = getEmblazeDurationOnFireHit(nearest.oilSaturated);
            if (duration > 0) {
              nearest.emblazeUntil = Math.max(nearest.emblazeUntil, elapsed + duration);
            }
          }
          if (type === "slime") {
            nearest.slowUntil = elapsed + 5;
            nearest.dotUntil = elapsed + 5;
            nearest.dotDps = 6;
          }

          const projectile = new THREE.Mesh(
            new THREE.SphereGeometry(
              (type === "rocket" ? 0.45 : type === "cannon" ? 0.35 : 0.22) * PARTICLE_SIZE_MULTIPLIER,
              10,
              8
            ),
            new THREE.MeshStandardMaterial({
              color:
                type === "machine_gun"
                  ? "#fde047"
                  : type === "flamethrower"
                    ? "#fb923c"
                    : type === "cannon"
                      ? "#cbd5e1"
                      : type === "rocket"
                        ? "#f97316"
                        : "#84cc16",
              emissive: type === "flamethrower" || type === "rocket" ? "#ea580c" : "#000000",
              emissiveIntensity: type === "flamethrower" || type === "rocket" ? 0.45 : 0,
            })
          );
          projectile.position.copy(from);
          particleGroup.add(projectile);
          const velocity = to.clone().sub(from).normalize().multiplyScalar(120);
          pushParticle(particlesRef.current, particleGroup, {
            mesh: projectile,
            velocity,
            life: 0.25,
          });

          if (type === "cannon" || type === "rocket") {
            const blast = new THREE.Mesh(
              new THREE.RingGeometry(
                (type === "rocket" ? 1.2 : 2.4) * PARTICLE_SIZE_MULTIPLIER,
                (type === "rocket" ? 3.4 : 5.2) * PARTICLE_SIZE_MULTIPLIER,
                30
              ),
              new THREE.MeshBasicMaterial({
                color: type === "rocket" ? "#fb923c" : "#f8fafc",
                transparent: true,
                opacity: 0.85,
                side: THREE.DoubleSide,
              })
            );
            blast.rotation.x = -Math.PI / 2;
            blast.position.set(to.x, 0.05, to.z);
            particleGroup.add(blast);
            pushParticle(particlesRef.current, particleGroup, {
              mesh: blast,
              velocity: new THREE.Vector3(),
              life: 0.14,
            });
          }
        }

        const aliveCount = enemies.filter((enemy) => enemy.health > 0 && !enemy.dead).length;
        setEnemiesAlive(aliveCount);
      }

      for (let i = particlesRef.current.length - 1; i >= 0; i -= 1) {
        const p = particlesRef.current[i];
        p.life -= delta;
        if (p.gravity) {
          p.velocity.y -= p.gravity * delta;
        }
        if (p.drag) {
          const dragFactor = Math.max(0, 1 - p.drag * delta);
          p.velocity.multiplyScalar(dragFactor);
        }
        p.mesh.position.addScaledVector(p.velocity, delta);
        if (p.settleToStain && p.mesh.position.y <= 0.04) {
          stampBloodOnGround(bloodSurfaceRef.current, p.mesh.position.x, p.mesh.position.z, p.stainRadius ?? 1);
          particleGroup.remove(p.mesh);
          disposeRenderable(p.mesh);
          particlesRef.current.splice(i, 1);
          continue;
        }
        if (p.life <= 0) {
          if (p.settleToStain) {
            stampBloodOnGround(bloodSurfaceRef.current, p.mesh.position.x, p.mesh.position.z, p.stainRadius ?? 1);
          }
          particleGroup.remove(p.mesh);
          disposeRenderable(p.mesh);
          particlesRef.current.splice(i, 1);
        }
      }
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("resize", onResize);
      window.cancelAnimationFrame(animationFrame);
      enemiesRef.current = [];
      particlesRef.current = [];
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    const mapGroup = mapGroupRef.current;
    const scene = sceneRef.current;
    if (!mapGroup) return;

    disposeGroup(mapGroup);
    const map = gameState.map ?? DEFAULT_MAP;
    if (scene) {
      scene.background = new THREE.Color(map.groundColor);
      scene.fog = new THREE.Fog(map.groundColor, 220, 520);
    }

    const expandedWidth = Math.max(map.width, 320);
    const expandedDepth = Math.max(map.depth, 320);
    const enemyGroup = enemyGroupRef.current;
    if (enemyGroup) {
      enemyGroup.clear();
      const spawns = buildEnemySpawns(expandedWidth, expandedDepth, 21);
      enemiesRef.current = spawns.map((spawn, index) => {
        const hatProfile = getEnemyHatProfile(index, spawns.length);
        const { enemy: mesh, hat } = makeEnemyCharacter(hatProfile.hat, hatProfile.dumbness, index);
        const baseHatScale = hat.scale.x;
        if (index > 0) {
          mesh.scale.setScalar(getWorldScale() * 0.85);
        }
        mesh.position.set(spawn.x, 0, spawn.z);
        enemyGroup.add(mesh);
        return {
          id: `enemy-${index + 1}`,
          mesh,
          hat,
          baseHatScale,
          spawn,
          health: hatProfile.maxHealth,
          maxHealth: hatProfile.maxHealth,
          dead: false,
          slowUntil: 0,
          dotUntil: 0,
          dotDps: 0,
          oilSaturated: false,
          emblazeUntil: 0,
          emblazeDps: 18,
          respawnAt: null,
          nextHitByTower: {},
        };
      });
    }
    const seed = seedFromMap(map) ^ Math.floor(Date.now() / 1000);
    const grassTexture = makeGrassTexture(map.groundColor, seed);
    bloodSurfaceRef.current = {
      canvas: grassTexture.canvas,
      ctx: grassTexture.ctx,
      texture: grassTexture.texture,
      worldWidth: expandedWidth,
      worldDepth: expandedDepth,
    };

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(expandedWidth, expandedDepth),
      new THREE.MeshStandardMaterial({
        color: map.groundColor,
        map: grassTexture.texture,
        roughness: 0.96,
        metalness: 0,
      })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    mapGroup.add(ground);
    groundRef.current = ground;

    const decor = generateGroundLayout(expandedWidth, expandedDepth, seed ^ 0xabc123);
    const dummy = new THREE.Object3D();

    const stickMesh = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.04, 0.06, 0.95, 6),
      new THREE.MeshStandardMaterial({ color: "#7a5a33", roughness: 0.95, metalness: 0 }),
      decor.sticks.length
    );
    stickMesh.castShadow = true;
    stickMesh.receiveShadow = true;
    decor.sticks.forEach((point, index) => {
      dummy.position.set(point.x, 0.07, point.z);
      dummy.rotation.set(Math.PI / 2, point.yaw, 0);
      dummy.scale.set(point.scale, point.scale, point.scale);
      dummy.updateMatrix();
      stickMesh.setMatrixAt(index, dummy.matrix);
    });
    mapGroup.add(stickMesh);

    const leafMesh = new THREE.InstancedMesh(
      new THREE.CircleGeometry(0.22, 5),
      new THREE.MeshStandardMaterial({
        color: "#87b85c",
        roughness: 1,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
      decor.leaves.length
    );
    leafMesh.castShadow = false;
    leafMesh.receiveShadow = true;
    decor.leaves.forEach((point, index) => {
      dummy.position.set(point.x, 0.015, point.z);
      dummy.rotation.set(-Math.PI / 2, point.yaw, 0);
      dummy.scale.set(point.scale, point.scale * 0.5, point.scale);
      dummy.updateMatrix();
      leafMesh.setMatrixAt(index, dummy.matrix);
    });
    mapGroup.add(leafMesh);

    for (const tree of map.trees) {
      mapGroup.add(makeTree(tree));
    }
  }, [gameState.map]);

  useEffect(() => {
    const towerGroup = towerGroupRef.current;
    if (!towerGroup) return;

    towerGroup.clear();
    towerMeshesRef.current = {};
    for (const tower of gameState.towers) {
      const towerModel = makeTowerModel(tower.towerType);
      towerModel.position.set(tower.x, 0, tower.z);
      towerMeshesRef.current[tower.id] = towerModel;
      const liveEnemies = enemiesRef.current.filter((enemy) => enemy.health > 0 && enemy.respawnAt === null);
      if (liveEnemies.length > 0) {
        const nearest = liveEnemies.reduce((best, enemy) => {
          const bDist = Math.hypot(best.mesh.position.x - tower.x, best.mesh.position.z - tower.z);
          const eDist = Math.hypot(enemy.mesh.position.x - tower.x, enemy.mesh.position.z - tower.z);
          return eDist < bDist ? enemy : best;
        }, liveEnemies[0]);
        towerModel.lookAt(nearest.mesh.position.x, 0, nearest.mesh.position.z);
      }
      towerGroup.add(towerModel);

      const flameEffect = towerModel.children.find((child) => child.userData?.effectMesh);
      if (flameEffect) {
        flameEffect.visible = isFlamethrowerActive(performance.now() / 1000);
      }
    }
  }, [gameState.towers]);

  useEffect(() => {
    return () => {
      socketRef.current?.close();
    };
  }, []);

  const connect = () => {
    socketRef.current?.close();
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;
    setStatus("Connecting...");

    ws.onopen = () => {
      setStatus("Connected");
      setIsConnected(true);
    };
    ws.onclose = () => {
      setStatus("Disconnected");
      setIsConnected(false);
    };
    ws.onerror = () => {
      setStatus("Connection error");
      setIsConnected(false);
    };
    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data) as {
        type?: string;
        state?: GameState;
      };
      if (payload.type === "state" && payload.state) {
        setGameState(payload.state);
      }
    };
  };

  const sendMessage = (payload: unknown) => {
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify(payload));
  };

  return (
    <main className="container">
      <h1>Tower Defense</h1>
      <section className="controls">
        <button onClick={connect}>Connect</button>
        <button disabled={!isConnected} onClick={() => sendMessage({ type: "start_wave" })}>
          Start Wave
        </button>
        <span>{status}</span>
        <span>Pending Tower: {pendingTowerType ? TOWER_DEFINITIONS[pendingTowerType].label : "none"}</span>
      </section>
      <section className="stats">
        <span>Wave: {gameState.wave}</span>
        <span>Gold: {gameState.gold}</span>
        <span>Lives: {gameState.lives}</span>
        <span>Enemies Alive: {enemiesAlive}</span>
        <span>Total Enemies: {enemiesRef.current.length}</span>
        <span>Trees: {gameState.map.trees.length}</span>
        <span>Clusters: {countTreeClusters(gameState.map.trees)}</span>
        <span>Map Ready: {mapMeetsTreeRequirement(gameState.map) ? "yes" : "no"}</span>
      </section>
      <div ref={mountRef} className="world" />
      {worldMenu.open ? (
        <div
          style={{
            position: "fixed",
            left: worldMenu.x,
            top: worldMenu.y,
            background: "rgba(15, 23, 42, 0.96)",
            border: "1px solid #334155",
            borderRadius: 8,
            padding: 10,
            width: 340,
            zIndex: 50,
          }}
        >
          <div style={{ marginBottom: 8, fontWeight: 700 }}>Select Tower</div>
          {TOWER_ORDER.map((towerType) => (
            <button
              key={towerType}
              style={{ display: "block", width: "100%", marginBottom: 6, textAlign: "left" }}
              onClick={() => {
                setPendingTowerType(towerType);
                setWorldMenu({ open: false, x: 0, y: 0 });
              }}
            >
              <strong>{TOWER_DEFINITIONS[towerType].label}</strong>
              <div style={{ fontSize: 12, opacity: 0.85 }}>{TOWER_DEFINITIONS[towerType].description}</div>
            </button>
          ))}
        </div>
      ) : null}
      <p className="hint">
        Left-click opens tower menu, then left-click again to place selected tower. Right-click closes menu or
        moves your character if no menu is open.
      </p>
    </main>
  );
}

export default App;
