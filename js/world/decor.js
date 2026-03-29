import * as THREE from "three";
import { CONFIG } from "../config.js";
import { makeRng } from "./math.js";
import {
  createBuilding,
  createParkedCar,
  createPedestrian
} from "./props.js";

export function createWorldDecorController(scene, graph, hooks = {}) {
  const { coords, roadMetas } = graph;

  const treePlacements = [];
  const lampPlacements = [];
  const buildings = [];
  const movingPedestrians = [];
  const staticPedestrians = [];
  const editorPedestrians = [];
  const parkedCars = [];
  const hostilePedestrians = [];
  const pedestrianTargetsCache = [];
  const hostilePedestrianTargetsCache = [];
  const viewForward = new THREE.Vector3();
  const viewForwardXZ = new THREE.Vector2();
  const cachedView = {
    x: 0,
    z: 0,
    fx: 0,
    fz: 0,
    minDot: 0
  };
  const lastStaticCullView = {
    valid: false,
    x: 0,
    z: 0,
    fx: 0,
    fz: 0
  };
  let staticCullAccumulator = Infinity;

  function isHostilePedestrian(rnd) {
    return rnd() < (CONFIG.npc.hostileChance ?? 0.18);
  }

  function applyPedestrianAlertPose(ped, targetX, targetZ, strength = 1) {
    const dx = targetX - ped.group.position.x;
    const dz = targetZ - ped.group.position.z;

    ped.group.rotation.y = Math.atan2(dx, dz);
    ped.armLeft.rotation.x = THREE.MathUtils.lerp(
      ped.armLeft.rotation.x,
      -0.45 * strength,
      0.22
    );
    ped.armRight.rotation.x = THREE.MathUtils.lerp(
      ped.armRight.rotation.x,
      -1.2 * strength,
      0.3
    );
    ped.armRight.rotation.y = THREE.MathUtils.lerp(
      ped.armRight.rotation.y,
      -0.18 * strength,
      0.24
    );
    ped.legLeft.rotation.x *= 1 - 0.14 * strength;
    ped.legRight.rotation.x *= 1 - 0.14 * strength;
  }

  function relaxPedestrianPose(ped, strength = 0.16) {
    ped.armLeft.rotation.x = THREE.MathUtils.lerp(ped.armLeft.rotation.x, 0, strength);
    ped.armRight.rotation.x = THREE.MathUtils.lerp(ped.armRight.rotation.x, 0, strength);
    ped.armRight.rotation.y = THREE.MathUtils.lerp(ped.armRight.rotation.y, 0, strength);
  }

  function chasePlayer(ped, playerPose, dt, playerDistance) {
    if (!playerPose || !Number.isFinite(playerDistance) || playerDistance <= 0.001) return;

    const stopDistance = Math.max(2.8, (CONFIG.npc.attackRange ?? 16) * 0.7);
    if (playerDistance <= stopDistance) return;

    const dx = playerPose.x - ped.group.position.x;
    const dz = playerPose.z - ped.group.position.z;
    const length = Math.hypot(dx, dz);
    if (length <= 0.001) return;

    const chaseSpeed = CONFIG.npc.chaseSpeed ?? 4.2;
    const step = Math.min(length - stopDistance, chaseSpeed * dt);
    if (step <= 0) return;

    ped.group.position.x += (dx / length) * step;
    ped.group.position.z += (dz / length) * step;
  }

  function isReserved(x, z, padding = 0) {
    if (!hooks.isReservedArea) return false;
    return hooks.isReservedArea(x, z, padding);
  }

  function registerBoxCollider(x, z, width, depth, meta = {}) {
    if (!hooks.registerBoxCollider) return;
    hooks.registerBoxCollider(x, z, width, depth, meta);
  }

  function registerCircleCollider(x, z, radius, meta = {}) {
    if (!hooks.registerCircleCollider) return;
    hooks.registerCircleCollider(x, z, radius, meta);
  }

  function canPlaceBuilding(x, z, w, d) {
    const radius = Math.max(w, d) * 0.82;
    return !isReserved(x, z, radius);
  }

  function populateBlocks() {
    for (let ix = 0; ix < coords.length - 1; ix++) {
      for (let iz = 0; iz < coords.length - 1; iz++) {
        const left = coords[ix];
        const right = coords[ix + 1];
        const top = coords[iz];
        const bottom = coords[iz + 1];

        const seedBase = ix * 100 + iz * 1000;
        const rnd = makeRng(seedBase + 1);

        const lotMinX = left + CONFIG.intersectionSize / 2 + 12;
        const lotMaxX = right - CONFIG.intersectionSize / 2 - 12;
        const lotMinZ = top + CONFIG.intersectionSize / 2 + 12;
        const lotMaxZ = bottom - CONFIG.intersectionSize / 2 - 12;

        const centerX = (lotMinX + lotMaxX) / 2;
        const centerZ = (lotMinZ + lotMaxZ) / 2;

        const northZ = lotMinZ + 12;
        const southZ = lotMaxZ - 12;
        const westX = lotMinX + 12;
        const eastX = lotMaxX - 12;

        const northXs = [
          THREE.MathUtils.lerp(lotMinX + 18, lotMaxX - 18, 0.25),
          THREE.MathUtils.lerp(lotMinX + 18, lotMaxX - 18, 0.75)
        ];

        const southXs = [
          THREE.MathUtils.lerp(lotMinX + 18, lotMaxX - 18, 0.25),
          THREE.MathUtils.lerp(lotMinX + 18, lotMaxX - 18, 0.75)
        ];

        const westZs = [
          THREE.MathUtils.lerp(lotMinZ + 18, lotMaxZ - 18, 0.35),
          THREE.MathUtils.lerp(lotMinZ + 18, lotMaxZ - 18, 0.68)
        ];

        const eastZs = [
          THREE.MathUtils.lerp(lotMinZ + 18, lotMaxZ - 18, 0.35),
          THREE.MathUtils.lerp(lotMinZ + 18, lotMaxZ - 18, 0.68)
        ];

        const allBuildings = [
          { x: northXs[0], z: northZ, w: 20 + rnd() * 10, d: 16 + rnd() * 6, h: 18 + rnd() * 18, rot: Math.PI },
          { x: northXs[1], z: northZ, w: 18 + rnd() * 12, d: 16 + rnd() * 6, h: 22 + rnd() * 26, rot: Math.PI },
          { x: southXs[0], z: southZ, w: 20 + rnd() * 12, d: 16 + rnd() * 7, h: 16 + rnd() * 14, rot: 0 },
          { x: southXs[1], z: southZ, w: 18 + rnd() * 14, d: 16 + rnd() * 7, h: 20 + rnd() * 18, rot: 0 },
          { x: westX, z: westZs[0], w: 16 + rnd() * 6, d: 22 + rnd() * 10, h: 18 + rnd() * 20, rot: -Math.PI / 2 },
          { x: westX, z: westZs[1], w: 16 + rnd() * 6, d: 20 + rnd() * 10, h: 14 + rnd() * 18, rot: -Math.PI / 2 },
          { x: eastX, z: eastZs[0], w: 16 + rnd() * 6, d: 22 + rnd() * 10, h: 18 + rnd() * 22, rot: Math.PI / 2 },
          { x: eastX, z: eastZs[1], w: 16 + rnd() * 6, d: 20 + rnd() * 10, h: 14 + rnd() * 16, rot: Math.PI / 2 }
        ];

        allBuildings.forEach((b, idx) => {
          if (!canPlaceBuilding(b.x, b.z, b.w, b.d)) return;

          const building = createBuilding(
            seedBase + idx * 17,
            b.w,
            b.d,
            b.h,
            b.rot
          );
          building.userData.editorRemovable = true;
          building.position.set(b.x, 0, b.z);
          scene.add(building);
          buildings.push(building);

          hooks.beginEditorObject?.(building);
          const rotated = Math.abs(Math.sin(b.rot)) > 0.5;
          registerBoxCollider(
            b.x,
            b.z,
            rotated ? b.d : b.w,
            rotated ? b.w : b.d,
            { tag: "decor-building" }
          );
          hooks.endEditorObject?.(building);
        });

        for (let i = 0; i < 4; i++) {
          const x = centerX + (rnd() - 0.5) * 70;
          const z = centerZ + (rnd() - 0.5) * 70;
          if (!isReserved(x, z, 4)) {
            treePlacements.push({ x, z });
          }
        }
      }
    }
  }

  function addTreesAndLamps() {
    for (const road of roadMetas) {
      const half = road.length / 2;
      const min = -half + 26;
      const max = half - 26;

      for (let t = min; t <= max; t += CONFIG.decor.treeSpacing) {
        if (road.horizontal) {
          const a = { x: road.x + t, z: road.z - CONFIG.roadWidth / 2 - 11 };
          const b = { x: road.x + t, z: road.z + CONFIG.roadWidth / 2 + 11 };
          if (!isReserved(a.x, a.z, 5)) treePlacements.push(a);
          if (!isReserved(b.x, b.z, 5)) treePlacements.push(b);
        } else {
          const a = { x: road.x - CONFIG.roadWidth / 2 - 11, z: road.z + t };
          const b = { x: road.x + CONFIG.roadWidth / 2 + 11, z: road.z + t };
          if (!isReserved(a.x, a.z, 5)) treePlacements.push(a);
          if (!isReserved(b.x, b.z, 5)) treePlacements.push(b);
        }
      }

      for (let t = min; t <= max; t += CONFIG.decor.lampSpacing) {
        if (road.horizontal) {
          const a = { x: road.x + t, z: road.z - CONFIG.roadWidth / 2 - 6.5 };
          const b = { x: road.x + t, z: road.z + CONFIG.roadWidth / 2 + 6.5 };
          if (!isReserved(a.x, a.z, 5)) lampPlacements.push(a);
          if (!isReserved(b.x, b.z, 5)) lampPlacements.push(b);
        } else {
          const a = {
            x: road.x - CONFIG.roadWidth / 2 - 6.5,
            z: road.z + t,
            rot: Math.PI / 2
          };
          const b = {
            x: road.x + CONFIG.roadWidth / 2 + 6.5,
            z: road.z + t,
            rot: Math.PI / 2
          };
          if (!isReserved(a.x, a.z, 5)) lampPlacements.push(a);
          if (!isReserved(b.x, b.z, 5)) lampPlacements.push(b);
        }
      }
    }

    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.24, 2.6, 8);
    const crownGeo = new THREE.ConeGeometry(1.4, 2.8, 9);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4f2a });
    const crownMat = new THREE.MeshStandardMaterial({ color: 0x2f7d32 });

    const treeGroup = new THREE.Group();
    treeGroup.userData.editorRemovable = true;
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treePlacements.length);
    const crowns = new THREE.InstancedMesh(crownGeo, crownMat, treePlacements.length);
    treeGroup.add(trunks, crowns);

    const dummy = new THREE.Object3D();

    hooks.beginEditorObject?.(treeGroup);
    treePlacements.forEach((p, i) => {
      dummy.position.set(p.x, 1.3, p.z);
      dummy.rotation.set(0, (i % 7) * 0.31, 0);
      dummy.scale.setScalar(1 + (i % 5) * 0.06);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);

      dummy.position.set(p.x, 3.7, p.z);
      dummy.rotation.set(0, (i % 11) * 0.28, 0);
      dummy.scale.setScalar(1 + (i % 4) * 0.08);
      dummy.updateMatrix();
      crowns.setMatrixAt(i, dummy.matrix);

      registerCircleCollider(p.x, p.z, 1.05, { tag: "decor-tree" });
    });
    hooks.endEditorObject?.(treeGroup);

    scene.add(treeGroup);

    const poleGeo = new THREE.CylinderGeometry(0.06, 0.08, 4.8, 10);
    const lampHeadGeo = new THREE.BoxGeometry(0.55, 0.28, 0.55);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x7c7c7c });
    const lampHeadMaterial = new THREE.MeshStandardMaterial({
      color: 0xe7e7d1,
      emissive: 0x333300,
      emissiveIntensity: 1
    });

    const lampGroup = new THREE.Group();
    lampGroup.userData.editorRemovable = true;
    const poles = new THREE.InstancedMesh(poleGeo, poleMat, lampPlacements.length);
    const heads = new THREE.InstancedMesh(lampHeadGeo, lampHeadMaterial, lampPlacements.length);
    lampGroup.add(poles, heads);

    lampPlacements.forEach((p, i) => {
      dummy.position.set(p.x, 2.4, p.z);
      dummy.rotation.set(0, p.rot ?? 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      poles.setMatrixAt(i, dummy.matrix);

      dummy.position.set(p.x, 4.95, p.z);
      dummy.rotation.set(0, p.rot ?? 0, 0);
      dummy.updateMatrix();
      heads.setMatrixAt(i, dummy.matrix);
    });

    scene.add(lampGroup);

    if (hooks.onLampHeadMaterial) {
      hooks.onLampHeadMaterial(lampHeadMaterial);
    }
  }

  function addParkedCars() {
    const colors = [0x4f46e5, 0xef4444, 0x10b981, 0xf59e0b, 0x64748b, 0x8b5cf6];
    const rnd = makeRng(999);

    let created = 0;

    for (const road of roadMetas) {
      if (created >= CONFIG.decor.parkedCars) break;
      if (rnd() < 0.34) continue;

      const side = rnd() < 0.5 ? -1 : 1;
      const count = 1 + Math.floor(rnd() * 2);

      for (let i = 0; i < count; i++) {
        if (created >= CONFIG.decor.parkedCars) break;

        const along = -road.length / 2 + 28 + rnd() * (road.length - 56);
        const curbOffset = CONFIG.roadWidth / 2 + 2.7;

        let x = 0;
        let z = 0;
        let rotY = 0;
        let width = 2.5;
        let depth = 4.9;

        if (road.horizontal) {
          x = road.x + along;
          z = road.z + curbOffset * side;
          rotY = side > 0 ? -Math.PI / 2 : Math.PI / 2;
          width = 4.9;
          depth = 2.5;
        } else {
          x = road.x + curbOffset * side;
          z = road.z + along;
          rotY = side > 0 ? Math.PI : 0;
          width = 2.5;
          depth = 4.9;
        }

        if (isReserved(x, z, 4.5)) continue;

        const car = createParkedCar(colors[Math.floor(rnd() * colors.length)]);
        car.userData.editorRemovable = true;
        car.position.set(x, 0, z);
        car.rotation.y = rotY;

        parkedCars.push(car);
        scene.add(car);
        hooks.beginEditorObject?.(car);
        registerBoxCollider(x, z, width, depth, { tag: "decor-parked-car" });
        hooks.endEditorObject?.(car);
        created++;
      }
    }
  }

  function addMovingPedestrians() {
    const rnd = makeRng(555);

    for (let i = 0; i < CONFIG.decor.movingPedestrians; i++) {
      const road = roadMetas[Math.floor(rnd() * roadMetas.length)];
      const side = rnd() < 0.5 ? -1 : 1;
      const sidewalkOffset = CONFIG.roadWidth / 2 + 5.05 + rnd() * 1.95;
      const travelSpan = 82 + rnd() * 132;
      const centerAlong = -road.length / 2 + 28 + rnd() * (road.length - 56);
      const startAlong = Math.max(-road.length / 2 + 18, centerAlong - travelSpan * 0.5);
      const endAlong = Math.min(road.length / 2 - 18, centerAlong + travelSpan * 0.5);
      const lateralJitter = (rnd() - 0.5) * 1.1;

      let start;
      let end;
      let heading = 0;

      if (road.horizontal) {
        start = new THREE.Vector3(
          road.x + startAlong,
          0,
          road.z + sidewalkOffset * side + lateralJitter
        );
        end = new THREE.Vector3(
          road.x + endAlong,
          0,
          road.z + sidewalkOffset * side - lateralJitter * 0.6
        );
        heading = Math.PI / 2;
      } else {
        start = new THREE.Vector3(
          road.x + sidewalkOffset * side + lateralJitter,
          0,
          road.z + startAlong
        );
        end = new THREE.Vector3(
          road.x + sidewalkOffset * side - lateralJitter * 0.6,
          0,
          road.z + endAlong
        );
        heading = 0;
      }

      if (isReserved(start.x, start.z, 3.4) || isReserved(end.x, end.z, 3.4)) {
        continue;
      }

      const hostile = isHostilePedestrian(rnd);
      const ped = createPedestrian(2000 + i * 7, { hostile });
      ped.group.userData.editorRemovable = true;
      ped.group.position.copy(start);
      ped.group.rotation.y = heading;
      ped.group.visible = true;
      scene.add(ped.group);

      movingPedestrians.push({
        id: `mp_${i}`,
        alive: true,
        hostile,
        alert: 0,
        radius: 0.42,
        ...ped,
        start,
        end,
        t: rnd(),
        dir: rnd() < 0.5 ? 1 : -1,
        speed: 0.032 + rnd() * 0.04,
        phase: rnd() * Math.PI * 2,
        simAccumulator: 0
      });

      if (hostile) {
        hostilePedestrians.push(movingPedestrians[movingPedestrians.length - 1]);
      }
    }
  }

  function addStaticPedestrians() {
    const rnd = makeRng(7777);
    let created = 0;
    let attempts = 0;
    const maxAttempts = CONFIG.decor.staticPedestrians * 14;

    while (created < CONFIG.decor.staticPedestrians && attempts < maxAttempts) {
      attempts++;

      const road = roadMetas[Math.floor(rnd() * roadMetas.length)];
      const side = rnd() < 0.5 ? -1 : 1;
      const sidewalkOffset = CONFIG.roadWidth / 2 + 5.15 + rnd() * 2.2;
      const clusterSize = 4 + Math.floor(rnd() * 7);
      const clusterCenter = -road.length / 2 + 20 + rnd() * (road.length - 40);

      for (let c = 0; c < clusterSize && created < CONFIG.decor.staticPedestrians; c++) {
        const along = clusterCenter + (rnd() - 0.5) * 9.5;
        const lateral = sidewalkOffset * side + (rnd() - 0.5) * 2.8;

        const x = road.horizontal
          ? road.x + along
          : road.x + lateral;

        const z = road.horizontal
          ? road.z + lateral
          : road.z + along;

        if (isReserved(x, z, 2.8)) continue;

        const hostile = isHostilePedestrian(rnd);
        const ped = createPedestrian(9000 + created * 13, { hostile });
        ped.group.userData.editorRemovable = true;
        ped.group.position.set(x, 0, z);
        const idleHeading = rnd() * Math.PI * 2;
        ped.group.rotation.y = idleHeading;

        const armPose = (rnd() - 0.5) * 0.52;
        const legPose = (rnd() - 0.5) * 0.38;

        ped.armLeft.rotation.x = armPose;
        ped.armRight.rotation.x = -armPose * 0.85;
        ped.legLeft.rotation.x = legPose;
        ped.legRight.rotation.x = -legPose * 0.75;

        scene.add(ped.group);
        staticPedestrians.push({
          id: `sp_${created}`,
          alive: true,
          hostile,
          alert: 0,
          idleHeading,
          radius: 0.42,
          ...ped
        });
        if (hostile) {
          hostilePedestrians.push(staticPedestrians[staticPedestrians.length - 1]);
        }
        created++;
      }
    }
  }

  function build() {
    populateBlocks();
    addTreesAndLamps();
    addParkedCars();
    addMovingPedestrians();
    addStaticPedestrians();
  }

  function addEditorPedestrian(definition) {
    const hostile = definition.type === "hostile-npc";
    const ped = createPedestrian(12000 + editorPedestrians.length * 37, { hostile });
    ped.group.userData.editorRemovable = true;
    ped.group.userData.editorPlacementId = definition.id;
    ped.group.position.set(definition.x, 0, definition.z);
    ped.group.rotation.y = definition.rotation ?? 0;

    if (!hostile) {
      ped.armLeft.rotation.x = 0.3;
      ped.armRight.rotation.x = -0.24;
      ped.legLeft.rotation.x = -0.18;
      ped.legRight.rotation.x = 0.16;
    } else {
      ped.armLeft.rotation.x = -0.12;
      ped.armRight.rotation.x = -0.68;
      ped.armRight.rotation.y = -0.12;
    }

    scene.add(ped.group);

    const entry = {
      id: definition.id,
      placementId: definition.id,
      alive: true,
      hostile,
      alert: 0,
      idleHeading: definition.rotation ?? 0,
      radius: 0.42,
      fromEditor: true,
      ...ped
    };

    editorPedestrians.push(entry);
    if (hostile) {
      hostilePedestrians.push(entry);
    }

    return ped.group;
  }

  function removeEditorPedestrianByPlacementId(placementId) {
    const index = editorPedestrians.findIndex((ped) => ped.placementId === placementId);
    if (index === -1) return false;

    const [ped] = editorPedestrians.splice(index, 1);
    ped.alive = false;

    if (ped.group.parent) {
      ped.group.parent.remove(ped.group);
    }

    const hostileIndex = hostilePedestrians.indexOf(ped);
    if (hostileIndex >= 0) {
      hostilePedestrians.splice(hostileIndex, 1);
    }

    return true;
  }

  function buildViewContext(context) {
    const camera = context?.camera;
    if (!camera) return null;

    camera.getWorldDirection(viewForward);

    viewForwardXZ.set(viewForward.x, viewForward.z);
    if (viewForwardXZ.lengthSq() < 0.0001) return null;

    viewForwardXZ.normalize();

    const halfFov =
      THREE.MathUtils.degToRad(camera.fov * 0.5) +
      (CONFIG.world.cullFovPaddingRad ?? 0.6);

    cachedView.x = camera.position.x;
    cachedView.z = camera.position.z;
    cachedView.fx = viewForwardXZ.x;
    cachedView.fz = viewForwardXZ.y;
    cachedView.minDot = Math.cos(halfFov);

    return cachedView;
  }

  function isVisibleByView(position, maxDistance, view) {
    const dx = position.x - view.x;
    const dz = position.z - view.z;
    const distSq = dx * dx + dz * dz;
    const maxDistSq = maxDistance * maxDistance;

    if (distSq > maxDistSq) return false;
    if (distSq < 18 * 18) return true;

    const invDist = 1 / Math.sqrt(distSq);
    const dot = (dx * view.fx + dz * view.fz) * invDist;
    return dot >= view.minDot;
  }

  function shouldRefreshStaticVisibility(view, dt) {
    staticCullAccumulator += dt;

    if (!view) {
      lastStaticCullView.valid = false;
      staticCullAccumulator = 0;
      return true;
    }

    if (!lastStaticCullView.valid) {
      staticCullAccumulator = 0;
      return true;
    }

    const dx = view.x - lastStaticCullView.x;
    const dz = view.z - lastStaticCullView.z;
    const movedSq = dx * dx + dz * dz;
    const forwardDot =
      view.fx * lastStaticCullView.fx + view.fz * lastStaticCullView.fz;

    if (movedSq >= 3.5 * 3.5 || forwardDot <= 0.996 || staticCullAccumulator >= 0.08) {
      staticCullAccumulator = 0;
      return true;
    }

    return false;
  }

  function rememberStaticCullView(view) {
    if (!view) {
      lastStaticCullView.valid = false;
      return;
    }

    lastStaticCullView.valid = true;
    lastStaticCullView.x = view.x;
    lastStaticCullView.z = view.z;
    lastStaticCullView.fx = view.fx;
    lastStaticCullView.fz = view.fz;
  }

  function refreshStaticVisibility(view, maxBuildingDistance, maxParkedDistance, maxPedDistance) {
    for (const building of buildings) {
      building.visible = !view || isVisibleByView(building.position, maxBuildingDistance, view);
    }

    for (const car of parkedCars) {
      car.visible = !view || isVisibleByView(car.position, maxParkedDistance, view);
    }

    for (const ped of staticPedestrians) {
      if (!ped.alive) continue;
      ped.group.visible = !view || isVisibleByView(ped.group.position, maxPedDistance, view);
    }
  }

  function updateDecorations(dt, context = null) {
    const playerPose = context?.playerPose ?? null;
    const view = buildViewContext(context);

    const maxBuildingDistance = CONFIG.world.cullDistanceBuildings ?? 520;
    const maxParkedDistance = CONFIG.world.cullDistanceParkedCars ?? 320;
    const maxPedDistance = CONFIG.world.cullDistancePedestrians ?? 240;
    if (shouldRefreshStaticVisibility(view, dt)) {
      refreshStaticVisibility(view, maxBuildingDistance, maxParkedDistance, maxPedDistance);
      rememberStaticCullView(view);
    }

    const nearDist = CONFIG.world.pedestrianNearUpdateDistance ?? 90;
    const midDist = CONFIG.world.pedestrianMidUpdateDistance ?? 170;
    const farStep = CONFIG.world.pedestrianFarStepSeconds ?? 0.24;

    for (const ped of movingPedestrians) {
      if (!ped.alive) continue;

      let visible = true;
      if (view) {
        visible = isVisibleByView(ped.group.position, maxPedDistance, view);
      }
      ped.group.visible = visible;
      if (!visible) continue;

      let simDt = dt;
      if (playerPose) {
        const dxp = ped.group.position.x - playerPose.x;
        const dzp = ped.group.position.z - playerPose.z;
        const dist = Math.hypot(dxp, dzp);

        if (dist > midDist) {
          ped.simAccumulator += dt;
          if (ped.simAccumulator < farStep) {
            continue;
          }
          simDt = ped.simAccumulator;
          ped.simAccumulator = 0;
        } else if (dist > nearDist) {
          simDt = dt * 0.66;
          ped.simAccumulator = 0;
        } else {
          ped.simAccumulator = 0;
        }
      }

      const playerDistance = playerPose
        ? Math.hypot(
            ped.group.position.x - playerPose.x,
            ped.group.position.z - playerPose.z
          )
        : Infinity;
      const detectDistance = CONFIG.npc.detectDistance ?? 20;
      const forgetDistance = CONFIG.npc.forgetDistance ?? detectDistance * 1.4;
      const shouldAlert = ped.hostile && playerDistance <= detectDistance;
      ped.alert = THREE.MathUtils.clamp(
        ped.alert + (shouldAlert ? 1 : -1) * simDt * (shouldAlert ? 3.4 : 1.4),
        0,
        1
      );

      if (
        ped.hostile &&
        playerPose &&
        (ped.alert > 0.05 || playerDistance <= forgetDistance)
      ) {
        applyPedestrianAlertPose(ped, playerPose.x, playerPose.z, ped.alert || 1);
        chasePlayer(ped, playerPose, simDt, playerDistance);
        ped.group.position.y = 0;
        continue;
      }

      ped.t += ped.dir * ped.speed * simDt;

      if (ped.t > 1) {
        ped.t = 1;
        ped.dir = -1;
      } else if (ped.t < 0) {
        ped.t = 0;
        ped.dir = 1;
      }

      ped.group.position.lerpVectors(ped.start, ped.end, ped.t);

      const dx = ped.end.x - ped.start.x;
      const dz = ped.end.z - ped.start.z;
      const facing = Math.atan2(dx, dz);

      ped.group.rotation.y = ped.dir > 0 ? facing : facing + Math.PI;

      const walk = Math.sin((ped.phase + ped.t * 10) * 2.0);
      ped.armLeft.rotation.x = walk * 0.42;
      ped.armRight.rotation.x = -walk * 0.42;
      ped.armRight.rotation.y = 0;
      ped.legLeft.rotation.x = -walk * 0.5;
      ped.legRight.rotation.x = walk * 0.5;
      ped.group.position.y = Math.abs(walk) * 0.015;
    }

    for (const ped of staticPedestrians) {
      if (!ped.alive || !ped.group.visible) continue;

      const playerDistance = playerPose
        ? Math.hypot(
            ped.group.position.x - playerPose.x,
            ped.group.position.z - playerPose.z
          )
        : Infinity;
      const detectDistance = CONFIG.npc.detectDistance ?? 20;
      const shouldAlert = ped.hostile && playerDistance <= detectDistance;
      ped.alert = THREE.MathUtils.clamp(
        ped.alert + (shouldAlert ? 1 : -1) * dt * (shouldAlert ? 3.4 : 1.2),
        0,
        1
      );

      if (ped.hostile && ped.alert > 0.05 && playerPose) {
        applyPedestrianAlertPose(ped, playerPose.x, playerPose.z, ped.alert);
        chasePlayer(ped, playerPose, dt, playerDistance);
      } else {
        ped.group.rotation.y = THREE.MathUtils.lerp(
          ped.group.rotation.y,
          ped.idleHeading ?? ped.group.rotation.y,
          0.08
        );
        relaxPedestrianPose(ped);
      }
    }

    for (const ped of editorPedestrians) {
      if (!ped.alive || !ped.group.visible) continue;

      const dx = playerPose ? playerPose.x - ped.group.position.x : 0;
      const dz = playerPose ? playerPose.z - ped.group.position.z : 0;
      const playerDistance = Math.hypot(dx, dz);
      const detectDistance = CONFIG.npc.detectDistance ?? 20;
      const shouldAlert = ped.hostile && playerPose && playerDistance <= detectDistance;

      ped.alert = THREE.MathUtils.clamp(
        ped.alert + (shouldAlert ? 1 : -1) * dt * (shouldAlert ? 3.4 : 1.2),
        0,
        1
      );

      if (ped.hostile && ped.alert > 0.05 && playerPose) {
        applyPedestrianAlertPose(ped, playerPose.x, playerPose.z, ped.alert);
        chasePlayer(ped, playerPose, dt, playerDistance);
      } else {
        ped.group.rotation.y = THREE.MathUtils.lerp(
          ped.group.rotation.y,
          ped.idleHeading ?? ped.group.rotation.y,
          0.08
        );
        relaxPedestrianPose(ped);
      }
    }
  }

  function getPedestrianTargets() {
    pedestrianTargetsCache.length = 0;

    for (const ped of movingPedestrians) {
      if (!ped.alive || !ped.group.visible) continue;
      pedestrianTargetsCache.push({
        id: ped.id,
        x: ped.group.position.x,
        y: ped.group.position.y + 2.05,
        z: ped.group.position.z,
        radius: ped.radius,
        hostile: ped.hostile
      });
    }

    for (const ped of staticPedestrians) {
      if (!ped.alive || !ped.group.visible) continue;
      pedestrianTargetsCache.push({
        id: ped.id,
        x: ped.group.position.x,
        y: ped.group.position.y + 2.05,
        z: ped.group.position.z,
        radius: ped.radius,
        hostile: ped.hostile
      });
    }

    for (const ped of editorPedestrians) {
      if (!ped.alive || !ped.group.visible) continue;
      pedestrianTargetsCache.push({
        id: ped.id,
        x: ped.group.position.x,
        y: ped.group.position.y + 2.05,
        z: ped.group.position.z,
        radius: ped.radius,
        hostile: ped.hostile
      });
    }

    return pedestrianTargetsCache;
  }

  function getHostilePedestrians() {
    hostilePedestrianTargetsCache.length = 0;

    for (const ped of hostilePedestrians) {
      if (!ped.alive) continue;
      hostilePedestrianTargetsCache.push({
        id: ped.id,
        x: ped.group.position.x,
        y: ped.group.position.y + 1.45,
        z: ped.group.position.z,
        radius: ped.radius,
        alert: ped.alert ?? 0
      });
    }

    return hostilePedestrianTargetsCache;
  }

  function destroyPedestrian(id) {
    const all = [...movingPedestrians, ...staticPedestrians, ...editorPedestrians];
    const ped = all.find((entry) => entry.id === id);
    if (!ped || !ped.alive) return null;

    ped.alive = false;
    ped.group.visible = false;

    if (ped.fromEditor) {
      const editorIndex = editorPedestrians.indexOf(ped);
      if (editorIndex >= 0) {
        editorPedestrians.splice(editorIndex, 1);
      }
    }

    const hostileIndex = hostilePedestrians.indexOf(ped);
    if (hostileIndex >= 0) {
      hostilePedestrians.splice(hostileIndex, 1);
    }

    return {
      x: ped.group.position.x,
      z: ped.group.position.z
    };
  }

  return {
    build,
    updateDecorations,
    getPedestrianTargets,
    getHostilePedestrians,
    destroyPedestrian,
    addEditorPedestrian,
    removeEditorPedestrianByPlacementId
  };
}
