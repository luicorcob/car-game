import * as THREE from "three";
import { CONFIG } from "./config.js";
import {
  createTrafficCar,
  createTrafficTruck,
  setVehicleWreckState
} from "./car.js";
import { createCharacterController } from "./player/characterController.js";
import { getPlayerCharacterWeaponMuzzlePose } from "./player/characterVisual.js";
import { createDestructionController } from "./effects/destruction.js";
import { createPizzaDeliveryController } from "./missions/pizzaDelivery.js";
import { createWeaponController } from "./combat/weapons.js";

const TRAFFIC_COLORS = [
  0x3366ff,
  0xffb703,
  0x8338ec,
  0x2a9d8f,
  0xef476f,
  0xfb8500,
  0x64748b,
  0x22c55e
];

const TRUCK_CAB_COLORS = [
  0x2563eb,
  0xdc2626,
  0xf59e0b,
  0x10b981,
  0x7c3aed,
  0x475569
];

const TRUCK_TRAILER_COLORS = [
  0xe5e7eb,
  0xdbeafe,
  0xf3f4f6,
  0xe2e8f0,
  0xfef3c7
];

const INVENTORY_SLOT_COUNT = 20;
const HOTBAR_SLOT_COUNT = 5;

const TRACER_GEOMETRY = new THREE.CylinderGeometry(1, 1, 1, 6, 1, true);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

function randChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sameLogicalSegment(a, b) {
  if (!a || !b || a.type !== b.type) return false;

  if (a.type === "road") {
    return (
      a.fromNodeId === b.fromNodeId &&
      a.toNodeId === b.toNodeId &&
      a.dir === b.dir
    );
  }

  if (a.type === "junction-straight") {
    return (
      a.nodeId === b.nodeId &&
      a.dir === b.dir &&
      a.nextDir === b.nextDir
    );
  }

  if (a.type === "junction-turn") {
    return (
      a.nodeId === b.nodeId &&
      a.dir === b.dir &&
      a.turn === b.turn
    );
  }

  return false;
}

function isInteractPressed(input) {
  return !!(
    input?.interact ||
    input?.use ||
    input?.keyE ||
    input?.e
  );
}

function advanceVehicleAlongGraph(vehicle, distance, world, chooseTurn) {
  let remaining = distance;

  while (remaining > 0 && vehicle.segment) {
    if (vehicle.segment.type === "gas-stop" && !vehicle.canLeaveGasStop) {
      vehicle.segmentS = vehicle.segment.length;
      break;
    }

    const available = vehicle.segment.length - vehicle.segmentS;

    if (remaining < available) {
      vehicle.segmentS += remaining;
      remaining = 0;
      break;
    }

    remaining -= available;
    vehicle.segmentS = vehicle.segment.length;

    if (world.isGasStationSegment(vehicle.segment)) {
      const next = world.buildAfterSpecialSegment(vehicle.segment);
      if (!next) {
        remaining = 0;
        break;
      }

      if (next.mode === "segment") {
        vehicle.segment = next.segment;
        vehicle.segmentS = 0;
        if (vehicle.segment.type === "gas-stop") {
          vehicle.canLeaveGasStop = false;
        }
        continue;
      }

      if (next.mode === "merge") {
        vehicle.segment = next.segment;
        vehicle.segmentS = next.segmentS ?? 0;
        vehicle.laneOffset = next.laneOffset ?? 0;
        vehicle.canLeaveGasStop = false;
        continue;
      }
    }

    if (vehicle.segment.type === "road") {
      const requestedTurn = chooseTurn(vehicle.segment, vehicle.segmentS);
      vehicle.segment = world.buildTransitionAfterRoad(
        vehicle.segment,
        requestedTurn
      );
      vehicle.segmentS = 0;
      vehicle.laneOffset = 0;
      continue;
    }

    vehicle.segment = world.buildRoadAfterConnector(vehicle.segment);
    vehicle.segmentS = 0;
  }
}

function getVehiclePose(vehicle, world) {
  const laneOffset =
    vehicle.segment?.type === "road" ||
    vehicle.segment?.type === "junction-straight"
      ? vehicle.laneOffset
      : 0;

  return world.evaluateSegment(vehicle.segment, vehicle.segmentS, laneOffset);
}

function localizePoint(point, origin, heading) {
  const dx = point.x - origin.x;
  const dz = point.z - origin.z;

  const cosH = Math.cos(heading);
  const sinH = Math.sin(heading);

  return {
    x: dx * cosH + dz * sinH,
    z: -dx * sinH + dz * cosH
  };
}

