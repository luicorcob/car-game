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
      mesh.userData.editorRemovable = true;
      mesh.position.set((node.x + east.x) / 2, 0, node.z);
      scene.add(mesh);
    }

    const north = graph.getNeighbor(node.id, "N");
    if (north) {
      const mesh = createStraightRoadMesh(roadLength, false);
      mesh.userData.editorRemovable = true;
      mesh.position.set(node.x, 0, (node.z + north.z) / 2);
      scene.add(mesh);
    }
  }

  for (const node of graph.nodes.values()) {
    const cross = createIntersectionMesh();
    cross.userData.editorRemovable = true;
    cross.position.set(node.x, 0, node.z);
    scene.add(cross);
  }
}

export function createWorld(scene) {
  const lighting = createWorldLighting(scene);
  const graph = createWorldGraph();

  const boxColliders = [];
  const circleColliders = [];
  const colliderCellSize = 36;
  const boxColliderGrid = new Map();
  const circleColliderGrid = new Map();
  let activeEditorOwner = null;
  let collisionQueryMark = 0;

  function getCellCoord(value) {
    return Math.floor(value / colliderCellSize);
  }

  function getCellKey(cellX, cellZ) {
    return `${cellX},${cellZ}`;
  }

  function addColliderToGrid(grid, collider, minX, maxX, minZ, maxZ) {
    collider._gridKeys = [];

    const minCellX = getCellCoord(minX);
    const maxCellX = getCellCoord(maxX);
    const minCellZ = getCellCoord(minZ);
    const maxCellZ = getCellCoord(maxZ);

    for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
      for (let cellZ = minCellZ; cellZ <= maxCellZ; cellZ++) {
        const key = getCellKey(cellX, cellZ);
        let bucket = grid.get(key);
        if (!bucket) {
          bucket = [];
          grid.set(key, bucket);
        }
        bucket.push(collider);
        collider._gridKeys.push(key);
      }
    }
  }

  function indexBoxCollider(collider) {
    addColliderToGrid(
      boxColliderGrid,
      collider,
      collider.x - collider.width * 0.5,
      collider.x + collider.width * 0.5,
      collider.z - collider.depth * 0.5,
      collider.z + collider.depth * 0.5
    );
  }

  function indexCircleCollider(collider) {
    addColliderToGrid(
      circleColliderGrid,
      collider,
      collider.x - collider.radius,
      collider.x + collider.radius,
      collider.z - collider.radius,
      collider.z + collider.radius
    );
  }

  function rebuildColliderGrids() {
    boxColliderGrid.clear();
    circleColliderGrid.clear();

    for (const collider of boxColliders) {
      indexBoxCollider(collider);
    }

    for (const collider of circleColliders) {
      indexCircleCollider(collider);
    }
  }

  function registerBoxCollider(x, z, width, depth, meta = {}) {
    const collider = { x, z, width, depth, meta, owner: activeEditorOwner };
    boxColliders.push(collider);
    indexBoxCollider(collider);
  }

  function registerCircleCollider(x, z, radius, meta = {}) {
    const collider = { x, z, radius, meta, owner: activeEditorOwner };
    circleColliders.push(collider);
    indexCircleCollider(collider);
  }

  function beginEditorObject(owner) {
    activeEditorOwner = owner ?? null;
  }

  function endEditorObject(owner = null) {
    if (!owner || activeEditorOwner === owner) {
      activeEditorOwner = null;
    }
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
    registerCircleCollider,
    beginEditorObject,
    endEditorObject
  });
  pizzeria.build();

  const weaponShop = createWeaponShopController(scene, graph, {
    registerBoxCollider,
    registerCircleCollider,
    beginEditorObject,
    endEditorObject
  });
  weaponShop.build();

  const deliveryHouses = createDeliveryHousesController(scene, graph, {
    registerBoxCollider,
    registerCircleCollider,
    beginEditorObject,
    endEditorObject
  });
  deliveryHouses.build();

  const decor = createWorldDecorController(scene, graph, {
    onLampHeadMaterial: lighting.registerLampHeadMaterial,
    isReservedArea,
    registerBoxCollider,
    registerCircleCollider,
    beginEditorObject,
    endEditorObject
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

  function distanceToNearestGridLine(value) {
    const block = CONFIG.blockSize;
    const wrapped = ((value % block) + block) % block;
    return Math.min(wrapped, block - wrapped);
  }

  function getSurfaceType(x, z) {
    const distX = distanceToNearestGridLine(x);
    const distZ = distanceToNearestGridLine(z);
    const roadHalf = CONFIG.roadWidth * 0.5;
    const intersectionHalf = CONFIG.intersectionSize * 0.5;

    const onVerticalRoad = distX <= roadHalf;
    const onHorizontalRoad = distZ <= roadHalf;
    const onIntersection = distX <= intersectionHalf && distZ <= intersectionHalf;

    return onVerticalRoad || onHorizontalRoad || onIntersection
      ? "road"
      : "grass";
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

  function gatherNearbyColliders(grid, out, minX, maxX, minZ, maxZ, mark) {
    const minCellX = getCellCoord(minX);
    const maxCellX = getCellCoord(maxX);
    const minCellZ = getCellCoord(minZ);
    const maxCellZ = getCellCoord(maxZ);

    for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
      for (let cellZ = minCellZ; cellZ <= maxCellZ; cellZ++) {
        const bucket = grid.get(getCellKey(cellX, cellZ));
        if (!bucket) continue;

        for (const collider of bucket) {
          if (collider._queryMark === mark) continue;
          collider._queryMark = mark;
          out.push(collider);
        }
      }
    }
  }

  function resolveCharacterMotion(currentPose, radius, desiredX, desiredZ, extraBlockers = []) {
    const pos = {
      x: desiredX,
      z: desiredZ
    };
    const nearbyBoxes = [];
    const nearbyCircles = [];
    const minX = Math.min(currentPose?.x ?? desiredX, desiredX) - radius - 2;
    const maxX = Math.max(currentPose?.x ?? desiredX, desiredX) + radius + 2;
    const minZ = Math.min(currentPose?.z ?? desiredZ, desiredZ) - radius - 2;
    const maxZ = Math.max(currentPose?.z ?? desiredZ, desiredZ) + radius + 2;
    const mark = ++collisionQueryMark;

    const maxCoord = CONFIG.world.grassSize * 0.5 - 8;

    gatherNearbyColliders(boxColliderGrid, nearbyBoxes, minX, maxX, minZ, maxZ, mark);
    gatherNearbyColliders(circleColliderGrid, nearbyCircles, minX, maxX, minZ, maxZ, mark);

    for (let i = 0; i < 3; i++) {
      for (const box of nearbyBoxes) {
        solveBoxCollision(pos, box, radius);
      }

      for (const circle of nearbyCircles) {
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

  function removeEditorObject(object) {
    if (!object) return false;

    if (object.parent) {
      object.parent.remove(object);
    }

    for (let i = boxColliders.length - 1; i >= 0; i--) {
      if (boxColliders[i].owner === object) {
        boxColliders.splice(i, 1);
      }
    }

    for (let i = circleColliders.length - 1; i >= 0; i--) {
      if (circleColliders[i].owner === object) {
        circleColliders.splice(i, 1);
      }
    }

    rebuildColliderGrids();

    return true;
  }

  return {
    laneCenters: graph.laneCenters,
    laneClamp: graph.laneClamp,

    getStartRoad: graph.getStartRoad,
    getTrafficSpawnRoads: graph.getTrafficSpawnRoads,
    findClosestRoadPose: graph.findClosestRoadPose,

    evaluateSegment,
    getSurfaceType,
    buildRoadSegment: graph.buildRoadSegment,
    buildTransitionAfterRoad: graph.buildTransitionAfterRoad,
    buildRoadAfterConnector: graph.buildRoadAfterConnector,

    getUpcomingIntersectionInfo: graph.getUpcomingIntersectionInfo,
    getValidTurnChoices: graph.getValidTurnChoices,
    resolveTurn: graph.resolveTurn,
    normalizeAngle,

    resolveCharacterMotion,

    updateChoiceSigns: signs.updateChoiceSigns,
    updateDecorations: (dt, context = null) => decor.updateDecorations(dt, context),
    updateInteractivePlaces,

    setNightMode: lighting.setNightMode,
    isNightMode: lighting.isNightMode,

    getGasStationAccess: gasStations.getAvailableAccess,
    createGasStationEntrySegment: gasStations.createEntrySegment,
    buildAfterSpecialSegment: gasStations.buildAfterSpecialSegment,
    isGasStationSegment: gasStations.isGasStationSegment,
    getGasStationInfos: gasStations.getInfos,

    getPizzeriaInfo: pizzeria.getInfo,
    isPlayerNearPizzeriaPickup: pizzeria.isNearPickup,

    setActiveDeliveryHouse: deliveryHouses.setActiveHouse,
    getDeliveryHouses: deliveryHouses.getHouses,
    getDeliveryHouseById: deliveryHouses.getHouseById,
    getNearbyActiveDeliveryHouse: deliveryHouses.getNearbyActiveHouse,

    getWeaponShopInfo: weaponShop.getInfo,
    isPlayerNearWeaponShopCounter: weaponShop.isNearCounter,

    getPedestrianTargets: decor.getPedestrianTargets,
    destroyPedestrian: decor.destroyPedestrian,
    removeEditorObject
  };
}
