import * as THREE from "three";
import { normalizeAngle } from "../world/math.js";
import { CONFIG } from "../config.js";

function createLimb(width, height, depth, color) {
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.72,
    metalness: 0.04
  });

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    mat
  );

  mesh.position.y = -height * 0.5;
  return mesh;
}

function createPizzaBox() {
  const group = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.08, 0.7),
    new THREE.MeshStandardMaterial({
      color: 0xf5e8cf,
      roughness: 0.8
    })
  );
  group.add(base);

  const lid = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.05, 0.7),
    new THREE.MeshStandardMaterial({
      color: 0xf8f0de,
      roughness: 0.8
    })
  );
  lid.position.y = 0.06;
  group.add(lid);

  const sticker = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.01, 0.18),
    new THREE.MeshStandardMaterial({
      color: 0xb91c1c,
      emissive: 0x5b0000,
      emissiveIntensity: 0.12
    })
  );
  sticker.position.y = 0.09;
  group.add(sticker);

  return group;
}

function createMuzzleFlash(size = 0.16) {
  const flash = new THREE.Mesh(
    new THREE.SphereGeometry(size, 8, 8),
    new THREE.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0xffb703,
      emissiveIntensity: 2.4,
      roughness: 0.22,
      transparent: true,
      opacity: 0.95
    })
  );
  flash.visible = false;
  return flash;
}

function createWeaponModel(type, firstPerson = false) {
  const group = new THREE.Group();

  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.72,
    metalness: 0.08
  });

  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x374151,
    roughness: 0.5,
    metalness: 0.18
  });

  let body;
  let barrel;
  let muzzleZ = 0.6;

  if (type === "pistol") {
    body = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.12, 0.34),
      darkMat
    );
    body.position.z = 0.06;
    group.add(body);

    barrel = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 0.24),
      metalMat
    );
    barrel.position.z = 0.28;
    group.add(barrel);

    const grip = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.22, 0.12),
      darkMat
    );
    grip.position.set(0, -0.15, -0.02);
    grip.rotation.x = -0.26;
    group.add(grip);

    muzzleZ = 0.42;
  }

  if (type === "shotgun") {
    body = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.12, 0.7),
      darkMat
    );
    body.position.z = -0.02;
    group.add(body);

    barrel = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 0.82),
      metalMat
    );
    barrel.position.z = 0.42;
    group.add(barrel);

    const stock = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.18, 0.36),
      darkMat
    );
    stock.position.set(0, -0.02, -0.42);
    group.add(stock);

    const pump = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.1, 0.26),
      metalMat
    );
    pump.position.set(0, -0.08, 0.2);
    group.add(pump);

    muzzleZ = 0.84;
  }

  if (type === "rifle") {
    body = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.12, 0.74),
      darkMat
    );
    body.position.z = -0.04;
    group.add(body);

    barrel = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, 0.88),
      metalMat
    );
    barrel.position.z = 0.44;
    group.add(barrel);

    const stock = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.18, 0.34),
      darkMat
    );
    stock.position.set(0, -0.02, -0.46);
    group.add(stock);

    const mag = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.24, 0.16),
      metalMat
    );
    mag.position.set(0, -0.16, -0.05);
    mag.rotation.x = -0.18;
    group.add(mag);

    const sight = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.06, 0.18),
      metalMat
    );
    sight.position.set(0, 0.1, 0.1);
    group.add(sight);

    muzzleZ = 0.92;
  }

  if (firstPerson) {
    group.scale.setScalar(1.28);
  }

  const muzzleAnchor = new THREE.Object3D();
  muzzleAnchor.position.set(0, 0, muzzleZ);
  group.add(muzzleAnchor);

  const flash = createMuzzleFlash(firstPerson ? 0.12 : 0.08);
  muzzleAnchor.add(flash);

  return {
    group,
    muzzleAnchor,
    flash
  };
}

