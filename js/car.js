import * as THREE from "three";
import { CONFIG } from "./config.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";


const USE_TRAFFIC_CAR_GLB = true;
const TRAFFIC_CAR_VISUAL_SCALE_MULTIPLIER = 1.55;

const trafficCarLoader = new GLTFLoader();
const trafficCarCache = new Map();

const TRAFFIC_CAR_MODEL_BASE_PATH = "../assets/models/vehicles/cars/";
const trafficCarPath = (fileName) =>
  `${TRAFFIC_CAR_MODEL_BASE_PATH}${encodeURIComponent(fileName)}`;

const TRAFFIC_CAR_MODELS = [
  { file: "Car 1.glb", width: 2.2, depth: 4.6, height: 1.9, rotY: 0, yOffset: 0 },
  { file: "Car 2.glb", width: 2.2, depth: 4.6, height: 1.9, rotY: 0, yOffset: 0 },
  { file: "Car 3.glb", width: 2.2, depth: 4.6, height: 1.9, rotY: 0, yOffset: 0 },
  { file: "Car 4.glb", width: 2.2, depth: 4.6, height: 1.9, rotY: 0, yOffset: 0 },
  { file: "Car 5.glb", width: 2.2, depth: 4.6, height: 1.9, rotY: 0, yOffset: 0 },
  { file: "Car 6.glb", width: 2.2, depth: 4.6, height: 1.9, rotY: 0, yOffset: 0 },
  { file: "Car 7.glb", width: 2.2, depth: 4.6, height: 1.9, rotY: 0, yOffset: 0 },
  { file: "Car 8.glb", width: 2.2, depth: 4.6, height: 1.9, rotY: 0, yOffset: 0 },
  { file: "Car 9.glb", width: 2.2, depth: 4.6, height: 1.9, rotY: 0, yOffset: 0 },
  { file: "Car 10.glb", width: 2.2, depth: 4.6, height: 1.9, rotY: 0, yOffset: 0 },
  { file: "Car 11.glb", width: 2.2, depth: 4.6, height: 1.9, rotY: 0, yOffset: 0 },
  { file: "Car 12.glb", width: 2.2, depth: 4.6, height: 1.9, rotY: 0, yOffset: 0 },
  { file: "Car 13.glb", width: 2.2, depth: 4.6, height: 1.9, rotY: 0, yOffset: 0 },
  { file: "Car 14.glb", width: 2.2, depth: 4.6, height: 1.9, rotY: 0, yOffset: 0 },
  { file: "Car 15.glb", width: 2.2, depth: 4.6, height: 1.9, rotY: 0, yOffset: 0 }
];









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

