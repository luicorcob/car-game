import * as THREE from "three";
import { CONFIG } from "../config.js";
import { DIR_TO_HEADING } from "./constants.js";
import {
  dirVector,
  rightVectorFromDir,
  vec2,
  rotateDir,
  normalizeAngle
} from "./math.js";

export function createWorldGraph() {
  const step = CONFIG.blockSize;
  const coords = [-2 * step, -step, 0, step, 2 * step];

  const nodes = new Map();
  const roadMetas = [];

  for (const x of coords) {
    for (const z of coords) {
      const id = `${x},${z}`;
      nodes.set(id, { id, x, z });
    }
  }

  function getNode(id) {
    return nodes.get(id) ?? null;
  }

  function getNodeByCoord(x, z) {
    return nodes.get(`${x},${z}`) ?? null;
  }

  function getNeighbor(nodeId, dir) {
    const node = getNode(nodeId);
    if (!node) return null;

    switch (dir) {
      case "N":
        return getNodeByCoord(node.x, node.z - step);
      case "E":
        return getNodeByCoord(node.x + step, node.z);
      case "S":
        return getNodeByCoord(node.x, node.z + step);
      case "W":
        return getNodeByCoord(node.x - step, node.z);
      default:
        return null;
    }
  }

  const roadLength = CONFIG.blockSize - CONFIG.intersectionSize;

  for (const node of nodes.values()) {
    const east = getNeighbor(node.id, "E");
    if (east) {
      roadMetas.push({
        x: (node.x + east.x) / 2,
        z: node.z,
        length: roadLength,
        horizontal: true,
        fromNodeId: node.id,
        dir: "E"
      });
    }

    const north = getNeighbor(node.id, "N");
    if (north) {
      roadMetas.push({
        x: node.x,
        z: (node.z + north.z) / 2,
        length: roadLength,
        horizontal: false,
        fromNodeId: node.id,
        dir: "N"
      });
    }
  }

  const laneCenters = [];
  const laneStep = CONFIG.roadWidth / CONFIG.laneCount;
  for (let i = 0; i < CONFIG.laneCount; i++) {
    laneCenters.push(-CONFIG.roadWidth / 2 + laneStep * i + laneStep / 2);
  }

  const turnRadius = CONFIG.intersectionSize / 2;
  const laneClamp = CONFIG.roadWidth * 0.5 - CONFIG.player.collisionRadiusX;

  function buildRoadSegment(fromNodeId, dir) {
    const fromNode = getNode(fromNodeId);
    const toNode = getNeighbor(fromNodeId, dir);
    if (!fromNode || !toNode) return null;

    const f = dirVector(dir);
    const r = rightVectorFromDir(dir);

    const start = vec2(fromNode.x, fromNode.z).add(
      f.clone().multiplyScalar(turnRadius)
    );
    const end = vec2(toNode.x, toNode.z).add(
      f.clone().multiplyScalar(-turnRadius)
    );

    return {
      type: "road",
      fromNodeId,
      toNodeId: toNode.id,
      nodeId: toNode.id,
      dir,
      heading: DIR_TO_HEADING[dir],
      startX: start.x,
      startZ: start.y,
      length: start.distanceTo(end),
      rightX: r.x,
      rightZ: r.y
    };
  }

  function buildStraightConnector(nodeId, dir) {
    const node = getNode(nodeId);
    if (!node) return null;

    const f = dirVector(dir);
    const r = rightVectorFromDir(dir);

    const start = vec2(node.x, node.z).add(
      f.clone().multiplyScalar(-turnRadius)
    );

    return {
      type: "junction-straight",
      nodeId,
      nextDir: dir,
      dir,
      heading: DIR_TO_HEADING[dir],
      startX: start.x,
      startZ: start.y,
      length: turnRadius * 2,
      rightX: r.x,
      rightZ: r.y
    };
  }

  function buildTurnSegment(nodeId, dir, turn) {
    const node = getNode(nodeId);
    if (!node) return null;

    return {
      type: "junction-turn",
      nodeId,
      dir,
      turn,
      heading: DIR_TO_HEADING[dir],
      nextDir: rotateDir(dir, turn),
      centerX: node.x,
      centerZ: node.z,
      radius: turnRadius,
      length: (Math.PI * turnRadius) / 2
    };
  }

  function evaluateSegment(segment, distanceAlongSegment, laneOffset = 0) {
    const s = THREE.MathUtils.clamp(distanceAlongSegment, 0, segment.length);

    if (segment.type === "road" || segment.type === "junction-straight") {
      const f = dirVector(segment.dir);

      const x = segment.startX + f.x * s + segment.rightX * laneOffset;
      const z = segment.startZ + f.y * s + segment.rightZ * laneOffset;

      return {
        x,
        z,
        heading: segment.heading
      };
    }

    const phi = s / segment.radius;
    const f = dirVector(segment.dir);
    const r = rightVectorFromDir(segment.dir);

    const x =
      segment.centerX -
      f.x * segment.radius +
      f.x * segment.radius * Math.sin(phi) +
      r.x * segment.turn * segment.radius * (1 - Math.cos(phi));

    const z =
      segment.centerZ -
      f.y * segment.radius +
      f.y * segment.radius * Math.sin(phi) +
      r.y * segment.turn * segment.radius * (1 - Math.cos(phi));

    return {
      x,
      z,
      heading: normalizeAngle(segment.heading + segment.turn * phi)
    };
  }

  function getValidTurnChoices(nodeId, dir) {
    const straight = getNeighbor(nodeId, dir) ? 0 : null;
    const leftDir = rotateDir(dir, -1);
    const rightDir = rotateDir(dir, 1);

    const left = getNeighbor(nodeId, leftDir) ? -1 : null;
    const right = getNeighbor(nodeId, rightDir) ? 1 : null;

    return [left, straight, right].filter((v) => v !== null);
  }

  function resolveTurn(nodeId, dir, requestedTurn) {
    const valid = getValidTurnChoices(nodeId, dir);

    if (valid.includes(requestedTurn)) return requestedTurn;
    if (valid.includes(0)) return 0;
    if (valid.includes(-1)) return -1;
    if (valid.includes(1)) return 1;
    return 0;
  }

  function buildTransitionAfterRoad(roadSegment, requestedTurn) {
    const nodeId = roadSegment.toNodeId;
    const turn = resolveTurn(nodeId, roadSegment.dir, requestedTurn);

    if (turn === 0) {
      return buildStraightConnector(nodeId, roadSegment.dir);
    }

    return buildTurnSegment(nodeId, roadSegment.dir, turn);
  }

  function buildRoadAfterConnector(connectorSegment) {
    return buildRoadSegment(connectorSegment.nodeId, connectorSegment.nextDir);
  }

  function getUpcomingIntersectionInfo(segment, s) {
    if (!segment || segment.type !== "road") return null;

    return {
      nodeId: segment.toNodeId,
      dir: segment.dir,
      remaining: Math.max(0, segment.length - s),
      validTurns: getValidTurnChoices(segment.toNodeId, segment.dir)
    };
  }

  function getStartRoad() {
    return buildRoadSegment(`0,${2 * step}`, "N");
  }

  function getTrafficSpawnRoads() {
    return [
      buildRoadSegment(`0,${2 * step}`, "N"),
      buildRoadSegment(`${step},${2 * step}`, "N"),
      buildRoadSegment(`${-step},${step}`, "E"),
      buildRoadSegment(`${2 * step},0`, "W"),
      buildRoadSegment(`${-2 * step},${-step}`, "E"),
      buildRoadSegment(`${step},${-2 * step}`, "S")
    ].filter(Boolean);
  }

  return {
    step,
    coords,
    nodes,
    roadMetas,
    laneCenters,
    laneClamp,
    getNode,
    getNeighbor,
    buildRoadSegment,
    buildTransitionAfterRoad,
    buildRoadAfterConnector,
    evaluateSegment,
    getValidTurnChoices,
    resolveTurn,
    getUpcomingIntersectionInfo,
    getStartRoad,
    getTrafficSpawnRoads
  };
}