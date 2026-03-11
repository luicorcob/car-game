import * as THREE from "three";
import { CONFIG } from "./config.js";

function createSmokeTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;

  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(64, 64, 10, 64, 64, 56);

  g.addColorStop(0, "rgba(255,255,255,0.95)");
  g.addColorStop(0.3, "rgba(210,210,210,0.75)");
  g.addColorStop(0.7, "rgba(130,130,130,0.28)");
  g.addColorStop(1, "rgba(80,80,80,0)");

  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createWheel(radius = 0.44, width = 0.48) {
  const wheel = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, width, 18),
    new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.85
    })
  );
  wheel.rotation.z = Math.PI / 2;
  return wheel;
}

function setEmissive(mesh, hex, intensity) {
  if (!mesh?.material?.emissive) return;
  mesh.material.emissive.setHex(hex);
  mesh.material.emissiveIntensity = intensity;
}

function createLampCluster(color, width = 0.42, height = 0.22, depth = 0.16) {
  return new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({
      color,
      emissive: 0x000000,
      emissiveIntensity: 0,
      roughness: 0.3,
      metalness: 0.08
    })
  );
}

function cloneMeshWithOwnMaterial(mesh) {
  const cloned = mesh.clone();
  if (cloned.material) {
    cloned.material = cloned.material.clone();
  }
  return cloned;
}

function createSimpleTrafficBody(color = 0x3366ff) {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.15,
    roughness: 0.45
  });

  const sideMat = new THREE.MeshStandardMaterial({
    color: 0x0f4cde,
    metalness: 0.15,
    roughness: 0.5
  });

  const cabinMat = new THREE.MeshStandardMaterial({
    color: 0x9ad1ff,
    metalness: 0.05,
    roughness: 0.2
  });

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.9, 4.6),
    bodyMat
  );
  base.position.y = 0.9;
  group.add(base);

  const sideLeft = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.8, 4.2),
    sideMat
  );
  sideLeft.position.set(-1.12, 0.92, 0);
  group.add(sideLeft);

  const sideRight = sideLeft.clone();
  sideRight.material = sideLeft.material.clone();
  sideRight.position.x = 1.12;
  group.add(sideRight);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.85, 2.15),
    cabinMat
  );
  cabin.position.set(0, 1.62, -0.2);
  group.add(cabin);

  const nose = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 0.45, 1.05),
    bodyMat.clone()
  );
  nose.position.set(0, 1.12, 1.68);
  group.add(nose);

  for (const x of [-1.16, 1.16]) {
    for (const z of [-1.45, 1.45]) {
      const wheel = createWheel(0.42, 0.45);
      wheel.position.set(x, 0.45, z);
      group.add(wheel);
    }
  }

  return group;
}

function createMirror(side = 1) {
  const group = new THREE.Group();

  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.08, 0.28),
    new THREE.MeshStandardMaterial({
      color: 0x202020,
      roughness: 0.8
    })
  );
  arm.position.set(side * 0.92, 1.62, 0.56);
  arm.rotation.y = side * 0.34;
  group.add(arm);

  const housing = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.16, 0.3),
    new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      metalness: 0.2,
      roughness: 0.5
    })
  );
  housing.position.set(side * 1.05, 1.63, 0.76);
  housing.rotation.y = side * 0.12;
  group.add(housing);

  return group;
}

