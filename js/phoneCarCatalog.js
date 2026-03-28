import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/addons/utils/SkeletonUtils.js";

const CAR_MODEL_BASE_PATH = "../assets/models/vehicles/cars/";
const CAR_VISUAL_SCALE_MULTIPLIER = 1.55;

const catalogLoader = new GLTFLoader();
const catalogCache = new Map();

const carPath = (fileName) =>
  `${CAR_MODEL_BASE_PATH}${encodeURIComponent(fileName)}`;

const CAR_CATALOG = [
  { file: "Car 1.glb", label: "Aster S1", category: "Compacto", price: 18500, power: 118, zeroToHundred: 8.4, topSpeed: 172, drive: "FWD", width: 2.2, depth: 4.6, height: 1.9, rotY: 0, yOffset: 0 },
  { file: "Car 2.glb", label: "Monaco GT", category: "Berlina", price: 24500, power: 136, zeroToHundred: 7.6, topSpeed: 188, drive: "RWD", width: 2.2, depth: 4.6, height: 1.9, rotY: 0, yOffset: 0 },
  { file: "Car 3.glb", label: "Nordic R", category: "Deportivo", price: 33900, power: 178, zeroToHundred: 6.1, topSpeed: 204, drive: "AWD", width: 2.2, depth: 4.6, height: 1.9, rotY: 0, yOffset: 0 },
  { file: "Car 4.glb", label: "Velvet LX", category: "SUV", price: 27200, power: 124, zeroToHundred: 8.9, topSpeed: 176, drive: "FWD", width: 2.2, depth: 4.6, height: 1.9, rotY: 0, yOffset: 0 },
  { file: "Car 5.glb", label: "Comet RS", category: "Coupe", price: 38400, power: 196, zeroToHundred: 5.8, topSpeed: 212, drive: "RWD", width: 2.2, depth: 4.6, height: 1.9, rotY: 0, yOffset: 0 },
  { file: "Car 6.glb", label: "Metro Mini", category: "Urbano", price: 14900, power: 92, zeroToHundred: 9.6, topSpeed: 166, drive: "FWD", width: 2.2, depth: 4.6, height: 1.9, rotY: 0, yOffset: 0 },
  { file: "Car 7.glb", label: "Falcon XR", category: "Sportback", price: 31800, power: 164, zeroToHundred: 6.9, topSpeed: 196, drive: "AWD", width: 2.2, depth: 4.6, height: 1.9, rotY: 0, yOffset: 0 },
  { file: "Car 8.glb", label: "Vortex Z", category: "Supercar", price: 45900, power: 221, zeroToHundred: 5.4, topSpeed: 218, drive: "RWD", width: 2.2, depth: 4.6, height: 1.9, rotY: 0, yOffset: 0 },
  { file: "Car 9.glb", label: "Solace Touring", category: "Familiar", price: 28600, power: 148, zeroToHundred: 7.8, topSpeed: 184, drive: "AWD", width: 2.2, depth: 4.6, height: 1.9, rotY: 0, yOffset: 0 },
  { file: "Car 10.glb", label: "Titan Coupe", category: "GT", price: 37200, power: 187, zeroToHundred: 6.2, topSpeed: 207, drive: "RWD", width: 2.2, depth: 4.6, height: 1.9, rotY: 0, yOffset: 0 },
  { file: "Car 11.glb", label: "Phoenix Turbo", category: "Track", price: 52900, power: 268, zeroToHundred: 4.9, topSpeed: 226, drive: "AWD", width: 2.2, depth: 4.6, height: 1.9, rotY: 0, yOffset: 0 },
  { file: "Car 12.glb", label: "Aurora EV", category: "Electrico", price: 49800, power: 245, zeroToHundred: 6.6, topSpeed: 198, drive: "AWD", width: 2.2, depth: 4.6, height: 1.9, rotY: 0, yOffset: 0 },
  { file: "Car 13.glb", label: "Gran Via", category: "Sedan", price: 30100, power: 154, zeroToHundred: 7.1, topSpeed: 191, drive: "FWD", width: 2.2, depth: 4.6, height: 1.9, rotY: 0, yOffset: 0 },
  { file: "Car 14.glb", label: "Atlas Sport", category: "Crossover", price: 42100, power: 203, zeroToHundred: 5.7, topSpeed: 214, drive: "AWD", width: 2.2, depth: 4.6, height: 1.9, rotY: 0, yOffset: 0 },
  { file: "Car 15.glb", label: "Nebula X", category: "Hyper", price: 61900, power: 296, zeroToHundred: 4.6, topSpeed: 233, drive: "RWD", width: 2.2, depth: 4.6, height: 1.9, rotY: 0, yOffset: 0 }
];

function fitImportedVehicleModel(container, model, {
  width = 2.2,
  depth = 4.6,
  height = 1.9,
  rotY = 0,
  yOffset = 0
} = {}) {
  const targetWidth = width * CAR_VISUAL_SCALE_MULTIPLIER;
  const targetDepth = depth * CAR_VISUAL_SCALE_MULTIPLIER;
  const targetHeight = height * CAR_VISUAL_SCALE_MULTIPLIER;

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

function loadCatalogTemplate(fileName) {
  if (!catalogCache.has(fileName)) {
    catalogCache.set(
      fileName,
      new Promise((resolve, reject) => {
        catalogLoader.load(
          carPath(fileName),
          (gltf) => {
            const root = gltf.scene || gltf.scenes?.[0];
            if (!root) {
              reject(new Error(`El GLB no tiene escena raiz: ${fileName}`));
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

  return catalogCache.get(fileName);
}

export function getPhoneCarCatalog() {
  return CAR_CATALOG.map((car) => ({
    file: car.file,
    label: car.label,
    category: car.category,
    price: car.price,
    power: car.power,
    zeroToHundred: car.zeroToHundred,
    topSpeed: car.topSpeed,
    drive: car.drive
  }));
}

export async function loadPhoneCarPreview(fileName) {
  const car = CAR_CATALOG.find((entry) => entry.file === fileName);
  if (!car) {
    throw new Error(`Modelo no encontrado: ${fileName}`);
  }

  const template = await loadCatalogTemplate(fileName);
  const clone = SkeletonUtils.clone(template);
  const root = new THREE.Group();

  fitImportedVehicleModel(root, clone, car);

  root.traverse((child) => {
    if (!child.isMesh) return;

    if (Array.isArray(child.material)) {
      child.material = child.material.map((material) =>
        material?.clone ? material.clone() : material
      );
    } else if (child.material?.clone) {
      child.material = child.material.clone();
    }

    child.castShadow = false;
    child.receiveShadow = true;
  });

  return root;
}
