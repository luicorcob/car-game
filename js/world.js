import { CONFIG } from "./config.js";
import { normalizeAngle } from "./world/math.js";
import { createStraightRoadMesh, createIntersectionMesh } from "./world/meshes.js";
import { createWorldGraph } from "./world/graph.js";
import { createWorldLighting } from "./world/lighting.js";
import { createChoiceSignController } from "./world/signs.js";
import { createWorldDecorController } from "./world/decor.js";
import { createGasStationController } from "./world/gasStations.js";
import { createPizzeriaController } from "./world/pizzeria.js";
import { createDeliveryHousesController } from "./world/deliveryHouses.js";
import { createWeaponShopController } from "./world/weaponShop.js";

function addStaticRoadNetwork(scene, graph) {
  const roadLength = CONFIG.blockSize - CONFIG.intersectionSize;

  for (const node of graph.nodes.values()) {
    const east = graph.getNeighbor(node.id, "E");
    if (east) {
      const mesh = createStraightRoadMesh(roadLength, true);
      mesh.position.set((node.x + east.x) / 2, 0, node.z);
      scene.add(mesh);
    }

    const north = graph.getNeighbor(node.id, "N");
    if (north) {
      const mesh = createStraightRoadMesh(roadLength, false);
      mesh.position.set(node.x, 0, (node.z + north.z) / 2);
      scene.add(mesh);
    }
  }

  for (const node of graph.nodes.values()) {
    const cross = createIntersectionMesh();
    cross.position.set(node.x, 0, node.z);
    scene.add(cross);
  }
}