function createHeadlightRig(side = 1) {
  const mount = new THREE.Group();
  mount.position.set(side * 0.72, 1.08, 2.55);

  const lens = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.2, 0.12),
    new THREE.MeshStandardMaterial({
      color: 0xf6f2da,
      emissive: 0x111111,
      emissiveIntensity: 0.06,
      roughness: 0.18,
      metalness: 0.12
    })
  );
  mount.add(lens);

  const glow = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.12, 0.04),
    new THREE.MeshStandardMaterial({
      color: 0xfff2c2,
      emissive: 0x000000,
      emissiveIntensity: 0,
      roughness: 0.2,
      metalness: 0
    })
  );
  glow.position.z = 0.08;
  mount.add(glow);

  const light = new THREE.SpotLight(
    0xfff1c1,
    0,
    CONFIG.carVisuals.headlightDistance,
    CONFIG.carVisuals.headlightAngle,
    CONFIG.carVisuals.headlightPenumbra,
    1.3
  );
  light.position.set(0, 0.06, 0.02);

  const target = new THREE.Object3D();
  target.position.set(side * 0.4, -0.18, 26);

  mount.add(light);
  mount.add(target);
  light.target = target;

  return {
    mount,
    lens,
    glow,
    light,
    target
  };
}

function createPlayerRig() {
  const group = new THREE.Group();

  const paintMat = new THREE.MeshStandardMaterial({
    color: 0xd62828,
    metalness: 0.28,
    roughness: 0.32
  });

  const darkPaintMat = new THREE.MeshStandardMaterial({
    color: 0x7f1d1d,
    metalness: 0.22,
    roughness: 0.38
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    metalness: 0.35,
    roughness: 0.5
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x9ed6ff,
    emissive: 0x08121b,
    emissiveIntensity: 0.5,
    metalness: 0.08,
    roughness: 0.18
  });

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.18, 0.72, 4.95),
    paintMat
  );
  body.position.y = 0.94;
  group.add(body);

  const frontClip = new THREE.Mesh(
    new THREE.BoxGeometry(1.98, 0.48, 1.15),
    darkPaintMat
  );
  frontClip.position.set(0, 1.06, 2.07);
  group.add(frontClip);

  const rearClip = new THREE.Mesh(
    new THREE.BoxGeometry(1.96, 0.46, 0.92),
    darkPaintMat.clone()
  );
  rearClip.position.set(0, 1.02, -2.05);
  group.add(rearClip);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(1.62, 0.34, 2.3),
    paintMat.clone()
  );
  roof.position.set(0, 1.95, -0.02);
  group.add(roof);

  const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(1.54, 0.72, 0.14),
    glassMat
  );
  windshield.position.set(0, 1.62, 1.0);
  windshield.rotation.x = -0.58;
  group.add(windshield);

  const rearGlass = new THREE.Mesh(
    new THREE.BoxGeometry(1.44, 0.58, 0.14),
    glassMat.clone()
  );
  rearGlass.position.set(0, 1.56, -1.1);
  rearGlass.rotation.x = 0.48;
  group.add(rearGlass);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.56, 0.82, 2.18),
    glassMat.clone()
  );
  cabin.position.set(0, 1.55, -0.05);
  group.add(cabin);

  const splitter = new THREE.Mesh(
    new THREE.BoxGeometry(2.02, 0.08, 0.36),
    trimMat
  );
  splitter.position.set(0, 0.55, 2.45);
  group.add(splitter);

  const diffuser = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 0.08, 0.28),
    trimMat.clone()
  );
  diffuser.position.set(0, 0.54, -2.45);
  group.add(diffuser);

  const sideSkirtLeft = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.18, 3.6),
    trimMat.clone()
  );
  sideSkirtLeft.position.set(-1.07, 0.62, 0);
  group.add(sideSkirtLeft);

  const sideSkirtRight = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.18, 3.6),
    trimMat.clone()
  );
  sideSkirtRight.position.set(1.07, 0.62, 0);
  group.add(sideSkirtRight);

  const spoilerSupportLeft = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.32, 0.08),
    trimMat.clone()
  );
  spoilerSupportLeft.position.set(-0.52, 1.96, -2.12);
  group.add(spoilerSupportLeft);

  const spoilerSupportRight = new THREE.Mesh(
    new THREE.BoxGeometry(0.09, 0.32, 0.08),
    trimMat.clone()
  );
  spoilerSupportRight.position.set(0.52, 1.96, -2.12);
  group.add(spoilerSupportRight);

  const spoiler = new THREE.Mesh(
    new THREE.BoxGeometry(1.42, 0.08, 0.34),
    trimMat.clone()
  );
  spoiler.position.set(0, 2.12, -2.14);
  group.add(spoiler);

  const exhaust = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.42, 12),
    new THREE.MeshStandardMaterial({
      color: 0x71717a,
      metalness: 0.65,
      roughness: 0.32
    })
  );
  exhaust.rotation.x = Math.PI / 2;
  exhaust.position.set(0.62, 0.64, -2.55);
  group.add(exhaust);

  const brakeLeft = createLampCluster(0x6b0000, 0.42, 0.2, 0.1);
  brakeLeft.position.set(-0.62, 1.02, -2.5);
  group.add(brakeLeft);

  const brakeRight = cloneMeshWithOwnMaterial(brakeLeft);
  brakeRight.position.x = 0.62;
  group.add(brakeRight);

  const indRearLeft = createLampCluster(0x5a2800, 0.18, 0.16, 0.09);
  indRearLeft.position.set(-0.96, 1.0, -2.5);
  group.add(indRearLeft);

  const indRearRight = cloneMeshWithOwnMaterial(indRearLeft);
  indRearRight.position.x = 0.96;
  group.add(indRearRight);

  const indFrontLeft = createLampCluster(0x5a2800, 0.18, 0.14, 0.08);
  indFrontLeft.position.set(-0.98, 1.0, 2.5);
  group.add(indFrontLeft);

  const indFrontRight = cloneMeshWithOwnMaterial(indFrontLeft);
  indFrontRight.position.x = 0.98;
  group.add(indFrontRight);

  const headLeft = createHeadlightRig(-1);
  const headRight = createHeadlightRig(1);
  group.add(headLeft.mount, headRight.mount);

  const mirrorLeft = createMirror(-1);
  const mirrorRight = createMirror(1);
  group.add(mirrorLeft, mirrorRight);

  for (const x of [-1.14, 1.14]) {
    for (const z of [-1.52, 1.54]) {
      const wheel = createWheel(0.44, 0.48);
      wheel.position.set(x, 0.46, z);
      group.add(wheel);
    }
  }

  const smokeRoot = new THREE.Group();
  const smokeTexture = createSmokeTexture();
  const smokeParticles = [];

  for (let i = 0; i < CONFIG.carVisuals.smokeMaxParticles; i++) {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: smokeTexture,
        transparent: true,
        depthWrite: false,
        opacity: 0,
        color: 0xc8c8c8
      })
    );
    sprite.visible = false;
    sprite.scale.setScalar(0.01);
    smokeRoot.add(sprite);

    smokeParticles.push({
      sprite,
      velocity: new THREE.Vector3(),
      age: 0,
      life: 1
    });
  }

  group.userData.playerRig = {
    headlights: [headLeft, headRight],
    rearLights: [brakeLeft, brakeRight],
    frontIndicators: [indFrontLeft, indFrontRight],
    rearIndicators: [indRearLeft, indRearRight],
    smokeRoot,
    smokeParticles,
    smokeIndex: 0,
    smokeAccumulator: 0,
    blinkTime: 0,
    exhaustLocal: new THREE.Vector3(0.62, 0.72, -2.72),
    tempWorld: new THREE.Vector3(),
    tempDir: new THREE.Vector3(),
    tempUp: new THREE.Vector3()
  };

  return group;
}

