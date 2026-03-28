import * as THREE from "three";
import { CONFIG } from "./config.js";
import {
  getPlayerCarFirstPersonCameraPose,
  setPlayerCarViewMode
} from "./car.js";
import {
  getPlayerCharacterFirstPersonCameraPose,
  setPlayerCharacterFirstPerson
} from "./player/characterVisual.js";

export function createCameraController(camera, lookTarget, options = {}) {
  let firstPerson = false;
  let firstPersonMode = "walking";
  let fpModeSwitchCooldown = 0;
  let idleLookTime = 0;
  let lastState = null;

  const domElement = options.domElement ?? document.body;
  const usePointerLock = options.usePointerLock ?? true;
  let firstPersonSensitivity =
    options.firstPersonSensitivity ?? CONFIG.camera.mouseSensitivityFirstPerson ?? 0.0022;
  let thirdPersonTurnSensitivity =
    options.thirdPersonTurnSensitivity ?? CONFIG.camera.thirdPersonTurnSensitivity ?? 1;

  const walkPitchMin =
    options.walkPitchMin ?? CONFIG.camera.walkPitchMin ?? THREE.MathUtils.degToRad(-70);
  const walkPitchMax =
    options.walkPitchMax ?? CONFIG.camera.walkPitchMax ?? THREE.MathUtils.degToRad(60);

  const drivePitchMin =
    options.drivePitchMin ?? CONFIG.camera.drivePitchMin ?? THREE.MathUtils.degToRad(-35);
  const drivePitchMax =
    options.drivePitchMax ?? CONFIG.camera.drivePitchMax ?? THREE.MathUtils.degToRad(35);

  const walkYawLimit =
    options.walkYawLimit ?? CONFIG.camera.walkYawLimit ?? null;
  const driveYawLimit =
    options.driveYawLimit ?? CONFIG.camera.driveYawLimit ?? THREE.MathUtils.degToRad(60);

  const fpLookDistance =
    options.fpLookDistance ?? CONFIG.camera.firstPersonLookDistance ?? 10;
  const firstPersonRecenteringSpeed =
    options.firstPersonRecenteringSpeed ?? CONFIG.camera.firstPersonRecenteringSpeed ?? 2.4;
  const firstPersonRecenteringDelay =
    options.firstPersonRecenteringDelay ?? CONFIG.camera.firstPersonRecenteringDelay ?? 0.32;
  const firstPersonMouseDeadzone =
    options.firstPersonMouseDeadzone ?? CONFIG.camera.firstPersonMouseDeadzone ?? 0.00002;
  const firstPersonToggleCooldown =
    options.firstPersonToggleCooldown ?? CONFIG.camera.firstPersonToggleCooldown ?? 0.12;

  let pointerLocked = false;
  let pointerLockBlocked = false;
  let mouseYaw = 0;
  let mousePitch = 0;

  const tempDirection = new THREE.Vector3();
  const tempForward = new THREE.Vector3();
  const tempPose = new THREE.Vector3();
  const tempLook = new THREE.Vector3();
  const tempAimDirection = new THREE.Vector3();

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function getModeYawLimit(playerMode) {
    return playerMode === "driving" ? driveYawLimit : walkYawLimit;
  }

  function getModePitchLimits(playerMode) {
    if (playerMode === "driving") {
      return { min: drivePitchMin, max: drivePitchMax };
    }
    return { min: walkPitchMin, max: walkPitchMax };
  }

  function normalizeAngle(angle) {
    let a = angle;
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function setPointerLocked(value) {
    pointerLocked = value;
  }

  function onPointerLockChange() {
    setPointerLocked(document.pointerLockElement === domElement);
  }

  function isInteractiveElement(target) {
    return !!target?.closest?.("input, select, button, textarea, label");
  }

  function onMouseMove(event) {
    if (!firstPerson) return;
    if (pointerLockBlocked) return;
    if (usePointerLock && !pointerLocked) return;

    const yawDelta = event.movementX * firstPersonSensitivity;
    const pitchDelta = -event.movementY * firstPersonSensitivity;

    if (
      Math.abs(yawDelta) < firstPersonMouseDeadzone &&
      Math.abs(pitchDelta) < firstPersonMouseDeadzone
    ) {
      return;
    }

    idleLookTime = 0;
    mouseYaw += yawDelta;
    mousePitch += pitchDelta;

    const currentMode = lastState?.playerMode ?? "walking";
    const { min, max } = getModePitchLimits(currentMode);
    const yawLimit = getModeYawLimit(currentMode);

    mousePitch = clamp(mousePitch, min, max);

    if (currentMode === "driving" && typeof yawLimit === "number") {
      mouseYaw = clamp(mouseYaw, -yawLimit, yawLimit);
    } else {
      mouseYaw = normalizeAngle(mouseYaw);
    }
  }

  function onMouseDown(event) {
    if (isInteractiveElement(event.target)) return;
    if (!firstPerson || !usePointerLock) return;
    if (pointerLockBlocked) return;
    if (document.pointerLockElement !== domElement) {
      domElement.requestPointerLock?.();
    }
  }

  function bindMouseControls() {
    document.addEventListener("pointerlockchange", onPointerLockChange);
    document.addEventListener("mousemove", onMouseMove);
    domElement.addEventListener("mousedown", onMouseDown);
  }

  function unbindMouseControls() {
    document.removeEventListener("pointerlockchange", onPointerLockChange);
    document.removeEventListener("mousemove", onMouseMove);
    domElement.removeEventListener("mousedown", onMouseDown);
  }

  function resetFirstPersonLook() {
    mouseYaw = 0;
    mousePitch = 0;
    idleLookTime = 0;
  }

  function seedFirstPersonLookFromCamera(state) {
    const poseHeading = state?.playerPose?.heading ?? 0;
    const mode = state?.playerMode ?? "walking";

    camera.getWorldDirection(tempForward);
    const viewYaw = Math.atan2(tempForward.x, -tempForward.z);
    const viewPitch = Math.asin(clamp(tempForward.y, -1, 1));

    if (mode === "driving") {
      mouseYaw = normalizeAngle(viewYaw - poseHeading);
    } else {
      mouseYaw = normalizeAngle(viewYaw);
    }
    mousePitch = viewPitch;

    const yawLimit = getModeYawLimit(mode);
    const pitchLimits = getModePitchLimits(mode);

    if (mode === "driving" && typeof yawLimit === "number") {
      mouseYaw = clamp(mouseYaw, -yawLimit, yawLimit);
    }
    mousePitch = clamp(mousePitch, pitchLimits.min, pitchLimits.max);

    idleLookTime = 0;
  }

  function enterFirstPerson() {
    if (fpModeSwitchCooldown > 0) {
      return firstPerson;
    }

    firstPerson = true;
    fpModeSwitchCooldown = firstPersonToggleCooldown;
    seedFirstPersonLookFromCamera(lastState);
    return firstPerson;
  }

  function exitFirstPerson() {
    if (fpModeSwitchCooldown > 0) {
      return firstPerson;
    }

    firstPerson = false;
    fpModeSwitchCooldown = firstPersonToggleCooldown;
    setPointerLocked(false);

    if (document.pointerLockElement === domElement) {
      document.exitPointerLock?.();
    }

    return firstPerson;
  }

  function togglePerspective() {
    if (firstPerson) {
      return exitFirstPerson();
    }
    return enterFirstPerson();
  }

  function setFirstPerson(enabled) {
    if (enabled) return enterFirstPerson();
    return exitFirstPerson();
  }

  function isFirstPerson() {
    return firstPerson;
  }

  function setPointerLockBlocked(blocked) {
    pointerLockBlocked = !!blocked;

    if (pointerLockBlocked) {
      setPointerLocked(false);
      if (document.pointerLockElement === domElement) {
        document.exitPointerLock?.();
      }
    }
  }

  function buildThirdPersonRig(state) {
    const heading = state.playerPose.heading;

    if (state.playerMode === "walking") {
      const backX = -Math.sin(heading) * CONFIG.camera.walkFollowDistance;
      const backZ = Math.cos(heading) * CONFIG.camera.walkFollowDistance;

      const sideX = Math.cos(heading) * CONFIG.camera.walkSideOffset;
      const sideZ = Math.sin(heading) * CONFIG.camera.walkSideOffset;

      return {
        cameraX: state.playerPose.x + backX + sideX,
        cameraY: CONFIG.camera.walkHeight + (state.characterState?.jumpOffset ?? 0) * 0.18,
        cameraZ: state.playerPose.z + backZ + sideZ,

        lookX: state.playerPose.x + Math.sin(heading) * CONFIG.camera.walkLookAhead,
        lookY: CONFIG.camera.walkLookHeight + (state.characterState?.jumpOffset ?? 0) * 0.35,
        lookZ: state.playerPose.z - Math.cos(heading) * CONFIG.camera.walkLookAhead,

        firstPerson: false
      };
    }

    const inService = !!state.inGasStation;

    const followDistance = inService
      ? CONFIG.camera.serviceFollowDistance
      : CONFIG.camera.followDistance;

    const height = inService
      ? CONFIG.camera.serviceHeight
      : CONFIG.camera.height;

    const lookAhead = inService
      ? CONFIG.camera.serviceLookAhead
      : CONFIG.camera.lookAhead;

    const lookHeight = inService
      ? CONFIG.camera.serviceLookHeight
      : CONFIG.camera.lookHeight;

    const sideOffset = inService
      ? state.isRefueling
        ? CONFIG.camera.serviceSideOffsetRefuel
        : CONFIG.camera.serviceSideOffset
      : 0;

    const backX = -Math.sin(heading) * followDistance;
    const backZ = Math.cos(heading) * followDistance;

    const sideX = Math.cos(heading) * sideOffset;
    const sideZ = Math.sin(heading) * sideOffset;

    return {
      cameraX: state.playerPose.x + backX + sideX,
      cameraY: height,
      cameraZ: state.playerPose.z + backZ + sideZ,

      lookX: state.playerPose.x + Math.sin(heading) * lookAhead,
      lookY: lookHeight,
      lookZ: state.playerPose.z - Math.cos(heading) * lookAhead,

      firstPerson: false
    };
  }

  function buildFirstPersonRig(state, playerCar, playerCharacter) {
    let pose = null;

    if (state.playerMode === "driving") {
      pose = getPlayerCarFirstPersonCameraPose(
        playerCar,
        CONFIG.camera.drivingFirstPersonLookDistance
      );
    } else if (state.playerMode === "walking" && state.characterState?.visible) {
      pose = getPlayerCharacterFirstPersonCameraPose(
        playerCharacter,
        CONFIG.camera.walkingFirstPersonLookDistance
      );
    }

    if (!pose) {
      return buildThirdPersonRig(state);
    }

    const baseHeading = state.playerPose?.heading ?? 0;
    const yawLimit = getModeYawLimit(state.playerMode);
    const { min, max } = getModePitchLimits(state.playerMode);

    let localYaw = mouseYaw;
    let localPitch = mousePitch;

    if (typeof yawLimit === "number") {
      localYaw = clamp(localYaw, -yawLimit, yawLimit);
    }
    localPitch = clamp(localPitch, min, max);

    const finalYaw = state.playerMode === "driving"
      ? normalizeAngle(baseHeading + localYaw)
      : normalizeAngle(localYaw);

    tempDirection.set(
      Math.sin(finalYaw) * Math.cos(localPitch),
      Math.sin(localPitch),
      -Math.cos(finalYaw) * Math.cos(localPitch)
    );

    const distance =
      state.playerMode === "driving"
        ? CONFIG.camera.drivingFirstPersonLookDistance ?? fpLookDistance
        : CONFIG.camera.walkingFirstPersonLookDistance ?? fpLookDistance;

    tempPose.set(
      pose.position.x,
      pose.position.y,
      pose.position.z
    );
    tempLook.copy(tempPose).addScaledVector(tempDirection, distance);

    return {
      cameraX: tempPose.x,
      cameraY: tempPose.y,
      cameraZ: tempPose.z,

      lookX: tempLook.x,
      lookY: tempLook.y,
      lookZ: tempLook.z,

      firstPerson: true
    };
  }

  function applyRig(rig, dt, instant = false) {
    if (rig.firstPerson) {
      const snapWalkingFirstPerson = false;
      const subtleWalkingFirstPerson =
        firstPersonMode === "walking";
      const firstPersonPositionDamping =
        firstPersonMode === "driving"
          ? (CONFIG.camera.firstPersonPositionDampingDriving ?? CONFIG.camera.firstPersonPositionDamping ?? 14)
          : (subtleWalkingFirstPerson
              ? 40
              : (CONFIG.camera.firstPersonPositionDampingWalking ?? CONFIG.camera.firstPersonPositionDamping ?? 14));

      const firstPersonLookDamping =
        firstPersonMode === "driving"
          ? (CONFIG.camera.firstPersonLookDampingDriving ?? CONFIG.camera.firstPersonLookDamping ?? 10)
          : (subtleWalkingFirstPerson
              ? 36
              : (CONFIG.camera.firstPersonLookDampingWalking ?? CONFIG.camera.firstPersonLookDamping ?? 10));

      if (instant || snapWalkingFirstPerson) {
        camera.position.set(rig.cameraX, rig.cameraY, rig.cameraZ);
        lookTarget.set(rig.lookX, rig.lookY, rig.lookZ);
        camera.lookAt(lookTarget);
        return;
      }

      camera.position.x = THREE.MathUtils.damp(
        camera.position.x,
        rig.cameraX,
        firstPersonPositionDamping,
        dt
      );

      camera.position.y = THREE.MathUtils.damp(
        camera.position.y,
        rig.cameraY,
        firstPersonPositionDamping,
        dt
      );

      camera.position.z = THREE.MathUtils.damp(
        camera.position.z,
        rig.cameraZ,
        firstPersonPositionDamping,
        dt
      );

      lookTarget.x = THREE.MathUtils.damp(
        lookTarget.x,
        rig.lookX,
        firstPersonLookDamping,
        dt
      );

      lookTarget.y = THREE.MathUtils.damp(
        lookTarget.y,
        rig.lookY,
        firstPersonLookDamping,
        dt
      );

      lookTarget.z = THREE.MathUtils.damp(
        lookTarget.z,
        rig.lookZ,
        firstPersonLookDamping,
        dt
      );

      camera.lookAt(lookTarget);
      return;
    }

    if (instant) {
      camera.position.set(rig.cameraX, rig.cameraY, rig.cameraZ);
      lookTarget.set(rig.lookX, rig.lookY, rig.lookZ);
      camera.lookAt(lookTarget);
      return;
    }

    camera.position.x = THREE.MathUtils.damp(
      camera.position.x,
      rig.cameraX,
      CONFIG.camera.positionDamping,
      dt
    );

    camera.position.y = THREE.MathUtils.damp(
      camera.position.y,
      rig.cameraY,
      CONFIG.camera.positionDamping,
      dt
    );

    camera.position.z = THREE.MathUtils.damp(
      camera.position.z,
      rig.cameraZ,
      CONFIG.camera.positionDamping,
      dt
    );

    lookTarget.x = THREE.MathUtils.damp(
      lookTarget.x,
      rig.lookX,
      CONFIG.camera.lookDamping,
      dt
    );

    lookTarget.y = THREE.MathUtils.damp(
      lookTarget.y,
      rig.lookY,
      CONFIG.camera.lookDamping,
      dt
    );

    lookTarget.z = THREE.MathUtils.damp(
      lookTarget.z,
      rig.lookZ,
      CONFIG.camera.lookDamping,
      dt
    );

    camera.lookAt(lookTarget);
  }

  function update(state, dt, playerCar, playerCharacter, instant = false) {
    lastState = state;
    firstPersonMode = state.playerMode;
    fpModeSwitchCooldown = Math.max(0, fpModeSwitchCooldown - dt);

    if (firstPerson && state.playerMode === "driving") {
      idleLookTime += dt;
      const canRecenter = !usePointerLock || pointerLocked;

      if (canRecenter && idleLookTime >= firstPersonRecenteringDelay) {
        const t = Math.min(1, firstPersonRecenteringSpeed * dt);
        mouseYaw = THREE.MathUtils.lerp(mouseYaw, 0, t);
      }
    } else {
      idleLookTime = 0;
    }

    const enableCarFP = firstPerson && state.playerMode === "driving";
    const enableCharacterFP = firstPerson && state.playerMode === "walking";

    setPlayerCarViewMode(playerCar, {
      firstPerson: enableCarFP,
      playerMode: state.playerMode
    });

    setPlayerCharacterFirstPerson(playerCharacter, enableCharacterFP);

    const rig = firstPerson
      ? buildFirstPersonRig(state, playerCar, playerCharacter)
      : buildThirdPersonRig(state);

    applyRig(rig, dt, instant);
  }

  function getWalkingControlContext() {
    if (!firstPerson) {
      return {
        firstPerson: false,
        moveHeading: null,
        aimHeading: null,
        aimPitch: null,
        aimDirection: null,
        thirdPersonTurnSensitivity
      };
    }

    if ((lastState?.playerMode ?? "walking") !== "walking") {
      return {
        firstPerson: false,
        moveHeading: null,
        aimHeading: null,
        aimPitch: null,
        aimDirection: null,
        thirdPersonTurnSensitivity
      };
    }

    tempAimDirection.set(
      Math.sin(mouseYaw) * Math.cos(mousePitch),
      Math.sin(mousePitch),
      -Math.cos(mouseYaw) * Math.cos(mousePitch)
    ).normalize();

    return {
      firstPerson: true,
      moveHeading: normalizeAngle(mouseYaw),
      aimHeading: normalizeAngle(mouseYaw),
      aimPitch: mousePitch,
      aimDirection: {
        x: tempAimDirection.x,
        y: tempAimDirection.y,
        z: tempAimDirection.z
      },
      thirdPersonTurnSensitivity
    };
  }

  function setSettings({
    firstPersonSensitivity: fpSens,
    thirdPersonTurnSensitivity: tpTurnSens
  } = {}) {
    if (typeof fpSens === "number") {
      firstPersonSensitivity = clamp(fpSens, 0.0004, 0.01);
    }
    if (typeof tpTurnSens === "number") {
      thirdPersonTurnSensitivity = clamp(tpTurnSens, 0.25, 2.5);
    }
  }

  function getSettings() {
    return {
      firstPersonSensitivity,
      thirdPersonTurnSensitivity
    };
  }

  function dispose() {
    if (document.pointerLockElement === domElement) {
      document.exitPointerLock?.();
    }
    unbindMouseControls();
  }

  bindMouseControls();

  return {
    togglePerspective,
    setFirstPerson,
    isFirstPerson,
    setPointerLockBlocked,
    setSettings,
    getSettings,
    getWalkingControlContext,
    resetFirstPersonLook,
    update,
    dispose
  };
}