function createSkidMarkMaterial() {
  return new THREE.MeshBasicMaterial({
    color: 0x050505,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    side: THREE.DoubleSide
  });
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

function registerWreckable(rig, mesh, weight = 1) {
  rig.wreckables.push({
    mesh,
    weight,
    basePosition: mesh.position.clone(),
    baseRotation: mesh.rotation.clone(),
    baseScale: mesh.scale.clone()
  });
}

function loadTrafficCarTemplate(fileName) {
  if (!trafficCarCache.has(fileName)) {
    trafficCarCache.set(
      fileName,
      new Promise((resolve, reject) => {
        trafficCarLoader.load(
          trafficCarPath(fileName),
          (gltf) => {
            const root = gltf.scene || gltf.scenes?.[0];
            if (!root) {
              reject(new Error(`El GLB no tiene escena raíz: ${fileName}`));
              return;
            }
            resolve(root);
          },
          undefined,
          reject
        );
      })
    );
  }

  return trafficCarCache.get(fileName);
}

function fitImportedVehicleModel(container, model, {
  width = 2.2,
  depth = 4.6,
  height = 1.9,
  rotY = 0,
  yOffset = 0
} = {}) {
  const targetWidth = width * TRAFFIC_CAR_VISUAL_SCALE_MULTIPLIER;
  const targetDepth = depth * TRAFFIC_CAR_VISUAL_SCALE_MULTIPLIER;
  const targetHeight = height * TRAFFIC_CAR_VISUAL_SCALE_MULTIPLIER;

  model.rotation.y = rotY;
  container.add(model);
  container.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(container);
  const size = new THREE.Vector3();
  box.getSize(size);

  const scale = Math.min(
    targetWidth / Math.max(size.x, 0.0001),
    targetDepth / Math.max(size.z, 0.0001),
    targetHeight / Math.max(size.y, 0.0001)
  );

  model.scale.setScalar(scale);
  container.updateMatrixWorld(true);

  const fittedBox = new THREE.Box3().setFromObject(container);
  const fittedCenter = new THREE.Vector3();
  fittedBox.getCenter(fittedCenter);

  model.position.set(
    -fittedCenter.x,
    yOffset - fittedBox.min.y,
    -fittedCenter.z
  );

  container.updateMatrixWorld(true);
}
function registerImportedVehicleAsWreckable(vehicleRig, root, weight = 1) {
  vehicleRig.importedVehicle = true;

  root.traverse((child) => {
    if (!child.isMesh) return;

    if (Array.isArray(child.material)) {
      child.material = child.material.map((mat) =>
        mat?.clone ? mat.clone() : mat
      );
    } else if (child.material?.clone) {
      child.material = child.material.clone();
    }

    child.castShadow = false;
    child.receiveShadow = true;
  });

  registerWreckable(vehicleRig, root, weight);
}
function pickRandomTrafficCarModel() {
  return TRAFFIC_CAR_MODELS[
    Math.floor(Math.random() * TRAFFIC_CAR_MODELS.length)
  ];
}

function createImportedTrafficCar(color = 0x3366ff) {
  const group = createSimpleTrafficBody(color);

  if (!USE_TRAFFIC_CAR_GLB || !TRAFFIC_CAR_MODELS.length) {
    return group;
  }

  const selectedModel = pickRandomTrafficCarModel();

  loadTrafficCarTemplate(selectedModel.file)
    .then((template) => {
      const cloned = SkeletonUtils.clone(template);
      const visualRoot = new THREE.Group();
      const vehicleRig = {
        wreckables: [],
        isWrecked: false
      };

      fitImportedVehicleModel(visualRoot, cloned, selectedModel);
      registerImportedVehicleAsWreckable(vehicleRig, visualRoot, 0.28);

      group.clear();
      group.userData.vehicleRig = vehicleRig;
      group.add(visualRoot);
    })
    .catch((error) => {
      console.error(`No se pudo cargar ${selectedModel.file}`, error);
    });

  return group;
}


function resetVehicleWreckState(vehicle) {
  const rig = vehicle.userData.vehicleRig;
  if (!rig) return;

  rig.isWrecked = false;

  for (const item of rig.wreckables) {
    item.mesh.position.copy(item.basePosition);
    item.mesh.rotation.copy(item.baseRotation);
    item.mesh.scale.copy(item.baseScale);
  }
}

export function setVehicleWreckState(vehicle, {
  impactX = 0,
  impactZ = 1,
  intensity = 1
} = {}) {
  const rig = vehicle.userData.vehicleRig;
  if (!rig || rig.isWrecked) return;

  rig.isWrecked = true;

  const xSign = impactX >= 0 ? 1 : -1;
  const zSign = impactZ >= 0 ? 1 : -1;

  if (rig.importedVehicle) {
    const item = rig.wreckables[0];
    if (!item) return;

    const f = Math.min(1.4, Math.max(0.65, intensity * item.weight));

    item.mesh.position.x = item.basePosition.x + xSign * 0.08 * f;
    item.mesh.position.y = item.basePosition.y + 0.03 * f;
    item.mesh.position.z = item.basePosition.z - zSign * 0.12 * f;

    item.mesh.rotation.x = item.baseRotation.x + zSign * 0.05 * f;
    item.mesh.rotation.y = item.baseRotation.y + xSign * 0.02 * f;
    item.mesh.rotation.z = item.baseRotation.z + xSign * 0.09 * f;

    item.mesh.scale.copy(item.baseScale);
    return;
  }

  for (const item of rig.wreckables) {
    const f = intensity * item.weight;

    item.mesh.position.x = item.basePosition.x + xSign * 0.05 * f;
    item.mesh.position.y = item.basePosition.y + 0.025 * f;
    item.mesh.position.z = item.basePosition.z - zSign * 0.06 * f;

    item.mesh.rotation.x = item.baseRotation.x + zSign * 0.06 * f;
    item.mesh.rotation.y = item.baseRotation.y + xSign * 0.015 * f;
    item.mesh.rotation.z = item.baseRotation.z + xSign * 0.11 * f;

    item.mesh.scale.x = Math.max(0.72, item.baseScale.x - 0.04 * f);
    item.mesh.scale.y = Math.max(0.78, item.baseScale.y - 0.025 * f);
    item.mesh.scale.z = Math.max(0.64, item.baseScale.z - 0.055 * f);
  }
}

function createSimpleTrafficBody(color = 0x3366ff) {
  const group = new THREE.Group();
  const vehicleRig = {
    wreckables: [],
    isWrecked: false
  };
  group.userData.vehicleRig = vehicleRig;

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
  registerWreckable(vehicleRig, base, 1.1);

  const sideLeft = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.8, 4.2),
    sideMat
  );
  sideLeft.position.set(-1.12, 0.92, 0);
  group.add(sideLeft);
  registerWreckable(vehicleRig, sideLeft, 0.8);

  const sideRight = sideLeft.clone();
  sideRight.material = sideLeft.material.clone();
  sideRight.position.x = 1.12;
  group.add(sideRight);
  registerWreckable(vehicleRig, sideRight, 0.8);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.85, 2.15),
    cabinMat
  );
  cabin.position.set(0, 1.62, -0.2);
  group.add(cabin);
  registerWreckable(vehicleRig, cabin, 0.9);

  const nose = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 0.45, 1.05),
    bodyMat.clone()
  );
  nose.position.set(0, 1.12, 1.68);
  group.add(nose);
  registerWreckable(vehicleRig, nose, 1);

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