export function createPlayerCar() {
  return createPlayerRig();
}

export function attachPlayerCarEffects(car, scene) {
  const rig = car.userData.playerRig;
  if (!rig || rig.smokeRoot.parent) return;
  scene.add(rig.smokeRoot);
}

export function resetPlayerCarEffects(car) {
  const rig = car.userData.playerRig;
  if (!rig) return;

  rig.smokeAccumulator = 0;
  rig.blinkTime = 0;

  for (const particle of rig.smokeParticles) {
    particle.age = particle.life;
    particle.sprite.visible = false;
    particle.sprite.material.opacity = 0;
    particle.sprite.scale.setScalar(0.01);
  }

  for (const lamp of rig.rearLights) {
    setEmissive(lamp, 0x000000, 0);
  }

  for (const lamp of [...rig.frontIndicators, ...rig.rearIndicators]) {
    setEmissive(lamp, 0x000000, 0);
  }

  for (const head of rig.headlights) {
    head.light.intensity = 0;
    setEmissive(head.glow, 0x000000, 0);
  }
}

function spawnSmokeParticle(car, rig, intensityScale = 1) {
  const particle = rig.smokeParticles[rig.smokeIndex];
  rig.smokeIndex = (rig.smokeIndex + 1) % rig.smokeParticles.length;

  car.localToWorld(rig.tempWorld.copy(rig.exhaustLocal));

  rig.tempDir.set(0, 0, -1).applyQuaternion(car.quaternion).normalize();
  rig.tempUp.set(0, 1, 0).applyQuaternion(car.quaternion).normalize();

  particle.sprite.visible = true;
  particle.sprite.position.copy(rig.tempWorld);
  particle.sprite.scale.setScalar(0.18 + Math.random() * 0.08);
  particle.sprite.material.opacity = 0.38 + Math.random() * 0.12;

  particle.velocity.copy(rig.tempDir).multiplyScalar(0.6 + Math.random() * 0.38);
  particle.velocity.addScaledVector(rig.tempUp, 0.6 + Math.random() * 0.28);
  particle.velocity.x += (Math.random() - 0.5) * 0.18;
  particle.velocity.z += (Math.random() - 0.5) * 0.18;
  particle.velocity.multiplyScalar(0.75 + intensityScale * 0.45);

  particle.age = 0;
  particle.life = 0.75 + Math.random() * 0.45;
}