function getThirdPersonWeaponPose(weaponId, bob, recoil, walkSway = 0) {
  if (weaponId === "pistol") {
    return {
      armLeftX: -0.84 + bob * 0.02 + walkSway * 0.03,
      armRightX: -1.28 - recoil * 0.28 + bob * 0.02,
      armLeftZ: 0.18,
      armRightZ: -0.12,

      handX: -0.17,
      handY: -0.31 + bob * 0.012,
      handZ: 0.19 - recoil * 0.025,

      handRotX: -1.3 - recoil * 0.1,
      handRotY: Math.PI / 2 - 0.03,
      handRotZ: -0.05
    };
  }

  const longGunForward = weaponId === "shotgun" ? 0.24 : 0.3;

  return {
    armLeftX: -1.08 - recoil * 0.08 + bob * 0.02,
    armRightX: -1.38 - recoil * 0.2 + bob * 0.02,
    armLeftZ: 0.31,
    armRightZ: -0.14,

    handX: -0.17,
    handY: -0.27 + bob * 0.01,
    handZ: longGunForward - recoil * 0.035,

    handRotX: -1.5 - recoil * 0.12,
    handRotY: Math.PI / 2 - 0.025,
    handRotZ: -0.07
  };
}

function getFirstPersonWeaponPose(weaponId, bob, recoil) {
  if (weaponId === "pistol") {
    return {
      rootX: -0.54,
      rootY: -0.29 + recoil * 0.11,
      rootZ: 0.52 - recoil * 0.085,
      rotX: -0.08 - recoil * 0.22,
      rotY: 0.025,
      rotZ: -0.012
    };
  }

  return {
    rootX: -0.52,
    rootY: -0.31 + recoil * 0.12,
    rootZ: weaponId === "shotgun" ? 0.5 - recoil * 0.075 : 0.54 - recoil * 0.08,
    rotX: -0.1 - recoil * 0.24,
    rotY: 0.03,
    rotZ: -0.015
  };
}

function applyThirdPersonWeaponAlignment(weapon, weaponId) {
  weapon.group.position.set(0, 0, 0);
  weapon.group.rotation.set(0, -Math.PI / 2, 0);

  if (weaponId === "pistol") {
    weapon.group.position.set(0.02, -0.01, 0.02);
    weapon.group.rotation.z = 0.04;
    return;
  }

  if (weaponId === "shotgun") {
    weapon.group.position.set(0.02, -0.02, 0.08);
    weapon.group.rotation.z = 0.03;
    return;
  }

  if (weaponId === "rifle") {
    weapon.group.position.set(0.02, -0.02, 0.1);
    weapon.group.rotation.z = 0.03;
  }
}

function resetWeaponTransforms(weapon) {
  weapon.group.position.set(0, 0, 0);
  weapon.group.rotation.set(0, 0, 0);
}