function createInterior(playerRig, vehicleRig) {
  const interiorGroup = new THREE.Group();

  const trimDarkMat = new THREE.MeshStandardMaterial({
    color: 0x161a20,
    roughness: 0.92
  });

  const trimMidMat = new THREE.MeshStandardMaterial({
    color: 0x20242c,
    roughness: 0.86
  });

  const trimSoftMat = new THREE.MeshStandardMaterial({
    color: 0x2b313b,
    roughness: 0.88
  });

  const displayMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    emissive: 0x1d4ed8,
    emissiveIntensity: 0.32,
    roughness: 0.2
  });

  const consoleMat = new THREE.MeshStandardMaterial({
    color: 0x101418,
    emissive: 0x0f766e,
    emissiveIntensity: 0.18,
    roughness: 0.22
  });

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(1.52, 0.08, 2.2),
    trimDarkMat
  );
  floor.position.set(0, 0.98, -0.02);
  interiorGroup.add(floor);

  const tunnel = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 0.22, 1.5),
    trimMidMat
  );
  tunnel.position.set(0, 1.09, -0.18);
  interiorGroup.add(tunnel);

  const dashBase = new THREE.Mesh(
    new THREE.BoxGeometry(1.52, 0.32, 0.88),
    trimMidMat
  );
  dashBase.position.set(0, 1.4, 1.08);
  interiorGroup.add(dashBase);

  const dashTop = new THREE.Mesh(
    new THREE.BoxGeometry(1.44, 0.08, 0.72),
    trimDarkMat
  );
  dashTop.position.set(0, 1.58, 1.01);
  interiorGroup.add(dashTop);

  const instrumentPod = new THREE.Mesh(
    new THREE.BoxGeometry(0.64, 0.18, 0.28),
    trimSoftMat
  );
  instrumentPod.position.set(-0.32, 1.58, 1.18);
  instrumentPod.rotation.x = -0.24;
  interiorGroup.add(instrumentPod);

  const cluster = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.14, 0.04),
    displayMat
  );
  cluster.position.set(-0.32, 1.56, 1.32);
  cluster.rotation.x = -0.22;
  interiorGroup.add(cluster);

  const centerStack = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.36, 0.1),
    consoleMat
  );
  centerStack.position.set(0.02, 1.42, 1.3);
  centerStack.rotation.x = -0.18;
  interiorGroup.add(centerStack);

  const steeringColumn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 0.28, 10),
    trimSoftMat
  );
  steeringColumn.rotation.x = Math.PI / 2;
  steeringColumn.position.set(-0.38, 1.35, 0.9);
  interiorGroup.add(steeringColumn);

  const steeringWheel = new THREE.Mesh(
    new THREE.TorusGeometry(0.17, 0.025, 10, 22),
    new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.72
    })
  );
  steeringWheel.rotation.set(Math.PI / 2, 0, 0.18);
  steeringWheel.position.set(-0.38, 1.36, 0.78);
  interiorGroup.add(steeringWheel);

  const seatMat = new THREE.MeshStandardMaterial({
    color: 0x20242c,
    roughness: 0.92
  });

  const driverSeatBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.18, 0.52),
    seatMat
  );
  driverSeatBase.position.set(-0.36, 1.1, 0.02);
  interiorGroup.add(driverSeatBase);

  const driverSeatBack = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.68, 0.14),
    seatMat
  );
  driverSeatBack.position.set(-0.36, 1.44, -0.22);
  driverSeatBack.rotation.x = 0.18;
  interiorGroup.add(driverSeatBack);

  const passengerSeatBase = driverSeatBase.clone();
  passengerSeatBase.material = driverSeatBase.material.clone();
  passengerSeatBase.position.x = 0.36;
  interiorGroup.add(passengerSeatBase);

  const passengerSeatBack = driverSeatBack.clone();
  passengerSeatBack.material = driverSeatBack.material.clone();
  passengerSeatBack.position.x = 0.36;
  interiorGroup.add(passengerSeatBack);

  const rearBench = new THREE.Mesh(
    new THREE.BoxGeometry(1.08, 0.22, 0.56),
    seatMat.clone()
  );
  rearBench.position.set(0, 1.12, -1.18);
  interiorGroup.add(rearBench);

  const rearBack = new THREE.Mesh(
    new THREE.BoxGeometry(1.08, 0.56, 0.16),
    seatMat.clone()
  );
  rearBack.position.set(0, 1.45, -1.46);
  rearBack.rotation.x = 0.14;
  interiorGroup.add(rearBack);

  const windFrameTop = new THREE.Mesh(
    new THREE.BoxGeometry(1.46, 0.1, 0.12),
    trimDarkMat
  );
  windFrameTop.position.set(0, 2.0, 1.28);
  interiorGroup.add(windFrameTop);

  const windFrameLeft = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.76, 0.12),
    trimDarkMat
  );
  windFrameLeft.position.set(-0.73, 1.63, 1.16);
  interiorGroup.add(windFrameLeft);

  const windFrameRight = windFrameLeft.clone();
  windFrameRight.material = windFrameLeft.material.clone();
  windFrameRight.position.x = 0.73;
  interiorGroup.add(windFrameRight);

  const fpCameraAnchor = new THREE.Object3D();
  fpCameraAnchor.position.set(-0.16, 1.8, 1.42);
  interiorGroup.add(fpCameraAnchor);

  const fpLookAnchor = new THREE.Object3D();
  fpLookAnchor.position.set(-0.16, 1.77, 26);
  interiorGroup.add(fpLookAnchor);

  playerRig.firstPersonCameraAnchor = fpCameraAnchor;
  playerRig.firstPersonLookAnchor = fpLookAnchor;
  playerRig.interiorMeshes = [
    floor,
    tunnel,
    dashBase,
    dashTop,
    instrumentPod,
    cluster,
    centerStack,
    steeringColumn,
    steeringWheel,
    driverSeatBase,
    driverSeatBack,
    passengerSeatBase,
    passengerSeatBack,
    rearBench,
    rearBack,
    windFrameTop,
    windFrameLeft,
    windFrameRight
  ];

  playerRig.firstPersonHideInterior = [
    floor,
    tunnel,
    driverSeatBase,
    driverSeatBack,
    passengerSeatBase,
    passengerSeatBack,
    rearBench,
    rearBack,
    windFrameTop,
    windFrameLeft,
    windFrameRight
  ];

  for (const mesh of playerRig.interiorMeshes) {
    registerWreckable(vehicleRig, mesh, 0.42);
  }

  return interiorGroup;
}

