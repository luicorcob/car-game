import * as THREE from "three";
import { CONFIG } from "../config.js";
import {
  rightVectorFromDir,
  normalizeAngle
} from "./math.js";

const ENTRY_FORWARD_PADDING = 5.8;
const ENTRY_EARLY_DISTANCE = 18;
const ENTRY_LATE_TOLERANCE = 10;
const ACCESS_DISTANCE_LIMIT = 36;
const ACCESS_HEADING_LIMIT = 0.78;
const OUTER_LANE_BLEND = 0.9;

function headingFromDelta(dx, dz) {
  return Math.atan2(dx, -dz);
}

function pointFromPose(pose) {
  return { x: pose.x, z: pose.z };
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

function sameRoad(a, b) {
  return !!a && !!b &&
    a.type === "road" &&
    b.type === "road" &&
    a.fromNodeId === b.fromNodeId &&
    a.toNodeId === b.toNodeId &&
    a.dir === b.dir;
}

function createRoadsidePoint(graph, roadSegment, s, dir, side, lateralOffset) {
  const base = graph.evaluateSegment(roadSegment, s, 0);
  const right = rightVectorFromDir(dir);

  return {
    x: base.x + right.x * side * lateralOffset,
    z: base.z + right.y * side * lateralOffset
  };
}

function createCanvasLabel(text, bg = "#1f2937", fg = "#ffffff", accent = "#fbbf24") {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = accent;
  ctx.fillRect(18, 18, 26, canvas.height - 36);

  ctx.fillStyle = fg;
  ctx.font = "bold 70px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2 + 16, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function compactPathPoints(points, minDistance = 1.15) {
  const out = [];

  for (const p of points) {
    if (!p) continue;
    if (!out.length) {
      out.push({ x: p.x, z: p.z });
      continue;
    }

    const prev = out[out.length - 1];
    if (Math.hypot(p.x - prev.x, p.z - prev.z) >= minDistance) {
      out.push({ x: p.x, z: p.z });
    }
  }

  if (out.length === 1) {
    out.push({ x: out[0].x, z: out[0].z + 0.01 });
  }

  return out;
}

function buildPathSegment(type, stationId, points, extra = {}) {
  const cleaned = compactPathPoints(points);

  const curve = new THREE.CatmullRomCurve3(
    cleaned.map((p) => new THREE.Vector3(p.x, 0, p.z)),
    false,
    "centripetal",
    0.38
  );

  const samples3 = curve.getPoints(Math.max(24, cleaned.length * 14));
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

function createAdvanceFuelSign(station) {
  const group = new THREE.Group();

  const pole = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 2.8, 0.24),
    new THREE.MeshStandardMaterial({ color: 0xcbd5e1 })
  );
  pole.position.set(station.advanceSignBase.x, 1.4, station.advanceSignBase.z);
  group.add(pole);

  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(2.8, 1.4),
    new THREE.MeshBasicMaterial({
      map: createCanvasLabel("FUEL", "#1d4ed8", "#ffffff", "#93c5fd"),
      side: THREE.DoubleSide
    })
  );
  panel.position.set(station.advanceSignBase.x, 3.05, station.advanceSignBase.z);
  panel.rotation.y = station.roadAlignedRotation;
  group.add(panel);

  const sub = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 0.72),
    new THREE.MeshBasicMaterial({
      map: createCanvasLabel("SERVICE", "#0f172a", "#e5e7eb", "#22c55e"),
      side: THREE.DoubleSide
    })
  );
  sub.position.set(station.advanceSignBase.x, 2.02, station.advanceSignBase.z);
  sub.rotation.y = station.roadAlignedRotation;
  group.add(sub);

  return group;
}

