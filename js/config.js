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

  onFoot: {
    walkSpeed: 0.145,
    runSpeed: 0.235,
    acceleration: 11.5,
    airControl: 3.6,
    drag: 10.2,

    jumpVelocity: 0.23,
    gravity: 0.0145,

    radius: 0.58,
    height: 1.72,
    turnSpeed: 12,

    enterVehicleDistance: 3.4,
    exitVehicleMaxSpeed: 0.035,
    exitOffsetSide: 2.15,
    exitOffsetForward: 0.24,

    hitboxRadius: 0.62
  },

  camera: {
    height: 6.2,
    followDistance: 14,
    lookAhead: 16,
    lookHeight: 1.4,

    serviceHeight: 3.2,
    serviceFollowDistance: 8.4,
    serviceLookAhead: 9.5,
    serviceLookHeight: 1.18,
    serviceSideOffset: 2.2,
    serviceSideOffsetRefuel: 3.2,

    walkHeight: 3.7,
    walkFollowDistance: 6.2,
    walkLookAhead: 4.9,
    walkLookHeight: 1.3,
    walkSideOffset: 0.48,

    firstPersonPositionDamping: 14,
    firstPersonLookDamping: 10,
    firstPersonPositionDampingDriving: 18,
    firstPersonPositionDampingWalking: 14,
    firstPersonLookDampingDriving: 16,
    firstPersonLookDampingWalking: 11,
    drivingFirstPersonLookDistance: 28,
    walkingFirstPersonLookDistance: 12,
    firstPersonRecenteringSpeed: 2.4,
    firstPersonRecenteringDelay: 0.32,
    firstPersonMouseDeadzone: 0.00002,
    firstPersonToggleCooldown: 0.12,
    mouseSensitivityFirstPerson: 0.0022,
    thirdPersonTurnSensitivity: 1,
    walkPitchMin: -1.2217304764,
    walkPitchMax: 1.0471975512,
    drivePitchMin: -0.6108652382,
    drivePitchMax: 0.6108652382,
    driveYawLimit: 1.0471975512,

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
    movingPedestrians: 88,
    staticPedestrians: 360,
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

  pizzaDelivery: {
    pickupRadius: 2.3,
    deliveryRadius: 2.85,
    reward: 10
  },

  minimap: {
    extent: 620,
    size: 220
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
