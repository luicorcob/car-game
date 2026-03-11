export function createInput() {
  const input = {
    left: false,
    right: false,
    accelerate: false,
    brake: false,
    restart: false,
    interact: false,
    toggleNight: false
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
    Enter: "interact"
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

    setKey(event.code, true);
  });

  window.addEventListener("keyup", (event) => {
    if (event.code === "KeyN") return;
    setKey(event.code, false);
  });

  return input;
}