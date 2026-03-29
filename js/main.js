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
import { getWeaponAttributes } from "./combat/weaponAttributes.js";

const canvas = document.querySelector("#game");
const speedEl = document.querySelector("#speed");
const scoreEl = document.querySelector("#score");
const moneyEl = document.querySelector("#money");
const moneyGainLayerEl = document.querySelector("#money-gain-layer");
const statusEl = document.querySelector("#status");
const cameraModeEl = document.querySelector("#camera-mode");
const gameOverEl = document.querySelector("#game-over");
const roadDriverMenuEl = document.querySelector("#road-driver-menu");
const roadDriverHintEl = document.querySelector("#road-driver-hint");
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

const healthCardEl = document.querySelector("#health-card");
const healthPercentEl = document.querySelector("#health-percent");
const healthValueEl = document.querySelector("#health-value");
const healthStateEl = document.querySelector("#health-state");
const healthBarFillEl = document.querySelector("#health-bar-fill");
const pedHealthLayerEl = document.querySelector("#ped-health-layer");
const damageOverlayEl = document.querySelector("#damage-overlay");

const weaponCardEl = document.querySelector("#weapon-card");
const weaponNameEl = document.querySelector("#weapon-name");
const weaponAmmoEl = document.querySelector("#weapon-ammo");
const weaponStateEl = document.querySelector("#weapon-state");
const hotbarEl = document.querySelector("#hotbar");
const hotbarSlotEls = Array.from(document.querySelectorAll(".hotbar-slot"));
const inventoryMenuEl = document.querySelector("#inventory-menu");
const inventoryMenuSummaryEl = document.querySelector("#inventory-menu-summary");
const inventoryMenuGridEl = document.querySelector("#inventory-menu-grid");
const crosshairEl = document.querySelector("#crosshair");
const crosshairRingEl = document.querySelector(".crosshair-ring");
const sniperScopeEl = document.querySelector("#sniper-scope");
const sniperScopeZoomEl = document.querySelector("#sniper-scope-zoom");

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
const weaponVolumeEl = document.querySelector("#weapon-volume");
const weaponVolumeValueEl = document.querySelector("#weapon-volume-value");
const fpSensEl = document.querySelector("#fp-sens");
const fpSensValueEl = document.querySelector("#fp-sens-value");
const tpSensEl = document.querySelector("#tp-sens");
const tpSensValueEl = document.querySelector("#tp-sens-value");
const qualityPresetEl = document.querySelector("#quality-preset");
const qualityPresetValueEl = document.querySelector("#quality-preset-value");
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
let inventoryMenuOpen = false;
let roadDriverMenuOpen = false;
let settingsOpen = false;
let lastPlayerMode = "driving";
let draggedInventorySlotIndex = null;
let crosshairAnimTime = 0;
let latestGameState = null;
let previousMoneyValue = null;
const SNIPER_SCOPE_ZOOM_STEPS = [1, 0.78, 0.58, 0.42];
let sniperScopeZoomIndex = 0;
let sniperScopeForcedFirstPerson = false;
const pedestrianHealthBarEls = new Map();
const projectedPedPosition = new THREE.Vector3();
const hotbarSlotUi = hotbarSlotEls.map((slotEl) => ({
  slotEl,
  labelEl: slotEl.querySelector(".hotbar-label"),
  detailEl: slotEl.querySelector(".hotbar-detail")
}));
const inventorySlotEls = [];
let lastMinimapRoadOriginX = Number.NaN;
let lastMinimapRoadOriginZ = Number.NaN;
let lastMinimapRoadHeading = Number.NaN;

function isSniperScopeActive(state) {
  const weaponId = state.weaponHud?.equippedId ?? null;
  const weaponAttributes = getWeaponAttributes(weaponId);
  const aimBlend = state.characterState?.aimBlend ?? 0;
  return (
    !inventoryMenuOpen &&
    !editor.isActive() &&
    !state.gameOver &&
    state.playerMode === "walking" &&
    state.weaponHud?.hasEquippedWeapon &&
    state.inventoryHud?.activeItemKind === "weapon" &&
    !!weaponAttributes?.useScopeOverlay &&
    aimBlend > 0.08
  );
}

function getSniperScopeFov(state) {
  const weaponId = state.weaponHud?.equippedId ?? null;
  const weaponAttributes = getWeaponAttributes(weaponId);
  const baseFov = weaponAttributes?.scopeFov ?? 22;
  const zoomStep = SNIPER_SCOPE_ZOOM_STEPS[sniperScopeZoomIndex] ?? 1;
  return baseFov * zoomStep;
}

function getSniperScopeZoomLabel(state) {
  const fov = getSniperScopeFov(state);
  const zoom = 68 / Math.max(1, fov);
  return `x${zoom.toFixed(1)}`;
}

