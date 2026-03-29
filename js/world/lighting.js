import * as THREE from "three";
import { CONFIG } from "../config.js";

function createGrassTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#4c9c45";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 2600; i += 1) {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height;
    const bladeHeight = 3 + Math.random() * 9;
    const lean = (Math.random() - 0.5) * 4;

    ctx.strokeStyle = `hsl(${94 + Math.random() * 18} 55% ${32 + Math.random() * 26}%)`;
    ctx.lineWidth = 0.8 + Math.random() * 1.1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + lean, y - bladeHeight);
    ctx.stroke();
  }

  for (let i = 0; i < 1400; i += 1) {
    const size = 1 + Math.random() * 2.2;
    ctx.fillStyle = `hsla(${88 + Math.random() * 20}, 48%, ${24 + Math.random() * 20}%, ${0.16 + Math.random() * 0.18})`;
    ctx.beginPath();
    ctx.arc(
      Math.random() * canvas.width,
      Math.random() * canvas.height,
      size,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(CONFIG.world.grassSize / 28, CONFIG.world.grassSize / 28);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function createWorldLighting(scene) {
  const dayBackground = new THREE.Color(0x87ceeb);
  const nightBackground = new THREE.Color(0x07111d);
  const dayFogColor = new THREE.Color(0x9bd6ff);
  const nightFogColor = new THREE.Color(0x0d1827);

  scene.background = dayBackground;
  scene.fog = new THREE.Fog(
    dayFogColor,
    CONFIG.world.fogNear,
    CONFIG.world.fogFar
  );

  const hemi = new THREE.HemisphereLight(0xffffff, 0x2f6b2f, 1.15);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 1.05);
  sun.position.set(40, 60, 20);
  scene.add(sun);

  const moon = new THREE.DirectionalLight(0x9bbcff, 0);
  moon.position.set(-50, 42, -26);
  scene.add(moon);

  const grassTexture = createGrassTexture();
  const grassMaterial = new THREE.MeshStandardMaterial({
    color: 0x67b957,
    map: grassTexture,
    roughness: 0.96,
    metalness: 0
  });

  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(CONFIG.world.grassSize, CONFIG.world.grassSize),
    grassMaterial
  );
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.16;
  scene.add(grass);

  let lampHeadMaterial = null;
  let nightMode = false;
  let targetFogNear = CONFIG.world.fogNear;
  let targetFogFar = CONFIG.world.fogFar;

  function applyNightState() {
    scene.background = nightMode ? nightBackground : dayBackground;
    scene.fog.color.copy(nightMode ? nightFogColor : dayFogColor);

    hemi.intensity = nightMode ? 0.22 : 1.15;
    sun.intensity = nightMode ? 0.16 : 1.05;
    moon.intensity = nightMode ? 0.42 : 0;

    grassMaterial.color.setHex(nightMode ? 0x1f4f28 : 0x67b957);

    if (lampHeadMaterial) {
      lampHeadMaterial.emissive.setHex(nightMode ? 0xffdd88 : 0x333300);
      lampHeadMaterial.emissiveIntensity = nightMode ? 2.6 : 1;
    }
  }

  function registerLampHeadMaterial(material) {
    lampHeadMaterial = material;
    applyNightState();
  }

  function setNightMode(enabled) {
    nightMode = enabled;
    applyNightState();
  }

  function isNightMode() {
    return nightMode;
  }

  function setRenderProfile(profile = {}) {
    targetFogNear = profile.fogNear ?? targetFogNear;
    targetFogFar = profile.fogFar ?? targetFogFar;
  }

  function update(dt) {
    const blend = 1 - Math.exp(-Math.max(0, dt) * 5.5);
    scene.fog.near = THREE.MathUtils.lerp(scene.fog.near, targetFogNear, blend);
    scene.fog.far = THREE.MathUtils.lerp(scene.fog.far, targetFogFar, blend);
  }

  setNightMode(false);

  return {
    registerLampHeadMaterial,
    setNightMode,
    isNightMode,
    setRenderProfile,
    update
  };
}
