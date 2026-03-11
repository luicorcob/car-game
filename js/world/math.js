import * as THREE from "three";
import { DIRS, DIR_TO_HEADING } from "./constants.js";

export function dirIndex(dir) {
  return DIRS.indexOf(dir);
}

export function rotateDir(dir, turn) {
  const idx = dirIndex(dir);
  return DIRS[(idx + turn + 4) % 4];
}

export function dirVector(dir) {
  switch (dir) {
    case "N":
      return new THREE.Vector2(0, -1);
    case "E":
      return new THREE.Vector2(1, 0);
    case "S":
      return new THREE.Vector2(0, 1);
    case "W":
      return new THREE.Vector2(-1, 0);
    default:
      return new THREE.Vector2(0, -1);
  }
}

export function rightVectorFromDir(dir) {
  const h = DIR_TO_HEADING[dir];
  return new THREE.Vector2(Math.cos(h), Math.sin(h));
}

export function vec2(x, z) {
  return new THREE.Vector2(x, z);
}

export function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

export function makeRng(seed) {
  let s = seed;
  return () => {
    const x = Math.sin(s++) * 10000;
    return x - Math.floor(x);
  };
}