function normalizeAngle(angle) {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

const input = createInput();
const world = createWorld(scene);

const playerCar = createPlayerCar();
scene.add(playerCar);
attachPlayerCarEffects(playerCar, scene);

const playerCharacter = createPlayerCharacter();
scene.add(playerCharacter);

const game = createGame(scene, playerCar, playerCharacter, world);

function clearInventoryDragState() {
  draggedInventorySlotIndex = null;
  hotbarEl.classList.remove("inventory-drag-enabled");
  hotbarSlotEls.forEach((slotEl) => {
    slotEl.classList.remove("dragging", "drag-over");
  });
  inventorySlotEls.forEach((slotEl) => {
    slotEl.classList.remove("dragging", "drag-over");
  });
}

function getInventorySlotElement(target) {
  return target instanceof Element ? target.closest("[data-slot-index]") : null;
}

function getInventorySlotIndex(target) {
  const slotEl = getInventorySlotElement(target);
  if (!slotEl) return null;
  const rawIndex = Number(slotEl.dataset.slotIndex);
  return Number.isInteger(rawIndex) ? rawIndex : null;
}

function handleInventoryDragStart(event) {
  const slotIndex = getInventorySlotIndex(event.target);
  if (slotIndex === null) {
    event.preventDefault();
    return;
  }

  const slotEl = getInventorySlotElement(event.target);
  if (!slotEl || slotEl.dataset.empty === "true") {
    event.preventDefault();
    return;
  }

  draggedInventorySlotIndex = slotIndex;
  hotbarEl.classList.add("inventory-drag-enabled");
  slotEl.classList.add("dragging");

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(slotIndex));
  }
}

function handleInventoryDragOver(event) {
  if (draggedInventorySlotIndex === null) return;
  const slotEl = getInventorySlotElement(event.target);
  if (!slotEl) return;

  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = "move";
  }
  hotbarSlotEls.forEach((hotbarSlotEl) => hotbarSlotEl.classList.remove("drag-over"));
  inventorySlotEls.forEach((inventorySlotEl) => {
    inventorySlotEl.classList.remove("drag-over");
  });
  slotEl.classList.add("drag-over");
}

function handleInventoryDragLeave(event) {
  const slotEl = getInventorySlotElement(event.target);
  if (!slotEl) return;
  slotEl.classList.remove("drag-over");
}

function handleInventoryDrop(event) {
  if (draggedInventorySlotIndex === null) return;
  const targetIndex = getInventorySlotIndex(event.target);
  if (targetIndex === null) return;

  event.preventDefault();
  game.moveInventorySlot(draggedInventorySlotIndex, targetIndex);
  clearInventoryDragState();
}

function handleInventoryDragEnd() {
  clearInventoryDragState();
}

hotbarSlotEls.forEach((slotEl, index) => {
  slotEl.dataset.slotIndex = String(index);
  slotEl.addEventListener("dragstart", handleInventoryDragStart);
  slotEl.addEventListener("dragover", handleInventoryDragOver);
  slotEl.addEventListener("dragleave", handleInventoryDragLeave);
  slotEl.addEventListener("drop", handleInventoryDrop);
  slotEl.addEventListener("dragend", handleInventoryDragEnd);
});

inventoryMenuGridEl.addEventListener("dragstart", handleInventoryDragStart);
inventoryMenuGridEl.addEventListener("dragover", handleInventoryDragOver);
inventoryMenuGridEl.addEventListener("dragleave", handleInventoryDragLeave);
inventoryMenuGridEl.addEventListener("drop", handleInventoryDrop);
inventoryMenuGridEl.addEventListener("dragend", handleInventoryDragEnd);

const pizzeriaInfo = world.getPizzeriaInfo ? world.getPizzeriaInfo() : null;
const weaponShopInfo = world.getWeaponShopInfo ? world.getWeaponShopInfo() : null;
const gasStationInfos = world.getGasStationInfos ? world.getGasStationInfos() : [];

const lookTarget = new THREE.Vector3();
const cameraController = createCameraController(camera, lookTarget);
const SETTINGS_KEY = "road-driver-settings-v2";
const LEGACY_CAMERA_SETTINGS_KEY = "road-driver-camera-settings-v1";
const QUALITY_PRESETS = {
  "very-low": {
    label: "Muy baja",
    fogNear: 95,
    fogFar: 620,
    cullDistanceBuildings: 280,
    cullDistanceParkedCars: 160,
    cullDistancePedestrians: 110,
    pedestrianNearUpdateDistance: 54,
    pedestrianMidUpdateDistance: 92,
    pedestrianFarStepSeconds: 0.46
  },
  medium: {
    label: "Media",
    fogNear: 110,
    fogFar: 760,
    cullDistanceBuildings: 360,
    cullDistanceParkedCars: 210,
    cullDistancePedestrians: 150,
    pedestrianNearUpdateDistance: 68,
    pedestrianMidUpdateDistance: 120,
    pedestrianFarStepSeconds: 0.36
  },
  high: {
    label: "Alta",
    fogNear: 130,
    fogFar: 980,
    cullDistanceBuildings: 460,
    cullDistanceParkedCars: 280,
    cullDistancePedestrians: 210,
    pedestrianNearUpdateDistance: 82,
    pedestrianMidUpdateDistance: 155,
    pedestrianFarStepSeconds: 0.28
  },
  ultra: {
    label: "Ultra",
    fogNear: 150,
    fogFar: 1250,
    cullDistanceBuildings: 560,
    cullDistanceParkedCars: 340,
    cullDistancePedestrians: 250,
    pedestrianNearUpdateDistance: 96,
    pedestrianMidUpdateDistance: 185,
    pedestrianFarStepSeconds: 0.22
  }
};

const MAP_SIZE = CONFIG.minimap.size;
const MAP_EXTENT = CONFIG.minimap.extent;
let phoneOpen = false;
let dealerBrowserOpen = false;
let dealerCatalogBuilt = false;
let dealerPreviewLoader = null;

