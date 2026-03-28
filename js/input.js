export function createInput() {
  const input = {
    left: false,
    right: false,
    accelerate: false,
    brake: false,
    handbrake: false,
    restart: false,
    interact: false,
    toggleNight: false,
    toggleFirstPerson: false,
    togglePhone: false,
    toggleRoadDriverMenu: false,
    toggleSettings: false,
    jump: false,
    sprint: false,
    debugDamage: false,
    horn: false,

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
  };

  const keyMap = {
    ArrowLeft: "left",
    KeyA: "left",
    ArrowRight: "right",
    KeyD: "right",
    ArrowUp: "accelerate",
    KeyW: "accelerate",
    KeyZ: "accelerate",
    ArrowDown: "brake",
    KeyS: "brake",
    KeyR: "restart",
    KeyE: "interact",
    Enter: "interact",
    ShiftLeft: "sprint",
    ShiftRight: "sprint",
    KeyC: "crouch",
    KeyQ: "shopPrev",
    KeyF: "shopNext",
    Digit1: "selectWeapon1",
    Digit2: "selectWeapon2",
    Digit3: "selectWeapon3",
    Digit4: "selectWeapon4",
    Digit5: "selectWeapon5",
    KeyX: "fire"
  };

  function isTypingTarget(target) {
    if (!target) return false;
    const tagName = target.tagName?.toLowerCase?.();
    if (!tagName) return false;
    if (tagName === "input" || tagName === "textarea" || tagName === "select") {
      return true;
    }
    return !!target.isContentEditable;
  }

  function pulse(action) {
    input[action] = true;
    setTimeout(() => {
      input[action] = false;
    }, 0);
  }

  function setKey(code, value) {
    if (code === "Space") {
      input.handbrake = value;
      input.jump = value;
      return;
    }

    const action = keyMap[code];
    if (!action) return;
    input[action] = value;
  }

  window.addEventListener("keydown", (event) => {
    if (isTypingTarget(event.target)) return;

    if (event.code === "Tab") {
      event.preventDefault();
      if (!event.repeat) {
        input.toggleRoadDriverMenu = true;
      }
      return;
    }

    if (event.code === "Escape") {
      event.preventDefault();
      if (!event.repeat) {
        input.toggleSettings = true;
      }
      return;
    }

    if (event.key === "¡") {
      if (!event.repeat) {
        pulse("debugDamage");
      }
      return;
    }

    if (event.code === "KeyN") {
      if (!event.repeat) {
        input.toggleNight = true;
      }
      return;
    }

    if (event.code === "KeyV") {
      if (!event.repeat) {
        input.toggleFirstPerson = true;
      }
      return;
    }

    if (event.code === "KeyH") {
      if (!event.repeat) {
        input.horn = true;
      }
      return;
    }

    if (event.code === "KeyP") {
      if (!event.repeat) {
        input.togglePhone = true;
      }
      return;
    }

    if (event.code === "KeyI") {
      if (!event.repeat) {
        input.toggleInventory = true;
      }
      return;
    }

    setKey(event.code, true);
  });

  window.addEventListener("keyup", (event) => {
    if (
      event.code === "KeyN" ||
      event.code === "KeyV" ||
      event.code === "KeyI" ||
      event.code === "KeyP" ||
      event.code === "KeyH" ||
      event.code === "Tab" ||
      event.code === "Escape"
    ) return;

    setKey(event.code, false);
  });

  window.addEventListener("mousedown", (event) => {
    if (isTypingTarget(event.target)) return;
    if (event.button === 0) {
      input.fire = true;
    } else if (event.button === 2) {
      input.aim = true;
    }
  });

  window.addEventListener("mouseup", (event) => {
    if (event.button === 0) {
      input.fire = false;
    } else if (event.button === 2) {
      input.aim = false;
    }
  });

  window.addEventListener("contextmenu", (event) => {
    if (isTypingTarget(event.target)) return;
    event.preventDefault();
  });

  window.addEventListener("wheel", (event) => {
    if (isTypingTarget(event.target)) return;
    if (Math.abs(event.deltaY) < 0.01) return;
    if (event.deltaY > 0) {
      pulse("shopNext");
    } else {
      pulse("shopPrev");
    }
  }, { passive: true });

  window.addEventListener("blur", () => {
    for (const key of Object.keys(input)) {
      if (
        key === "toggleNight" ||
        key === "toggleFirstPerson" ||
        key === "togglePhone" ||
        key === "toggleInventory" ||
        key === "toggleRoadDriverMenu" ||
        key === "toggleSettings"
      ) {
        continue;
      }

      input[key] = false;
    }
  });

  document.addEventListener("pointerlockchange", () => {
    if (!document.pointerLockElement) {
      input.fire = false;
      input.aim = false;
    }
  });

  return input;
}