function createGasStationVisual(station) {
  const group = new THREE.Group();
  group.userData.editorRemovable = true;

  const serviceLot = new THREE.Mesh(
    new THREE.BoxGeometry(64, 0.14, 38),
    new THREE.MeshStandardMaterial({ color: 0x59616a })
  );
  serviceLot.position.set(station.serviceLotCenter.x, 0.02, station.serviceLotCenter.z);
  serviceLot.rotation.y = station.roadAlignedRotation;
  group.add(serviceLot);

  const roadsidePad = new THREE.Mesh(
    new THREE.BoxGeometry(64, 0.1, 12),
    new THREE.MeshStandardMaterial({ color: 0x666f78 })
  );
  roadsidePad.position.set(station.roadsidePadCenter.x, 0.03, station.roadsidePadCenter.z);
  roadsidePad.rotation.y = station.roadAlignedRotation;
  group.add(roadsidePad);

  const apron = new THREE.Mesh(
    new THREE.BoxGeometry(60, 0.12, 26),
    new THREE.MeshStandardMaterial({ color: 0x4b5563 })
  );
  apron.position.set(station.apronCenter.x, 0.04, station.apronCenter.z);
  apron.rotation.y = station.roadAlignedRotation;
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
  canopy.rotation.y = station.roadAlignedRotation;
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
    island.rotation.y = station.roadAlignedRotation;
    group.add(island);
  }

  const kiosk = new THREE.Mesh(
    new THREE.BoxGeometry(11.5, 5.4, 8.4),
    new THREE.MeshStandardMaterial({ color: 0xd6d3d1 })
  );
  kiosk.position.set(station.kioskCenter.x, 2.7, station.kioskCenter.z);
  kiosk.rotation.y = station.roadAlignedRotation;
  group.add(kiosk);

  const kioskRoof = new THREE.Mesh(
    new THREE.BoxGeometry(12.2, 0.35, 9.1),
    new THREE.MeshStandardMaterial({ color: 0x1f2937 })
  );
  kioskRoof.position.set(station.kioskCenter.x, 5.55, station.kioskCenter.z);
  kioskRoof.rotation.y = station.roadAlignedRotation;
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
  frontGlass.rotation.y = station.roadAlignedRotation;
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
  signPanel.rotation.y = station.roadAlignedRotation;
  group.add(signPanel);

  const drivewayMat = new THREE.MeshStandardMaterial({ color: 0x505760 });

  for (const d of station.drivewayVisuals) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(d.length, 0.08, d.width),
      drivewayMat
    );
    mesh.position.set(d.x, 0.05, d.z);
    mesh.rotation.y = d.rotY;
    group.add(mesh);
  }

  group.add(createAdvanceFuelSign(station));

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
    const mergeRoadS = THREE.MathUtils.clamp(def.exitS + 12, 0, road.length);

    const shoulderIn = createRoadsidePoint(
      graph,
      road,
      def.entryS - 3,
      dir,
      side,
      CONFIG.roadWidth / 2 + 2.4
    );

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

    const stopMid = createRoadsidePoint(
      graph,
      road,
      midS,
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

    const shoulderOut = createRoadsidePoint(
      graph,
      road,
      def.exitS + 2,
      dir,
      side,
      CONFIG.roadWidth / 2 + 2.4
    );

    const outerMergePose = graph.evaluateSegment(
      road,
      Math.max(def.exitS + 5, mergeRoadS - 5),
      accessLaneOffset * OUTER_LANE_BLEND
    );

    const mergePose = graph.evaluateSegment(road, mergeRoadS, accessLaneOffset);

    const roadsidePadCenter = createRoadsidePoint(
      graph,
      road,
      midS,
      dir,
      side,
      CONFIG.roadWidth / 2 + 10.4
    );

    const serviceLotCenter = createRoadsidePoint(
      graph,
      road,
      midS,
      dir,
      side,
      CONFIG.roadWidth / 2 + 18.2
    );

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

    const advanceSignBase = createRoadsidePoint(
      graph,
      road,
      def.entryS - 18,
      dir,
      side,
      CONFIG.roadWidth / 2 + 6.0
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
        width: 10.4,
        rotY: roadAlignedRotation
      },
      {
        x: (bayExit.x + curbOut.x) * 0.5,
        z: (bayExit.z + curbOut.z) * 0.5,
        length: Math.hypot(curbOut.x - bayExit.x, curbOut.z - bayExit.z),
        width: 10.4,
        rotY: roadAlignedRotation
      }
    ];

    const stopSegment = buildPathSegment(
      "gas-stop",
      def.id,
      [stopStart, stopMid, stopEnd],
      {
        fixedHeading: headingFromDelta(stopEnd.x - stopStart.x, stopEnd.z - stopStart.z)
      }
    );

    const exitSegment = buildPathSegment(
      "gas-exit",
      def.id,
      [stopEnd, bayExit, curbOut, shoulderOut, pointFromPose(outerMergePose), pointFromPose(mergePose)],
      {
        returnRoadFromNodeId: def.fromNodeId,
        returnRoadDir: def.dir,
        returnRoadS: mergeRoadS,
        returnLaneOffset: accessLaneOffset
      }
    );

    const station = {
      ...def,
      road,
      side,
      accessLaneOffset,
      approachHeading: road.heading,
      entryWindowStart: def.entryS - Math.max(CONFIG.fuel.entryWindowHalfSize, ENTRY_EARLY_DISTANCE),
      entryWindowEnd: def.entryS + ENTRY_LATE_TOLERANCE,
      roadAlignedRotation,
      roadsidePadCenter,
      serviceLotCenter,
      apronCenter,
      canopyCenter,
      kioskCenter,
      kioskGlass,
      totemBase,
      advanceSignBase,
      canopyPillars,
      pumpPositions,
      drivewayVisuals,
      shoulderIn,
      curbIn,
      bayEntry,
      stopStart,
      stopEnd,
      bayExit,
      curbOut,
      shoulderOut,
      mergePose: pointFromPose(mergePose),
      stopSegment,
      exitSegment
    };

    registerReservedArea(apronCenter.x, apronCenter.z, 34);
    return station;
  }

  function build() {
    for (const def of stationDefs) {
      const station = buildStation(def);
      if (!station) continue;

      stations.push(station);
      stationMap.set(station.id, station);

      const visual = createGasStationVisual(station);
      station.visual = visual;
      scene.add(visual);
    }
  }

  function getAvailableAccess(playerPose, segment, s, laneOffset, speed) {
    if (!playerPose || !segment || segment.type !== "road") return null;
    if (speed > CONFIG.fuel.stationEnterSpeedMax + 0.1) return null;

    let best = null;
    let bestScore = Infinity;

    for (const station of stations) {
      if (!station.visual?.parent) continue;
      if (!sameRoad(segment, station.road)) continue;

      const longitudinalDelta = station.entryS - s;
      if (longitudinalDelta < -ENTRY_LATE_TOLERANCE) continue;
      if (longitudinalDelta > Math.max(CONFIG.fuel.entryWindowHalfSize + 10, 30)) continue;

      const headingDelta = minHeadingDelta(playerPose.heading, station.approachHeading);
      if (headingDelta > ACCESS_HEADING_LIMIT) continue;

      const entryDistanceSq = distanceSq(playerPose, station.curbIn);
      if (entryDistanceSq > ACCESS_DISTANCE_LIMIT * ACCESS_DISTANCE_LIMIT) continue;

      const lanePenalty = Math.abs(laneOffset - station.accessLaneOffset) * 5.5;
      const score =
        Math.abs(longitudinalDelta) * 2.2 +
        entryDistanceSq * 0.02 +
        lanePenalty +
        speed * 16;

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

  function createEntrySegment(playerPose, currentSegment, currentS = 0, laneOffset = 0, stationId) {
    const station = stationMap.get(stationId);
    if (!station) return null;
    if (!station.visual?.parent) return null;

    const sameCurrentRoad = sameRoad(currentSegment, station.road);

    const start = playerPose
      ? { x: playerPose.x, z: playerPose.z }
      : pointFromPose(graph.evaluateSegment(station.road, currentS, laneOffset));

    const headingPoint = playerPose
      ? {
          x: playerPose.x + Math.sin(playerPose.heading) * ENTRY_FORWARD_PADDING,
          z: playerPose.z - Math.cos(playerPose.heading) * ENTRY_FORWARD_PADDING
        }
      : pointFromPose(graph.evaluateSegment(station.road, Math.min(currentS + 6, station.entryS - 6), laneOffset));

    const points = [start, headingPoint];

    if (sameCurrentRoad && currentS < station.entryS - 8) {
      const prepS = THREE.MathUtils.clamp(
        Math.max(currentS + 7, station.entryS - 16),
        0,
        station.entryS - 6
      );

      const prepPose = graph.evaluateSegment(station.road, prepS, laneOffset);
      points.push(pointFromPose(prepPose));
    }

    const outerRoadPose = graph.evaluateSegment(
      station.road,
      Math.max(0, station.entryS - 2),
      station.accessLaneOffset * OUTER_LANE_BLEND
    );

    points.push(
      pointFromPose(outerRoadPose),
      station.shoulderIn,
      station.curbIn,
      station.bayEntry,
      station.stopStart
    );

    return buildPathSegment(
      "gas-entry",
      station.id,
      points
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
    if (!station.visual?.parent) return null;

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

  function getInfos() {
    return stations
      .filter((station) => station.visual?.parent)
      .map((station) => ({
        id: station.id,
        brand: station.brand,
        center: { ...station.apronCenter }
      }));
  }

  return {
    build,
    isReservedArea,
    getAvailableAccess,
    createEntrySegment,
    buildAfterSpecialSegment,
    evaluateSegment,
    isGasStationSegment,
    getInfos
  };
}
