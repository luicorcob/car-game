export const CONFIG = {
  roadWidth: 14,
  laneCount: 3,
  blockSize: 280,
  intersectionSize: 44,

  player: {
    maxSpeed: 0.58,
    reverseMaxSpeed: 0.22,
    acceleration: 0.0105,
    braking: 0.03,
    handbrakeBraking: 0.018,
    drag: 0.016,
    coastDrag: 0.0042,
    handbrakeDrag: 0.014,
    handbrakeDriftMinSpeed: 0.18,
    handbrakeDriftGrip: 0.26,

    steerResponse: 7.5,
    steerReturn: 5.8,
    steerRate: 0.1,
    steerAtLowSpeed: 1.2,
    steerAtHighSpeed: 0.42,
    handbrakeSteerBoost: 1.72,
    steerVisualYaw: 0.12,
    bodyRoll: 0.075,
    driftSlipBoost: 2.15,
    driftSlipResponse: 5.4,
    driftVisualYaw: 0.12,
    driftVisualRoll: 0.085,
    driftVisualPitch: 0.05,
    driftVisualLift: 0.26,
    driftVisualSpeedThreshold: 80 / 150,
    collisionDamping: 0.22,

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

  health: {
    playerMax: 100,
    playerTrafficMinDamage: 12,
    playerTrafficMaxDamage: 90,
    playerTrafficSpeedRef: 0.24,
    vehiclePedestrianMinDamage: 26,
    vehiclePedestrianMaxDamage: 100,
    vehiclePedestrianSpeedRef: 0.24,
    playerRegenDelay: 3,
    playerRegenPerSecond: 16,
    playerCriticalStart: 0.7,
    pedestrianMax: 100,
    pedestrianBarDistance: 58
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

    walkHeight: 3.15,
    walkFollowDistance: 5.15,
    walkLookAhead: 4.9,
    walkLookHeight: 1.68,
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

  phone: {
    taxiBehindDistance: 14,
    taxiBehindDistanceStep: 4,
    taxiMaxBehindDistance: 26,
    taxiRoadSearchRadius: 14,
    taxiTrafficClearance: 9,
    taxiAlreadyNearDistance: 9
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
    fogFar: 1200,
    cullFovPaddingRad: 0.6,
    cullDistanceBuildings: 520,
    cullDistanceParkedCars: 320,
    cullDistancePedestrians: 240,
    pedestrianNearUpdateDistance: 90,
    pedestrianMidUpdateDistance: 170,
    pedestrianFarStepSeconds: 0.24
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
    portableCanLiters: 20,
    portableCanPrice: 16,
    portableCanMax: 3,

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
    reward: 10,
    inventoryCapacity: 3
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
    smokeAccelRate: 11,

    skidMarksMax: 120,
    skidMarkMinSpeed: 0.16,
    skidMarkMinSteer: 0.22,
    skidMarkWidth: 0.22,
    skidMarkYOffset: 0.031,
    grassSkidMarkWidth: 0.28,
    grassSkidMarkYOffset: -0.155
  }
};