export function createWorld(scene) {
  const lighting = createWorldLighting(scene);
  const graph = createWorldGraph();

  const boxColliders = [];
  const circleColliders = [];

  function registerBoxCollider(x, z, width, depth, meta = {}) {
    boxColliders.push({ x, z, width, depth, meta });
  }

  function registerCircleCollider(x, z, radius, meta = {}) {
    circleColliders.push({ x, z, radius, meta });
  }

  function isReservedArea(x, z, padding = 0) {
    return (
      gasStations.isReservedArea(x, z, padding) ||
      pizzeria.isReservedArea(x, z, padding) ||
      weaponShop.isReservedArea(x, z, padding) ||
      deliveryHouses.isReservedArea(x, z, padding)
    );
  }

  addStaticRoadNetwork(scene, graph);

  const gasStations = createGasStationController(scene, graph);
  gasStations.build();

  const pizzeria = createPizzeriaController(scene, graph, {
    registerBoxCollider,
    registerCircleCollider
  });
  pizzeria.build();

  const weaponShop = createWeaponShopController(scene, graph, {
    registerBoxCollider,
    registerCircleCollider
  });
  weaponShop.build();

  const deliveryHouses = createDeliveryHousesController(scene, graph, {
    registerBoxCollider,
    registerCircleCollider
  });
  deliveryHouses.build();

  const decor = createWorldDecorController(scene, graph, {
    onLampHeadMaterial: lighting.registerLampHeadMaterial,
    isReservedArea,
    registerBoxCollider,
    registerCircleCollider
  });
  decor.build();

  const signs = createChoiceSignController(scene, graph.getNode);

  lighting.setNightMode(false);

  function evaluateSegment(segment, distanceAlongSegment, laneOffset = 0) {
    if (gasStations.isGasStationSegment(segment)) {
      return gasStations.evaluateSegment(segment, distanceAlongSegment);
    }

    return graph.evaluateSegment(segment, distanceAlongSegment, laneOffset);
  }

  function solveCircleCollision(pos, collider, radius) {
    const dx = pos.x - collider.x;
    const dz = pos.z - collider.z;
    const minDist = radius + collider.radius;
    const distSq = dx * dx + dz * dz;

    if (distSq >= minDist * minDist) return pos;

    const dist = Math.sqrt(distSq);
    if (dist > 0.0001) {
      const push = minDist - dist;
      pos.x += (dx / dist) * push;
      pos.z += (dz / dist) * push;
      return pos;
    }

    pos.x += minDist;
    return pos;
  }

  function solveBoxCollision(pos, collider, radius) {
    const minX = collider.x - collider.width * 0.5;
    const maxX = collider.x + collider.width * 0.5;
    const minZ = collider.z - collider.depth * 0.5;
    const maxZ = collider.z + collider.depth * 0.5;

    const nearestX = Math.max(minX, Math.min(pos.x, maxX));
    const nearestZ = Math.max(minZ, Math.min(pos.z, maxZ));

    const dx = pos.x - nearestX;
    const dz = pos.z - nearestZ;
    const distSq = dx * dx + dz * dz;

    if (distSq >= radius * radius) return pos;

    const insideX = pos.x >= minX && pos.x <= maxX;
    const insideZ = pos.z >= minZ && pos.z <= maxZ;

    if (insideX && insideZ) {
      const pushLeft = Math.abs(pos.x - minX);
      const pushRight = Math.abs(maxX - pos.x);
      const pushTop = Math.abs(pos.z - minZ);
      const pushBottom = Math.abs(maxZ - pos.z);

      const minPush = Math.min(pushLeft, pushRight, pushTop, pushBottom);

      if (minPush === pushLeft) pos.x = minX - radius;
      else if (minPush === pushRight) pos.x = maxX + radius;
      else if (minPush === pushTop) pos.z = minZ - radius;
      else pos.z = maxZ + radius;

      return pos;
    }

    const dist = Math.sqrt(distSq);
    if (dist > 0.0001) {
      const push = radius - dist;
      pos.x += (dx / dist) * push;
      pos.z += (dz / dist) * push;
    }

    return pos;
  }

  function resolveCharacterMotion(currentPose, radius, desiredX, desiredZ, extraBlockers = []) {
    const pos = {
      x: desiredX,
      z: desiredZ
    };

    const maxCoord = CONFIG.world.grassSize * 0.5 - 8;

    for (let i = 0; i < 3; i++) {
      for (const box of boxColliders) {
        solveBoxCollision(pos, box, radius);
      }

      for (const circle of circleColliders) {
        solveCircleCollision(pos, circle, radius);
      }

      for (const blocker of extraBlockers) {
        if (!blocker) continue;
        if (blocker.type === "box") {
          solveBoxCollision(pos, blocker, radius);
        } else {
          solveCircleCollision(pos, blocker, radius);
        }
      }

      pos.x = Math.max(-maxCoord, Math.min(maxCoord, pos.x));
      pos.z = Math.max(-maxCoord, Math.min(maxCoord, pos.z));
    }

    return pos;
  }

  function updateInteractivePlaces(playerPose, playerMode, dt) {
    pizzeria.update(playerPose, playerMode);
    weaponShop.update(playerPose, playerMode);
    deliveryHouses.update(dt);
  }

  return {
    laneCenters: graph.laneCenters,
    laneClamp: graph.laneClamp,

    getStartRoad: graph.getStartRoad,
    getTrafficSpawnRoads: graph.getTrafficSpawnRoads,

    evaluateSegment,
    buildRoadSegment: graph.buildRoadSegment,
    buildTransitionAfterRoad: graph.buildTransitionAfterRoad,
    buildRoadAfterConnector: graph.buildRoadAfterConnector,

    getUpcomingIntersectionInfo: graph.getUpcomingIntersectionInfo,
    getValidTurnChoices: graph.getValidTurnChoices,
    resolveTurn: graph.resolveTurn,
    normalizeAngle,

    resolveCharacterMotion,

    updateChoiceSigns: signs.updateChoiceSigns,
    updateDecorations: decor.updateDecorations,
    updateInteractivePlaces,

    setNightMode: lighting.setNightMode,
    isNightMode: lighting.isNightMode,

    getGasStationAccess: gasStations.getAvailableAccess,
    createGasStationEntrySegment: gasStations.createEntrySegment,
    buildAfterSpecialSegment: gasStations.buildAfterSpecialSegment,
    isGasStationSegment: gasStations.isGasStationSegment,

    getPizzeriaInfo: pizzeria.getInfo,
    isPlayerNearPizzeriaPickup: pizzeria.isNearPickup,

    setActiveDeliveryHouse: deliveryHouses.setActiveHouse,
    getDeliveryHouses: deliveryHouses.getHouses,
    getDeliveryHouseById: deliveryHouses.getHouseById,
    getNearbyActiveDeliveryHouse: deliveryHouses.getNearbyActiveHouse,

    getWeaponShopInfo: weaponShop.getInfo,
    isPlayerNearWeaponShopCounter: weaponShop.isNearCounter,

    getPedestrianTargets: decor.getPedestrianTargets,
    destroyPedestrian: decor.destroyPedestrian
  };
}