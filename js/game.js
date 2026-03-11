import * as THREE from "three";
import { CONFIG } from "./config.js";
import { createTrafficCar, createTrafficTruck } from "./car.js";

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

export function createGame(scene, playerCar, world) {
  const traffic = [];

  const player = {
    segment: null,
    segmentS: 0,
    laneOffset: 0,
    laneVelocity: 0,
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
  let gameOver = false;
  let prevInteract = false;

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
      canLeaveGasStop: true
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

    player.segment = world.getStartRoad();
    player.segmentS = 0;
    player.laneOffset = 0;
    player.laneVelocity = 0;
    player.speed = 0;
    player.requestedTurn = 0;
    player.pose = world.evaluateSegment(player.segment, 0, 0);
    player.fuel = CONFIG.fuel.start;
    player.canLeaveGasStop = false;
    player.isRefueling = false;

    playerCar.position.set(player.pose.x, 0, player.pose.z);
    playerCar.rotation.set(0, Math.PI, 0);

    score = 0;
    gameOver = false;
    prevInteract = false;

    spawnTraffic();
  }

  function getGasStationAccess() {
    if (!player.segment || gameOver) return null;
    if (world.isGasStationSegment(player.segment)) return null;

    return world.getGasStationAccess(
      player.pose,
      player.segment,
      player.segmentS,
      player.laneOffset,
      player.speed
    );
  }

  function tryEnterGasStation(input) {
    const justPressed = input.interact && !prevInteract;
    if (!justPressed) return null;

    const access = getGasStationAccess();
    if (!access) return null;

    const entrySegment = world.createGasStationEntrySegment(
      player.pose,
      access.stationId
    );

    if (!entrySegment) return null;

    player.segment = entrySegment;
    player.segmentS = 0;
    player.laneOffset = 0;
    player.laneVelocity = 0;
    player.requestedTurn = 0;
    player.speed = Math.min(
      Math.max(player.speed, 0.07),
      CONFIG.fuel.serviceLaneMaxSpeed
    );
    player.canLeaveGasStop = false;
    player.isRefueling = false;

    return access;
  }

  function updatePlayerInput(input, dt) {
    if (gameOver) return;

    const onGasSegment = world.isGasStationSegment(player.segment);
    const outOfFuel = player.fuel <= 0.0001;

    if (onGasSegment) {
      if (player.segment.type === "gas-stop" && !player.canLeaveGasStop) {
        player.speed = 0;
        player.laneVelocity = 0;
        return;
      }

      if (!outOfFuel && input.accelerate) {
        player.speed += CONFIG.player.acceleration * 0.55 * dt * 60;
      } else {
        player.speed -= CONFIG.player.drag * 0.9 * dt * 60;
      }

      if (input.brake) {
        player.speed -= CONFIG.player.braking * 1.1 * dt * 60;
      }

      player.speed = clamp(player.speed, 0, CONFIG.fuel.serviceLaneMaxSpeed);
      player.laneVelocity = 0;
      return;
    }

    if (!outOfFuel && input.accelerate) {
      player.speed += CONFIG.player.acceleration * dt * 60;
    } else {
      player.speed -= CONFIG.player.drag * (outOfFuel ? 2.6 : 1) * dt * 60;
    }

    if (input.brake) {
      player.speed -= CONFIG.player.braking * dt * 60;
    }

    player.speed = clamp(player.speed, 0, CONFIG.player.maxSpeed);

    const upcoming = world.getUpcomingIntersectionInfo(
      player.segment,
      player.segmentS
    );

    const inChoiceWindow =
      upcoming && upcoming.remaining <= CONFIG.player.choiceWindow;

    if (inChoiceWindow) {
      if (input.left && !input.right) {
        player.requestedTurn = -1;
      } else if (input.right && !input.left) {
        player.requestedTurn = 1;
      } else if (!input.left && !input.right) {
        player.requestedTurn = 0;
      }

      player.laneVelocity *= 0.82;
    } else {
      let desiredLaneVelocity = 0;

      if (input.left && !input.right) {
        desiredLaneVelocity = -CONFIG.player.laneChangeSpeed;
      }

      if (input.right && !input.left) {
        desiredLaneVelocity = CONFIG.player.laneChangeSpeed;
      }

      player.laneVelocity +=
        (desiredLaneVelocity - player.laneVelocity) *
        Math.min(1, CONFIG.player.laneChangeResponse * dt);

      player.laneOffset += player.laneVelocity * dt * 60;
      player.laneOffset = clamp(
        player.laneOffset,
        -world.laneClamp,
        world.laneClamp
      );
    }

    if (player.segment.type !== "road") {
      player.laneOffset +=
        (0 - player.laneOffset) *
        Math.min(1, CONFIG.player.laneRecenterInTurn * dt);

      player.laneVelocity *= 0.82;
    }
  }

  function updatePlayer(dt) {
    const moveDistance = player.speed * dt * 60;

    advanceVehicleAlongGraph(player, moveDistance, world, (segment) => {
      const info = world.getUpcomingIntersectionInfo(segment, segment.length);
      const valid = info?.validTurns ?? [0];

      if (valid.includes(player.requestedTurn)) return player.requestedTurn;
      if (valid.includes(0)) return 0;
      return valid[0] ?? 0;
    });

    player.pose = getVehiclePose(player, world);
    playerCar.position.set(player.pose.x, 0, player.pose.z);

    const baseYaw = Math.PI - player.pose.heading;
    const visualYaw = world.isGasStationSegment(player.segment)
      ? 0
      : -player.laneVelocity * 0.25;

    let visualRoll = world.isGasStationSegment(player.segment)
      ? 0
      : -player.laneVelocity * 0.14;

    if (player.segment.type === "junction-turn") {
      visualRoll += -player.segment.turn * 0.12;
    }

    targetEuler.set(0, baseYaw + visualYaw, visualRoll);
    targetQuat.setFromEuler(targetEuler);
    playerCar.quaternion.slerp(targetQuat, 0.18);

    score += player.speed * 10;

    return moveDistance;
  }

  function updateFuel(dt, input, moveDistance) {
    if (gameOver) return;
    if (player.isRefueling) return;
    if (world.isGasStationSegment(player.segment)) return;

    let consumption = moveDistance * CONFIG.fuel.consumptionPerUnit;
    consumption += dt * CONFIG.fuel.idlePerSecond;

    if (input.accelerate) {
      consumption *= CONFIG.fuel.accelerationMultiplier;
    }

    player.fuel = Math.max(0, player.fuel - consumption);
  }

  function updateRefuelState(dt) {
    player.isRefueling = false;

    if (!player.segment || player.segment.type !== "gas-stop") return;
    if (player.segmentS < player.segment.length - 0.01) return;

    player.speed = 0;
    player.isRefueling = true;
    player.fuel = Math.min(
      CONFIG.fuel.max,
      player.fuel + CONFIG.fuel.refuelRate * dt
    );

    if (player.fuel >= CONFIG.fuel.max - 0.001) {
      player.fuel = CONFIG.fuel.max;
      player.isRefueling = false;
      player.canLeaveGasStop = true;
    }
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

  function checkCollisions() {
    const playerOrigin = { x: player.pose.x, z: player.pose.z };

    for (const car of traffic) {
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
        gameOver = true;
        player.speed = 0;
        break;
      }
    }
  }

  function getTurnSignal(upcomingIntersection) {
    if (player.segment?.type === "junction-turn") {
      return player.segment.turn;
    }

    if (
      upcomingIntersection &&
      upcomingIntersection.remaining <= CONFIG.player.choiceWindow &&
      upcomingIntersection.remaining > 3
    ) {
      return player.requestedTurn;
    }

    return 0;
  }

  function update(input, dt) {
    updatePlayerInput(input, dt);
    tryEnterGasStation(input);

    const moveDistance = updatePlayer(dt);
    updateFuel(dt, input, moveDistance);
    updateRefuelState(dt);

    updateTraffic(dt);
    checkCollisions();

    const upcomingIntersection = world.getUpcomingIntersectionInfo(
      player.segment,
      player.segmentS
    );

    const gasAccess = getGasStationAccess();
    const fuelRatio = player.fuel / CONFIG.fuel.max;

    prevInteract = input.interact;

    return {
      score: Math.floor(score),
      gameOver,
      speedKmh: Math.round(player.speed * 150),
      rawSpeed: player.speed,
      playerPose: player.pose,
      upcomingIntersection,
      isBraking: !gameOver && input.brake && player.speed > 0.01,
      isAccelerating: !gameOver && input.accelerate && player.fuel > 0.001,
      turnSignal: getTurnSignal(upcomingIntersection),

      fuelPct: Math.round(fuelRatio * 100),
      fuelLiters: Math.round(player.fuel * 10) / 10,
      lowFuel: fuelRatio <= CONFIG.fuel.lowThreshold,
      criticalFuel: fuelRatio <= CONFIG.fuel.criticalThreshold,
      outOfFuel: player.fuel <= 0.001,

      isRefueling: player.isRefueling,
      gasStationPrompt: gasAccess ? `Entrar gasolinera [E] · ${gasAccess.brand}` : ""
    };
  }

  return {
    reset,
    update
  };
}