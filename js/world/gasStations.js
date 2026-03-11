import * as THREE from "three";
import { CONFIG } from "../config.js";
import {
  rightVectorFromDir,
  normalizeAngle
} from "./math.js";

function headingFromDelta(dx, dz) {
  return Math.atan2(dx, -dz);
}

function forwardFromHeading(heading) {
  return {
    x: Math.sin(heading),
    z: -Math.cos(heading)
  };
}

function distanceSq(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

function minHeadingDelta(a, b) {
  const d1 = Math.abs(normalizeAngle(a - b));
  const d2 = Math.abs(normalizeAngle(a - (b + Math.PI)));
  return Math.min(d1, d2);
}

function createRoadsidePoint(graph, roadSegment, s, dir, side, lateralOffset) {
  const base = graph.evaluateSegment(roadSegment, s, 0);
  const right = rightVectorFromDir(dir);

  return {
    x: base.x + right.x * side * lateralOffset,
    z: base.z + right.y * side * lateralOffset
  };
}

function createCanvasLabel(text, bg = "#1f2937", fg = "#ffffff") {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#fbbf24";
  ctx.fillRect(20, 20, 26, canvas.height - 40);

  ctx.fillStyle = fg;
  ctx.font = "bold 72px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2 + 18, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function buildPathSegment(type, stationId, points, extra = {}) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(p.x, 0, p.z)),
    false,
    "centripetal",
    0.35
  );

  const samples3 = curve.getPoints(Math.max(18, points.length * 10));
  const samples = samples3.map((p) => ({ x: p.x, z: p.z }));
  const lengths = [0];

  let total = 0;
  for (let i = 1; i < samples.length; i++) {
    total += Math.hypot(
      samples[i].x - samples[i - 1].x,
      samples[i].z - samples[i - 1].z
    );
    lengths.push(total);
  }

  return {
    type,
    stationId,
    samples,
    sampleLengths: lengths,
    length: total,
    ...extra
  };
}

function evaluatePathSegment(segment, distanceAlongSegment) {
  const lengths = segment.sampleLengths;
  const samples = segment.samples;

  if (!samples.length) {
    return { x: 0, z: 0, heading: 0 };
  }

  if (samples.length === 1 || segment.length <= 0.0001) {
    return {
      x: samples[0].x,
      z: samples[0].z,
      heading: segment.fixedHeading ?? 0
    };
  }

  const d = THREE.MathUtils.clamp(distanceAlongSegment, 0, segment.length);

  let idx = 1;
  while (idx < lengths.length && lengths[idx] < d) idx++;

  const aIndex = Math.max(0, idx - 1);
  const bIndex = Math.min(samples.length - 1, idx);

  const a = samples[aIndex];
  const b = samples[bIndex];

  const la = lengths[aIndex];
  const lb = lengths[bIndex];
  const span = Math.max(0.0001, lb - la);
  const t = THREE.MathUtils.clamp((d - la) / span, 0, 1);

  const x = THREE.MathUtils.lerp(a.x, b.x, t);
  const z = THREE.MathUtils.lerp(a.z, b.z, t);

  const ta = samples[Math.max(0, aIndex - 1)];
  const tb = samples[Math.min(samples.length - 1, bIndex + 1)];
  const heading = headingFromDelta(tb.x - ta.x, tb.z - ta.z);

  return { x, z, heading };
}

function createPumpIsland() {
  const group = new THREE.Group();

  const island = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.24, 5.6),
    new THREE.MeshStandardMaterial({ color: 0xd1d5db })
  );
  island.position.y = 0.12;
  group.add(island);

  const pumpBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 1.8, 0.8),
    new THREE.MeshStandardMaterial({
      color: 0xef4444,
      metalness: 0.12,
      roughness: 0.45
    })
  );
  pumpBody.position.set(0, 1.05, 0);
  group.add(pumpBody);

  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.28, 0.04),
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: 0x0b2540,
      emissiveIntensity: 0.9
    })
  );
  screen.position.set(0, 1.35, 0.42);
  group.add(screen);

  const hose = new THREE.Mesh(
    new THREE.TorusGeometry(0.32, 0.03, 10, 22, Math.PI),
    new THREE.MeshStandardMaterial({ color: 0x111827 })
  );
  hose.rotation.set(Math.PI / 2, 0, Math.PI / 2);
  hose.position.set(0.22, 1.02, -0.12);
  group.add(hose);

  return group;
}

