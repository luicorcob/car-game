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
let inventoryMenuOpen = false;
let lastPlayerMode = "driving";
let draggedInventorySlotIndex = null;
let crosshairAnimTime = 0;
let latestGameState = null;
const SNIPER_SCOPE_ZOOM_STEPS = [1, 0.78, 0.58, 0.42];
let sniperScopeZoomIndex = 0;
let sniperScopeForcedFirstPerson = false;

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
  inventoryMenuGridEl.querySelectorAll(".inventory-slot").forEach((slotEl) => {
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
  inventoryMenuGridEl.querySelectorAll(".inventory-slot").forEach((inventorySlotEl) => {
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
const CAMERA_SETTINGS_KEY = "road-driver-camera-settings-v1";

const MAP_SIZE = CONFIG.minimap.size;
const MAP_EXTENT = CONFIG.minimap.extent;
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

function initMinimap() {
  navMapSvg.setAttribute("viewBox", `0 0 ${MAP_SIZE} ${MAP_SIZE}`);

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
  const shouldShow =
    !inventoryMenuOpen &&
    !editor.isActive() &&
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
  settingsToggleEl.classList.toggle("hidden", active);
  if (active) {
    cameraSettingsPanelEl.classList.add("hidden");
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
  hotbarSlotEls.forEach((slotEl, index) => {
    const slot = hotbarSlots[index];
    const labelEl = slotEl.querySelector(".hotbar-label");
    const detailEl = slotEl.querySelector(".hotbar-detail");

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
    inventoryMenuGridEl.innerHTML = backpackSlots.map((slot) => {
      const classes = [
        "inventory-slot",
        slot?.empty ? "empty" : "",
        slot?.active ? "active" : ""
      ].filter(Boolean).join(" ");
      const slotNumber = (slot?.index ?? 0) + 1;
      const keyMarkup = `<div class="inventory-slot-key">${slotNumber}</div>`;
      return `<div class="${classes}" data-slot-index="${slot?.index ?? -1}" data-empty="${slot?.empty ? "true" : "false"}" draggable="${slot?.empty ? "false" : "true"}">${keyMarkup}<strong>${slot?.empty ? "Vacio" : (slot?.label ?? "Vacio")}</strong><span>${slot?.empty ? "" : (slot?.detail ?? "")}</span></div>`;
    }).join("");
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

  updateMinimapRoads(originX, originZ, mapHeading);

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
  fpsEl.textContent = Math.round(fpsSmoothed);
  cameraModeEl.textContent = cameraController.isFirstPerson()
    ? "1ª persona"
    : "3ª persona";

  if (state.gameOver) {
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
  updateInventoryUI(state);
  updateMinimap(state);
  updateCrosshair(state);
  updatePrompt(state);
  gameOverEl.classList.toggle("hidden", !state.gameOver);
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
      jump: false,
      sprint: false,
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

  if (editor.consumeToggleRequested()) {
    if (editor.isActive()) {
      editor.exit();
    } else {
      editor.enter();
    }
  }

  if (editor.isActive()) {
    input.restart = false;
    input.toggleNight = false;
    input.toggleFirstPerson = false;
    input.toggleInventory = false;
    editor.update(dt);
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

  cameraController.setPointerLockBlocked(inventoryMenuOpen && cameraController.isFirstPerson());
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
restartGame();
animate();
