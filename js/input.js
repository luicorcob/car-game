export function createInput() {
  const input = {
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
  };

  const keyMap = {
    ArrowLeft: "left",
    KeyA: "left",
    ArrowRight: "right",
    KeyD: "right",
    ArrowUp: "accelerate",
    KeyW: "accelerate",
    ArrowDown: "brake",
    KeyS: "brake",
    KeyR: "restart",
    KeyE: "interact",
    Enter: "interact",
    Space: "jump",
    ShiftLeft: "sprint",
    ShiftRight: "sprint",

    KeyQ: "shopPrev",
    KeyF: "shopNext",
    Digit1: "selectWeapon1",
    Digit2: "selectWeapon2",
    Digit3: "selectWeapon3",
    KeyX: "fire"
  };

  function setKey(code, value) {
    const action = keyMap[code];
    if (!action) return;
    input[action] = value;
  }

  window.addEventListener("keydown", (event) => {
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

    setKey(event.code, true);
  });

  window.addEventListener("keyup", (event) => {
    if (event.code === "KeyN" || event.code === "KeyV") return;
    setKey(event.code, false);
  });

  window.addEventListener("mousedown", (event) => {
    if (event.button === 0) {
      input.fire = true;
    }
  });

  window.addEventListener("mouseup", (event) => {
    if (event.button === 0) {
      input.fire = false;
    }
  });

  window.addEventListener("blur", () => {
    for (const key of Object.keys(input)) {
      if (key === "toggleNight" || key === "toggleFirstPerson") continue;
      input[key] = false;
    }
  });

  return input;
}