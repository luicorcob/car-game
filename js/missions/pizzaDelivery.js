import { CONFIG } from "../config.js";

function randChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function createPizzaDeliveryController(world) {
  let phase = "ready";
  let currentHouseId = null;
  let deliveredCount = 0;
  let orderNumber = 0;
  let lastHouseId = null;

  function reset() {
    phase = "ready";
    currentHouseId = null;
    deliveredCount = 0;
    orderNumber = 0;
    lastHouseId = null;
    world.setActiveDeliveryHouse(null);
  }

  function chooseNextHouse() {
    const houses = world.getDeliveryHouses();
    if (!houses.length) return null;

    let pool = houses;
    if (houses.length > 1 && lastHouseId) {
      pool = houses.filter((house) => house.id !== lastHouseId);
      if (!pool.length) pool = houses;
    }

    return randChoice(pool);
  }

  function getInteraction(playerMode, playerPose) {
    if (playerMode !== "walking" || !playerPose) return null;

    if (phase === "ready") {
      if (world.isPlayerNearPizzeriaPickup(playerPose, CONFIG.pizzaDelivery.pickupRadius)) {
        return {
          type: "pickup",
          prompt: "Recoger pizza [E]"
        };
      }

      return null;
    }

    if (phase === "deliver") {
      const house = world.getNearbyActiveDeliveryHouse(
        playerPose,
        CONFIG.pizzaDelivery.deliveryRadius
      );

      if (!house || house.id !== currentHouseId) return null;

      return {
        type: "deliver",
        prompt: `Entregar pizza [E] · ${house.label}`,
        house
      };
    }

    return null;
  }

  function handleInteract(playerMode, playerPose) {
    const interaction = getInteraction(playerMode, playerPose);
    if (!interaction) {
      return { handled: false };
    }

    if (interaction.type === "pickup") {
      const target = chooseNextHouse();
      if (!target) return { handled: false };

      phase = "deliver";
      currentHouseId = target.id;
      orderNumber += 1;
      world.setActiveDeliveryHouse(target.id);

      return {
        handled: true,
        type: "pickup",
        targetHouseId: target.id,
        targetHouseLabel: target.label
      };
    }

    if (interaction.type === "deliver") {
      const deliveredHouse = interaction.house;

      phase = "ready";
      currentHouseId = null;
      deliveredCount += 1;
      lastHouseId = deliveredHouse.id;
      world.setActiveDeliveryHouse(null);

      return {
        handled: true,
        type: "deliver",
        rewardMoney: CONFIG.pizzaDelivery.reward,
        targetHouseLabel: deliveredHouse.label
      };
    }

    return { handled: false };
  }

  function getState() {
    const target = currentHouseId
      ? world.getDeliveryHouseById(currentHouseId)
      : null;

    return {
      phase,
      carryingPizza: phase === "deliver",
      deliveredCount,
      orderNumber,
      targetHouseId: target?.id ?? null,
      targetHouseLabel: target?.label ?? "",
      targetPoint: target?.doorPoint ? { ...target.doorPoint } : null,
      title:
        phase === "deliver"
          ? "Reparto activo"
          : "Pizzería Vesuvio",
      objective:
        phase === "deliver"
          ? `Entrega la pizza en ${target?.label ?? "la casa objetivo"}`
          : "Entra en la pizzería y recoge un pedido en la barra",
      shortStatus:
        phase === "deliver"
          ? `Pedido #${orderNumber}`
          : "Sin pedido"
    };
  }

  return {
    reset,
    getInteraction,
    handleInteract,
    getState
  };
}