function createGasStationVisual(station) {
  const group = new THREE.Group();

  const roadAlignedRotation =
    station.dir === "N" || station.dir === "S" ? Math.PI / 2 : 0;

  const apron = new THREE.Mesh(
    new THREE.BoxGeometry(58, 0.12, 20),
    new THREE.MeshStandardMaterial({ color: 0x4b5563 })
  );
  apron.position.set(station.apronCenter.x, 0.02, station.apronCenter.z);
  apron.rotation.y = roadAlignedRotation;
  group.add(apron);

  const canopy = new THREE.Mesh(
    new THREE.BoxGeometry(18, 0.5, 10.5),
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.1,
      roughness: 0.38
    })
  );
  canopy.position.set(station.canopyCenter.x, 5.6, station.canopyCenter.z);
  canopy.rotation.y = roadAlignedRotation;
  group.add(canopy);

  const pillarGeom = new THREE.BoxGeometry(0.45, 5.2, 0.45);
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0xe5e7eb });

  for (const p of station.canopyPillars) {
    const pillar = new THREE.Mesh(pillarGeom, pillarMat);
    pillar.position.set(p.x, 2.6, p.z);
    group.add(pillar);
  }

  for (const p of station.pumpPositions) {
    const island = createPumpIsland();
    island.position.set(p.x, 0.02, p.z);
    island.rotation.y = roadAlignedRotation;
    group.add(island);
  }

  const kiosk = new THREE.Mesh(
    new THREE.BoxGeometry(11.5, 5.4, 8.4),
    new THREE.MeshStandardMaterial({ color: 0xd6d3d1 })
  );
  kiosk.position.set(station.kioskCenter.x, 2.7, station.kioskCenter.z);
  kiosk.rotation.y = roadAlignedRotation;
  group.add(kiosk);

  const kioskRoof = new THREE.Mesh(
    new THREE.BoxGeometry(12.2, 0.35, 9.1),
    new THREE.MeshStandardMaterial({ color: 0x1f2937 })
  );
  kioskRoof.position.set(station.kioskCenter.x, 5.55, station.kioskCenter.z);
  kioskRoof.rotation.y = roadAlignedRotation;
  group.add(kioskRoof);

  const frontGlass = new THREE.Mesh(
    new THREE.BoxGeometry(6.8, 1.9, 0.12),
    new THREE.MeshStandardMaterial({
      color: 0x9ed6ff,
      emissive: 0x0b1b2d,
      emissiveIntensity: 0.45,
      roughness: 0.18
    })
  );
  frontGlass.position.set(
    station.kioskGlass.x,
    2.55,
    station.kioskGlass.z
  );
  frontGlass.rotation.y = roadAlignedRotation;
  group.add(frontGlass);

  const signPole = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 5.6, 0.5),
    new THREE.MeshStandardMaterial({ color: 0xd1d5db })
  );
  signPole.position.set(station.totemBase.x, 2.8, station.totemBase.z);
  group.add(signPole);

  const signPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 2.2),
    new THREE.MeshBasicMaterial({
      map: createCanvasLabel(station.brand),
      transparent: false,
      side: THREE.DoubleSide
    })
  );
  signPanel.position.set(station.totemBase.x, 6.4, station.totemBase.z);
  signPanel.rotation.y = roadAlignedRotation;
  group.add(signPanel);

  const drivewayMat = new THREE.MeshStandardMaterial({ color: 0x505760 });

  for (const d of station.drivewayVisuals) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(d.length, 0.08, d.width),
      drivewayMat
    );
    mesh.position.set(d.x, 0.01, d.z);
    mesh.rotation.y = d.rotY;
    group.add(mesh);
  }

  return group;
}