function createPlayerRig() {
  const group = new THREE.Group();
  const vehicleRig = {
    wreckables: [],
    isWrecked: false
  };
  group.userData.vehicleRig = vehicleRig;

  const playerRig = {
    headlights: [],
    rearLights: [],
    frontIndicators: [],
    rearIndicators: [],
    smokeRoot: null,
    smokeParticles: [],
    smokeIndex: 0,
    smokeAccumulator: 0,
    blinkTime: 0,
    exhaustLocal: new THREE.Vector3(0.62, 0.72, -2.72),
    tempWorld: new THREE.Vector3(),
    tempDir: new THREE.Vector3(),
    tempUp: new THREE.Vector3(),
    tempPosition: new THREE.Vector3(),
    tempLookAt: new THREE.Vector3(),
    forceInteriorView: false,
    hideInFirstPerson: [],
    firstPersonHideInterior: [],
    interiorMeshes: [],
    firstPersonCameraAnchor: null,
    firstPersonLookAnchor: null
  };

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
  registerWreckable(vehicleRig, body, 1.15);

  const frontClip = new THREE.Mesh(
    new THREE.BoxGeometry(1.98, 0.48, 1.15),
    darkPaintMat
  );
  frontClip.position.set(0, 1.06, 2.07);
  group.add(frontClip);
  registerWreckable(vehicleRig, frontClip, 1);

  const rearClip = new THREE.Mesh(
    new THREE.BoxGeometry(1.96, 0.46, 0.92),
    darkPaintMat.clone()
  );
  rearClip.position.set(0, 1.02, -2.05);
  group.add(rearClip);
  registerWreckable(vehicleRig, rearClip, 0.95);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(1.62, 0.34, 2.3),
    paintMat.clone()
  );
  roof.position.set(0, 1.95, -0.02);
  group.add(roof);
  registerWreckable(vehicleRig, roof, 0.72);

  const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(1.54, 0.72, 0.14),
    glassMat
  );
  windshield.position.set(0, 1.62, 1.0);
  windshield.rotation.x = -0.58;
  group.add(windshield);
  registerWreckable(vehicleRig, windshield, 0.55);

  const rearGlass = new THREE.Mesh(
    new THREE.BoxGeometry(1.44, 0.58, 0.14),
    glassMat.clone()
  );
  rearGlass.position.set(0, 1.56, -1.1);
  rearGlass.rotation.x = 0.48;
  group.add(rearGlass);
  registerWreckable(vehicleRig, rearGlass, 0.48);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.56, 0.82, 2.18),
    glassMat.clone()
  );
  cabin.position.set(0, 1.55, -0.05);
  group.add(cabin);
  registerWreckable(vehicleRig, cabin, 0.62);

  const splitter = new THREE.Mesh(
    new THREE.BoxGeometry(2.02, 0.08, 0.36),
    trimMat
  );
  splitter.position.set(0, 0.55, 2.45);
  group.add(splitter);
  registerWreckable(vehicleRig, splitter, 0.7);

  const diffuser = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 0.08, 0.28),
    trimMat.clone()
  );
  diffuser.position.set(0, 0.54, -2.45);
  group.add(diffuser);
  registerWreckable(vehicleRig, diffuser, 0.58);

  const sideSkirtLeft = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.18, 3.6),
    trimMat.clone()
  );
  sideSkirtLeft.position.set(-1.07, 0.62, 0);
  group.add(sideSkirtLeft);
  registerWreckable(vehicleRig, sideSkirtLeft, 0.52);

  const sideSkirtRight = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.18, 3.6),
    trimMat.clone()
  );
  sideSkirtRight.position.set(1.07, 0.62, 0);
  group.add(sideSkirtRight);
  registerWreckable(vehicleRig, sideSkirtRight, 0.52);

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
  registerWreckable(vehicleRig, spoiler, 0.48);

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

  const interiorGroup = createInterior(playerRig, vehicleRig);
  group.add(interiorGroup);

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
  const skidRoot = new THREE.Group();
  const skidMaterial = createSkidMarkMaterial();
  const skidMarks = [];

  for (let i = 0; i < CONFIG.carVisuals.skidMarksMax; i++) {
    const mark = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      skidMaterial.clone()
    );
    mark.rotation.x = -Math.PI / 2;
    mark.visible = false;
    skidRoot.add(mark);
    skidMarks.push(mark);
  }

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

  playerRig.headlights = [headLeft, headRight];
  playerRig.rearLights = [brakeLeft, brakeRight];
  playerRig.frontIndicators = [indFrontLeft, indFrontRight];
  playerRig.rearIndicators = [indRearLeft, indRearRight];
  playerRig.smokeRoot = smokeRoot;
  playerRig.smokeParticles = smokeParticles;
  playerRig.skidRoot = skidRoot;
  playerRig.skidMarks = skidMarks;
  playerRig.skidMarkIndex = 0;
  playerRig.skidPrevLeft = null;
  playerRig.skidPrevRight = null;
  playerRig.skidWheelLeftLocal = new THREE.Vector3(-1.14, 0, -1.52);
  playerRig.skidWheelRightLocal = new THREE.Vector3(1.14, 0, -1.52);
  playerRig.skidTempLeft = new THREE.Vector3();
  playerRig.skidTempRight = new THREE.Vector3();
  playerRig.skidTempMid = new THREE.Vector3();
  playerRig.skidTempDir = new THREE.Vector3();
  playerRig.hideInFirstPerson = [
    body,
    frontClip,
    rearClip,
    roof,
    windshield,
    rearGlass,
    cabin,
    splitter,
    diffuser,
    sideSkirtLeft,
    sideSkirtRight,
    mirrorLeft,
    mirrorRight,
    spoiler,
    spoilerSupportLeft,
    spoilerSupportRight
  ];

  group.userData.playerRig = playerRig;

  return group;
}

