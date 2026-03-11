import { CONFIG } from "./config.js";
import { normalizeAngle } from "./world/math.js";
import { createStraightRoadMesh, createIntersectionMesh } from "./world/meshes.js";
import { createWorldGraph } from "./world/graph.js";
import { createWorldLighting } from "./world/lighting.js";
import { createChoiceSignController } from "./world/signs.js";
import { createWorldDecorController } from "./world/decor.js";
import { createGasStationController } from "./world/gasStations.js";

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

  addStaticRoadNetwork(scene, graph);

  const gasStations = createGasStationController(scene, graph);
  gasStations.build();

  const decor = createWorldDecorController(scene, graph, {
    onLampHeadMaterial: lighting.registerLampHeadMaterial,
    isReservedArea: gasStations.isReservedArea
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

    updateChoiceSigns: signs.updateChoiceSigns,
    updateDecorations: decor.updateDecorations,

    setNightMode: lighting.setNightMode,
    isNightMode: lighting.isNightMode,

    getGasStationAccess: gasStations.getAvailableAccess,
    createGasStationEntrySegment: gasStations.createEntrySegment,
    buildAfterSpecialSegment: gasStations.buildAfterSpecialSegment,
    isGasStationSegment: gasStations.isGasStationSegment
  };
}