const phoneCarCatalog = getPhoneCarCatalog();
const MAP_CENTER = MAP_SIZE * 0.5;
const MAP_SCALE = MAP_SIZE / (MAP_EXTENT * 2);
const ROAD_LINE_REACH = MAP_EXTENT * 1.75;


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
    removeWorldObject: world.removeEditorObject,
    createPlacementObject: (definition) => {
      if (definition.type === "civilian-npc" || definition.type === "hostile-npc") {
        return world.addEditorPedestrian(definition);
      }
      return null;
    },
    removePlacementObject: (definition, object) => {
      if (definition.type === "civilian-npc" || definition.type === "hostile-npc") {
        return world.removeEditorPedestrianByPlacementId(definition.id);
      }
      if (!object?.parent) return false;
      object.parent.remove(object);
      return true;
    }
  }
);

function readSavedSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return JSON.parse(raw);

    const legacyRaw = localStorage.getItem(LEGACY_CAMERA_SETTINGS_KEY);
    if (!legacyRaw) return null;
    return JSON.parse(legacyRaw);
  } catch {
    return null;
  }
}

function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignorado en modo privado o con storage bloqueado.
  }
}

function getCombinedSettings() {
  const cameraSettings = cameraController.getSettings();
  return {
    firstPersonSensitivity: cameraSettings.firstPersonSensitivity,
    thirdPersonTurnSensitivity: cameraSettings.thirdPersonTurnSensitivity,
    weaponVolume: game.getWeaponSoundVolume(),
    qualityPreset: world.getQualityPreset?.() ?? "high"
  };
}

function updateSettingsUI(settings) {
  weaponVolumeEl.value = String(Math.round((settings.weaponVolume ?? 0.5) * 100));
  fpSensEl.value = String(settings.firstPersonSensitivity);
  tpSensEl.value = String(settings.thirdPersonTurnSensitivity);
  if (qualityPresetEl) {
    const qualityPreset = settings.qualityPreset ?? "high";
    const qualityLabel = QUALITY_PRESETS[qualityPreset]?.label ?? QUALITY_PRESETS.high.label;
    qualityPresetEl.value = qualityPreset;
    qualityPresetValueEl.textContent = qualityLabel;
  }

  weaponVolumeValueEl.textContent = `${Math.round((settings.weaponVolume ?? 0.5) * 100)}%`;
  fpSensValueEl.textContent = Number(settings.firstPersonSensitivity).toFixed(4);
  tpSensValueEl.textContent = `${Number(settings.thirdPersonTurnSensitivity).toFixed(2)}x`;
}

function applyCameraSettings(nextSettings, persist = true) {
  cameraController.setSettings(nextSettings);
  const applied = getCombinedSettings();
  updateSettingsUI(applied);
  if (persist) {
    saveSettings(applied);
  }
}

function applyWeaponVolume(volume, persist = true) {
  game.setWeaponSoundVolume(volume);
  const applied = getCombinedSettings();
  updateSettingsUI(applied);
  if (persist) {
    saveSettings(applied);
  }
}

function applyQualityPreset(presetId, persist = true) {
  const resolvedPresetId = QUALITY_PRESETS[presetId] ? presetId : "high";
  world.setQualityPreset?.(resolvedPresetId, QUALITY_PRESETS[resolvedPresetId]);
  const applied = getCombinedSettings();
  updateSettingsUI(applied);
  if (persist) {
    saveSettings(applied);
  }
}

function updateRoadDriverMenu() {
  roadDriverMenuEl?.classList.toggle("hidden", !roadDriverMenuOpen);
  if (roadDriverHintEl) {
    roadDriverHintEl.textContent = roadDriverMenuOpen
      ? "Tab para ocultar Road Driver"
      : "Tab para desplegar Road Driver";
  }
}

function setSettingsOpen(nextOpen) {
  settingsOpen = !!nextOpen;
  cameraSettingsPanelEl.classList.toggle("hidden", !settingsOpen);
  document.body.classList.toggle("settings-open", settingsOpen);

  if (settingsOpen) {
    inventoryMenuOpen = false;
    clearInventoryDragState();
    clearMomentaryInputs();
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
  }
}

function setupCameraSettingsPanel() {
  const saved = readSavedSettings();
  const defaults = cameraController.getSettings();

  applyQualityPreset(saved?.qualityPreset ?? "high", false);
  applyWeaponVolume(saved?.weaponVolume ?? 0.5, false);

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

  weaponVolumeEl.addEventListener("input", () => {
    applyWeaponVolume(Number(weaponVolumeEl.value) / 100);
  });

  tpSensEl.addEventListener("input", () => {
    applyCameraSettings({
      thirdPersonTurnSensitivity: Number(tpSensEl.value)
    });
  });

  qualityPresetEl?.addEventListener("input", () => {
    applyQualityPreset(qualityPresetEl.value);
  });

  cameraSettingsPanelEl.addEventListener("mousedown", (event) => {
    event.stopPropagation();
  });

  settingsToggleEl.addEventListener("click", () => {
    setSettingsOpen(!settingsOpen);
  });
}

window.addEventListener("wheel", (event) => {
  const state = latestGameState;
  if (!state || !isSniperScopeActive(state)) return;

  if (event.deltaY > 0.01) {
    sniperScopeZoomIndex = Math.max(0, sniperScopeZoomIndex - 1);
  } else if (event.deltaY < -0.01) {
    sniperScopeZoomIndex = Math.min(
      SNIPER_SCOPE_ZOOM_STEPS.length - 1,
      sniperScopeZoomIndex + 1
    );
  }

  event.preventDefault();
}, { passive: false });

const minimapRoadLines = [];