export function createPlayerCar() {
  return createPlayerRig();
}

export function attachPlayerCarEffects(car, scene) {
  const rig = car.userData.playerRig;
  if (!rig || rig.smokeRoot.parent) return;
  scene.add(rig.smokeRoot);
  scene.add(rig.skidRoot);
}

export function setPlayerCarViewMode(car, {
  firstPerson = false,
  playerMode = "driving"
} = {}) {
  const rig = car.userData.playerRig;
  if (!rig) return;

  const enableInteriorView = !!firstPerson && playerMode === "driving";
  rig.forceInteriorView = enableInteriorView;

  for (const mesh of rig.hideInFirstPerson) {
    mesh.visible = !enableInteriorView;
  }

  for (const mesh of rig.firstPersonHideInterior) {
    mesh.visible = !enableInteriorView;
  }

  const keepVisible = [
    ...rig.interiorMeshes.filter((mesh) => !rig.firstPersonHideInterior.includes(mesh))
  ];

  for (const mesh of keepVisible) {
    mesh.visible = true;
  }
}

export function getPlayerCarFirstPersonCameraPose(
  car,
  lookDistance = 28
) {
  const rig = car.userData.playerRig;
  if (!rig || !rig.firstPersonCameraAnchor || !rig.firstPersonLookAnchor) {
    return null;
  }

  rig.firstPersonCameraAnchor.getWorldPosition(rig.tempPosition);
  rig.firstPersonLookAnchor.getWorldPosition(rig.tempLookAt);

  const dir = rig.tempLookAt.clone().sub(rig.tempPosition).normalize();
  rig.tempLookAt.copy(rig.tempPosition).addScaledVector(dir, lookDistance);

  return {
    position: rig.tempPosition.clone(),
    lookAt: rig.tempLookAt.clone()
  };
}