function distanceSq2D(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

export function createGame(scene, playerCar, playerCharacter, world) {
  const traffic = [];
  const character = createCharacterController(world);
  const destruction = createDestructionController(scene);
  const weapons = createWeaponController();
  const inventory = {
    pizzaBoxes: 0,
    maxPizzaBoxes: CONFIG.pizzaDelivery.inventoryCapacity ?? 3,
    fuelCans: 0,
    maxFuelCans: CONFIG.fuel.portableCanMax ?? 3,
    fuelPerCan: CONFIG.fuel.portableCanLiters ?? 20
  };
  const pizzaDelivery = createPizzaDeliveryController(world, inventory);
  const shotTracers = [];

  const tracerTempMid = new THREE.Vector3();
  const tracerTempDir = new THREE.Vector3();
  const tracerUp = new THREE.Vector3(0, 1, 0);

  const player = {
    segment: null,
    segmentS: 0,
    laneOffset: 0,
    laneVelocity: 0,
    handbrakeAmount: 0,
    steer: 0,
    speed: 0,
    requestedTurn: 0,
    pose: { x: 0, z: 0, heading: 0 },

    fuel: CONFIG.fuel.start,
    canLeaveGasStop: false,
    isRefueling: false
  };

  const targetQuat = new THREE.Quaternion();
  const targetEuler = new THREE.Euler();

  let score = 0;
  let money = 0;
  let gameOver = false;
  let prevInteract = false;
  let prevSelectSlot1 = false;
  let prevSelectSlot2 = false;
  let prevSelectSlot3 = false;
  let prevSelectSlot4 = false;
  let prevSelectSlot5 = false;
  let playerMode = "driving";
  let failureLabel = "Chocado";
  let characterDestroyed = false;
  let activeRefuelStationId = null;
  let selectedHotbarSlot = 0;
  let inventorySlotItemIds = Array(INVENTORY_SLOT_COUNT).fill(null);

  function clearShotTracers() {
    while (shotTracers.length) {
      const tracer = shotTracers.pop();
      scene.remove(tracer.mesh);
      tracer.mesh.material.dispose();
    }
  }

  function spawnShotTracer(start, end, shot) {
    const direction = tracerTempDir.copy(end).sub(start);
    const distance = direction.length();

    if (distance <= 0.001) return;

    direction.normalize();

    const material = new THREE.MeshBasicMaterial({
      color: shot.visualTracerColor ?? 0xfff1b8,
      transparent: true,
      opacity: 0.95,
      depthWrite: false
    });

    const mesh = new THREE.Mesh(TRACER_GEOMETRY, material);
    mesh.position.copy(tracerTempMid.copy(start).add(end).multiplyScalar(0.5));
    mesh.quaternion.setFromUnitVectors(tracerUp, direction);
    mesh.scale.set(
      shot.visualTracerThickness ?? 0.02,
      distance,
      shot.visualTracerThickness ?? 0.02
    );
    mesh.frustumCulled = false;

    scene.add(mesh);

    shotTracers.push({
      mesh,
      life: shot.visualTracerLife ?? 0.05,
      maxLife: shot.visualTracerLife ?? 0.05
    });
  }

  function updateShotTracers(dt) {
    for (let i = shotTracers.length - 1; i >= 0; i--) {
      const tracer = shotTracers[i];
      tracer.life -= dt;

      if (tracer.life <= 0) {
        scene.remove(tracer.mesh);
        tracer.mesh.material.dispose();
        shotTracers.splice(i, 1);
        continue;
      }

      const alpha = tracer.life / tracer.maxLife;
      tracer.mesh.material.opacity = alpha * 0.95;
    }
  }

  function createTrafficVehicle({
    type,
    startRoad,
    laneOffset,
    desiredSpeed,
    segmentS
  }) {
    let mesh;
    let collisionRadiusX;
    let collisionRadiusZ;

    if (type === "truck") {
      mesh = createTrafficTruck(
        randChoice(TRUCK_CAB_COLORS),
        randChoice(TRUCK_TRAILER_COLORS)
      );
      collisionRadiusX = 1.55;
      collisionRadiusZ = 4.35;
    } else {
      mesh = createTrafficCar(randChoice(TRAFFIC_COLORS));
      collisionRadiusX = 1.35;
      collisionRadiusZ = 2.45;
    }

    scene.add(mesh);

    return {
      type,
      mesh,
      segment: startRoad,
      segmentS,
      laneOffset,
      desiredSpeed,
      speed: desiredSpeed,
      collisionRadiusX,
      collisionRadiusZ,
      canLeaveGasStop: true,
      wrecked: false
    };
  }

  function canSpawnTraffic(segment, segmentS, laneOffset, collisionRadiusZ) {
    const laneTolerance = CONFIG.roadWidth / CONFIG.laneCount * 0.6;

    for (const other of traffic) {
      if (!sameLogicalSegment(segment, other.segment)) continue;
      if (Math.abs(laneOffset - other.laneOffset) > laneTolerance) continue;

      const minGap = collisionRadiusZ + other.collisionRadiusZ + 8;

      if (Math.abs(segmentS - other.segmentS) < minGap) {
        return false;
      }
    }

    if (
      segment.fromNodeId === `0,${2 * CONFIG.blockSize}` &&
      segment.dir === "N" &&
      segmentS < 92 &&
      Math.abs(laneOffset) < CONFIG.roadWidth / CONFIG.laneCount
    ) {
      return false;
    }

    return true;
  }

  function spawnTraffic() {
    const starts = world.getTrafficSpawnRoads();
    if (!starts.length) return;

    let attempts = 0;
    const maxAttempts = CONFIG.traffic.count * 30;

    while (traffic.length < CONFIG.traffic.count && attempts < maxAttempts) {
      attempts++;

      const template = randChoice(starts);
      const startRoad = world.buildRoadSegment(template.fromNodeId, template.dir);
      if (!startRoad) continue;

      const isTruck = Math.random() < CONFIG.traffic.truckChance;
      const laneOffset = randChoice(world.laneCenters);
      const desiredSpeed = isTruck
        ? randRange(CONFIG.traffic.truckMinSpeed, CONFIG.traffic.truckMaxSpeed)
        : randRange(CONFIG.traffic.minSpeed, CONFIG.traffic.maxSpeed);

      const collisionRadiusZ = isTruck ? 4.35 : 2.45;
      const segmentS = randRange(
        CONFIG.traffic.spawnPadding,
        Math.max(
          CONFIG.traffic.spawnPadding + 2,
          startRoad.length - CONFIG.traffic.spawnPadding
        )
      );

      if (!canSpawnTraffic(startRoad, segmentS, laneOffset, collisionRadiusZ)) {
        continue;
      }

      traffic.push(
        createTrafficVehicle({
          type: isTruck ? "truck" : "car",
          startRoad,
          laneOffset,
          desiredSpeed,
          segmentS
        })
      );
    }
  }

  function reset() {
    for (const car of traffic) {
      scene.remove(car.mesh);
    }
    traffic.length = 0;

    clearShotTracers();
    destruction.reset();
    pizzaDelivery.reset();
    weapons.reset();
    weapons.grantWeapon("pistol", null, { equip: true });
    weapons.grantWeapon("shotgun");

    player.segment = world.getStartRoad();
    player.segmentS = 0;
    player.laneOffset = 0;
    player.laneVelocity = 0;
    player.handbrakeAmount = 0;
    player.steer = 0;
    player.speed = 0;
    player.requestedTurn = 0;
    player.pose = world.evaluateSegment(player.segment, 0, 0);
    player.fuel = CONFIG.fuel.start;
    player.canLeaveGasStop = false;
    player.isRefueling = false;
    inventory.pizzaBoxes = 0;
    inventory.fuelCans = 0;
    activeRefuelStationId = null;

    playerCar.position.set(player.pose.x, 0, player.pose.z);
    playerCar.rotation.set(0, Math.PI, 0);

    character.setPose(player.pose.x, player.pose.z, player.pose.heading);
    playerCharacter.visible = false;

    score = 0;
    money = 1000;
    gameOver = false;
    prevInteract = false;
    prevSelectSlot1 = false;
    prevSelectSlot2 = false;
    prevSelectSlot3 = false;
    prevSelectSlot4 = false;
    prevSelectSlot5 = false;
    playerMode = "driving";
    failureLabel = "Chocado";
    characterDestroyed = false;
    selectedHotbarSlot = 0;
    inventorySlotItemIds = Array(INVENTORY_SLOT_COUNT).fill(null);

    spawnTraffic();
  }

  function getWalkingGasStationAccess(playerPose) {
    if (!playerPose) return null;

    const stationInfos = world.getGasStationInfos?.() ?? [];
    const maxDistanceSq = 4.8 * 4.8;
    let best = null;
    let bestDistanceSq = Infinity;

    for (const station of stationInfos) {
      for (const pump of station.pumpPositions ?? []) {
        const distSq = distanceSq2D(playerPose, pump);
        if (distSq > maxDistanceSq || distSq >= bestDistanceSq) continue;

        bestDistanceSq = distSq;
        best = {
          stationId: station.id,
          brand: station.brand,
          distanceSq: distSq
        };
      }
    }

    return best;
  }

  function buildInventoryEntries() {
    const entries = [];

    for (const weapon of weapons.getInventoryEntries()) {
      entries.push({
        id: weapon.id,
        kind: "weapon",
        label: weapon.label,
        detail: `${weapon.ammo} balas`,
        weaponId: weapon.id
      });
    }

    if (inventory.pizzaBoxes > 0) {
      entries.push({
        id: "pizza",
        kind: "pizza",
        label: "Pizza",
        detail: `${inventory.pizzaBoxes}/${inventory.maxPizzaBoxes}`
      });
    }

    if (inventory.fuelCans > 0) {
      entries.push({
        id: "fuel",
        kind: "fuel",
        label: "Gasolina",
        detail: `${inventory.fuelCans} garrafa${inventory.fuelCans === 1 ? "" : "s"} · ${inventory.fuelCans * inventory.fuelPerCan} L`
      });
    }

    return entries;
  }

  function createInventorySlotFromEntry(entry) {
    if (!entry) return null;

    if (entry.kind === "weapon") {
      return {
        id: entry.id,
        kind: "weapon",
        label: entry.label,
        detail: entry.detail,
        weaponId: entry.weaponId
      };
    }

    if (entry.kind === "pizza") {
      return {
        id: entry.id,
        kind: "pizza",
        label: entry.label,
        detail: entry.detail
      };
    }

    if (entry.kind === "fuel") {
      return {
        id: entry.id,
        kind: "fuel",
        label: entry.label,
        detail: entry.detail
      };
    }

    return null;
  }

  function syncInventorySlotItemIds(entries) {
    const entryIds = new Set(entries.map((entry) => entry.id));

    inventorySlotItemIds = inventorySlotItemIds.map((itemId) =>
      entryIds.has(itemId) ? itemId : null
    );

    for (const entry of entries) {
      if (inventorySlotItemIds.includes(entry.id)) continue;
      const emptyIndex = inventorySlotItemIds.indexOf(null);
      if (emptyIndex === -1) break;
      inventorySlotItemIds[emptyIndex] = entry.id;
    }
  }

  function buildInventorySlots() {
    const entries = buildInventoryEntries();
    syncInventorySlotItemIds(entries);
    const entryById = new Map(entries.map((entry) => [entry.id, entry]));

    return Array.from({ length: INVENTORY_SLOT_COUNT }, (_, index) => {
      const itemId = inventorySlotItemIds[index];
      const entry = itemId ? entryById.get(itemId) ?? null : null;
      return createInventorySlotFromEntry(entry);
    });
  }

  function moveInventorySlot(fromIndex, toIndex) {
    if (
      !Number.isInteger(fromIndex) ||
      !Number.isInteger(toIndex) ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= INVENTORY_SLOT_COUNT ||
      toIndex >= INVENTORY_SLOT_COUNT ||
      fromIndex === toIndex
    ) {
      return false;
    }

    const fromItemId = inventorySlotItemIds[fromIndex];
    if (!fromItemId) return false;

    const toItemId = inventorySlotItemIds[toIndex];
    inventorySlotItemIds[fromIndex] = toItemId ?? null;
    inventorySlotItemIds[toIndex] = fromItemId;
    syncSelectedHotbarSlot();
    return true;
  }

  function buildHotbarSlots() {
    const slots = buildInventorySlots();
    return Array.from({ length: HOTBAR_SLOT_COUNT }, (_, index) => {
      const entry = slots[index];
      if (!entry) return null;

      if (entry.kind === "weapon") {
        return {
          kind: "weapon",
          label: entry.label,
          detail: entry.detail.replace(" balas", ""),
          weaponId: entry.weaponId
        };
      }

      if (entry.kind === "pizza") {
        return {
          kind: "pizza",
          label: entry.label,
          detail: `${inventory.pizzaBoxes}`
        };
      }

      if (entry.kind === "fuel") {
        return {
          kind: "fuel",
          label: entry.label,
          detail: `${inventory.fuelCans}`
        };
      }

      return null;
    });
  }

  function syncSelectedHotbarSlot() {
    const hotbarSlots = buildHotbarSlots();
    const selectedItem = hotbarSlots[selectedHotbarSlot] ?? null;

    if (selectedItem?.kind === "weapon" && selectedItem.weaponId) {
      weapons.equipWeapon(selectedItem.weaponId);
      return;
    }

    weapons.holsterWeapon();
  }

  function updateHotbarSelection(input) {
    const select1Held = !!input.selectWeapon1;
    const select2Held = !!input.selectWeapon2;
    const select3Held = !!input.selectWeapon3;
    const select4Held = !!input.selectWeapon4;
    const select5Held = !!input.selectWeapon5;

    if (select1Held && !prevSelectSlot1) selectedHotbarSlot = 0;
    if (select2Held && !prevSelectSlot2) selectedHotbarSlot = 1;
    if (select3Held && !prevSelectSlot3) selectedHotbarSlot = 2;
    if (select4Held && !prevSelectSlot4) selectedHotbarSlot = 3;
    if (select5Held && !prevSelectSlot5) selectedHotbarSlot = 4;

    prevSelectSlot1 = select1Held;
    prevSelectSlot2 = select2Held;
    prevSelectSlot3 = select3Held;
    prevSelectSlot4 = select4Held;
    prevSelectSlot5 = select5Held;

    syncSelectedHotbarSlot();
  }

  function getSelectedHotbarItem() {
    const hotbarSlots = buildHotbarSlots();
    return {
      hotbarSlots,
      selectedItem: hotbarSlots[selectedHotbarSlot] ?? null
    };
  }

  function canPourFuelToCar(characterState) {
    if (playerMode !== "walking") return false;
    if (!characterState) return false;
    if (inventory.fuelCans <= 0) return false;
    if (player.fuel >= CONFIG.fuel.max - 0.001) return false;
    return canEnterVehicle(characterState);
  }

  function tryPourFuelToCar(characterState) {
    if (!canPourFuelToCar(characterState)) return false;

    inventory.fuelCans -= 1;
    player.fuel = Math.min(CONFIG.fuel.max, player.fuel + inventory.fuelPerCan);
    return true;
  }

  function getGasStationAccess() {
    if (playerMode !== "driving" || gameOver) return null;

    const stationInfos = world.getGasStationInfos?.() ?? [];
    const maxDistanceSq = 7.2 * 7.2;
    let best = null;
    let bestDistanceSq = Infinity;

    for (const station of stationInfos) {
      for (const pump of station.pumpPositions ?? []) {
        const distSq = distanceSq2D(player.pose, pump);
        if (distSq > maxDistanceSq || distSq >= bestDistanceSq) continue;

        bestDistanceSq = distSq;
        best = {
          stationId: station.id,
          brand: station.brand,
          distanceSq: distSq
        };
      }
    }

    return best;
  }

  function tryEnterGasStation(input, access = null) {
    const interactPressed = isInteractPressed(input);
    const justPressed = interactPressed && !prevInteract;
    if (!justPressed || playerMode !== "driving" || gameOver) return null;

    const currentAccess = access ?? getGasStationAccess();
    if (!currentAccess) return null;
    if (Math.abs(player.speed) > 0.035) return null;
    if (player.fuel >= CONFIG.fuel.max - 0.001) return null;

    activeRefuelStationId = currentAccess.stationId;
    player.isRefueling = true;
    player.speed = 0;
    return currentAccess;
  }

  function canExitVehicle() {
    return (
      playerMode === "driving" &&
      !gameOver &&
      Math.abs(player.speed) <= CONFIG.onFoot.exitVehicleMaxSpeed
    );
  }

  function getPlayerVehicleBlocker() {
    return {
      type: "circle",
      x: player.pose.x,
      z: player.pose.z,
      radius: 2.75
    };
  }

  function buildExitCandidates() {
    const heading = player.pose.heading;
    const rightX = Math.cos(heading);
    const rightZ = Math.sin(heading);
    const forwardX = Math.sin(heading);
    const forwardZ = -Math.cos(heading);

    const sides = [-1, 1];
    const candidates = [];

    for (const side of sides) {
      const raw = {
        x:
          player.pose.x +
          rightX * side * CONFIG.onFoot.exitOffsetSide +
          forwardX * CONFIG.onFoot.exitOffsetForward,
        z:
          player.pose.z +
          rightZ * side * CONFIG.onFoot.exitOffsetSide +
          forwardZ * CONFIG.onFoot.exitOffsetForward
      };

      const resolved = world.resolveCharacterMotion(
        raw,
        CONFIG.onFoot.radius,
        raw.x,
        raw.z,
        [getPlayerVehicleBlocker()]
      );

      const dx = resolved.x - player.pose.x;
      const dz = resolved.z - player.pose.z;

      candidates.push({
        x: resolved.x,
        z: resolved.z,
        score: dx * dx + dz * dz
      });
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates;
  }

  function tryExitVehicle(input, gasAccess = null) {
    const interactPressed = isInteractPressed(input);
    const justPressed = interactPressed && !prevInteract;

    if (!justPressed || !canExitVehicle()) return false;

    const currentGasAccess = gasAccess ?? getGasStationAccess();
    if (currentGasAccess) return false;

    const candidates = buildExitCandidates();
    const best = candidates[0];
    if (!best) return false;

    player.speed = 0;
    player.laneVelocity = 0;
    player.handbrakeAmount = 0;
    player.steer = 0;
    player.isRefueling = false;
    activeRefuelStationId = null;
    playerMode = "walking";
    characterDestroyed = false;

    character.setPose(best.x, best.z, player.pose.heading);
    playerCharacter.visible = true;

    return true;
  }

  function canEnterVehicle(characterState) {
    if (playerMode !== "walking") return false;
    if (gameOver) return false;
    if (!characterState.onGround) return false;

    const dx = characterState.x - player.pose.x;
    const dz = characterState.z - player.pose.z;
    const dist = Math.hypot(dx, dz);

    return dist <= CONFIG.onFoot.enterVehicleDistance;
  }

  function tryEnterVehicleFromFoot(input, characterState) {
    const interactPressed = isInteractPressed(input);
    const justPressed = interactPressed && !prevInteract;

    if (!justPressed) return false;
    if (!canEnterVehicle(characterState)) return false;

    playerMode = "driving";
    player.isRefueling = false;
    activeRefuelStationId = null;
    playerCharacter.visible = false;
    characterDestroyed = false;
    return true;
  }

  function updateDrivingInput(input, dt, turnSensitivity = 1) {
    if (gameOver) return;
    const outOfFuel = player.fuel <= 0.0001;
    const usingHandbrake = !!input.handbrake;
    const desiredSteer =
      input.left && !input.right ? -1 : input.right && !input.left ? 1 : 0;
    const steerBlend = Math.min(
      1,
      (desiredSteer === 0
        ? CONFIG.player.steerReturn
        : CONFIG.player.steerResponse) * dt
    );

    player.steer += (desiredSteer - player.steer) * steerBlend;
    const accelStep = CONFIG.player.acceleration * dt * 60;
    const brakeStep = CONFIG.player.braking * dt * 60;
    const handbrakeStep = (CONFIG.player.handbrakeBraking ?? (CONFIG.player.braking * 1.8)) * dt * 60;
    const preStepSpeedRatio = clamp(
      Math.abs(player.speed) / CONFIG.player.maxSpeed,
      0,
      1
    );
    const steerAmount = Math.abs(player.steer);
    const driftSpeedRatio = clamp(
      (Math.abs(player.speed) - (CONFIG.player.handbrakeDriftMinSpeed ?? 0.18)) /
        Math.max(0.001, CONFIG.player.maxSpeed - (CONFIG.player.handbrakeDriftMinSpeed ?? 0.18)),
      0,
      1
    );
    const handbrakeDriftRatio =
      usingHandbrake
        ? driftSpeedRatio * clamp((steerAmount - 0.12) / 0.88, 0, 1)
        : 0;
    const coastScale = 0.2 + preStepSpeedRatio * 0.45;
    const coastFactor = Math.max(
      0,
      1 - CONFIG.player.coastDrag * coastScale * dt * 60
    );
    const dragFactor = Math.max(0, 1 - CONFIG.player.drag * dt * 60);
    const handbrakeGrip =
      CONFIG.player.handbrakeDriftGrip ??
      0.3;
    const handbrakeDragFactor = Math.max(
      0,
      1 -
        (CONFIG.player.handbrakeDrag ?? (CONFIG.player.drag * 3)) *
          (1 - handbrakeDriftRatio * (1 - handbrakeGrip)) *
          dt *
          60
    );
    player.handbrakeAmount +=
      ((usingHandbrake ? 1 : 0) - player.handbrakeAmount) * Math.min(1, 8 * dt);

    if (!outOfFuel && input.accelerate) {
      if (player.speed < 0) {
        player.speed += brakeStep * 0.75;
      } else {
        player.speed += accelStep;
      }
    } else if (usingHandbrake) {
      const handbrakeBrakeScale = 1 - handbrakeDriftRatio * 0.9;
      const handbrakeSlowdown = handbrakeStep * handbrakeBrakeScale;
      if (player.speed > 0.01) {
        player.speed = Math.max(0, player.speed - handbrakeSlowdown);
      } else if (player.speed < -0.01) {
        player.speed = Math.min(0, player.speed + handbrakeSlowdown);
      } else {
        player.speed = 0;
      }
    } else if (input.brake) {
      if (player.speed > 0.02) {
        player.speed -= brakeStep;
      } else {
        player.speed -= accelStep * 0.82;
      }
    } else {
      player.speed *= coastFactor;
    }

    if (usingHandbrake) {
      player.speed *= handbrakeDragFactor;
    } else if ((input.accelerate && player.speed > 0) || (input.brake && player.speed < 0)) {
      player.speed *= dragFactor;
    }

    const speedRatio = clamp(Math.abs(player.speed) / CONFIG.player.maxSpeed, 0, 1);
    player.speed = clamp(
      player.speed,
      -CONFIG.player.reverseMaxSpeed,
      CONFIG.player.maxSpeed
    );
    const steerAuthority =
      CONFIG.player.steerAtLowSpeed +
      (CONFIG.player.steerAtHighSpeed - CONFIG.player.steerAtLowSpeed) * speedRatio;
    const steerMultiplier = usingHandbrake && speedRatio > 0.08
      ? (CONFIG.player.handbrakeSteerBoost ?? 1.35)
      : 1;
    const direction = player.speed < -0.001 ? -1 : 1;
    const yawStep =
      player.steer *
      CONFIG.player.steerRate *
      steerAuthority *
      steerMultiplier *
      turnSensitivity *
      direction *
      Math.min(1, 0.25 + speedRatio);

    player.pose.heading = world.normalizeAngle(
      player.pose.heading + yawStep * dt * 60
    );
    const laneTarget =
      player.steer *
      Math.abs(player.speed) *
      (1 + handbrakeDriftRatio * (CONFIG.player.driftSlipBoost ?? 1.4));
    player.laneVelocity +=
      (laneTarget - player.laneVelocity) *
      Math.min(
        1,
        (usingHandbrake
          ? (CONFIG.player.driftSlipResponse ?? 4.1)
          : 6) * dt
      );
  }

  function updateDrivingPlayer(dt) {
    const forwardX = Math.sin(player.pose.heading);
    const forwardZ = -Math.cos(player.pose.heading);
    const moveDistance = player.speed * dt * 60;
    const desiredX = player.pose.x + forwardX * moveDistance;
    const desiredZ = player.pose.z + forwardZ * moveDistance;
    const collisionRadius =
      (CONFIG.player.collisionRadiusX + CONFIG.player.collisionRadiusZ) * 0.42;
    const resolved = world.resolveCharacterMotion(
      { x: player.pose.x, z: player.pose.z },
      collisionRadius,
      desiredX,
      desiredZ
    );

    const movedX = resolved.x - player.pose.x;
    const movedZ = resolved.z - player.pose.z;
    const actualDistance = Math.hypot(movedX, movedZ);

    player.pose.x = resolved.x;
    player.pose.z = resolved.z;
    if (actualDistance + 0.001 < Math.abs(moveDistance)) {
      player.speed *= CONFIG.player.collisionDamping;
    }

    const speedAbs = Math.abs(player.speed);
    const driftLiftRatio =
      player.handbrakeAmount *
      clamp(
        (speedAbs - (CONFIG.player.driftVisualSpeedThreshold ?? (80 / 150))) /
          Math.max(
            0.001,
            CONFIG.player.maxSpeed - (CONFIG.player.driftVisualSpeedThreshold ?? (80 / 150))
          ),
        0,
        1
      ) *
      clamp(Math.abs(player.steer), 0, 1);
    const driftSlipRatio = clamp(
      Math.abs(player.laneVelocity) / Math.max(0.001, CONFIG.player.maxSpeed * 0.7),
      0,
      1
    );
    const driftVisualRatio = driftLiftRatio * (0.45 + driftSlipRatio * 0.55);
    const driftDirection =
      Math.abs(player.steer) > 0.02
        ? Math.sign(player.steer)
        : Math.sign(player.laneVelocity || 0);
    const driftLift = (CONFIG.player.driftVisualLift ?? 0.14) * driftVisualRatio;

    playerCar.position.set(player.pose.x, driftLift, player.pose.z);

    const baseYaw = Math.PI - player.pose.heading;
    const speedRatio = clamp(player.speed / CONFIG.player.maxSpeed, 0, 1);
    const visualYaw =
      -player.steer * CONFIG.player.steerVisualYaw * (0.35 + Math.abs(speedRatio) * 0.65) +
      driftDirection * (CONFIG.player.driftVisualYaw ?? 0.08) * driftVisualRatio;

    let visualRoll =
      -player.steer * CONFIG.player.bodyRoll * (0.25 + Math.abs(speedRatio) * 0.75) -
      driftDirection * (CONFIG.player.driftVisualRoll ?? 0.055) * driftVisualRatio;
    const visualPitch = -(CONFIG.player.driftVisualPitch ?? 0.03) * driftVisualRatio;

    targetEuler.set(visualPitch, baseYaw + visualYaw, visualRoll);
    targetQuat.setFromEuler(targetEuler);
    playerCar.quaternion.slerp(targetQuat, 0.18);

    score += Math.abs(player.speed) * 10;
    return actualDistance;
  }

  function updateFuel(dt, input, moveDistance) {
    if (gameOver) return;
    if (playerMode !== "driving") return;
    if (player.isRefueling) return;

    let consumption = moveDistance * CONFIG.fuel.consumptionPerUnit;
    consumption += dt * CONFIG.fuel.idlePerSecond;

    if (input.accelerate) {
      consumption *= CONFIG.fuel.accelerationMultiplier;
    }

    player.fuel = Math.max(0, player.fuel - consumption);
  }

  function updateRefuelState(dt, gasAccess = null) {
    const access = gasAccess ?? getGasStationAccess();
    const sameStationNearby =
      !!access &&
      !!activeRefuelStationId &&
      access.stationId === activeRefuelStationId;

    if (
      playerMode !== "driving" ||
      !sameStationNearby ||
      Math.abs(player.speed) > 0.045
    ) {
      player.isRefueling = false;
      activeRefuelStationId = null;
      return;
    }

    if (player.fuel >= CONFIG.fuel.max - 0.001) {
      player.fuel = CONFIG.fuel.max;
      player.isRefueling = false;
      activeRefuelStationId = null;
      return;
    }

    player.speed = 0;
    player.isRefueling = true;
    player.fuel = Math.min(
      CONFIG.fuel.max,
      player.fuel + CONFIG.fuel.refuelRate * dt
    );
  }

  function chooseTrafficTurn(segment) {
    const info = world.getUpcomingIntersectionInfo(segment, segment.length);
    const valid = info?.validTurns ?? [0];
    return randChoice(valid);
  }

  function getTrafficTargetSpeed(vehicle) {
    let targetSpeed = vehicle.desiredSpeed;
    let closestGap = Infinity;
    let leadVehicle = null;

    for (const other of traffic) {
      if (other === vehicle) continue;
      if (!sameLogicalSegment(vehicle.segment, other.segment)) continue;
      if (Math.abs(vehicle.laneOffset - other.laneOffset) > 1.2) continue;

      const deltaS = other.segmentS - vehicle.segmentS;
      if (deltaS <= 0) continue;

      if (deltaS < closestGap) {
        closestGap = deltaS;
        leadVehicle = other;
      }
    }

    if (leadVehicle) {
      const minGap =
        vehicle.collisionRadiusZ + leadVehicle.collisionRadiusZ + 5;
      const slowGap =
        CONFIG.traffic.followDistance +
        vehicle.collisionRadiusZ +
        leadVehicle.collisionRadiusZ;

      if (closestGap <= minGap) {
        targetSpeed = 0;
      } else if (closestGap < slowGap) {
        const factor = clamp(
          (closestGap - minGap) / Math.max(0.001, slowGap - minGap),
          0,
          1
        );
        targetSpeed *= factor;
      }
    }

    return targetSpeed;
  }

  function updateTraffic(dt) {
    for (const car of traffic) {
      if (car.wrecked) continue;

      const targetSpeed = getTrafficTargetSpeed(car);
      car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 3.2);

      advanceVehicleAlongGraph(
        car,
        car.speed * dt * 60,
        world,
        chooseTrafficTurn
      );

      const pose = getVehiclePose(car, world);
      car.mesh.position.set(pose.x, 0, pose.z);
      car.mesh.rotation.set(0, Math.PI - pose.heading, 0);
    }
  }

  function triggerVehicleImpact(otherVehicle, playerLocal, otherLocal, otherPose) {
    if (gameOver) return;

    gameOver = true;
    failureLabel = "Impacto total";
    player.speed = 0;

    otherVehicle.speed = 0;
    otherVehicle.wrecked = true;

    setVehicleWreckState(playerCar, {
      impactX: playerLocal.x,
      impactZ: playerLocal.z,
      intensity: 1.18
    });

    setVehicleWreckState(otherVehicle.mesh, {
      impactX: otherLocal.x,
      impactZ: otherLocal.z,
      intensity: 1.05
    });

    const playerForward = new THREE.Vector3(
      Math.sin(player.pose.heading),
      0,
      -Math.cos(player.pose.heading)
    );

    const otherForward = new THREE.Vector3(
      Math.sin(otherPose.heading),
      0,
      -Math.cos(otherPose.heading)
    );

    destruction.triggerVehicleCrash(playerCar, {
      intensity: 1.24,
      forward: playerForward
    });

    destruction.triggerVehicleCrash(otherVehicle.mesh, {
      intensity: 1.06,
      forward: otherForward
    });
  }

  function triggerPedestrianImpact(hitVehicle, hitPose, characterState) {
    if (gameOver) return;

    gameOver = true;
    failureLabel = "Atropellado";
    characterDestroyed = true;
    playerCharacter.visible = false;

    hitVehicle.speed = 0;
    hitVehicle.wrecked = true;

    setVehicleWreckState(hitVehicle.mesh, {
      impactX: 0,
      impactZ: 1,
      intensity: 0.88
    });

    const hitForward = new THREE.Vector3(
      Math.sin(hitPose.heading),
      0,
      -Math.cos(hitPose.heading)
    );

    destruction.triggerVehicleCrash(hitVehicle.mesh, {
      intensity: 0.9,
      forward: hitForward,
      height: 0.92
    });

    destruction.triggerPedestrianHit(
      { x: characterState.x, z: characterState.z },
      hitPose.heading,
      Math.max(0.95, hitVehicle.speed * 5.4)
    );
  }

  function checkDrivingCollisions() {
    const playerOrigin = { x: player.pose.x, z: player.pose.z };
    const maxCollisionRadius = CONFIG.player.collisionRadiusZ + 5.2;
    const maxCollisionDistSq = maxCollisionRadius * maxCollisionRadius;

    for (const car of traffic) {
      if (car.wrecked) continue;
      const dx = car.mesh.position.x - playerOrigin.x;
      const dz = car.mesh.position.z - playerOrigin.z;
      if (dx * dx + dz * dz > maxCollisionDistSq) continue;

      const local = localizePoint(
        { x: car.mesh.position.x, z: car.mesh.position.z },
        playerOrigin,
        player.pose.heading
      );

      if (
        Math.abs(local.x) <
          CONFIG.player.collisionRadiusX + car.collisionRadiusX &&
        Math.abs(local.z) <
          CONFIG.player.collisionRadiusZ + car.collisionRadiusZ
      ) {
        const otherPose = getVehiclePose(car, world);
        const otherLocal = localizePoint(
          { x: player.pose.x, z: player.pose.z },
          { x: otherPose.x, z: otherPose.z },
          otherPose.heading
        );

        triggerVehicleImpact(car, local, otherLocal, otherPose);
        break;
      }
    }
  }

  function checkPedestrianTrafficCollisions(characterState) {
    const maxCollisionRadius = CONFIG.onFoot.hitboxRadius + 5.2;
    const maxCollisionDistSq = maxCollisionRadius * maxCollisionRadius;

    for (const car of traffic) {
      if (car.wrecked) continue;

      const pose = getVehiclePose(car, world);
      const dx = pose.x - characterState.x;
      const dz = pose.z - characterState.z;
      if (dx * dx + dz * dz > maxCollisionDistSq) continue;

      const local = localizePoint(
        { x: characterState.x, z: characterState.z },
        { x: pose.x, z: pose.z },
        pose.heading
      );

      if (
        Math.abs(local.x) <
          CONFIG.onFoot.hitboxRadius + car.collisionRadiusX &&
        Math.abs(local.z) <
          CONFIG.onFoot.hitboxRadius + car.collisionRadiusZ
      ) {
        triggerPedestrianImpact(car, pose, characterState);
        break;
      }
    }
  }

  function triggerShotOnVehicle(vehicle, shot, lateral, pose) {
    vehicle.speed = 0;
    vehicle.wrecked = true;

    setVehicleWreckState(vehicle.mesh, {
      impactX: lateral,
      impactZ: 1,
      intensity: shot.weaponId === "shotgun" ? 1.18 : 0.98
    });

    const forward = new THREE.Vector3(
      Math.sin(pose.heading),
      0,
      -Math.cos(pose.heading)
    );

    destruction.triggerVehicleCrash(vehicle.mesh, {
      intensity: shot.weaponId === "shotgun" ? 1.28 : 1.02,
      forward,
      height: 0.95
    });
  }

  function triggerShotOnPedestrian(hit) {
    const removed = world.destroyPedestrian(hit.id);
    if (!removed) return;

    destruction.triggerPedestrianHit(
      removed,
      hit.heading,
      hit.intensity
    );
  }

  function getShotOriginAndDirection(shot, characterState, aimControl = null) {
    const hasAimDirection =
      typeof aimControl?.aimDirection?.x === "number" &&
      typeof aimControl?.aimDirection?.y === "number" &&
      typeof aimControl?.aimDirection?.z === "number";
    const aimHeading = typeof aimControl?.aimHeading === "number"
      ? aimControl.aimHeading
      : characterState.heading;
    const aimBlend = typeof aimControl?.aimBlend === "number"
      ? aimControl.aimBlend
      : 0;
    const planarSpeed = characterState.planarSpeed ?? 0;
    const moveFactor = Math.min(1.35, planarSpeed / CONFIG.onFoot.runSpeed);
    const aimingMultiplier = THREE.MathUtils.lerp(1, 0.24, aimBlend);
    const spreadByWeapon = {
      pistol: 0.026,
      shotgun: 0.08,
      rifle: 0.03
    };
    const baseSpread =
      (spreadByWeapon[shot?.weaponId] ?? 0.028) *
      (1 + moveFactor * 0.95) *
      aimingMultiplier;
    const spreadX = (Math.random() * 2 - 1) * baseSpread;
    const spreadY = (Math.random() * 2 - 1) * baseSpread;
    const muzzlePose = getPlayerCharacterWeaponMuzzlePose(playerCharacter);

    function withSpread(direction) {
      const forward = direction.clone().normalize();
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));
      if (right.lengthSq() < 0.0001) {
        right.set(1, 0, 0);
      } else {
        right.normalize();
      }
      const up = new THREE.Vector3().crossVectors(right, forward).normalize();
      return forward
        .addScaledVector(right, spreadX)
        .addScaledVector(up, spreadY)
        .normalize();
    }

    if (muzzlePose) {
      const tracerForward3D = hasAimDirection
        ? withSpread(new THREE.Vector3(
            aimControl.aimDirection.x,
            aimControl.aimDirection.y,
            aimControl.aimDirection.z
          ))
        : withSpread(muzzlePose.forward.clone());
      const flatForward = new THREE.Vector3(
        tracerForward3D.x,
        0,
        tracerForward3D.z
      );

      if (flatForward.lengthSq() > 0.0001) {
        flatForward.normalize();

        return {
          origin2D: {
            x: muzzlePose.position.x,
            z: muzzlePose.position.z
          },
          start3D: new THREE.Vector3(
            muzzlePose.position.x,
            muzzlePose.position.y,
            muzzlePose.position.z
          ),
          forwardX: flatForward.x,
          forwardZ: flatForward.z,
          rightX: -flatForward.z,
          rightZ: flatForward.x,
          tracerForward3D
        };
      }
    }

    const forwardX = Math.sin(aimHeading);
    const forwardZ = -Math.cos(aimHeading);
    const tracerForward3D = hasAimDirection
      ? withSpread(new THREE.Vector3(
          aimControl.aimDirection.x,
          aimControl.aimDirection.y,
          aimControl.aimDirection.z
        ))
      : withSpread(new THREE.Vector3(forwardX, 0, forwardZ));

    return {
      origin2D: {
        x: characterState.x + forwardX * 0.72,
        z: characterState.z + forwardZ * 0.72
      },
      start3D: new THREE.Vector3(
        characterState.x + forwardX * 0.72,
        1.46 + (characterState.jumpOffset ?? 0),
        characterState.z + forwardZ * 0.72
      ),
      forwardX,
      forwardZ,
      rightX: -forwardZ,
      rightZ: forwardX,
      tracerForward3D
    };
  }

  function fireWeapon(shot, characterState, aimControl = null) {
    const shotPose = getShotOriginAndDirection(shot, characterState, aimControl);
    const {
      origin2D,
      start3D,
      forwardX,
      forwardZ,
      rightX,
      rightZ,
      tracerForward3D
    } = shotPose;

    let bestHit = null;

    for (const ped of world.getPedestrianTargets()) {
      const dx = ped.x - origin2D.x;
      const dz = ped.z - origin2D.z;

      const forward = dx * forwardX + dz * forwardZ;
      const lateral = dx * rightX + dz * rightZ;
      const maxLateral = ped.radius + shot.hitRadius * 0.48;

      if (forward < 0 || forward > shot.range) continue;
      if (Math.abs(lateral) > maxLateral) continue;

      if (!bestHit || forward < bestHit.forward) {
        bestHit = {
          type: "pedestrian",
          id: ped.id,
          x: ped.x,
          z: ped.z,
          forward,
          lateral,
          heading: typeof aimControl?.aimHeading === "number"
            ? aimControl.aimHeading
            : characterState.heading,
          intensity: shot.weaponId === "shotgun" ? 1.22 : 1.02
        };
      }
    }

    for (const vehicle of traffic) {
      if (vehicle.wrecked) continue;

      const pose = getVehiclePose(vehicle, world);
      const dx = pose.x - origin2D.x;
      const dz = pose.z - origin2D.z;

      const forward = dx * forwardX + dz * forwardZ;
      const lateral = dx * rightX + dz * rightZ;
      const maxLateral = vehicle.collisionRadiusX + shot.hitRadius;

      if (forward < 0 || forward > shot.range) continue;
      if (Math.abs(lateral) > maxLateral) continue;

      if (!bestHit || forward < bestHit.forward) {
        bestHit = {
          type: "vehicle",
          vehicle,
          pose,
          forward,
          lateral
        };
      }
    }

    const visibleDistance = bestHit
      ? Math.min(bestHit.forward, shot.visualTracerLength ?? 9)
      : (shot.visualTracerLength ?? 9);

    const tracerEnd = start3D.clone().addScaledVector(
      tracerForward3D,
      Math.max(0.2, visibleDistance)
    );

    spawnShotTracer(start3D, tracerEnd, shot);

    if (!bestHit) return;

    if (bestHit.type === "pedestrian") {
      triggerShotOnPedestrian(bestHit);
      return;
    }

    triggerShotOnVehicle(
      bestHit.vehicle,
      shot,
      bestHit.lateral,
      bestHit.pose
    );
  }

  function getTurnSignal(upcomingIntersection) {
    return 0;
  }

  function update(input, dt, controlContext = null) {
    let moveDistance = 0;
    let upcomingIntersection = null;
    let gasAccess = null;
    let walkingGasAccess = null;
    let missionInteraction = null;
    let inWeaponShopCounter = false;

    if (!gameOver) {
      updateHotbarSelection(input);

      if (playerMode === "driving") {
        weapons.update(dt, input, {
          playerMode,
          inShop: false
        });

        const turnSensitivity = clamp(
          controlContext?.thirdPersonTurnSensitivity ?? 1,
          0.5,
          2.5
        );
        updateDrivingInput(input, dt, turnSensitivity);

        gasAccess = getGasStationAccess();

        const enteredStation = tryEnterGasStation(input, gasAccess);
        if (!enteredStation) {
          tryExitVehicle(input, gasAccess);
        }

        if (playerMode === "driving") {
          moveDistance = updateDrivingPlayer(dt);
          gasAccess = getGasStationAccess();
          updateFuel(dt, input, moveDistance);
          updateRefuelState(dt, gasAccess);
          upcomingIntersection = null;
        }
      } else {
        const characterStateNow = character.update(
          input,
          dt,
          [getPlayerVehicleBlocker()],
          controlContext
        );

        inWeaponShopCounter = world.isPlayerNearWeaponShopCounter(characterStateNow);

        weapons.update(dt, input, {
          playerMode,
          inShop: inWeaponShopCounter
        });

        missionInteraction = pizzaDelivery.getInteraction(
          playerMode,
          characterStateNow
        );
        walkingGasAccess = getWalkingGasStationAccess(characterStateNow);
        const { selectedItem } = getSelectedHotbarItem();

        const interactPressed = isInteractPressed(input);
        const justPressed = interactPressed && !prevInteract;

        if (justPressed && inWeaponShopCounter) {
          const purchase = weapons.tryBuy(money);
          if (purchase.success) {
            money = purchase.money;
          }
        } else if (justPressed && walkingGasAccess) {
          if (
            inventory.fuelCans < inventory.maxFuelCans &&
            money >= (CONFIG.fuel.portableCanPrice ?? 16)
          ) {
            inventory.fuelCans += 1;
            money -= (CONFIG.fuel.portableCanPrice ?? 16);
          }
        } else if (justPressed && selectedItem?.kind === "fuel") {
          tryPourFuelToCar(characterStateNow);
        } else if (justPressed && missionInteraction) {
          const result = pizzaDelivery.handleInteract(playerMode, characterStateNow);
          if (result.handled && result.type === "deliver") {
            money += result.rewardMoney ?? 0;
          }
        } else {
          tryEnterVehicleFromFoot(input, characterStateNow);
        }

        const missionStateNow = pizzaDelivery.getState();
        const hotbarStateNow = getSelectedHotbarItem();
        const shot = weapons.tryFire({
          playerMode,
          blocked: hotbarStateNow.selectedItem?.kind !== "weapon"
        });

        if (shot) {
          fireWeapon(shot, characterStateNow, controlContext);
        }
      }

      if (!gameOver) {
        updateTraffic(dt);

        if (playerMode === "driving") {
          checkDrivingCollisions();
        } else {
          checkPedestrianTrafficCollisions(character.getState());
        }
      }
    } else {
      weapons.update(dt, input, {
        playerMode,
        inShop: false
      });
    }

    updateShotTracers(dt);
    destruction.update(dt);

    const characterState = character.getState();
    const missionState = pizzaDelivery.getState();
    const fuelRatio = player.fuel / CONFIG.fuel.max;
    const inGasStation = !!gasAccess || player.isRefueling;
    const vehicleSurface =
      playerMode === "driving"
        ? (world.getSurfaceType?.(player.pose.x, player.pose.z) ?? "road")
        : (world.getSurfaceType?.(player.pose.x, player.pose.z) ?? "road");
    const weaponHud = weapons.getHUDState(inWeaponShopCounter);
    const inventorySlots = buildInventorySlots();
    const portableFuelLiters = inventory.fuelCans * inventory.fuelPerCan;
    const hotbarState = getSelectedHotbarItem();

    let actionPrompt = "";

    if (!gameOver) {
      if (playerMode === "walking") {
        if (inWeaponShopCounter) {
          actionPrompt = weapons.getShopPrompt(money);
        } else if (walkingGasAccess) {
          if (inventory.fuelCans >= inventory.maxFuelCans) {
            actionPrompt = `Garrafas al máximo · ${walkingGasAccess.brand}`;
          } else if (money < (CONFIG.fuel.portableCanPrice ?? 16)) {
            actionPrompt = `Falta dinero para garrafa · ${walkingGasAccess.brand}`;
          } else {
            actionPrompt =
              `Llenar garrafa [E] · ${inventory.fuelPerCan} L · $${CONFIG.fuel.portableCanPrice ?? 16} · ${walkingGasAccess.brand}`;
          }
        } else if (hotbarState.selectedItem?.kind === "fuel" && canPourFuelToCar(characterState)) {
          actionPrompt = `Verter garrafa [E] · +${inventory.fuelPerCan} L al coche`;
        } else if (missionInteraction?.prompt) {
          actionPrompt = missionInteraction.prompt;
        } else if (canEnterVehicle(characterState)) {
          actionPrompt = "Entrar al coche [E]";
        } else if (weaponHud.hasEquippedWeapon && hotbarState.selectedItem?.kind === "weapon") {
          actionPrompt = `Disparar [Click] · ${weaponHud.equippedShortLabel} · ${weaponHud.ammo} balas`;
        }
      } else if (gasAccess) {
        if (player.fuel >= CONFIG.fuel.max - 0.001) {
          actionPrompt = `Depósito lleno · ${gasAccess.brand}`;
        } else if (Math.abs(player.speed) > 0.035) {
          actionPrompt = `Frena junto al surtidor · ${gasAccess.brand}`;
        } else if (player.isRefueling) {
          actionPrompt = `Echando gasolina... · ${gasAccess.brand}`;
        } else {
          actionPrompt = `Echar gasolina [E] · ${gasAccess.brand}`;
        }
      } else if (canExitVehicle()) {
        actionPrompt = "Salir del coche [E]";
      }
    }

    prevInteract = isInteractPressed(input);

    const activePose =
      playerMode === "walking"
        ? {
            x: characterState.x,
            z: characterState.z,
            heading: characterState.heading
          }
        : player.pose;

    const walkingSpeedKmh = Math.round(characterState.planarSpeed * 70);

    return {
      score: Math.floor(score),
      money,
      gameOver,
      failureLabel,

      playerMode,
      playerPose: activePose,
      vehiclePose: player.pose,
      vehicleSurface,
      upcomingIntersection: playerMode === "driving" ? upcomingIntersection : null,

      speedKmh:
        playerMode === "walking"
          ? walkingSpeedKmh
          : Math.round(Math.abs(player.speed) * 150),

      rawSpeed:
        playerMode === "walking"
          ? characterState.planarSpeed
          : Math.abs(player.speed),

      steer:
        playerMode === "driving"
          ? player.steer
          : 0,

      isBraking:
        playerMode === "driving" &&
        !gameOver &&
        (input.brake || input.handbrake) &&
        Math.abs(player.speed) > 0.01,

      isHandbraking:
        playerMode === "driving" &&
        !gameOver &&
        !!input.handbrake &&
        Math.abs(player.speed) > 0.01,

      isAccelerating:
        playerMode === "driving" &&
        !gameOver &&
        input.accelerate &&
        player.fuel > 0.001,

      turnSignal:
        playerMode === "driving"
          ? getTurnSignal(upcomingIntersection)
          : 0,

      fuelPct: Math.round(fuelRatio * 100),
      fuelLiters: Math.round(player.fuel * 10) / 10,
      lowFuel: fuelRatio <= CONFIG.fuel.lowThreshold,
      criticalFuel: fuelRatio <= CONFIG.fuel.criticalThreshold,
      outOfFuel: player.fuel <= 0.001,

      isRefueling: player.isRefueling,
      inGasStation,

      actionPrompt,
      missionState,
      weaponHud,
      inventoryHud: {
        itemCount: inventorySlots.filter(Boolean).length,
        pizzaBoxes: inventory.pizzaBoxes,
        pizzaCapacity: inventory.maxPizzaBoxes,
        fuelCans: inventory.fuelCans,
        portableFuelLiters,
        slots: inventorySlots.map((slot, index) => ({
          index,
          key: index < HOTBAR_SLOT_COUNT ? index + 1 : null,
          label: slot?.label ?? "",
          detail: slot?.detail ?? "",
          kind: slot?.kind ?? null,
          empty: !slot,
          active: index === selectedHotbarSlot
        })),
        selectedSlot: selectedHotbarSlot,
        activeItemKind: hotbarState.selectedItem?.kind ?? null,
        activeItemLabel: hotbarState.selectedItem?.label ?? "",
        hotbarSlots: hotbarState.hotbarSlots.map((slot, index) => ({
          index,
          key: index + 1,
          label: slot?.label ?? "",
          detail: slot?.detail ?? "",
          empty: !slot
        }))
      },

      characterState: {
        visible: playerMode === "walking" && !characterDestroyed,
        x: characterState.x,
        z: characterState.z,
        heading: characterState.heading,
        aimPitch: typeof controlContext?.aimPitch === "number"
          ? controlContext.aimPitch
          : 0,
        aiming: !!controlContext?.aiming,
        aimBlend: typeof controlContext?.aimBlend === "number"
          ? controlContext.aimBlend
          : 0,
        planarSpeed: characterState.planarSpeed,
        jumpOffset: characterState.jumpOffset,
        onGround: characterState.onGround,
        carryingPizza:
          hotbarState.selectedItem?.kind === "pizza" && inventory.pizzaBoxes > 0,
        weapon: weapons.getVisualState()
      }
    };
  }

  return {
    reset,
    update,
    moveInventorySlot
  };
}