function worldToMap(x, z, originX = 0, originZ = 0, heading = 0) {
  const dx = x - originX;
  const dz = z - originZ;
  const cosH = Math.cos(heading);
  const sinH = Math.sin(heading);

  const localX = dx * cosH + dz * sinH;
  const localZ = -dx * sinH + dz * cosH;

  return {
    x: MAP_CENTER + localX * MAP_SCALE,
    y: MAP_CENTER + localZ * MAP_SCALE,
    localX,
    localZ
  };
}

function setMarker(
  el,
  worldX,
  worldZ,
  originX,
  originZ,
  heading,
  rotation = 0,
  visible = true
) {
  const p = worldToMap(worldX, worldZ, originX, originZ, heading);
  const inBounds =
    Math.abs(p.localX) <= MAP_EXTENT * 1.05 &&
    Math.abs(p.localZ) <= MAP_EXTENT * 1.05;

  el.classList.toggle("hidden", !visible || !inBounds);
  if (!visible) return;
  if (!inBounds) return;

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

function createInventorySlotElement(slotIndex) {
  const slotEl = document.createElement("div");
  const keyEl = document.createElement("div");
  const labelEl = document.createElement("strong");
  const detailEl = document.createElement("span");

  slotEl.className = "inventory-slot empty";
  slotEl.dataset.slotIndex = String(slotIndex);
  slotEl.dataset.empty = "true";
  slotEl.draggable = false;

  keyEl.className = "inventory-slot-key";
  keyEl.textContent = String(slotIndex + 1);
  labelEl.textContent = "Vacio";
  detailEl.textContent = "";

  slotEl.append(keyEl, labelEl, detailEl);
  inventorySlotEls.push(slotEl);

  return {
    slotEl,
    labelEl,
    detailEl
  };
}

const inventorySlotUi = Array.from({ length: 15 }, (_, index) =>
  createInventorySlotElement(index + 5)
);

function initMinimap() {
  navMapSvg.setAttribute("viewBox", `0 0 ${MAP_SIZE} ${MAP_SIZE}`);

  inventoryMenuGridEl.replaceChildren(
    ...inventorySlotUi.map(({ slotEl }) => slotEl)
  );

  const roadCoords = [-2, -1, 0, 1, 2].map((v) => v * CONFIG.blockSize);

  for (const coord of roadCoords) {
    const vertical = createSvgLine(0, 0, 0, 0, "map-road-line");
    const horizontal = createSvgLine(0, 0, 0, 0, "map-road-line");

    minimapRoadLines.push({
      line: vertical,
      x1: coord,
      z1: -ROAD_LINE_REACH,
      x2: coord,
      z2: ROAD_LINE_REACH
    });
    minimapRoadLines.push({
      line: horizontal,
      x1: -ROAD_LINE_REACH,
      z1: coord,
      x2: ROAD_LINE_REACH,
      z2: coord
    });

    navMapSvg.appendChild(vertical);
    navMapSvg.appendChild(horizontal);
  }

  navMapSvg.appendChild(navRouteEl);
}

function updateMinimapRoads(originX, originZ, heading) {
  for (const road of minimapRoadLines) {
    const start = worldToMap(road.x1, road.z1, originX, originZ, heading);
    const end = worldToMap(road.x2, road.z2, originX, originZ, heading);

    road.line.setAttribute("x1", start.x);
    road.line.setAttribute("y1", start.y);
    road.line.setAttribute("x2", end.x);
    road.line.setAttribute("y2", end.y);
  }
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
  promptEl.classList.toggle(
    "above-hotbar",
    state.playerMode === "walking"
  );
}

function updateCrosshair(state) {
  const sniperScopeActive = isSniperScopeActive(state);
  if (editor.isActive() || settingsOpen) {
    crosshairEl.classList.add("hidden");
    document.body.style.cursor = "default";
    return;
  }

  const shouldShow =
    !inventoryMenuOpen &&
    !state.gameOver &&
    state.playerMode === "walking" &&
    state.weaponHud.hasEquippedWeapon &&
    state.inventoryHud.activeItemKind === "weapon" &&
    !sniperScopeActive;

  crosshairEl.classList.toggle("hidden", !shouldShow);
  document.body.style.cursor = shouldShow || sniperScopeActive ? "none" : "";
  if (!shouldShow) return;

  const aimBlend = state.characterState?.aimBlend ?? 0;
  const crouchBlend = THREE.MathUtils.clamp(
    state.characterState?.crouchBlend ?? 0,
    0,
    1
  );
  const speedNorm = Math.min(
    1,
    (state.characterState?.planarSpeed ?? 0) / CONFIG.onFoot.runSpeed
  );
  const sprintFactor = THREE.MathUtils.clamp((speedNorm - 0.58) / 0.42, 0, 1);
  const swayAmp =
    (0.8 + speedNorm * 2.1 + sprintFactor * 1.8) *
    (1 - aimBlend * 0.78) *
    THREE.MathUtils.lerp(1, 0.6, crouchBlend);
  const offsetX = Math.sin(crosshairAnimTime * 5.2) * swayAmp * 0.32;
  const offsetY = Math.abs(Math.sin(crosshairAnimTime * 10.4)) * swayAmp;
  const weaponId = state.weaponHud?.equippedId ?? "pistol";
  const spreadRadius = Math.max(0, state.characterState?.shotSpread ?? 0);
  const shotBloom = THREE.MathUtils.clamp(
    state.characterState?.shotBloom ?? 0,
    0,
    1.6
  );
  const weaponAttributes = getWeaponAttributes(weaponId);
  const baseVisualSpread =
    spreadRadius * (weaponAttributes?.crosshairPxScale ?? 520);
  let spread = baseVisualSpread * 1.18 + 6 + shotBloom * 11;

  if (!cameraController.isFirstPerson()) {
    const edgePressure = THREE.MathUtils.clamp(
      state.characterState?.cursorEdgePressure ?? 0,
      0,
      1
    );
    spread += edgePressure * 6;
  }

  spread = THREE.MathUtils.lerp(spread, 4.5, aimBlend * crouchBlend * (1 - shotBloom * 0.45));
  const cursor = cameraController.getCursorScreenPosition();
  const crosshairOffsetX = cameraController.isFirstPerson()
    ? offsetX
    : cursor.x - window.innerWidth * 0.5 + offsetX;
  const crosshairOffsetY = cameraController.isFirstPerson()
    ? offsetY
    : cursor.y - window.innerHeight * 0.5 + offsetY;

  crosshairEl.style.setProperty("--crosshair-x", `${crosshairOffsetX.toFixed(2)}px`);
  crosshairEl.style.setProperty("--crosshair-y", `${crosshairOffsetY.toFixed(2)}px`);
  crosshairEl.style.setProperty("--crosshair-scale", `${(1 - aimBlend * 0.08).toFixed(3)}`);
  crosshairRingEl?.style.setProperty("--crosshair-size", `${spread.toFixed(2)}px`);
}

function updateSniperScope(state) {
  const active = isSniperScopeActive(state);
  sniperScopeEl?.classList.toggle("hidden", !active);
  sniperScopeEl?.classList.toggle("active", active);
  if (sniperScopeZoomEl) {
    sniperScopeZoomEl.textContent = getSniperScopeZoomLabel(state);
  }
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

function updateHealthUI(state) {
  const health = state.healthHud;
  const healthPct = Math.max(0, Math.min(100, health?.pct ?? 100));

  healthPercentEl.textContent = `${healthPct}%`;
  healthValueEl.textContent = `${health?.current ?? 100} / ${health?.max ?? 100}`;
  healthBarFillEl.style.width = `${healthPct}%`;

  healthCardEl.classList.remove("normal", "mid", "critical");

  if (healthPct <= 30) {
    healthCardEl.classList.add("critical");
    healthStateEl.textContent = "Critica";
  } else if (healthPct <= 65) {
    healthCardEl.classList.add("mid");
    healthStateEl.textContent = "Herido";
  } else {
    healthCardEl.classList.add("normal");
    healthStateEl.textContent = "Completa";
  }

  healthCardEl.classList.remove("hidden");
}

function getPedestrianHealthBarEl(id) {
  let el = pedestrianHealthBarEls.get(id);
  if (el) return el;

  el = document.createElement("div");
  el.className = "ped-health-bar";
  el.innerHTML = '<div class="ped-health-fill"></div>';
  pedHealthLayerEl.appendChild(el);
  pedestrianHealthBarEls.set(id, el);
  return el;
}

function updatePedestrianHealthBars(state) {
  const targets = state.pedestrianHealthHud ?? [];
  const activeIds = new Set();

  for (const target of targets) {
    projectedPedPosition.set(target.x, target.y ?? 2.05, target.z).project(camera);
    const visible =
      projectedPedPosition.z > -1 &&
      projectedPedPosition.z < 1 &&
      projectedPedPosition.x >= -1.1 &&
      projectedPedPosition.x <= 1.1 &&
      projectedPedPosition.y >= -1.1 &&
      projectedPedPosition.y <= 1.1;

    if (!visible) continue;

    activeIds.add(target.id);
    const el = getPedestrianHealthBarEl(target.id);
    const fillEl = el.firstElementChild;
    const screenX = (projectedPedPosition.x * 0.5 + 0.5) * window.innerWidth;
    const screenY = (-projectedPedPosition.y * 0.5 + 0.5) * window.innerHeight;
    const pct = Math.max(0, Math.min(100, target.pct ?? 100));

    el.classList.remove("hidden");
    el.style.left = `${screenX.toFixed(1)}px`;
    el.style.top = `${(screenY - 18).toFixed(1)}px`;
    if (fillEl) {
      fillEl.style.transform = `scaleX(${(pct / 100).toFixed(3)})`;
    }
  }

  for (const [id, el] of pedestrianHealthBarEls) {
    el.classList.toggle("hidden", !activeIds.has(id));
  }
}

function updateDamageOverlay(state) {
  const health = state.healthHud;
  const pct = Math.max(0, Math.min(100, health?.pct ?? 100));
  const criticalStart = Math.max(1, Math.min(100, health?.criticalStartPct ?? 70));

  if (pct >= criticalStart) {
    damageOverlayEl.classList.add("hidden");
    damageOverlayEl.style.opacity = "0";
    return;
  }

  const intensity = 1 - pct / criticalStart;
  damageOverlayEl.classList.remove("hidden");
  const boostedIntensity = Math.pow(intensity, 1.75);
  damageOverlayEl.style.opacity = `${THREE.MathUtils.lerp(0.03, 0.92, boostedIntensity).toFixed(3)}`;
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
  
  updateSniperScope(state);
  return;
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
  updateSniperScope(state);
}

function legacyUpdateInventoryUIEntries(state) {
  const walking = state.playerMode === "walking";
  const inventory = state.inventoryHud;
  const entries = inventory?.entries ?? [];
  const summaryText =
    `Pizzas ${inventory?.pizzaBoxes ?? 0}/${inventory?.pizzaCapacity ?? 0} · Gasolina ${inventory?.portableFuelLiters ?? 0} L`;

  const hotbarSlots = inventory?.hotbarSlots ?? [];
  hotbarSlotEls.forEach((slotEl, index) => {
    const slot = hotbarSlots[index];
    const labelEl = slotEl.querySelector(".hotbar-label");
    const detailEl = slotEl.querySelector(".hotbar-detail");

    labelEl.textContent = slot?.empty ? "Vacío" : (slot?.label ?? "Vacío");
    detailEl.textContent = slot?.empty ? "" : (slot?.detail ?? "");

    slotEl.classList.toggle("active", (inventory?.selectedSlot ?? 0) === index);
    slotEl.classList.toggle("empty", !!slot?.empty);
  });

  inventoryMenuSummaryEl.textContent = summaryText;

  const backpackSlotCount = Math.max(15, entries.length);
  inventoryMenuGridEl.innerHTML = Array.from({ length: backpackSlotCount }, (_, index) => {
    const entry = entries[index];
    const classes = ["inventory-slot", entry ? "" : "empty"].filter(Boolean).join(" ");
    return `<div class="${classes}"><strong>${entry?.label ?? "Vacío"}</strong><span>${entry?.detail ?? ""}</span></div>`;
  }).join("");

  inventoryMenuEl.classList.toggle("hidden", !walking || !inventoryMenuOpen);
  hotbarEl.classList.toggle("hidden", !walking);
}

function legacyUpdateInventoryUISlotsBroken(state) {
  const walking = state.playerMode === "walking";
  const inventory = state.inventoryHud;
  const slots = inventory?.slots ?? [];
  const summaryText =
    `Pizzas ${inventory?.pizzaBoxes ?? 0}/${inventory?.pizzaCapacity ?? 0} Â· Gasolina ${inventory?.portableFuelLiters ?? 0} L`;

  const hotbarSlots = inventory?.hotbarSlots ?? [];
  hotbarSlotEls.forEach((slotEl, index) => {
    const slot = hotbarSlots[index];
    const labelEl = slotEl.querySelector(".hotbar-label");
    const detailEl = slotEl.querySelector(".hotbar-detail");

    labelEl.textContent = slot?.empty ? "VacÃ­o" : (slot?.label ?? "VacÃ­o");
    detailEl.textContent = slot?.empty ? "" : (slot?.detail ?? "");

    slotEl.classList.toggle("active", (inventory?.selectedSlot ?? 0) === index);
    slotEl.classList.toggle("empty", !!slot?.empty);
  });

  inventoryMenuSummaryEl.textContent = summaryText;

  inventoryMenuGridEl.innerHTML = slots.map((slot) => {
    const classes = [
      "inventory-slot",
      slot?.empty ? "empty" : "",
      slot?.active ? "active" : ""
    ].filter(Boolean).join(" ");
    const keyMarkup = slot?.key ? `<div class="inventory-slot-key">${slot.key}</div>` : "";
    return `<div class="${classes}">${keyMarkup}<strong>${slot?.empty ? "VacÃ­o" : (slot?.label ?? "VacÃ­o")}</strong><span>${slot?.empty ? "" : (slot?.detail ?? "")}</span></div>`;
  }).join("");

  inventoryMenuEl.classList.toggle("hidden", !walking || !inventoryMenuOpen);
  hotbarEl.classList.toggle("hidden", !walking);
}

function updateInventoryUI(state) {
  const walking = state.playerMode === "walking";
  const inventory = state.inventoryHud;
  const slots = inventory?.slots ?? [];
  const summaryText =
    `Pizzas ${inventory?.pizzaBoxes ?? 0}/${inventory?.pizzaCapacity ?? 0} - Gasolina ${inventory?.portableFuelLiters ?? 0} L`;

  const hotbarSlots = inventory?.hotbarSlots ?? [];
  hotbarSlotUi.forEach(({ slotEl, labelEl, detailEl }, index) => {
    const slot = hotbarSlots[index];

    slotEl.dataset.slotIndex = String(index);
    slotEl.dataset.empty = slot?.empty ? "true" : "false";
    slotEl.draggable = !slot?.empty && inventoryMenuOpen;
    labelEl.textContent = slot?.empty ? "Vacio" : (slot?.label ?? "Vacio");
    detailEl.textContent = slot?.empty ? "" : (slot?.detail ?? "");

    slotEl.classList.toggle("active", (inventory?.selectedSlot ?? 0) === index);
    slotEl.classList.toggle("empty", !!slot?.empty);
  });

  inventoryMenuSummaryEl.textContent = summaryText;

  if (draggedInventorySlotIndex === null) {
    const backpackSlots = slots.slice(5);
    inventorySlotUi.forEach(({ slotEl, labelEl, detailEl }, index) => {
      const slot = backpackSlots[index] ?? null;
      slotEl.dataset.slotIndex = String(slot?.index ?? index + 5);
      slotEl.dataset.empty = slot?.empty ? "true" : "false";
      slotEl.draggable = !slot?.empty;
      labelEl.textContent = slot?.empty ? "Vacio" : (slot?.label ?? "Vacio");
      detailEl.textContent = slot?.empty ? "" : (slot?.detail ?? "");
      slotEl.classList.toggle("empty", !!slot?.empty);
      slotEl.classList.toggle("active", !!slot?.active);
    });
  }

  inventoryMenuEl.classList.toggle("hidden", !walking || !inventoryMenuOpen);
  hotbarEl.classList.toggle("hidden", !walking);
  hotbarEl.classList.toggle("inventory-drag-enabled", inventoryMenuOpen);
}

function updateMinimap(state) {
  const mapFocus =
    state.playerMode === "driving" ? state.vehiclePose : state.playerPose;
  const mapHeading = mapFocus.heading;
  const originX = mapFocus.x;
  const originZ = mapFocus.z;

  if (
    !Number.isFinite(lastMinimapRoadOriginX) ||
    Math.abs(originX - lastMinimapRoadOriginX) >= 1.4 ||
    Math.abs(originZ - lastMinimapRoadOriginZ) >= 1.4 ||
    Math.abs(normalizeAngle(mapHeading - lastMinimapRoadHeading)) >= 0.025
  ) {
    updateMinimapRoads(originX, originZ, mapHeading);
    lastMinimapRoadOriginX = originX;
    lastMinimapRoadOriginZ = originZ;
    lastMinimapRoadHeading = mapHeading;
  }

  setMarker(
    navPlayerEl,
    state.playerPose.x,
    state.playerPose.z,
    originX,
    originZ,
    mapHeading,
    0,
    true
  );

  if (pizzeriaInfo) {
    setMarker(
      navPizzeriaEl,
      pizzeriaInfo.center.x,
      pizzeriaInfo.center.z,
      originX,
      originZ,
      mapHeading,
      0,
      true
    );
  } else {
    navPizzeriaEl.classList.add("hidden");
  }

  if (navWeaponShopEl && weaponShopInfo) {
    setMarker(
      navWeaponShopEl,
      weaponShopInfo.center.x,
      weaponShopInfo.center.z,
      originX,
      originZ,
      mapHeading,
      0,
      true
    );
  }

  for (let i = 0; i < navGasStationEls.length; i++) {
    const el = navGasStationEls[i];
    const info = gasStationInfos[i];
    if (!el || !info) continue;
    setMarker(
      el,
      info.center.x,
      info.center.z,
      originX,
      originZ,
      mapHeading,
      Math.PI / 4,
      true
    );
  }

  const showCar = state.playerMode === "walking";
  navCarEl.classList.toggle("player-owned-car", showCar);
  setMarker(
    navCarEl,
    state.vehiclePose.x,
    state.vehiclePose.z,
    originX,
    originZ,
    mapHeading,
    Math.PI - (state.vehiclePose.heading - mapHeading),
    showCar
  );

  const targetPoint = state.missionState.targetPoint;
  const hasTarget = !!targetPoint;

  if (hasTarget) {
    setMarker(
      navTargetEl,
      targetPoint.x,
      targetPoint.z,
      originX,
      originZ,
      mapHeading,
      0,
      true
    );

    const targetMap = worldToMap(
      targetPoint.x,
      targetPoint.z,
      originX,
      originZ,
      mapHeading
    );
    navRouteEl.setAttribute("x1", MAP_CENTER);
    navRouteEl.setAttribute("y1", MAP_CENTER);
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
  if (previousMoneyValue === null) {
    previousMoneyValue = state.money;
  } else if (state.money > previousMoneyValue) {
    showMoneyGainPopup(state.money - previousMoneyValue);
    previousMoneyValue = state.money;
  } else if (state.money !== previousMoneyValue) {
    previousMoneyValue = state.money;
  }
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
  updateHealthUI(state);
  updatePedestrianHealthBars(state);
  updateDamageOverlay(state);
  updateMissionUI(state);
  updateWeaponUI(state);
  updateInventoryUI(state);
  updateMinimap(state);
  updateCrosshair(state);
  updatePrompt(state);
  gameOverEl.classList.toggle("hidden", !state.gameOver);
}

function showMoneyGainPopup(amount) {
  if (!moneyGainLayerEl || amount <= 0) {
    return;
  }

  const popupEl = document.createElement("div");
  const offsetX = (Math.random() - 0.5) * 260;
  const offsetY = (Math.random() - 0.5) * 140;

  popupEl.className = "money-gain-popup";
  popupEl.textContent = `+${amount} €`;
  popupEl.style.left = `calc(50% + ${offsetX.toFixed(0)}px)`;
  popupEl.style.top = `calc(50% + ${offsetY.toFixed(0)}px)`;

  moneyGainLayerEl.appendChild(popupEl);
  void popupEl.offsetWidth;
  popupEl.classList.add("show");
  popupEl.addEventListener("animationend", () => {
    popupEl.remove();
  }, { once: true });
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
  input.horn = false;
}

function updateOverlayVisibility() {
  phoneShellEl.classList.toggle("hidden", !phoneOpen);
  phoneShellEl.setAttribute("aria-hidden", String(!phoneOpen));
  dealerBrowserEl.classList.toggle("hidden", !dealerBrowserOpen);
  dealerBrowserEl.setAttribute("aria-hidden", String(!dealerBrowserOpen));

  const overlayOpen = phoneOpen || dealerBrowserOpen;
  document.body.classList.toggle("phone-active", overlayOpen);

  if (overlayOpen) {
    setSettingsOpen(false);
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
      handbrake: false,
      restart: false,
      interact: false,
      toggleNight: false,
      toggleFirstPerson: false,
      togglePhone: false,
      jump: false,
      sprint: false,
      debugDamage: false,
      horn: false,
      crouch: false,
      fire: false,
      aim: false,
      shopPrev: false,
      shopNext: false,
      selectWeapon1: false,
      selectWeapon2: false,
      selectWeapon3: false,
      selectWeapon4: false,
      selectWeapon5: false,
      toggleInventory: false
    },
    0,
    null
  );
  latestGameState = state;

  world.updateInteractivePlaces(state.playerPose, state.playerMode, 0);
  world.updateChoiceSigns(
    state.playerMode === "driving" ? state.vehiclePose : state.playerPose,
    state.playerMode === "driving" ? state.upcomingIntersection : null
  );

  updatePlayerCarEffects(playerCar, 0, {
    nightMode: world.isNightMode(),
    speed: state.playerMode === "driving" ? state.rawSpeed : 0,
    steer: 0,
    surfaceType: state.vehicleSurface ?? "road",
    isBraking: false,
    isHandbraking: false,
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
  crosshairAnimTime += dt;

  if (input.toggleRoadDriverMenu) {
    roadDriverMenuOpen = !roadDriverMenuOpen;
    updateRoadDriverMenu();
    input.toggleRoadDriverMenu = false;
  }

  if (input.toggleSettings) {
    if (phoneOpen) {
      setPhoneOpen(false);
    } else if (dealerBrowserOpen) {
      setDealerBrowserOpen(false);
    } else if (!editor.isActive()) {
      setSettingsOpen(!settingsOpen);
    }
    input.toggleSettings = false;
  }

  if (editor.consumeToggleRequested()) {
    if (editor.isActive()) {
      editor.exit();
    } else {
      editor.enter();
    }
  }

  if (editor.isActive()) {
    setSettingsOpen(false);
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
    input.toggleInventory = false;
    input.horn = false;
    editor.update(dt);
    renderer.render(scene, camera);
    return;
  }

  if (settingsOpen) {
    input.restart = false;
    input.toggleNight = false;
    input.toggleFirstPerson = false;
    input.togglePhone = false;
    input.toggleInventory = false;
    input.horn = false;
    clearMomentaryInputs();
    cameraController.setPointerLockBlocked(true);
    cameraController.setAimDownSights(false);
    if (latestGameState) {
      updateUI(latestGameState);
    }
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
    input.horn = false;
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

  if (input.toggleInventory && lastPlayerMode === "walking") {
    inventoryMenuOpen = !inventoryMenuOpen;
    if (!inventoryMenuOpen) {
      clearInventoryDragState();
    }
  }
  input.toggleInventory = false;

  cameraController.setPointerLockBlocked(
    (inventoryMenuOpen || settingsOpen) && cameraController.isFirstPerson()
  );
  cameraController.setAimDownSights(
    !inventoryMenuOpen &&
    !editor.isActive() &&
    !!input.aim
  );

  const wantsSniperScope =
    !inventoryMenuOpen &&
    !editor.isActive() &&
    !!input.aim &&
    latestGameState?.playerMode === "walking" &&
    latestGameState?.inventoryHud?.activeItemKind === "weapon" &&
    latestGameState?.weaponHud?.equippedId === "francotirador";

  if (wantsSniperScope && !cameraController.isFirstPerson()) {
    cameraController.setFirstPerson(true);
    sniperScopeForcedFirstPerson = true;
  } else if (!wantsSniperScope && sniperScopeForcedFirstPerson) {
    cameraController.setFirstPerson(false);
    sniperScopeForcedFirstPerson = false;
  }

  if (input.restart) {
    restartGame();
    input.restart = false;
  }

  const controlContext = cameraController.getWalkingControlContext();
  const frameInput = inventoryMenuOpen
    ? {
        ...input,
        left: false,
        right: false,
        accelerate: false,
        brake: false,
        handbrake: false,
        interact: false,
        jump: false,
        sprint: false,
        crouch: false,
        fire: false,
        aim: false,
        shopPrev: false,
        shopNext: false
      }
    : input;
  const state = game.update(frameInput, dt, controlContext);
  latestGameState = state;
  lastPlayerMode = state.playerMode;
  input.horn = false;

  if (state.playerMode !== "walking" && inventoryMenuOpen) {
    inventoryMenuOpen = false;
    clearInventoryDragState();
  }

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
    steer: state.playerMode === "driving" ? state.steer : 0,
    surfaceType: state.vehicleSurface ?? "road",
    isBraking: state.playerMode === "driving" ? state.isBraking : false,
    isHandbraking: state.playerMode === "driving" ? state.isHandbraking : false,
    isAccelerating: state.playerMode === "driving" ? state.isAccelerating : false,
    turnSignal: state.playerMode === "driving" ? state.turnSignal : 0
  });

  updatePlayerCharacterVisual(playerCharacter, dt, state.characterState);

  cameraController.update(state, dt, playerCar, playerCharacter, false);
  const walkingAimBlend = state.characterState?.aimBlend ?? 0;
  const activeWeaponAttributes = getWeaponAttributes(state.weaponHud?.equippedId ?? null);
  const sniperScopeActive = isSniperScopeActive(state);
  const targetFov = state.playerMode === "walking"
    ? sniperScopeActive
      ? getSniperScopeFov(state)
      : cameraController.isFirstPerson()
        ? THREE.MathUtils.lerp(68, 57, walkingAimBlend)
        : THREE.MathUtils.lerp(68, 40, walkingAimBlend)
    : 68;
  camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 12, dt);
  camera.updateProjectionMatrix();
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
updateRoadDriverMenu();
setSettingsOpen(false);
updateOverlayVisibility();
restartGame();
animate();
