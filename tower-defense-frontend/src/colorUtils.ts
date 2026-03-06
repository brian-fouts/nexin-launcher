import * as THREE from "three";

export function colorFromHslDegrees(hueDegrees: number, saturationPercent: number, lightnessPercent: number): THREE.Color {
  const hue = ((hueDegrees % 360) + 360) % 360;
  const saturation = Math.max(0, Math.min(100, saturationPercent)) / 100;
  const lightness = Math.max(0, Math.min(100, lightnessPercent)) / 100;
  return new THREE.Color().setHSL(hue / 360, saturation, lightness);
}