function updateSmoke(car, rig, dt, state) {
  const speed = state.speed ?? 0;
  const moving = speed > 0.04;
  const accelerating = !!state.isAccelerating;

  let rate = CONFIG.carVisuals.smokeIdleRate;
  if (moving) rate = CONFIG.carVisuals.smokeMoveRate;
  if (accelerating) rate = CONFIG.carVisuals.smokeAccelRate;

  rig.smokeAccumulator += dt * rate;

  while (rig.smokeAccumulator >= 1) {
    spawnSmokeParticle(car, rig, moving ? 1 : 0.65);
    rig.smokeAccumulator -= 1;
  }

  for (const particle of rig.smokeParticles) {
    if (!particle.sprite.visible) continue;

    particle.age += dt;
    if (particle.age >= particle.life) {
      particle.sprite.visible = false;
      particle.sprite.material.opacity = 0;
      continue;
    }

    const t = particle.age / particle.life;
    particle.sprite.position.addScaledVector(particle.velocity, dt);
    particle.sprite.position.y += dt * 0.22;
    particle.sprite.scale.setScalar(THREE.MathUtils.lerp(0.18, 0.95, t));
    particle.sprite.material.opacity = THREE.MathUtils.lerp(0.45, 0, t);
  }
}

function updateLights(car, rig, dt, state) {
  const nightMode = !!state.nightMode;
  const braking = !!state.isBraking && (state.speed ?? 0) > 0.02;
  const turnSignal = state.turnSignal ?? 0;

  rig.blinkTime += dt;
  const blink =
    (rig.blinkTime % CONFIG.carVisuals.indicatorBlinkInterval) <
    CONFIG.carVisuals.indicatorBlinkInterval * 0.52;

  for (const head of rig.headlights) {
    head.light.intensity = nightMode ? CONFIG.carVisuals.headlightIntensity : 0;
    setEmissive(head.glow, 0xffe8aa, nightMode ? 1.35 : 0);
  }

  const rearBase = nightMode ? CONFIG.carVisuals.tailLightNightEmissive : 0;
  const rearIntensity = braking
    ? CONFIG.carVisuals.brakeLightEmissive
    : rearBase;

  for (const lamp of rig.rearLights) {
    setEmissive(lamp, 0xff1a1a, rearIntensity);
  }

  const leftActive = turnSignal < 0 && blink;
  const rightActive = turnSignal > 0 && blink;

  setEmissive(
    rig.frontIndicators[1],
    0xffa000,
    leftActive ? CONFIG.carVisuals.indicatorEmissive : 0
  );
  setEmissive(
    rig.rearIndicators[1],
    0xffa000,
    leftActive ? CONFIG.carVisuals.indicatorEmissive : 0
  );

  setEmissive(
    rig.frontIndicators[0],
    0xffa000,
    rightActive ? CONFIG.carVisuals.indicatorEmissive : 0
  );
  setEmissive(
    rig.rearIndicators[0],
    0xffa000,
    rightActive ? CONFIG.carVisuals.indicatorEmissive : 0
  );
}

