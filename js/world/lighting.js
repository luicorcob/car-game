import * as THREE from "three";
import { CONFIG } from "../config.js";

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

  const grassMaterial = new THREE.MeshStandardMaterial({ color: 0x3f8f3f });

  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(CONFIG.world.grassSize, CONFIG.world.grassSize),
    grassMaterial
  );
  grass.rotation.x = -Math.PI / 2;
  grass.position.y = -0.16;
  scene.add(grass);

  let lampHeadMaterial = null;
  let nightMode = false;

  function applyNightState() {
    scene.background = nightMode ? nightBackground : dayBackground;
    scene.fog.color.copy(nightMode ? nightFogColor : dayFogColor);

    hemi.intensity = nightMode ? 0.22 : 1.15;
    sun.intensity = nightMode ? 0.16 : 1.05;
    moon.intensity = nightMode ? 0.42 : 0;

    grassMaterial.color.setHex(nightMode ? 0x1f4f28 : 0x3f8f3f);

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

  setNightMode(false);

  return {
    registerLampHeadMaterial,
    setNightMode,
    isNightMode
  };
}