import * as THREE from "three";
import { CONFIG } from "./config.js";
import { createInput } from "./input.js";
import { createWorld } from "./world.js";
import { createCameraController } from "./cameraController.js";
import { createEditorMode } from "./editor/editorMode.js";
import {
  createPlayerCar,
  attachPlayerCarEffects,
  updatePlayerCarEffects,
  resetPlayerCarEffects
} from "./car.js";
import {
  getPhoneCarCatalog,
  loadPhoneCarPreview
} from "./phoneCarCatalog.js";
import {
  createPlayerCharacter,
  updatePlayerCharacterVisual,
  resetPlayerCharacterVisual
} from "./player/characterVisual.js";
import { createGame } from "./game.js";

const canvas = document.querySelector("#game");
const speedEl = document.querySelector("#speed");
const scoreEl = document.querySelector("#score");
const moneyEl = document.querySelector("#money");
const statusEl = document.querySelector("#status");
const cameraModeEl = document.querySelector("#camera-mode");
const gameOverEl = document.querySelector("#game-over");
const editorPanelEl = document.querySelector("#editor-panel");
const editorPaletteEl = document.querySelector("#editor-palette");
const editorSelectedLabelEl = document.querySelector("#editor-selected-label");
const editorCursorLabelEl = document.querySelector("#editor-cursor-label");
const editorRotationLabelEl = document.querySelector("#editor-rotation-label");
const editorCountLabelEl = document.querySelector("#editor-count-label");
const editorRotateBtn = document.querySelector("#editor-rotate");
const editorClearBtn = document.querySelector("#editor-clear");
const editorLayoutNameEl = document.querySelector("#editor-layout-name");
const editorSaveSlotBtn = document.querySelector("#editor-save-slot");
const editorLoadSlotBtn = document.querySelector("#editor-load-slot");
const editorDeleteSlotBtn = document.querySelector("#editor-delete-slot");
const editorLayoutListEl = document.querySelector("#editor-layout-list");
const editorCloseBtn = document.querySelector("#editor-close");

const fuelCardEl = document.querySelector("#fuel-card");
const fuelPercentEl = document.querySelector("#fuel-percent");
const fuelLitersEl = document.querySelector("#fuel-liters");
const fuelStateEl = document.querySelector("#fuel-state");
const fuelBarFillEl = document.querySelector("#fuel-bar-fill");

const missionCardEl = document.querySelector("#mission-card");
const missionTitleEl = document.querySelector("#mission-title");
const missionObjectiveEl = document.querySelector("#mission-objective");
const missionMetaEl = document.querySelector("#mission-meta");
const missionCountEl = document.querySelector("#mission-count");

const weaponCardEl = document.querySelector("#weapon-card");
const weaponNameEl = document.querySelector("#weapon-name");
const weaponAmmoEl = document.querySelector("#weapon-ammo");
const weaponStateEl = document.querySelector("#weapon-state");

const promptEl = document.querySelector("#prompt");
const phoneShellEl = document.querySelector("#phone-shell");
const phoneHomeViewEl = document.querySelector("#phone-home-view");
const phoneStatusEl = document.querySelector("#phone-status");
const phoneAppButtons = Array.from(document.querySelectorAll(".phone-app"));
const dealerBrowserEl = document.querySelector("#dealer-browser");
const dealerCarListEl = document.querySelector("#dealer-car-list");
const dealerBrowserCloseBtn = document.querySelector("#dealer-browser-close");
const dealerIntroTextEl = document.querySelector("#dealer-browser-intro-text");
const dealerCountEl = document.querySelector("#dealer-browser-count");
const cameraSettingsPanelEl = document.querySelector("#camera-settings");
const settingsToggleEl = document.querySelector("#settings-toggle");
const fpSensEl = document.querySelector("#fp-sens");
const fpSensValueEl = document.querySelector("#fp-sens-value");
const tpSensEl = document.querySelector("#tp-sens");
const tpSensValueEl = document.querySelector("#tp-sens-value");
const fpsEl = document.querySelector("#fps");

