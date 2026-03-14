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
      moveX: state.moveX,
      moveZ: state.moveZ
    };
  }

  function update(input, dt, extraColliders = []) {
    const inputForward = (input.accelerate ? 1 : 0) + (input.brake ? -1 : 0);
    const inputRight = (input.right ? 1 : 0) + (input.left ? -1 : 0);

    const forwardX = Math.sin(state.heading);
    const forwardZ = -Math.cos(state.heading);
    const rightX = Math.cos(state.heading);
    const rightZ = Math.sin(state.heading);

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

    const targetSpeed = isMoving
      ? (input.sprint ? CONFIG.onFoot.runSpeed : CONFIG.onFoot.walkSpeed)
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

    if (isMoving) {
      const targetHeading = Math.atan2(moveX, -moveZ);
      const delta = normalizeAngle(targetHeading - state.heading);

      state.heading = normalizeAngle(
        state.heading + delta * Math.min(1, CONFIG.onFoot.turnSpeed * dt)
      );
    }

    const jumpPressed = !!input.jump;
    const jumpJustPressed = jumpPressed && !state.prevJump;

    if (jumpJustPressed && state.onGround) {
      state.verticalVelocity = CONFIG.onFoot.jumpVelocity;
      state.onGround = false;
    }

    state.prevJump = jumpPressed;

    if (!state.onGround || state.jumpOffset > 0) {
      state.verticalVelocity -= CONFIG.onFoot.gravity * dt * 60;
      state.jumpOffset += state.verticalVelocity * dt * 60;

      if (state.jumpOffset <= 0) {
        state.jumpOffset = 0;
        state.verticalVelocity = 0;
        state.onGround = true;
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