export function createPlayerCharacter() {
  const group = new THREE.Group();
  group.visible = false;

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.48, 20),
    new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.2,
      depthWrite: false
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  const root = new THREE.Group();
  group.add(root);

  const pelvis = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.24, 0.24),
    new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.65
    })
  );
  pelvis.position.y = 0.94;
  root.add(pelvis);

  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.64, 0.82, 0.34),
    new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      roughness: 0.55
    })
  );
  torso.position.y = 1.42;
  root.add(torso);

  const chestStripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.66, 0.12, 0.36),
    new THREE.MeshStandardMaterial({
      color: 0xe5e7eb,
      roughness: 0.58
    })
  );
  chestStripe.position.set(0, 1.48, 0.18);
  root.add(chestStripe);

  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.12, 10),
    new THREE.MeshStandardMaterial({ color: 0xf1c27d })
  );
  neck.position.y = 1.9;
  root.add(neck);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 16, 16),
    new THREE.MeshStandardMaterial({
      color: 0xf1c27d,
      roughness: 0.82
    })
  );
  head.position.y = 2.18;
  root.add(head);

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.225, 14, 14, 0, Math.PI * 2, 0, Math.PI * 0.6),
    new THREE.MeshStandardMaterial({
      color: 0x2a1e16,
      roughness: 0.88
    })
  );
  hair.position.y = 2.27;
  root.add(hair);

  const backpack = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.52, 0.16),
    new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.72
    })
  );
  backpack.position.set(0, 1.46, -0.23);
  root.add(backpack);

  const armLeftPivot = new THREE.Group();
  armLeftPivot.position.set(-0.4, 1.72, 0);
  root.add(armLeftPivot);

  const armRightPivot = new THREE.Group();
  armRightPivot.position.set(0.4, 1.72, 0);
  root.add(armRightPivot);

  const armLeft = createLimb(0.16, 0.64, 0.16, 0x2563eb);
  const armRight = createLimb(0.16, 0.64, 0.16, 0x2563eb);
  armLeftPivot.add(armLeft);
  armRightPivot.add(armRight);

  const handLeft = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.18, 0.14),
    new THREE.MeshStandardMaterial({ color: 0xf1c27d })
  );
  handLeft.position.y = -0.72;
  armLeftPivot.add(handLeft);

  const handRight = handLeft.clone();
  handRight.material = handLeft.material.clone();
  handRight.position.y = -0.72;
  armRightPivot.add(handRight);

  const legLeftPivot = new THREE.Group();
  legLeftPivot.position.set(-0.15, 0.94, 0);
  root.add(legLeftPivot);

  const legRightPivot = new THREE.Group();
  legRightPivot.position.set(0.15, 0.94, 0);
  root.add(legRightPivot);

  const legLeft = createLimb(0.18, 0.78, 0.2, 0x1f2937);
  const legRight = createLimb(0.18, 0.78, 0.2, 0x1f2937);
  legLeftPivot.add(legLeft);
  legRightPivot.add(legRight);

  const shoeLeft = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.1, 0.34),
    new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.92
    })
  );
  shoeLeft.position.set(0, -0.82, 0.07);
  legLeftPivot.add(shoeLeft);

  const shoeRight = shoeLeft.clone();
  shoeRight.material = shoeLeft.material.clone();
  shoeRight.position.set(0, -0.82, 0.07);
  legRightPivot.add(shoeRight);

  const pizzaBox = createPizzaBox();
  pizzaBox.position.set(0, 1.28, 0.28);
  pizzaBox.visible = false;
  root.add(pizzaBox);

  const weaponHandRoot = new THREE.Group();
  weaponHandRoot.position.set(-0.17, -0.31, 0.19);
  weaponHandRoot.rotation.set(-1.3, Math.PI / 2 - 0.03, -0.05);
  armRightPivot.add(weaponHandRoot);

  const firstPersonAnchor = new THREE.Object3D();
  firstPersonAnchor.position.set(0, 2.02, 0.02);
  root.add(firstPersonAnchor);

  const firstPersonWeaponRoot = new THREE.Group();
  firstPersonWeaponRoot.position.set(-0.54, -0.29, 0.52);
  firstPersonWeaponRoot.rotation.set(-0.08, 0.025, -0.012);
  firstPersonAnchor.add(firstPersonWeaponRoot);

  const thirdPersonWeapons = {
    pistol: createWeaponModel("pistol", false),
    shotgun: createWeaponModel("shotgun", false),
    rifle: createWeaponModel("rifle", false)
  };

  const firstPersonWeapons = {
    pistol: createWeaponModel("pistol", true),
    shotgun: createWeaponModel("shotgun", true),
    rifle: createWeaponModel("rifle", true)
  };

  for (const weapon of Object.values(thirdPersonWeapons)) {
    weapon.group.visible = false;
    weaponHandRoot.add(weapon.group);
  }

  for (const weapon of Object.values(firstPersonWeapons)) {
    weapon.group.visible = false;
    firstPersonWeaponRoot.add(weapon.group);
  }

  const bodyMeshes = [
    pelvis,
    torso,
    chestStripe,
    neck,
    head,
    hair,
    backpack,
    armLeft,
    armRight,
    handLeft,
    handRight,
    legLeft,
    legRight,
    shoeLeft,
    shoeRight
  ];

  group.userData.characterRig = {
    shadow,
    root,
    armLeftPivot,
    armRightPivot,
    legLeftPivot,
    legRightPivot,
    pizzaBox,
    weaponHandRoot,
    firstPersonAnchor,
    firstPersonWeaponRoot,
    thirdPersonWeapons,
    firstPersonWeapons,
    bodyMeshes,

    animTime: 0,
    yaw: Math.PI,
    aimBlend: 0,
    forceHiddenForFirstPerson: false,

    tempPosition: new THREE.Vector3(),
    tempLookAt: new THREE.Vector3(),
    tempForward: new THREE.Vector3(),
    tempQuaternion: new THREE.Quaternion()
  };

  return group;
}