const navMapTitleEl = document.querySelector("#nav-map-title");
const navMapStateEl = document.querySelector("#nav-map-state");
const navMapSvg = document.querySelector("#nav-map-svg");
const navRouteEl = document.querySelector("#nav-route");
const navPlayerEl = document.querySelector("#nav-player");
const navCarEl = document.querySelector("#nav-car");
const navTargetEl = document.querySelector("#nav-target");
const navPizzeriaEl = document.querySelector("#nav-pizzeria");
const navMapViewEl = navPlayerEl.parentElement;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  68,
  window.innerWidth / window.innerHeight,
  0.1,
  2600
);

const clock = new THREE.Clock();
let fpsSmoothed = 0;

const input = createInput();
const world = createWorld(scene);

const playerCar = createPlayerCar();
scene.add(playerCar);
attachPlayerCarEffects(playerCar, scene);

const playerCharacter = createPlayerCharacter();
scene.add(playerCharacter);

const game = createGame(scene, playerCar, playerCharacter, world);

const pizzeriaInfo = world.getPizzeriaInfo ? world.getPizzeriaInfo() : null;
const weaponShopInfo = world.getWeaponShopInfo ? world.getWeaponShopInfo() : null;
const gasStationInfos = world.getGasStationInfos ? world.getGasStationInfos() : [];

const lookTarget = new THREE.Vector3();
const cameraController = createCameraController(camera, lookTarget);
const CAMERA_SETTINGS_KEY = "road-driver-camera-settings-v1";

const MAP_SIZE = CONFIG.minimap.size;
const MAP_EXTENT = CONFIG.minimap.extent;
let phoneOpen = false;
let dealerBrowserOpen = false;
let dealerCatalogBuilt = false;
let dealerPreviewLoader = null;

const phoneCarCatalog = getPhoneCarCatalog();


const editorJsonTextEl = document.querySelector("#editor-json-text");
const editorExportJsonBtn = document.querySelector("#editor-export-json");
const editorExportModuleBtn = document.querySelector("#editor-export-module");
const editorImportJsonBtn = document.querySelector("#editor-import-json");
const editorLoadProjectBtn = document.querySelector("#editor-load-project");
const editorJsonStatusEl = document.querySelector("#editor-json-status");
const editor = createEditorMode(
  scene,
  camera,
  renderer,
  {
    panelEl: editorPanelEl,
    paletteEl: editorPaletteEl,
    selectedLabelEl: editorSelectedLabelEl,
    cursorLabelEl: editorCursorLabelEl,
    rotationLabelEl: editorRotationLabelEl,
    countLabelEl: editorCountLabelEl,
    rotateBtn: editorRotateBtn,
    clearBtn: editorClearBtn,
    layoutNameEl: editorLayoutNameEl,
    saveSlotBtn: editorSaveSlotBtn,
    loadSlotBtn: editorLoadSlotBtn,
    deleteSlotBtn: editorDeleteSlotBtn,
    layoutListEl: editorLayoutListEl,
    closeBtn: editorCloseBtn,
    jsonTextEl: editorJsonTextEl,
    exportJsonBtn: editorExportJsonBtn,
    exportModuleBtn: editorExportModuleBtn,
    importJsonBtn: editorImportJsonBtn,
    loadProjectBtn: editorLoadProjectBtn,
    jsonStatusEl: editorJsonStatusEl,
  },
  {
    removeWorldObject: world.removeEditorObject
  }
);

