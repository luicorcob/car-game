import * as THREE from "three";
import { CONFIG } from "./config.js";
import { createInput } from "./input.js";
import { createWorld } from "./world.js";
import { createCameraController } from "./cameraController.js";
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

const canvas = document.querySelector("#game");
const speedEl = document.querySelector("#speed");
const scoreEl = document.querySelector("#score");
const moneyEl = document.querySelector("#money");
const statusEl = document.querySelector("#status");
const cameraModeEl = document.querySelector("#camera-mode");
const gameOverEl = document.querySelector("#game-over");

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

const navMapTitleEl = document.querySelector("#nav-map-title");
const navMapStateEl = document.querySelector("#nav-map-state");
const navMapSvg = document.querySelector("#nav-map-svg");
const navRouteEl = document.querySelector("#nav-route");
const navPlayerEl = document.querySelector("#nav-player");
const navCarEl = document.querySelector("#nav-car");
const navTargetEl = document.querySelector("#nav-target");
const navPizzeriaEl = document.querySelector("#nav-pizzeria");

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

const input = createInput();
const world = createWorld(scene);

const playerCar = createPlayerCar();
scene.add(playerCar);
attachPlayerCarEffects(playerCar, scene);

const playerCharacter = createPlayerCharacter();
scene.add(playerCharacter);

const game = createGame(scene, playerCar, playerCharacter, world);
const pizzeriaInfo = world.getPizzeriaInfo();

const lookTarget = new THREE.Vector3();
const cameraController = createCameraController(camera, lookTarget);

const MAP_SIZE = CONFIG.minimap.size;
const MAP_EXTENT = CONFIG.minimap.extent;

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

  setMarker(navPlayerEl, state.playerPose.x, state.playerPose.z, Math.PI - state.playerPose.heading, true);
  setMarker(navPizzeriaEl, pizzeriaInfo.center.x, pizzeriaInfo.center.z, 0, true);

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
    navMapStateEl.textContent = "Pizzería Vesuvio";
  }
}

function updateUI(state) {
  speedEl.textContent = state.speedKmh;
  scoreEl.textContent = state.score;
  moneyEl.textContent = `$${state.money}`;
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
  updateMinimap(state);
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
      restart: false,
      interact: false,
      toggleNight: false,
      toggleFirstPerson: false,
      jump: false,
      sprint: false,
      fire: false,
      shopPrev: false,
      shopNext: false,
      selectWeapon1: false,
      selectWeapon2: false,
      selectWeapon3: false
    },
    0
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

  const state = game.update(input, dt);

  world.updateInteractivePlaces(state.playerPose, state.playerMode, dt);
  world.updateChoiceSigns(
    state.playerMode === "driving" ? state.vehiclePose : state.playerPose,
    state.playerMode === "driving" ? state.upcomingIntersection : null
  );
  world.updateDecorations(dt);

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
restartGame();
animate();