export function setPlayerCharacterFirstPerson(character, enabled) {
  const rig = character.userData.characterRig;
  if (!rig) return;
  rig.forceHiddenForFirstPerson = !!enabled;
}

export function getPlayerCharacterFirstPersonCameraPose(
  character,
  lookDistance = 12
) {
  const rig = character.userData.characterRig;
  if (!rig) return null;

  rig.firstPersonAnchor.getWorldPosition(rig.tempPosition);
  rig.tempForward.set(0, 0, 1).applyQuaternion(character.quaternion).normalize();
  rig.tempLookAt.copy(rig.tempPosition).addScaledVector(rig.tempForward, lookDistance);

  return {
    position: rig.tempPosition.clone(),
    lookAt: rig.tempLookAt.clone()
  };
}

export function getPlayerCharacterWeaponMuzzlePose(character) {
  const rig = character.userData.characterRig;
  if (!rig) return null;

  const weaponSets = rig.forceHiddenForFirstPerson
    ? [rig.firstPersonWeapons]
    : [rig.thirdPersonWeapons, rig.firstPersonWeapons];

  for (const set of weaponSets) {
    for (const weapon of Object.values(set)) {
      if (!weapon.group.visible) continue;

      weapon.muzzleAnchor.getWorldPosition(rig.tempPosition);
      weapon.muzzleAnchor.getWorldQuaternion(rig.tempQuaternion);

      rig.tempForward
        .set(0, 0, 1)
        .applyQuaternion(rig.tempQuaternion)
        .normalize();

      return {
        position: rig.tempPosition.clone(),
        forward: rig.tempForward.clone()
      };
    }
  }

  return null;
}

export function resetPlayerCharacterVisual(character) {
  const rig = character.userData.characterRig;
  if (!rig) return;

  rig.animTime = 0;
  rig.yaw = Math.PI;
  rig.aimBlend = 0;
  rig.forceHiddenForFirstPerson = false;
  character.visible = false;
  character.position.set(0, 0, 0);
  character.rotation.set(0, rig.yaw, 0);

  rig.root.position.y = 0;
  rig.armLeftPivot.rotation.set(0, 0, 0);
  rig.armRightPivot.rotation.set(0, 0, 0);
  rig.legLeftPivot.rotation.set(0, 0, 0);
  rig.legRightPivot.rotation.set(0, 0, 0);

  rig.shadow.visible = true;
  rig.shadow.material.opacity = 0.2;
  rig.pizzaBox.visible = false;

  rig.weaponHandRoot.position.set(-0.17, -0.31, 0.19);
  rig.weaponHandRoot.rotation.set(-1.3, Math.PI / 2 - 0.03, -0.05);
  rig.firstPersonAnchor.rotation.set(0, 0, 0);
  rig.firstPersonWeaponRoot.position.set(-0.54, -0.29, 0.52);
  rig.firstPersonWeaponRoot.rotation.set(-0.08, 0.025, -0.012);

  for (const mesh of rig.bodyMeshes) {
    mesh.visible = true;
  }

  for (const weapon of Object.values(rig.thirdPersonWeapons)) {
    resetWeaponTransforms(weapon);
    weapon.group.visible = false;
    weapon.flash.visible = false;
  }

  for (const weapon of Object.values(rig.firstPersonWeapons)) {
    resetWeaponTransforms(weapon);
    weapon.group.visible = false;
    weapon.flash.visible = false;
  }
}