function readSavedCameraSettings() {
  try {
    const raw = localStorage.getItem(CAMERA_SETTINGS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveCameraSettings(settings) {
  try {
    localStorage.setItem(CAMERA_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignorado en modo privado o con storage bloqueado.
  }
}

function updateCameraSettingsUI(settings) {
  fpSensEl.value = String(settings.firstPersonSensitivity);
  tpSensEl.value = String(settings.thirdPersonTurnSensitivity);

  fpSensValueEl.textContent = Number(settings.firstPersonSensitivity).toFixed(4);
  tpSensValueEl.textContent = `${Number(settings.thirdPersonTurnSensitivity).toFixed(2)}x`;
}

function applyCameraSettings(nextSettings, persist = true) {
  cameraController.setSettings(nextSettings);
  const applied = cameraController.getSettings();
  updateCameraSettingsUI(applied);
  if (persist) {
    saveCameraSettings(applied);
  }
}

function setupCameraSettingsPanel() {
  const saved = readSavedCameraSettings();
  const defaults = cameraController.getSettings();

  applyCameraSettings(
    {
      firstPersonSensitivity: saved?.firstPersonSensitivity ?? defaults.firstPersonSensitivity,
      thirdPersonTurnSensitivity: saved?.thirdPersonTurnSensitivity ?? defaults.thirdPersonTurnSensitivity
    },
    false
  );

  fpSensEl.addEventListener("input", () => {
    applyCameraSettings({
      firstPersonSensitivity: Number(fpSensEl.value)
    });
  });

  tpSensEl.addEventListener("input", () => {
    applyCameraSettings({
      thirdPersonTurnSensitivity: Number(tpSensEl.value)
    });
  });

  cameraSettingsPanelEl.addEventListener("mousedown", (event) => {
    event.stopPropagation();
  });

  settingsToggleEl.addEventListener("click", () => {
    cameraSettingsPanelEl.classList.toggle("hidden");
  });
}

function worldToMap(x, z) {
  const px = ((x + MAP_EXTENT) / (MAP_EXTENT * 2)) * MAP_SIZE;
  const py = MAP_SIZE - ((z + MAP_EXTENT) / (MAP_EXTENT * 2)) * MAP_SIZE;
  return { x: px, y: py };
}

function setMarker(el, worldX, worldZ, rotation = 0, visible = true) {
  el.classList.toggle("hidden", !visible);
  if (!visible) return;

  const p = worldToMap(worldX, worldZ);
  el.style.left = `${p.x}px`;
  el.style.top = `${p.y}px`;
  el.style.transform = `translate(-50%, -50%) rotate(${rotation}rad)`;
}

function createSvgLine(x1, y1, x2, y2, cls) {
  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", x1);
  line.setAttribute("y1", y1);
  line.setAttribute("x2", x2);
  line.setAttribute("y2", y2);
  line.setAttribute("class", cls);
  return line;
}

function applyInlineMarkerStyle(el, type) {
  el.style.position = "absolute";
  el.style.pointerEvents = "none";

  if (type === "weapon-shop") {
    el.style.width = "12px";
    el.style.height = "12px";
    el.style.borderRadius = "3px";
    el.style.background = "#ef4444";
    el.style.boxShadow = "0 0 0 3px rgba(239,68,68,0.16), 0 0 12px rgba(239,68,68,0.42)";
  }

  if (type === "gas-station") {
    el.style.width = "10px";
    el.style.height = "10px";
    el.style.borderRadius = "2px";
    el.style.background = "#22c55e";
    el.style.boxShadow = "0 0 0 3px rgba(34,197,94,0.15), 0 0 12px rgba(34,197,94,0.38)";
  }
}

function createMapMarker(className, title = "", styleType = "") {
  const el = document.createElement("div");
  el.className = `map-marker ${className}`;
  el.title = title;
  applyInlineMarkerStyle(el, styleType || className);
  navMapViewEl.appendChild(el);
  return el;
}

const navWeaponShopEl = weaponShopInfo
  ? createMapMarker("weapon-shop", weaponShopInfo.label, "weapon-shop")
  : null;

const navGasStationEls = gasStationInfos.map((station) =>
  createMapMarker("gas-station", station.brand, "gas-station")
);

function initMinimap() {
  navMapSvg.setAttribute("viewBox", `0 0 ${MAP_SIZE} ${MAP_SIZE}`);

  const roadCoords = [-2, -1, 0, 1, 2].map((v) => v * CONFIG.blockSize);

  for (const coord of roadCoords) {
    const pV = worldToMap(coord, 0);
    const pH = worldToMap(0, coord);

    navMapSvg.appendChild(
      createSvgLine(pV.x, 0, pV.x, MAP_SIZE, "map-road-line")
    );

    navMapSvg.appendChild(
      createSvgLine(0, pH.y, MAP_SIZE, pH.y, "map-road-line")
    );
  }

  navMapSvg.appendChild(navRouteEl);
}

function updatePrompt(state) {
  if (phoneOpen) {
    promptEl.textContent = "";
    promptEl.classList.add("hidden");
    return;
  }

  let text = "";

  if (state.gameOver) {
    text = "";
  } else if (state.isRefueling) {
    text = `Repostando... ${state.fuelPct}%`;
  } else if (state.actionPrompt) {
    text = state.actionPrompt;
  } else if (state.outOfFuel && state.playerMode === "driving") {
    text = "Depósito vacío";
  }

  promptEl.textContent = text;
  promptEl.classList.toggle("hidden", !text);
}

function updateFuelUI(state) {
  fuelPercentEl.textContent = `${state.fuelPct}%`;
  fuelLitersEl.textContent = `${state.fuelLiters.toFixed(1)} L`;

  fuelCardEl.classList.remove("normal", "low", "critical", "refueling");

  if (state.isRefueling) {
    fuelCardEl.classList.add("refueling");
    fuelStateEl.textContent = "Repostando";
  } else if (state.outOfFuel) {
    fuelCardEl.classList.add("critical");
    fuelStateEl.textContent = "Vacío";
  } else if (state.criticalFuel) {
    fuelCardEl.classList.add("critical");
    fuelStateEl.textContent = "Crítico";
  } else if (state.lowFuel) {
    fuelCardEl.classList.add("low");
    fuelStateEl.textContent = "Reserva";
  } else {
    fuelCardEl.classList.add("normal");
    fuelStateEl.textContent = "Óptimo";
  }

  fuelBarFillEl.style.width = `${Math.max(0, Math.min(100, state.fuelPct))}%`;
}

function updateMissionUI(state) {
  const mission = state.missionState;

  missionTitleEl.textContent = mission.title;
  missionObjectiveEl.textContent = mission.objective;
  missionMetaEl.textContent = mission.shortStatus;
  missionCountEl.textContent = `${mission.deliveredCount} entregas`;

  missionCardEl.classList.toggle("carrying", mission.carryingPizza);
}

function updateWeaponUI(state) {
  const weapon = state.weaponHud;

  weaponNameEl.textContent = weapon.equippedLabel;
  weaponAmmoEl.textContent = weapon.hasEquippedWeapon
    ? `${weapon.ammo} balas`
    : "Sin equipar";

  if (weapon.inShop) {
    weaponStateEl.textContent = `Tienda · ${weapon.selectedShopLabel} · $${weapon.selectedShopPrice}`;
  } else if (weapon.hasEquippedWeapon) {
    weaponStateEl.textContent = `Inventario · ${weapon.ownedCount} arma${weapon.ownedCount === 1 ? "" : "s"}`;
  } else {
    weaponStateEl.textContent = "Compra en Armería Atlas";
  }

  weaponCardEl.classList.toggle("armed", weapon.hasEquippedWeapon);
  weaponCardEl.classList.toggle("shop", weapon.inShop);
}

function updateMinimap(state) {
  const playerPoint = worldToMap(state.playerPose.x, state.playerPose.z);

  setMarker(
    navPlayerEl,
    state.playerPose.x,
    state.playerPose.z,
    Math.PI - state.playerPose.heading,
    true
  );

  if (pizzeriaInfo) {
    setMarker(navPizzeriaEl, pizzeriaInfo.center.x, pizzeriaInfo.center.z, 0, true);
  } else {
    navPizzeriaEl.classList.add("hidden");
  }

  if (navWeaponShopEl && weaponShopInfo) {
    setMarker(navWeaponShopEl, weaponShopInfo.center.x, weaponShopInfo.center.z, 0, true);
  }

  for (let i = 0; i < navGasStationEls.length; i++) {
    const el = navGasStationEls[i];
    const info = gasStationInfos[i];
    if (!el || !info) continue;
    setMarker(el, info.center.x, info.center.z, Math.PI / 4, true);
  }

  const showCar = state.playerMode === "walking";
  setMarker(navCarEl, state.vehiclePose.x, state.vehiclePose.z, 0, showCar);

  const targetPoint = state.missionState.targetPoint;
  const hasTarget = !!targetPoint;

  if (hasTarget) {
    setMarker(navTargetEl, targetPoint.x, targetPoint.z, 0, true);

    const targetMap = worldToMap(targetPoint.x, targetPoint.z);
    navRouteEl.setAttribute("x1", playerPoint.x);
    navRouteEl.setAttribute("y1", playerPoint.y);
    navRouteEl.setAttribute("x2", targetMap.x);
    navRouteEl.setAttribute("y2", targetMap.y);
    navRouteEl.classList.remove("hidden");

    navMapTitleEl.textContent = "Mapa de reparto";
    navMapStateEl.textContent = state.missionState.targetHouseLabel;
  } else {
    navTargetEl.classList.add("hidden");
    navRouteEl.classList.add("hidden");
    navMapTitleEl.textContent = "Mapa de ciudad";
    navMapStateEl.textContent = "Pizzería · Armería · Fuel";
  }
}

function updateUI(state) {
  speedEl.textContent = state.speedKmh;
  scoreEl.textContent = state.score;
  moneyEl.textContent = `$${state.money}`;
  fpsEl.textContent = Math.round(fpsSmoothed);
  cameraModeEl.textContent = cameraController.isFirstPerson()
    ? "1ª persona"
    : "3ª persona";

  if (phoneOpen) {
    statusEl.textContent = "Usando movil";
  } else if (state.gameOver) {
    statusEl.textContent = state.failureLabel;
  } else if (state.playerMode === "walking") {
    if (state.missionState.carryingPizza) {
      statusEl.textContent = `A pie · Reparto · ${state.missionState.targetHouseLabel}`;
    } else {
      statusEl.textContent = world.isNightMode()
        ? "A pie · Noche"
        : "A pie · Día";
    }
  } else if (state.isRefueling) {
    statusEl.textContent = "Repostando";
  } else if (state.missionState.carryingPizza) {
    statusEl.textContent = world.isNightMode()
      ? "Con pedido · Noche"
      : "Con pedido · Día";
  } else if (state.outOfFuel) {
    statusEl.textContent = "Sin combustible";
  } else if (state.criticalFuel) {
    statusEl.textContent = world.isNightMode()
      ? "Crítico · Noche"
      : "Crítico · Día";
  } else if (state.lowFuel) {
    statusEl.textContent = world.isNightMode()
      ? "Poco combustible · Noche"
      : "Poco combustible · Día";
  } else {
    statusEl.textContent = world.isNightMode()
      ? "Jugando · Noche"
      : "Jugando · Día";
  }

  updateFuelUI(state);
  updateMissionUI(state);
  updateWeaponUI(state);
  updateMinimap(state);
  updatePrompt(state);
  gameOverEl.classList.toggle("hidden", !state.gameOver);
}

function formatPhoneMoney(amount) {
  return `$${Number(amount).toLocaleString("es-ES")}`;
}

let phonePreviewRenderer = null;
const PHONE_PREVIEW_WIDTH = 360;
const PHONE_PREVIEW_HEIGHT = 210;

function getPhonePreviewRenderer() {
  if (!phonePreviewRenderer) {
    phonePreviewRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    phonePreviewRenderer.setPixelRatio(1);
    phonePreviewRenderer.setSize(PHONE_PREVIEW_WIDTH, PHONE_PREVIEW_HEIGHT, false);
    phonePreviewRenderer.outputColorSpace = THREE.SRGBColorSpace;
    phonePreviewRenderer.setClearColor(0x000000, 0);
  }

  return phonePreviewRenderer;
}

async function renderPhoneCarPreview(fileName) {
  const renderer = getPhonePreviewRenderer();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    30,
    PHONE_PREVIEW_WIDTH / PHONE_PREVIEW_HEIGHT,
    0.1,
    100
  );

  scene.add(new THREE.HemisphereLight(0xffffff, 0x334155, 2.4));

  const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
  keyLight.position.set(4, 6, 5);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x93c5fd, 1.4);
  rimLight.position.set(-5, 3, -4);
  scene.add(rimLight);

  const previewRoot = await loadPhoneCarPreview(fileName);
  const turntable = new THREE.Group();
  turntable.add(previewRoot);
  turntable.rotation.y = Math.PI / 4;
  scene.add(turntable);

  const box = new THREE.Box3().setFromObject(turntable);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  turntable.position.x -= center.x;
  turntable.position.y -= box.min.y + size.y * 0.04;
  turntable.position.z -= center.z;

  const maxDim = Math.max(size.x, size.y, size.z);
  camera.position.set(maxDim * 1.45, maxDim * 0.85, maxDim * 2.25);
  camera.lookAt(0, size.y * 0.35, 0);

  renderer.clear();
  renderer.render(scene, camera);

  previewRoot.traverse((child) => {
    if (!child.isMesh) return;

    if (Array.isArray(child.material)) {
      for (const material of child.material) {
        material?.dispose?.();
      }
    } else {
      child.material?.dispose?.();
    }
  });

  return renderer.domElement.toDataURL("image/png");
}

function createDealerCarCard(car) {
  const card = document.createElement("article");
  card.className = "phone-car-card";
  card.dataset.carFile = car.file;
  card.innerHTML = `
    <div class="phone-car-media">
      <div class="phone-car-placeholder">Cargando</div>
      <img alt="${car.label}" loading="lazy" />
    </div>
    <div class="phone-car-info">
      <h3 class="phone-car-name">${car.label}</h3>
      <p class="phone-car-category">${car.category}</p>
      <div class="phone-car-meta">
        <span class="phone-car-price">${formatPhoneMoney(car.price)}</span>
        <button class="phone-car-buy" type="button">Comprar</button>
      </div>
      <div class="phone-car-spec-grid">
        <div class="phone-car-spec">
          <span class="phone-car-spec-label">Potencia</span>
          <span class="phone-car-spec-value">${car.power} CV</span>
        </div>
        <div class="phone-car-spec">
          <span class="phone-car-spec-label">0-100</span>
          <span class="phone-car-spec-value">${car.zeroToHundred.toFixed(1)} s</span>
        </div>
        <div class="phone-car-spec">
          <span class="phone-car-spec-label">Punta</span>
          <span class="phone-car-spec-value">${car.topSpeed} km/h</span>
        </div>
        <div class="phone-car-spec">
          <span class="phone-car-spec-label">Traccion</span>
          <span class="phone-car-spec-value">${car.drive}</span>
        </div>
      </div>
    </div>
  `;

  const buyButton = card.querySelector(".phone-car-buy");
  buyButton.addEventListener("click", () => {
    dealerIntroTextEl.textContent =
      `La compra real de ${car.label} la conectamos en el siguiente paso.`;
  });

  return card;
}

function buildDealerCatalog() {
  if (dealerCatalogBuilt) return;

  const fragment = document.createDocumentFragment();
  for (const car of phoneCarCatalog) {
    fragment.appendChild(createDealerCarCard(car));
  }

  dealerCarListEl.appendChild(fragment);
  dealerCatalogBuilt = true;
  dealerCountEl.textContent = `${phoneCarCatalog.length} modelos`;
}

function ensureDealerCatalogPreviews() {
  if (dealerPreviewLoader) return dealerPreviewLoader;

  dealerPreviewLoader = (async () => {
    const cards = Array.from(dealerCarListEl.querySelectorAll(".phone-car-card"));

    for (const card of cards) {
      const fileName = card.dataset.carFile;
      const image = card.querySelector("img");
      const placeholder = card.querySelector(".phone-car-placeholder");

      try {
        const dataUrl = await renderPhoneCarPreview(fileName);
        image.src = dataUrl;
        placeholder?.remove();
      } catch (error) {
        console.error(`No se pudo crear la preview de ${fileName}`, error);
        if (placeholder) {
          placeholder.textContent = "Sin preview";
        }
      }
    }
  })();

  return dealerPreviewLoader;
}

function clearMomentaryInputs() {
  input.left = false;
  input.right = false;
  input.accelerate = false;
  input.brake = false;
  input.restart = false;
  input.interact = false;
  input.toggleNight = false;
  input.toggleFirstPerson = false;
  input.jump = false;
  input.sprint = false;
  input.fire = false;
  input.shopPrev = false;
  input.shopNext = false;
  input.selectWeapon1 = false;
  input.selectWeapon2 = false;
  input.selectWeapon3 = false;
}

function updateOverlayVisibility() {
  phoneShellEl.classList.toggle("hidden", !phoneOpen);
  phoneShellEl.setAttribute("aria-hidden", String(!phoneOpen));
  dealerBrowserEl.classList.toggle("hidden", !dealerBrowserOpen);
  dealerBrowserEl.setAttribute("aria-hidden", String(!dealerBrowserOpen));

  const overlayOpen = phoneOpen || dealerBrowserOpen;
  document.body.classList.toggle("phone-active", overlayOpen);

  if (overlayOpen) {
    clearMomentaryInputs();
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
  }
}

function setPhoneOpen(nextOpen) {
  phoneOpen = nextOpen;
  if (phoneOpen) {
    dealerBrowserOpen = false;
  }
  phoneHomeViewEl.classList.remove("hidden");
  updateOverlayVisibility();
}

function setDealerBrowserOpen(nextOpen) {
  dealerBrowserOpen = nextOpen;
  if (dealerBrowserOpen) {
    phoneOpen = false;
  }
  updateOverlayVisibility();
}

function togglePhone() {
  setPhoneOpen(!phoneOpen);
}

function openDealerBrowser() {
  dealerIntroTextEl.textContent =
    "Catalogo completo de coches disponibles en el juego.";
  buildDealerCatalog();
  ensureDealerCatalogPreviews();
  setDealerBrowserOpen(true);
}

function setupPhoneUI() {
  buildDealerCatalog();

  phoneAppButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const appName = button.querySelector("strong")?.textContent ?? "App";
      const appId = button.dataset.app ?? "";

      if (appId === "taxi") {
        const result = game.requestTaxiPickup();
        phoneStatusEl.textContent = result.message;
        return;
      }

      if (appId === "autos") {
        openDealerBrowser();
        return;
      }

      phoneStatusEl.textContent = `${appName} lista. En el siguiente paso conectamos su funcionalidad.`;
    });
  });

  dealerBrowserCloseBtn.addEventListener("click", () => {
    setDealerBrowserOpen(false);
  });

  phoneShellEl.addEventListener("mousedown", (event) => {
    event.stopPropagation();
  });

  dealerBrowserEl.addEventListener("mousedown", (event) => {
    if (event.target === dealerBrowserEl) {
      setDealerBrowserOpen(false);
    }
    event.stopPropagation();
  });
}

