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
  const movingPedestrians = [];
  const staticPedestrians = [];
  const parkedCars = [];

  function isReserved(x, z, padding = 0) {
    if (!hooks.isReservedArea) return false;
    return hooks.isReservedArea(x, z, padding);
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
          const building = createBuilding(
            seedBase + idx * 17,
            b.w,
            b.d,
            b.h,
            b.rot
          );
          building.position.set(b.x, 0, b.z);
          scene.add(building);
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

    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treePlacements.length);
    const crowns = new THREE.InstancedMesh(crownGeo, crownMat, treePlacements.length);

    const dummy = new THREE.Object3D();

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
    });

    scene.add(trunks, crowns);

    const poleGeo = new THREE.CylinderGeometry(0.06, 0.08, 4.8, 10);
    const lampHeadGeo = new THREE.BoxGeometry(0.55, 0.28, 0.55);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x7c7c7c });
    const lampHeadMaterial = new THREE.MeshStandardMaterial({
      color: 0xe7e7d1,
      emissive: 0x333300,
      emissiveIntensity: 1
    });

    const poles = new THREE.InstancedMesh(poleGeo, poleMat, lampPlacements.length);
    const heads = new THREE.InstancedMesh(lampHeadGeo, lampHeadMaterial, lampPlacements.length);

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

    scene.add(poles, heads);

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

        if (road.horizontal) {
          x = road.x + along;
          z = road.z + curbOffset * side;
          rotY = side > 0 ? -Math.PI / 2 : Math.PI / 2;
        } else {
          x = road.x + curbOffset * side;
          z = road.z + along;
          rotY = side > 0 ? Math.PI : 0;
        }

        if (isReserved(x, z, 4.5)) continue;

        const car = createParkedCar(colors[Math.floor(rnd() * colors.length)]);
        car.position.set(x, 0, z);
        car.rotation.y = rotY;

        parkedCars.push(car);
        scene.add(car);
        created++;
      }
    }
  }

  function addMovingPedestrians() {
    const rnd = makeRng(555);

    for (let i = 0; i < CONFIG.decor.movingPedestrians; i++) {
      const road = roadMetas[i % roadMetas.length];
      const side = rnd() < 0.5 ? -1 : 1;
      const sidewalkOffset = CONFIG.roadWidth / 2 + 5.3;

      let start;
      let end;
      let heading = 0;

      if (road.horizontal) {
        start = new THREE.Vector3(
          road.x - road.length / 2 + 24 + rnd() * 40,
          0,
          road.z + sidewalkOffset * side
        );
        end = new THREE.Vector3(
          road.x + road.length / 2 - 24 - rnd() * 40,
          0,
          road.z + sidewalkOffset * side
        );
        heading = Math.PI / 2;
      } else {
        start = new THREE.Vector3(
          road.x + sidewalkOffset * side,
          0,
          road.z - road.length / 2 + 24 + rnd() * 40
        );
        end = new THREE.Vector3(
          road.x + sidewalkOffset * side,
          0,
          road.z + road.length / 2 - 24 - rnd() * 40
        );
        heading = 0;
      }

      if (isReserved(start.x, start.z, 4) || isReserved(end.x, end.z, 4)) {
        continue;
      }

      const ped = createPedestrian(2000 + i * 7);
      ped.group.position.copy(start);
      ped.group.rotation.y = heading;
      scene.add(ped.group);

      movingPedestrians.push({
        ...ped,
        start,
        end,
        t: rnd(),
        dir: rnd() < 0.5 ? 1 : -1,
        speed: 0.035 + rnd() * 0.035,
        phase: rnd() * Math.PI * 2
      });
    }
  }

  function addStaticPedestrians() {
    const rnd = makeRng(7777);
    let created = 0;

    for (let i = 0; i < roadMetas.length && created < CONFIG.decor.staticPedestrians; i++) {
      const road = roadMetas[i];
      const clusterCount = 4 + Math.floor(rnd() * 4);

      for (let c = 0; c < clusterCount && created < CONFIG.decor.staticPedestrians; c++) {
        const side = rnd() < 0.5 ? -1 : 1;
        const sidewalkOffset = CONFIG.roadWidth / 2 + 5.4;
        const along = -road.length / 2 + 20 + rnd() * (road.length - 40);

        const x = road.horizontal
          ? road.x + along
          : road.x + sidewalkOffset * side + (rnd() - 0.5) * 1.8;

        const z = road.horizontal
          ? road.z + sidewalkOffset * side + (rnd() - 0.5) * 1.8
          : road.z + along;

        if (isReserved(x, z, 3.5)) continue;

        const ped = createPedestrian(9000 + created * 13);
        ped.group.position.set(x, 0, z);
        ped.group.rotation.y = rnd() * Math.PI * 2;

        const armPose = (rnd() - 0.5) * 0.5;
        const legPose = (rnd() - 0.5) * 0.35;

        ped.armLeft.rotation.x = armPose;
        ped.armRight.rotation.x = -armPose * 0.85;
        ped.legLeft.rotation.x = legPose;
        ped.legRight.rotation.x = -legPose * 0.75;

        scene.add(ped.group);
        staticPedestrians.push(ped);
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

  function updateDecorations(dt) {
    for (const ped of movingPedestrians) {
      ped.t += ped.dir * ped.speed * dt;

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
      ped.legLeft.rotation.x = -walk * 0.5;
      ped.legRight.rotation.x = walk * 0.5;
      ped.group.position.y = Math.abs(walk) * 0.015;
    }
  }

  return {
    build,
    updateDecorations
  };
}