export function createGasStationController(scene, graph) {
  const step = graph.step;
  const laneMin = Math.min(...graph.laneCenters);
  const laneMax = Math.max(...graph.laneCenters);

  const stationDefs = [
    {
      id: "station_spawn_right",
      brand: "ROAD FUEL",
      fromNodeId: `0,${2 * step}`,
      dir: "N",
      side: 1,
      entryS: 78,
      exitS: 150
    },
    {
      id: "station_top_west",
      brand: "PETROX",
      fromNodeId: `${-2 * step},${-2 * step}`,
      dir: "E",
      side: -1,
      entryS: 88,
      exitS: 156
    },
    {
      id: "station_left_south",
      brand: "NOVA FUEL",
      fromNodeId: `${-2 * step},${2 * step}`,
      dir: "N",
      side: -1,
      entryS: 86,
      exitS: 154
    },
    {
      id: "station_right_north",
      brand: "CITY OIL",
      fromNodeId: `${2 * step},${-step}`,
      dir: "S",
      side: -1,
      entryS: 82,
      exitS: 150
    }
  ];

  const stations = [];
  const stationMap = new Map();
  const reservedAreas = [];

  function registerReservedArea(x, z, radius) {
    reservedAreas.push({ x, z, radius });
  }

  function isReservedArea(x, z, padding = 0) {
    return reservedAreas.some((area) => {
      const dx = x - area.x;
      const dz = z - area.z;
      const r = area.radius + padding;
      return dx * dx + dz * dz <= r * r;
    });
  }

  function buildStation(def) {
    const road = graph.buildRoadSegment(def.fromNodeId, def.dir);
    if (!road) return null;

    const side = def.side;
    const dir = def.dir;
    const accessLaneOffset = side > 0 ? laneMax : laneMin;
    const midS = (def.entryS + def.exitS) * 0.5;

    const curbIn = createRoadsidePoint(
      graph,
      road,
      def.entryS,
      dir,
      side,
      CONFIG.roadWidth / 2 + 4.8
    );

    const bayEntry = createRoadsidePoint(
      graph,
      road,
      def.entryS + 12,
      dir,
      side,
      CONFIG.roadWidth / 2 + 13.6
    );

    const stopStart = createRoadsidePoint(
      graph,
      road,
      midS - 4,
      dir,
      side,
      CONFIG.roadWidth / 2 + 13.9
    );

    const stopEnd = createRoadsidePoint(
      graph,
      road,
      midS + 4,
      dir,
      side,
      CONFIG.roadWidth / 2 + 13.9
    );

    const bayExit = createRoadsidePoint(
      graph,
      road,
      def.exitS - 12,
      dir,
      side,
      CONFIG.roadWidth / 2 + 13.6
    );

    const curbOut = createRoadsidePoint(
      graph,
      road,
      def.exitS,
      dir,
      side,
      CONFIG.roadWidth / 2 + 4.8
    );

    const mergePose = graph.evaluateSegment(road, def.exitS, accessLaneOffset);

    const apronCenter = createRoadsidePoint(
      graph,
      road,
      midS,
      dir,
      side,
      CONFIG.roadWidth / 2 + 18.2
    );

    const canopyCenter = createRoadsidePoint(
      graph,
      road,
      midS,
      dir,
      side,
      CONFIG.roadWidth / 2 + 14.8
    );

    const kioskCenter = createRoadsidePoint(
      graph,
      road,
      midS + 19,
      dir,
      side,
      CONFIG.roadWidth / 2 + 24.6
    );

    const kioskGlass = createRoadsidePoint(
      graph,
      road,
      midS + 13.6,
      dir,
      side,
      CONFIG.roadWidth / 2 + 20.35
    );

    const totemBase = createRoadsidePoint(
      graph,
      road,
      def.entryS + 8,
      dir,
      side,
      CONFIG.roadWidth / 2 + 8.1
    );

    const pumpPositions = [
      createRoadsidePoint(graph, road, midS - 7, dir, side, CONFIG.roadWidth / 2 + 14.4),
      createRoadsidePoint(graph, road, midS + 7, dir, side, CONFIG.roadWidth / 2 + 14.4)
    ];

    const canopyPillars = [
      createRoadsidePoint(graph, road, midS - 8, dir, side, CONFIG.roadWidth / 2 + 10.8),
      createRoadsidePoint(graph, road, midS - 8, dir, side, CONFIG.roadWidth / 2 + 18.8),
      createRoadsidePoint(graph, road, midS + 8, dir, side, CONFIG.roadWidth / 2 + 10.8),
      createRoadsidePoint(graph, road, midS + 8, dir, side, CONFIG.roadWidth / 2 + 18.8)
    ];

    const roadAlignedRotation =
      dir === "N" || dir === "S" ? Math.PI / 2 : 0;

    const drivewayVisuals = [
      {
        x: (curbIn.x + bayEntry.x) * 0.5,
        z: (curbIn.z + bayEntry.z) * 0.5,
        length: Math.hypot(bayEntry.x - curbIn.x, bayEntry.z - curbIn.z),
        width: 8.6,
        rotY: roadAlignedRotation
      },
      {
        x: (bayExit.x + curbOut.x) * 0.5,
        z: (bayExit.z + curbOut.z) * 0.5,
        length: Math.hypot(curbOut.x - bayExit.x, curbOut.z - bayExit.z),
        width: 8.6,
        rotY: roadAlignedRotation
      }
    ];

    const triggerCenter = {
      x: (curbIn.x + bayEntry.x) * 0.5,
      z: (curbIn.z + bayEntry.z) * 0.5
    };

    const stopSegment = buildPathSegment(
      "gas-stop",
      def.id,
      [stopStart, stopEnd],
      {
        fixedHeading: headingFromDelta(stopEnd.x - stopStart.x, stopEnd.z - stopStart.z)
      }
    );

    const exitSegment = buildPathSegment(
      "gas-exit",
      def.id,
      [stopEnd, bayExit, curbOut, { x: mergePose.x, z: mergePose.z }],
      {
        returnRoadFromNodeId: def.fromNodeId,
        returnRoadDir: def.dir,
        returnRoadS: def.exitS,
        returnLaneOffset: accessLaneOffset
      }
    );

    const station = {
      ...def,
      road,
      side,
      accessLaneOffset,
      approachHeading: road.heading,
      entryWindowStart: def.entryS - CONFIG.fuel.entryWindowHalfSize,
      entryWindowEnd: def.entryS + CONFIG.fuel.entryWindowHalfSize,
      apronCenter,
      canopyCenter,
      kioskCenter,
      kioskGlass,
      totemBase,
      canopyPillars,
      pumpPositions,
      drivewayVisuals,
      triggerCenter,
      curbIn,
      bayEntry,
      stopStart,
      stopEnd,
      bayExit,
      curbOut,
      mergePose,
      stopSegment,
      exitSegment
    };

    registerReservedArea(apronCenter.x, apronCenter.z, 30);
    return station;
  }

  function build() {
    for (const def of stationDefs) {
      const station = buildStation(def);
      if (!station) continue;

      stations.push(station);
      stationMap.set(station.id, station);

      const visual = createGasStationVisual(station);
      scene.add(visual);
    }
  }

  function isInsideEntryTrigger(playerPose, station) {
    const forward = forwardFromHeading(station.approachHeading);
    const right = rightVectorFromDir(station.dir);

    const dx = playerPose.x - station.triggerCenter.x;
    const dz = playerPose.z - station.triggerCenter.z;

    const localForward = dx * forward.x + dz * forward.z;
    const localRight = dx * right.x + dz * right.y;

    return (
      Math.abs(localForward) <= 18 &&
      Math.abs(localRight) <= 12
    );
  }

  function getCandidateScore(playerPose, station) {
    const d0 = distanceSq(playerPose, station.triggerCenter);
    const d1 = distanceSq(playerPose, station.curbIn);
    const d2 = distanceSq(playerPose, station.bayEntry);
    return Math.min(d0, d1, d2);
  }

  function getAvailableAccess(playerPose, segment, s, laneOffset, speed) {
    if (!playerPose) return null;
    if (speed > CONFIG.fuel.stationEnterSpeedMax + 0.1) return null;

    let best = null;
    let bestScore = Infinity;

    for (const station of stations) {
      const dTrigger = distanceSq(playerPose, station.triggerCenter);
      const dCurb = distanceSq(playerPose, station.curbIn);
      const dApron = distanceSq(playerPose, station.apronCenter);

      const nearEnough =
        dTrigger < 28 * 28 ||
        dCurb < 28 * 28 ||
        dApron < 40 * 40;

      if (!nearEnough) continue;

      const headingDelta = minHeadingDelta(
        playerPose.heading,
        station.approachHeading
      );

      const headingOk = headingDelta < 1.15 || dTrigger < 10 * 10;
      if (!headingOk) continue;

      const triggerOk =
        isInsideEntryTrigger(playerPose, station) ||
        dCurb < 16 * 16 ||
        dTrigger < 14 * 14;

      if (!triggerOk) continue;

      const score = getCandidateScore(playerPose, station);

      if (score < bestScore) {
        bestScore = score;
        best = {
          stationId: station.id,
          brand: station.brand
        };
      }
    }

    return best;
  }

  function createEntrySegment(playerPose, stationId) {
    const station = stationMap.get(stationId);
    if (!station) return null;

    const headingPoint = {
      x: playerPose.x + Math.sin(playerPose.heading) * 4.8,
      z: playerPose.z - Math.cos(playerPose.heading) * 4.8
    };

    return buildPathSegment(
      "gas-entry",
      station.id,
      [
        { x: playerPose.x, z: playerPose.z },
        headingPoint,
        station.curbIn,
        station.bayEntry,
        station.stopStart
      ]
    );
  }

  function isGasStationSegment(segment) {
    return !!segment && (
      segment.type === "gas-entry" ||
      segment.type === "gas-stop" ||
      segment.type === "gas-exit"
    );
  }

  function buildAfterSpecialSegment(segment) {
    const station = stationMap.get(segment.stationId);
    if (!station) return null;

    if (segment.type === "gas-entry") {
      return {
        mode: "segment",
        segment: station.stopSegment
      };
    }

    if (segment.type === "gas-stop") {
      return {
        mode: "segment",
        segment: station.exitSegment
      };
    }

    if (segment.type === "gas-exit") {
      return {
        mode: "merge",
        segment: graph.buildRoadSegment(
          station.exitSegment.returnRoadFromNodeId,
          station.exitSegment.returnRoadDir
        ),
        segmentS: station.exitSegment.returnRoadS,
        laneOffset: station.exitSegment.returnLaneOffset
      };
    }

    return null;
  }

  function evaluateSegment(segment, distanceAlongSegment) {
    return evaluatePathSegment(segment, distanceAlongSegment);
  }

  return {
    build,
    isReservedArea,
    getAvailableAccess,
    createEntrySegment,
    buildAfterSpecialSegment,
    evaluateSegment,
    isGasStationSegment
  };
}