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

export function createCameraController(camera, lookTarget) {
  let firstPerson = false;

  function togglePerspective() {
    firstPerson = !firstPerson;
    return firstPerson;
  }

  function isFirstPerson() {
    return firstPerson;
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
      ? (state.isRefueling
          ? CONFIG.camera.serviceSideOffsetRefuel
          : CONFIG.camera.serviceSideOffset)
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
    if (state.playerMode === "driving") {
      const pose = getPlayerCarFirstPersonCameraPose(
        playerCar,
        CONFIG.camera.drivingFirstPersonLookDistance
      );

      if (pose) {
        return {
          cameraX: pose.position.x,
          cameraY: pose.position.y,
          cameraZ: pose.position.z,

          lookX: pose.lookAt.x,
          lookY: pose.lookAt.y,
          lookZ: pose.lookAt.z,

          firstPerson: true
        };
      }
    }

    if (state.playerMode === "walking" && state.characterState?.visible) {
      const pose = getPlayerCharacterFirstPersonCameraPose(
        playerCharacter,
        CONFIG.camera.walkingFirstPersonLookDistance
      );

      if (pose) {
        return {
          cameraX: pose.position.x,
          cameraY: pose.position.y,
          cameraZ: pose.position.z,

          lookX: pose.lookAt.x,
          lookY: pose.lookAt.y,
          lookZ: pose.lookAt.z,

          firstPerson: true
        };
      }
    }

    return buildThirdPersonRig(state);
  }

  function applyRig(rig, dt, instant = false) {
    if (rig.firstPerson) {
      camera.position.set(rig.cameraX, rig.cameraY, rig.cameraZ);
      lookTarget.set(rig.lookX, rig.lookY, rig.lookZ);
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

  return {
    togglePerspective,
    isFirstPerson,
    update
  };
}