export function updatePlayerCharacterVisual(character, dt, state) {
  const rig = character.userData.characterRig;
  if (!rig) return;

  const inFirstPerson = !!rig.forceHiddenForFirstPerson;

  const shouldShowCharacter = !!state.visible;
  character.visible = shouldShowCharacter;

  if (!shouldShowCharacter) return;

  character.position.set(
    state.x,
    state.jumpOffset ?? 0,
    state.z
  );

  const targetYaw = Math.PI - state.heading;
  if (inFirstPerson) {
    rig.yaw = normalizeAngle(targetYaw);
  } else {
    const yawDelta = normalizeAngle(targetYaw - rig.yaw);
    rig.yaw = normalizeAngle(rig.yaw + yawDelta * Math.min(1, 12 * dt));
  }
  character.rotation.y = rig.yaw;

  const carryingPizza = !!state.carryingPizza;
  const aimPitch = typeof state.aimPitch === "number" ? state.aimPitch : 0;
  const aiming = !!state.aiming;
  const weaponState = state.weapon ?? {
    equippedId: null,
    hasEquippedWeapon: false,
    muzzlePulse: 0
  };

  for (const mesh of rig.bodyMeshes) {
    mesh.visible = !inFirstPerson;
  }

  rig.shadow.visible = !inFirstPerson;
  rig.pizzaBox.visible = carryingPizza && !inFirstPerson;
  rig.firstPersonAnchor.rotation.set(-aimPitch * 0.92, 0, 0);

  for (const weapon of Object.values(rig.thirdPersonWeapons)) {
    resetWeaponTransforms(weapon);
    weapon.group.visible = false;
    weapon.flash.visible = false;
  }

  for (const weapon of Object.values(rig.firstPersonWeapons)) {
    resetWeaponTransforms(weapon);
    weapon.group.visible = false;
    weapon.flash.visible = false;
  }

  const speedNorm = Math.min(
    1,
    (state.planarSpeed ?? 0) / CONFIG.onFoot.runSpeed
  );

  rig.animTime += dt * (5 + speedNorm * 7);

  let legSwing = 0;
  let armSwing = 0;
  let bob = 0;

  if (state.onGround) {
    legSwing = Math.sin(rig.animTime) * 0.85 * speedNorm;
    armSwing = -legSwing * 0.8;
    bob = Math.abs(Math.sin(rig.animTime * 2)) * 0.018 * speedNorm;
  } else {
    legSwing = -0.18;
    armSwing = 0.22;
    bob = 0.02;
  }

  if (inFirstPerson) {
    legSwing = 0;
    armSwing = 0;
    bob *= 0.12;
  }

  rig.root.position.y = bob;

  const hasWeapon = weaponState.hasEquippedWeapon && !carryingPizza;
  const targetAimBlend = inFirstPerson && aiming && hasWeapon ? 1 : 0;
  rig.aimBlend = THREE.MathUtils.damp(rig.aimBlend, targetAimBlend, 16, dt);
  const muzzlePulse = weaponState.muzzlePulse ?? 0;
  const recoil = muzzlePulse * 0.26;
  const sprintFactor = THREE.MathUtils.clamp((speedNorm - 0.58) / 0.42, 0, 1);

  if (carryingPizza) {
    rig.legLeftPivot.rotation.x = legSwing * 0.72;
    rig.legRightPivot.rotation.x = -legSwing * 0.72;

    rig.armLeftPivot.rotation.x = -1.1 + bob * 0.4;
    rig.armRightPivot.rotation.x = -1.1 + bob * 0.4;
    rig.armLeftPivot.rotation.z = -0.18;
    rig.armRightPivot.rotation.z = 0.18;

    rig.pizzaBox.position.set(0, 1.26 + bob * 0.28, 0.34);
    rig.pizzaBox.rotation.y += dt * 0.8;
    rig.pizzaBox.rotation.y *= 0.92;
  } else if (hasWeapon) {
    rig.legLeftPivot.rotation.x = legSwing * 0.82;
    rig.legRightPivot.rotation.x = -legSwing * 0.82;

    const aimPose = getThirdPersonWeaponPose(
      weaponState.equippedId,
      bob,
      recoil,
      legSwing * 0.08
    );

    rig.armLeftPivot.rotation.set(aimPose.armLeftX, 0, aimPose.armLeftZ);
    rig.armRightPivot.rotation.set(aimPose.armRightX, 0, aimPose.armRightZ);

    rig.weaponHandRoot.position.set(
      aimPose.handX,
      aimPose.handY,
      aimPose.handZ
    );

    rig.weaponHandRoot.rotation.set(
      aimPose.handRotX,
      aimPose.handRotY,
      aimPose.handRotZ
    );

    if (!inFirstPerson) {
      const active = rig.thirdPersonWeapons[weaponState.equippedId];
      if (active) {
        applyThirdPersonWeaponAlignment(active, weaponState.equippedId);
        active.group.visible = true;
        active.flash.visible = muzzlePulse > 0.08;
        active.flash.scale.setScalar(1 + muzzlePulse * 1.16);
      }
    } else {
      const active = rig.firstPersonWeapons[weaponState.equippedId];
      if (active) {
        active.group.visible = true;
        active.flash.visible = muzzlePulse > 0.08;
        active.flash.scale.setScalar(1 + muzzlePulse * 1.5);

        const fpPose = getFirstPersonWeaponPose(
          weaponState.equippedId,
          bob,
          recoil
        );
        const swayStrength =
          (0.006 + speedNorm * 0.01 + sprintFactor * 0.012) *
          (1 - rig.aimBlend * 0.78);
        const swayX = Math.sin(rig.animTime * 0.92) * swayStrength * 0.55;
        const swayY = Math.abs(Math.sin(rig.animTime * 1.84)) * swayStrength * (1.2 + sprintFactor * 0.5);
        const swayRotZ = Math.sin(rig.animTime * 0.92) * swayStrength * 0.9;
        const swayRotX = Math.abs(Math.sin(rig.animTime * 1.84)) * swayStrength * 0.42;

        rig.firstPersonWeaponRoot.position.set(
          THREE.MathUtils.lerp(fpPose.rootX + swayX, -0.32, rig.aimBlend),
          THREE.MathUtils.lerp(fpPose.rootY + swayY, -0.255, rig.aimBlend),
          THREE.MathUtils.lerp(fpPose.rootZ, 0.44, rig.aimBlend)
        );

        rig.firstPersonWeaponRoot.rotation.set(
          fpPose.rotX - swayRotX - rig.aimBlend * 0.045,
          THREE.MathUtils.lerp(fpPose.rotY, 0.012, rig.aimBlend),
          THREE.MathUtils.lerp(fpPose.rotZ + swayRotZ, -0.004, rig.aimBlend)
        );
      }
    }
  } else {
    rig.legLeftPivot.rotation.x = legSwing;
    rig.legRightPivot.rotation.x = -legSwing;

    rig.armLeftPivot.rotation.x = armSwing;
    rig.armRightPivot.rotation.x = -armSwing;
    rig.armLeftPivot.rotation.z = 0;
    rig.armRightPivot.rotation.z = 0;
  }

  if (!inFirstPerson) {
    rig.shadow.scale.setScalar(1 - Math.min(0.32, (state.jumpOffset ?? 0) * 0.22));
    rig.shadow.material.opacity = THREE.MathUtils.lerp(
      0.2,
      0.06,
      Math.min(1, (state.jumpOffset ?? 0) * 0.7)
    );
  }
}
