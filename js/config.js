export const CONFIG = {
  roadWidth: 14,
  laneCount: 3,
  blockSize: 280,
  intersectionSize: 44,

  player: {
    maxSpeed: 0.5,
    acceleration: 0.008,
    braking: 0.018,
    drag: 0.005,

    laneChangeSpeed: 0.18,
    laneChangeResponse: 8,
    laneRecenterInTurn: 8,

    choiceWindow: 48,

    collisionRadiusX: 1.35,
    collisionRadiusZ: 2.4
  },

  camera: {
    height: 6.2,
    followDistance: 14,
    lookAhead: 16,
    positionDamping: 8,
    lookDamping: 10
  },

  traffic: {
    count: 12,
    truckChance: 0.24,

    minSpeed: 0.16,
    maxSpeed: 0.24,

    truckMinSpeed: 0.11,
    truckMaxSpeed: 0.18,

    followDistance: 20,
    spawnPadding: 28
  },

  world: {
    grassSize: 2400,
    fogNear: 140,
    fogFar: 1200
  },

  decor: {
    movingPedestrians: 14,
    staticPedestrians: 110,
    parkedCars: 26,
    treeSpacing: 42,
    lampSpacing: 78
  },

  fuel: {
    max: 100,
    start: 100,

    consumptionPerUnit: 0.028,
    idlePerSecond: 0.012,
    accelerationMultiplier: 1.22,

    lowThreshold: 0.25,
    criticalThreshold: 0.1,

    refuelRate: 34,

    serviceLaneMaxSpeed: 0.18,
    stationEnterSpeedMax: 0.34,
    entryWindowHalfSize: 14
  },

  carVisuals: {
    headlightIntensity: 24,
    headlightDistance: 115,
    headlightAngle: Math.PI / 7.2,
    headlightPenumbra: 0.42,

    indicatorBlinkInterval: 0.44,

    tailLightNightEmissive: 0.35,
    brakeLightEmissive: 2.2,
    indicatorEmissive: 2.6,

    smokeMaxParticles: 28,
    smokeIdleRate: 4,
    smokeMoveRate: 7,
    smokeAccelRate: 11
  }
};