import * as THREE from "three";
import { CONFIG } from "./config.js";
import { createInput } from "./input.js";
import { createWorld } from "./world.js";
import {
  createPlayerCar,
  attachPlayerCarEffects,
  updatePlayerCarEffects,
  resetPlayerCarEffects
} from "./car.js";
import { createGame } from "./game.js";

const canvas = document.querySelector("#game");
const speedEl = document.querySelector("#speed");
const scoreEl = document.querySelector("#score");
const statusEl = document.querySelector("#status");
const gameOverEl = document.querySelector("#game-over");
const hudPanel = document.querySelector(".panel.hud");

const fuelRow = document.createElement("div");
fuelRow.innerHTML = 'Combustible: <span id="fuel-value">100</span>%';
hudPanel.appendChild(fuelRow);
const fuelEl = fuelRow.querySelector("#fuel-value");

const promptEl = document.createElement("div");
promptEl.style.position = "fixed";
promptEl.style.left = "50%";
promptEl.style.bottom = "34px";
promptEl.style.transform = "translateX(-50%)";
promptEl.style.padding = "10px 16px";
promptEl.style.borderRadius = "12px";
promptEl.style.background = "rgba(10,14,22,0.82)";
promptEl.style.color = "white";
promptEl.style.fontFamily = "Arial, sans-serif";
promptEl.style.fontSize = "15px";
promptEl.style.fontWeight = "700";
promptEl.style.letterSpacing = "0.02em";
promptEl.style.pointerEvents = "none";
promptEl.style.backdropFilter = "blur(4px)";
promptEl.style.display = "none";
promptEl.style.zIndex = "20";
document.body.appendChild(promptEl);

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

const game = createGame(scene, playerCar, world);

const lookTarget = new THREE.Vector3();

function updateCamera(playerPose, dt) {
  const heading = playerPose.heading;

  const backX = -Math.sin(heading) * CONFIG.camera.followDistance;
  const backZ = Math.cos(heading) * CONFIG.camera.followDistance;

  camera.position.x = THREE.MathUtils.damp(
    camera.position.x,
    playerPose.x + backX,
    CONFIG.camera.positionDamping,
    dt
  );

  camera.position.y = THREE.MathUtils.damp(
    camera.position.y,
    CONFIG.camera.height,
    CONFIG.camera.positionDamping,
    dt
  );

  camera.position.z = THREE.MathUtils.damp(
    camera.position.z,
    playerPose.z + backZ,
    CONFIG.camera.positionDamping,
    dt
  );

  lookTarget.x = THREE.MathUtils.damp(
    lookTarget.x,
    playerPose.x + Math.sin(heading) * CONFIG.camera.lookAhead,
    CONFIG.camera.lookDamping,
    dt
  );

  lookTarget.y = THREE.MathUtils.damp(
    lookTarget.y,
    1.4,
    CONFIG.camera.lookDamping,
    dt
  );

  lookTarget.z = THREE.MathUtils.damp(
    lookTarget.z,
    playerPose.z - Math.cos(heading) * CONFIG.camera.lookAhead,
    CONFIG.camera.lookDamping,
    dt
  );

  camera.lookAt(lookTarget);
}

function updatePrompt(state) {
  let text = "";

  if (state.gameOver) {
    text = "";
  } else if (state.outOfFuel) {
    text = "Depósito vacío";
  } else if (state.isRefueling) {
    text = `Repostando... ${state.fuelPct}%`;
  } else if (state.gasStationPrompt) {
    text = state.gasStationPrompt;
  }

  promptEl.textContent = text;
  promptEl.style.display = text ? "block" : "none";
}

function updateUI(state) {
  speedEl.textContent = state.speedKmh;
  scoreEl.textContent = state.score;
  fuelEl.textContent = state.fuelPct;

  if (state.gameOver) {
    statusEl.textContent = "Chocado";
  } else if (state.isRefueling) {
    statusEl.textContent = "Repostando";
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

  gameOverEl.classList.toggle("hidden", !state.gameOver);
  updatePrompt(state);
}

function restartGame() {
  game.reset();
  resetPlayerCarEffects(playerCar);

  const state = game.update(
    {
      left: false,
      right: false,
      accelerate: false,
      brake: false,
      restart: false,
      interact: false,
      toggleNight: false
    },
    0
  );

  camera.position.set(
    state.playerPose.x,
    CONFIG.camera.height,
    state.playerPose.z + CONFIG.camera.followDistance
  );

  lookTarget.set(
    state.playerPose.x,
    1.4,
    state.playerPose.z - CONFIG.camera.lookAhead
  );

  world.updateChoiceSigns(state.playerPose, state.upcomingIntersection);
  updatePlayerCarEffects(playerCar, 0, {
    nightMode: world.isNightMode(),
    speed: state.rawSpeed,
    isBraking: false,
    isAccelerating: false,
    turnSignal: 0
  });

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

  if (input.restart) {
    restartGame();
    input.restart = false;
  }

  const state = game.update(input, dt);

  world.updateChoiceSigns(state.playerPose, state.upcomingIntersection);
  world.updateDecorations(dt);
  updatePlayerCarEffects(playerCar, dt, {
    nightMode: world.isNightMode(),
    speed: state.rawSpeed,
    isBraking: state.isBraking,
    isAccelerating: state.isAccelerating,
    turnSignal: state.turnSignal
  });

  updateCamera(state.playerPose, dt);
  updateUI(state);

  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

restartGame();
animate();