export function resetPlayerCarEffects(car) {
  const rig = car.userData.playerRig;
  if (!rig) return;

  resetVehicleWreckState(car);
  setPlayerCarViewMode(car, { firstPerson: false, playerMode: "driving" });

  rig.smokeAccumulator = 0;
  rig.blinkTime = 0;
  rig.skidMarkIndex = 0;
  rig.skidPrevLeft = null;
  rig.skidPrevRight = null;

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

  for (const mark of rig.skidMarks ?? []) {
    mark.visible = false;
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

function emitSkidSegment(rig, from, to, surfaceType = "road") {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const length = Math.hypot(dx, dz);

  if (length < 0.03 || length > 4) return;

  const mark = rig.skidMarks[rig.skidMarkIndex];
  rig.skidMarkIndex = (rig.skidMarkIndex + 1) % rig.skidMarks.length;

  rig.skidTempMid.set(
    (from.x + to.x) * 0.5,
    surfaceType === "grass"
      ? (CONFIG.carVisuals.grassSkidMarkYOffset ?? -0.155)
      : (CONFIG.carVisuals.skidMarkYOffset ?? -0.145),
    (from.z + to.z) * 0.5
  );
  rig.skidTempDir.set(dx, 0, dz);

  mark.visible = true;
  mark.position.copy(rig.skidTempMid);
  mark.rotation.set(-Math.PI / 2, Math.atan2(dx, dz), 0);
  mark.scale.set(
    surfaceType === "grass"
      ? (CONFIG.carVisuals.grassSkidMarkWidth ?? 0.28)
      : (CONFIG.carVisuals.skidMarkWidth ?? 0.22),
    length,
    1
  );
  mark.material.color.setHex(surfaceType === "grass" ? 0x2c2416 : 0x050505);
  mark.material.opacity = surfaceType === "grass"
    ? THREE.MathUtils.lerp(0.18, 0.3, Math.min(1, length * 2.2))
    : THREE.MathUtils.lerp(0.2, 0.38, Math.min(1, length * 2.2));
}

function updateSkidMarks(car, rig, state) {
  const speed = Math.abs(state.speed ?? 0);
  const steerAmount = Math.abs(state.steer ?? 0);
  const surfaceType = state.surfaceType ?? "road";
  const onGrass = surfaceType === "grass";
  const shouldSkid =
    (
      (
        !!state.isHandbraking &&
        speed >= (CONFIG.carVisuals.skidMarkMinSpeed ?? 0.16) &&
        steerAmount >= (CONFIG.carVisuals.skidMarkMinSteer ?? 0.22)
      ) ||
      (
        onGrass &&
        speed >= 0.09
      )
    );

  car.localToWorld(rig.skidTempLeft.copy(rig.skidWheelLeftLocal));
  car.localToWorld(rig.skidTempRight.copy(rig.skidWheelRightLocal));

  if (shouldSkid) {
    if (rig.skidPrevLeft) {
      emitSkidSegment(rig, rig.skidPrevLeft, rig.skidTempLeft, surfaceType);
    }
    if (rig.skidPrevRight) {
      emitSkidSegment(rig, rig.skidPrevRight, rig.skidTempRight, surfaceType);
    }

    if (!rig.skidPrevLeft) {
      rig.skidPrevLeft = rig.skidTempLeft.clone();
    } else {
      rig.skidPrevLeft.copy(rig.skidTempLeft);
    }

    if (!rig.skidPrevRight) {
      rig.skidPrevRight = rig.skidTempRight.clone();
    } else {
      rig.skidPrevRight.copy(rig.skidTempRight);
    }
    return;
  }

  rig.skidPrevLeft = null;
  rig.skidPrevRight = null;
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

  if (rig.skidRoot?.parent) {
    updateSkidMarks(car, rig, state);
  }
}

export function createTrafficCar(color = 0x3366ff) {
  return createImportedTrafficCar(color);
}

export function createTrafficTruck(
  cabColor = 0x2563eb,
  trailerColor = 0xe5e7eb
) {
  const group = new THREE.Group();
  const vehicleRig = {
    wreckables: [],
    isWrecked: false
  };
  group.userData.vehicleRig = vehicleRig;

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
  registerWreckable(vehicleRig, trailer, 1.18);

  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.32, 8.7),
    darkMat
  );
  chassis.position.set(0, 0.62, -0.2);
  group.add(chassis);
  registerWreckable(vehicleRig, chassis, 0.82);

  const cabBase = new THREE.Mesh(
    new THREE.BoxGeometry(2.25, 1.55, 2.15),
    cabMat
  );
  cabBase.position.set(0, 1.35, 3.0);
  group.add(cabBase);
  registerWreckable(vehicleRig, cabBase, 1);

  const cabTop = new THREE.Mesh(
    new THREE.BoxGeometry(2.05, 1.1, 1.55),
    cabMat
  );
  cabTop.position.set(0, 2.25, 2.75);
  group.add(cabTop);
  registerWreckable(vehicleRig, cabTop, 0.78);

  const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.8, 0.1),
    glassMat
  );
  windshield.position.set(0, 2.18, 3.8);
  group.add(windshield);
  registerWreckable(vehicleRig, windshield, 0.46);

  const grill = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.62, 0.14),
    darkMat
  );
  grill.position.set(0, 1.2, 4.1);
  group.add(grill);
  registerWreckable(vehicleRig, grill, 0.62);

  const bumper = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 0.26, 0.2),
    darkMat
  );
  bumper.position.set(0, 0.78, 4.18);
  group.add(bumper);
  registerWreckable(vehicleRig, bumper, 0.56);

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
