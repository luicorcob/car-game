import { CONFIG } from "../config.js";
import { normalizeAngle } from "../world/math.js";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function createCharacterController(world) {
  const state = {
    x: 0,
    z: 0,
    heading: 0,

    planarSpeed: 0,
    verticalVelocity: 0,
    jumpOffset: 0,
    onGround: true,
    coyoteTime: 0,
    crouchBlend: 0,

    moveX: 0,
    moveZ: 0,
    prevJump: false
  };

  function setPose(x, z, heading = 0) {
    state.x = x;
    state.z = z;
    state.heading = heading;
    state.planarSpeed = 0;
    state.verticalVelocity = 0;
    state.jumpOffset = 0;
    state.onGround = true;
    state.coyoteTime = 0;
    state.crouchBlend = 0;
    state.moveX = 0;
    state.moveZ = 0;
    state.prevJump = false;
  }

  function getState() {
    return {
      x: state.x,
      z: state.z,
      heading: state.heading,
      planarSpeed: state.planarSpeed,
      jumpOffset: state.jumpOffset,
      onGround: state.onGround,
      coyoteTime: state.coyoteTime,
      crouchBlend: state.crouchBlend,
      crouching: state.crouchBlend > 0.55,
      moveX: state.moveX,
      moveZ: state.moveZ
    };
  }

  function update(input, dt, extraColliders = [], control = null) {
    const useFirstPersonMovement = !!control?.firstPerson;
    const aiming = !!control?.aiming;
    const faceAim = !!control?.faceAim;
    const crouchHeld = !!input.crouch;
    const thirdPersonTurnSensitivity =
      typeof control?.thirdPersonTurnSensitivity === "number"
        ? control.thirdPersonTurnSensitivity
        : 1;
    const aimingTurnMultiplier = !useFirstPersonMovement && aiming ? 0.55 : 1;
    const moveHeading =
      typeof control?.moveHeading === "number"
        ? control.moveHeading
        : state.heading;

    const inputForward = (input.accelerate ? 1 : 0) + (input.brake ? -1 : 0);
    const inputRight = (input.right ? 1 : 0) + (input.left ? -1 : 0);

    const forwardX = Math.sin(moveHeading);
    const forwardZ = -Math.cos(moveHeading);
    const rightX = Math.cos(moveHeading);
    const rightZ = Math.sin(moveHeading);

    let moveX = rightX * inputRight + forwardX * inputForward;
    let moveZ = rightZ * inputRight + forwardZ * inputForward;

    const moveLen = Math.hypot(moveX, moveZ);
    const isMoving = moveLen > 0.0001;

    if (isMoving) {
      moveX /= moveLen;
      moveZ /= moveLen;
    } else {
      moveX = 0;
      moveZ = 0;
    }

    state.crouchBlend = clamp(
      state.crouchBlend + (crouchHeld ? 1 : -1) * dt * 8,
      0,
      1
    );
    const crouchMoveFactor = 1 - state.crouchBlend * 0.45;
    const canSprint = !crouchHeld;
    const targetSpeed = isMoving
      ? ((input.sprint && canSprint) ? CONFIG.onFoot.runSpeed : CONFIG.onFoot.walkSpeed) *
        (aiming ? 0.42 : 1) *
        crouchMoveFactor
      : 0;

    const response = state.onGround
      ? CONFIG.onFoot.acceleration
      : CONFIG.onFoot.airControl;

    state.planarSpeed +=
      (targetSpeed - state.planarSpeed) *
      Math.min(1, response * dt);

    if (!isMoving && state.onGround) {
      state.planarSpeed *= Math.max(0, 1 - CONFIG.onFoot.drag * dt);
    }

    const desiredX = state.x + moveX * state.planarSpeed * dt * 60;
    const desiredZ = state.z + moveZ * state.planarSpeed * dt * 60;

    const resolved = world.resolveCharacterMotion(
      { x: state.x, z: state.z },
      CONFIG.onFoot.radius,
      desiredX,
      desiredZ,
      extraColliders
    );

    state.x = resolved.x;
    state.z = resolved.z;
    state.moveX = moveX;
    state.moveZ = moveZ;

    const shouldUpdateHeading = useFirstPersonMovement || isMoving || faceAim;
    if (shouldUpdateHeading) {
      const targetHeading = useFirstPersonMovement
        ? moveHeading
        : faceAim && typeof control?.faceHeading === "number"
          ? control.faceHeading
          : Math.atan2(moveX, -moveZ);
      const delta = normalizeAngle(targetHeading - state.heading);
      const turnSpeed = useFirstPersonMovement
        ? CONFIG.onFoot.turnSpeed * 2
        : faceAim
          ? CONFIG.onFoot.turnSpeed * thirdPersonTurnSensitivity * aimingTurnMultiplier * 1.2
          : CONFIG.onFoot.turnSpeed * thirdPersonTurnSensitivity * aimingTurnMultiplier;

      state.heading = normalizeAngle(
        state.heading + delta * Math.min(1, turnSpeed * dt)
      );
    }

    const jumpPressed = !!input.jump && !crouchHeld;
    const jumpJustPressed = jumpPressed && !state.prevJump;
    state.coyoteTime = state.onGround
      ? 0.08
      : Math.max(0, state.coyoteTime - dt);

    if (jumpJustPressed && (state.onGround || state.coyoteTime > 0)) {
      state.verticalVelocity = CONFIG.onFoot.jumpVelocity;
      state.onGround = false;
      state.coyoteTime = 0;
    }

    state.prevJump = jumpPressed;

    if (!state.onGround || state.jumpOffset > 0) {
      state.verticalVelocity -= CONFIG.onFoot.gravity * dt * 60;
      state.jumpOffset += state.verticalVelocity * dt * 60;

      if (state.jumpOffset <= 0) {
        state.jumpOffset = 0;
        state.verticalVelocity = 0;
        state.onGround = true;
        state.coyoteTime = 0.08;
      }
    }

    state.planarSpeed = clamp(
      state.planarSpeed,
      0,
      CONFIG.onFoot.runSpeed
    );

    return getState();
  }

  return {
    setPose,
    update,
    getState
  };
}