export function updatePlayerCarEffects(car, dt, state) {
  const rig = car.userData.playerRig;
  if (!rig) return;

  updateLights(car, rig, dt, state);

  if (rig.smokeRoot.parent) {
    updateSmoke(car, rig, dt, state);
  }
}

export function createTrafficCar(color = 0x3366ff) {
  return createSimpleTrafficBody(color);
}

export function createTrafficTruck(
  cabColor = 0x2563eb,
  trailerColor = 0xe5e7eb
) {
  const group = new THREE.Group();

  const cabMat = new THREE.MeshStandardMaterial({
    color: cabColor,
    metalness: 0.18,
    roughness: 0.45
  });

  const trailerMat = new THREE.MeshStandardMaterial({
    color: trailerColor,
    metalness: 0.08,
    roughness: 0.62
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x9ad1ff,
    metalness: 0.08,
    roughness: 0.18
  });

  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x2f2f2f,
    metalness: 0.1,
    roughness: 0.75
  });

  const trailer = new THREE.Mesh(
    new THREE.BoxGeometry(2.55, 2.45, 6.2),
    trailerMat
  );
  trailer.position.set(0, 1.75, -1.25);
  group.add(trailer);

  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.32, 8.7),
    darkMat
  );
  chassis.position.set(0, 0.62, -0.2);
  group.add(chassis);

  const cabBase = new THREE.Mesh(
    new THREE.BoxGeometry(2.25, 1.55, 2.15),
    cabMat
  );
  cabBase.position.set(0, 1.35, 3.0);
  group.add(cabBase);

  const cabTop = new THREE.Mesh(
    new THREE.BoxGeometry(2.05, 1.1, 1.55),
    cabMat
  );
  cabTop.position.set(0, 2.25, 2.75);
  group.add(cabTop);

  const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.8, 0.1),
    glassMat
  );
  windshield.position.set(0, 2.18, 3.8);
  group.add(windshield);

  const grill = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.62, 0.14),
    darkMat
  );
  grill.position.set(0, 1.2, 4.1);
  group.add(grill);

  const bumper = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 0.26, 0.2),
    darkMat
  );
  bumper.position.set(0, 0.78, 4.18);
  group.add(bumper);

  const wheelPositions = [
    [-1.25, 2.95],
    [1.25, 2.95],
    [-1.25, 1.15],
    [1.25, 1.15],
    [-1.25, -1.3],
    [1.25, -1.3],
    [-1.25, -3.35],
    [1.25, -3.35]
  ];

  for (const [x, z] of wheelPositions) {
    const wheel = createWheel(0.48, 0.42);
    wheel.position.set(x, 0.52, z);
    group.add(wheel);
  }

  return group;
}