function restartGame() {
  game.reset();
  resetPlayerCarEffects(playerCar);
  resetPlayerCharacterVisual(playerCharacter);

  const state = game.update(
    {
      left: false,
      right: false,
      accelerate: false,
      brake: false,
      restart: false,
      interact: false,
      toggleNight: false,
      toggleFirstPerson: false,
      togglePhone: false,
      jump: false,
      sprint: false,
      fire: false,
      shopPrev: false,
      shopNext: false,
      selectWeapon1: false,
      selectWeapon2: false,
      selectWeapon3: false
    },
    0,
    null
  );

  world.updateInteractivePlaces(state.playerPose, state.playerMode, 0);
  world.updateChoiceSigns(
    state.playerMode === "driving" ? state.vehiclePose : state.playerPose,
    state.playerMode === "driving" ? state.upcomingIntersection : null
  );

  updatePlayerCarEffects(playerCar, 0, {
    nightMode: world.isNightMode(),
    speed: state.playerMode === "driving" ? state.rawSpeed : 0,
    isBraking: false,
    isAccelerating: false,
    turnSignal: 0
  });

  updatePlayerCharacterVisual(playerCharacter, 0, state.characterState);

  cameraController.update(state, 0, playerCar, playerCharacter, true);

  gameOverEl.classList.add("hidden");
  updateUI(state);
  clock.getDelta();
}

