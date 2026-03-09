export const GLOBAL_SCALING_FACTOR = 1;
export const TOWER_VISUAL_MULTIPLIER = 2.5;

export function getWorldScale(): number {
  return GLOBAL_SCALING_FACTOR;
}

export function getTowerVisualScale(): number {
  return GLOBAL_SCALING_FACTOR * TOWER_VISUAL_MULTIPLIER;
}
