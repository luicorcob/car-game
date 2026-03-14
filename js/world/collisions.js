import { CONFIG } from "../config.js";

const EPSILON = 0.0001;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function resolveAgainstCircle(pos, radius, collider) {
  const dx = pos.x - collider.x;
  const dz = pos.z - collider.z;
  const combined = radius + collider.radius;

  const distSq = dx * dx + dz * dz;
  if (distSq >= combined * combined) return;

  let dist = Math.sqrt(distSq);

  if (dist < EPSILON) {
    dist = EPSILON;
    pos.x += combined;
    return;
  }

  const push = combined - dist;
  pos.x += (dx / dist) * push;
  pos.z += (dz / dist) * push;
}

function resolveAgainstBox(pos, radius, collider) {
  const halfW = collider.width * 0.5 + radius;
  const halfD = collider.depth * 0.5 + radius;

  const dx = pos.x - collider.x;
  const dz = pos.z - collider.z;

  if (Math.abs(dx) >= halfW || Math.abs(dz) >= halfD) return;

  const overlapX = halfW - Math.abs(dx);
  const overlapZ = halfD - Math.abs(dz);

  if (overlapX < overlapZ) {
    pos.x += dx >= 0 ? overlapX : -overlapX;
  } else {
    pos.z += dz >= 0 ? overlapZ : -overlapZ;
  }
}

export function createWorldCollisionSystem() {
  const colliders = [];
  const worldHalfExtent = CONFIG.world.grassSize * 0.5 - 8;

  function registerCircleCollider(x, z, radius, meta = {}) {
    colliders.push({
      type: "circle",
      x,
      z,
      radius,
      ...meta
    });
  }

  function registerBoxCollider(x, z, width, depth, meta = {}) {
    colliders.push({
      type: "box",
      x,
      z,
      width,
      depth,
      ...meta
    });
  }

  function resolveColliders(pos, radius, allColliders) {
    for (let iteration = 0; iteration < 3; iteration++) {
      for (const collider of allColliders) {
        if (collider.type === "circle") {
          resolveAgainstCircle(pos, radius, collider);
        } else if (collider.type === "box") {
          resolveAgainstBox(pos, radius, collider);
        }
      }
    }

    pos.x = clamp(pos.x, -worldHalfExtent, worldHalfExtent);
    pos.z = clamp(pos.z, -worldHalfExtent, worldHalfExtent);
  }

  function resolveMotion(origin, radius, targetX, targetZ, extraColliders = []) {
    const allColliders = extraColliders.length
      ? colliders.concat(extraColliders)
      : colliders;

    const pos = { x: targetX, z: origin.z };
    resolveColliders(pos, radius, allColliders);

    pos.z = targetZ;
    resolveColliders(pos, radius, allColliders);

    resolveColliders(pos, radius, allColliders);
    return pos;
  }

  return {
    registerCircleCollider,
    registerBoxCollider,
    resolveMotion
  };
}