function animate() {
  requestAnimationFrame(animate);

  const dt = Math.min(clock.getDelta(), 1 / 20);
  const currentFps = dt > 0 ? 1 / dt : 0;
  fpsSmoothed += (currentFps - fpsSmoothed) * 0.12;

  if (editor.consumeToggleRequested()) {
    if (editor.isActive()) {
      editor.exit();
    } else {
      editor.enter();
    }
  }

  if (editor.isActive()) {
    if (phoneOpen) {
      setPhoneOpen(false);
    }
    if (dealerBrowserOpen) {
      setDealerBrowserOpen(false);
    }
    input.restart = false;
    input.toggleNight = false;
    input.toggleFirstPerson = false;
    input.togglePhone = false;
    editor.update(dt);
    renderer.render(scene, camera);
    return;
  }

  if (input.togglePhone) {
    if (dealerBrowserOpen) {
      setDealerBrowserOpen(false);
    } else {
      togglePhone();
    }
    input.togglePhone = false;
  }

  if (phoneOpen || dealerBrowserOpen) {
    input.restart = false;
    input.toggleNight = false;
    input.toggleFirstPerson = false;
    input.togglePhone = false;
    clearMomentaryInputs();
    const idleState = game.update(input, 0, cameraController.getWalkingControlContext());
    updateUI(idleState);
    renderer.render(scene, camera);
    return;
  }

  if (input.toggleNight) {
    world.setNightMode(!world.isNightMode());
    input.toggleNight = false;
  }

  if (input.toggleFirstPerson) {
    cameraController.togglePerspective();
    input.toggleFirstPerson = false;
  }

  if (input.restart) {
    restartGame();
    input.restart = false;
  }

  const controlContext = cameraController.getWalkingControlContext();
  const state = game.update(input, dt, controlContext);

  world.updateInteractivePlaces(state.playerPose, state.playerMode, dt);
  world.updateChoiceSigns(
    state.playerMode === "driving" ? state.vehiclePose : state.playerPose,
    state.playerMode === "driving" ? state.upcomingIntersection : null
  );
  world.updateDecorations(dt, {
    camera,
    playerPose: state.playerPose
  });

  updatePlayerCarEffects(playerCar, dt, {
    nightMode: world.isNightMode(),
    speed: state.playerMode === "driving" ? state.rawSpeed : 0,
    isBraking: state.playerMode === "driving" ? state.isBraking : false,
    isAccelerating: state.playerMode === "driving" ? state.isAccelerating : false,
    turnSignal: state.playerMode === "driving" ? state.turnSignal : 0
  });

  updatePlayerCharacterVisual(playerCharacter, dt, state.characterState);

  cameraController.update(state, dt, playerCar, playerCharacter, false);
  updateUI(state);

  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

initMinimap();
setupCameraSettingsPanel();
setupPhoneUI();
updateOverlayVisibility();
restartGame();
animate();


