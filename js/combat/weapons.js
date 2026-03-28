const WEAPON_CATALOG = [
  {
    id: "pistol",
    label: "Pistola 9mm",
    shortLabel: "Pistola",
    price: 60,
    starterAmmo: 18,
    ammoPack: 24,
    ammoPrice: 18,
    fireInterval: 0.24,
    range: 170,
    hitRadius: 0.9,
    automatic: false,
    visualTracerLength: 8.5,
    visualTracerThickness: 0.022,
    visualTracerColor: 0xffefb0,
    visualTracerLife: 0.05
  },
  {
    id: "shotgun",
    label: "Escopeta táctica",
    shortLabel: "Escopeta",
    price: 140,
    starterAmmo: 12,
    ammoPack: 16,
    ammoPrice: 28,
    fireInterval: 0.62,
    range: 88,
    hitRadius: 1.6,
    automatic: false,
    visualTracerLength: 6.8,
    visualTracerThickness: 0.034,
    visualTracerColor: 0xffd38a,
    visualTracerLife: 0.06
  },
  {
    id: "rifle",
    label: "Rifle de asalto",
    shortLabel: "Rifle",
    price: 220,
    starterAmmo: 30,
    ammoPack: 36,
    ammoPrice: 42,
    fireInterval: 0.1,
    range: 240,
    hitRadius: 0.95,
    automatic: true,
    visualTracerLength: 10.5,
    visualTracerThickness: 0.018,
    visualTracerColor: 0xfff6cb,
    visualTracerLife: 0.04
  }
];

const CATALOG_BY_ID = new Map(WEAPON_CATALOG.map((w) => [w.id, w]));

function clampIndex(index, length) {
  if (length <= 0) return 0;
  return (index % length + length) % length;
}

export function createWeaponController() {
  const inventory = {};
  for (const weapon of WEAPON_CATALOG) {
    inventory[weapon.id] = {
      owned: false,
      ammo: 0
    };
  }

  const shopItems = [];
  for (const weapon of WEAPON_CATALOG) {
    shopItems.push({
      kind: "weapon",
      weaponId: weapon.id
    });
    shopItems.push({
      kind: "ammo",
      weaponId: weapon.id
    });
  }

  let equippedId = null;
  let shopIndex = 0;
  let cooldown = 0;
  let muzzlePulse = 0;

  let fireHeld = false;
  let fireJustPressed = false;
  let prevFireHeld = false;

  let prevShopPrev = false;
  let prevShopNext = false;
  let prevSelect1 = false;
  let prevSelect2 = false;
  let prevSelect3 = false;
  let holstered = false;

  function getOwnedWeaponIds() {
    return WEAPON_CATALOG
      .filter((weapon) => inventory[weapon.id].owned)
      .map((weapon) => weapon.id);
  }

  function ensureEquippedWeaponValid() {
    if (holstered) {
      if (!equippedId || !inventory[equippedId]?.owned) {
        equippedId = null;
      }
      return;
    }

    if (equippedId && inventory[equippedId]?.owned) return;

    const owned = getOwnedWeaponIds();
    equippedId = owned[0] ?? null;
  }

  function equipWeapon(weaponId) {
    if (!inventory[weaponId]?.owned) return false;
    holstered = false;
    equippedId = weaponId;
    return true;
  }

  function grantWeapon(weaponId, ammo = null, { equip = false } = {}) {
    const weapon = CATALOG_BY_ID.get(weaponId);
    if (!weapon || !inventory[weaponId]) return false;

    inventory[weaponId].owned = true;
    inventory[weaponId].ammo = ammo ?? weapon.starterAmmo;

    if (equip) {
      holstered = false;
      equippedId = weaponId;
    }

    return true;
  }

  function holsterWeapon() {
    holstered = true;
    equippedId = null;
  }

  function cycleOwnedWeapons(direction) {
    const owned = getOwnedWeaponIds();
    if (!owned.length) {
      equippedId = null;
      return;
    }

    const currentIndex = Math.max(0, owned.indexOf(equippedId));
    equippedId = owned[clampIndex(currentIndex + direction, owned.length)];
  }

  function getShopItem() {
    return shopItems[shopIndex] ?? shopItems[0];
  }

  function getShopItemPresentation() {
    const item = getShopItem();
    const weapon = CATALOG_BY_ID.get(item.weaponId);

    if (!item || !weapon) {
      return {
        label: "Sin producto",
        price: 0
      };
    }

    if (item.kind === "weapon") {
      return {
        item,
        weapon,
        label: weapon.label,
        price: weapon.price
      };
    }

    return {
      item,
      weapon,
      label: `Munición ${weapon.shortLabel} +${weapon.ammoPack}`,
      price: weapon.ammoPrice
    };
  }

  function update(dt, input, { playerMode = "walking", inShop = false } = {}) {
    cooldown = Math.max(0, cooldown - dt);
    muzzlePulse = Math.max(0, muzzlePulse - dt * 7.5);

    const shopPrevHeld = !!input.shopPrev;
    const shopNextHeld = !!input.shopNext;
    const shopPrevJust = shopPrevHeld && !prevShopPrev;
    const shopNextJust = shopNextHeld && !prevShopNext;

    if (playerMode === "walking") {
      if (inShop) {
        if (shopPrevJust) {
          shopIndex = clampIndex(shopIndex - 1, shopItems.length);
        }
        if (shopNextJust) {
          shopIndex = clampIndex(shopIndex + 1, shopItems.length);
        }
      }
    }

    fireHeld = !!input.fire;
    fireJustPressed = fireHeld && !prevFireHeld;

    prevFireHeld = fireHeld;
    prevShopPrev = shopPrevHeld;
    prevShopNext = shopNextHeld;
    prevSelect1 = !!input.selectWeapon1;
    prevSelect2 = !!input.selectWeapon2;
    prevSelect3 = !!input.selectWeapon3;

    ensureEquippedWeaponValid();
  }

  function tryBuy(money) {
    const presentation = getShopItemPresentation();
    const { item, weapon } = presentation;

    if (!item || !weapon) {
      return {
        success: false,
        money
      };
    }

    if (item.kind === "weapon") {
      if (inventory[weapon.id].owned) {
        return {
          success: false,
          money
        };
      }

      if (money < weapon.price) {
        return {
          success: false,
          money
        };
      }

      inventory[weapon.id].owned = true;
      inventory[weapon.id].ammo += weapon.starterAmmo;
      holstered = false;
      equippedId = weapon.id;

      return {
        success: true,
        money: money - weapon.price
      };
    }

    if (!inventory[weapon.id].owned) {
      return {
        success: false,
        money
      };
    }

    if (money < weapon.ammoPrice) {
      return {
        success: false,
        money
      };
    }

    inventory[weapon.id].ammo += weapon.ammoPack;

    return {
      success: true,
      money: money - weapon.ammoPrice
    };
  }

  function tryFire({
    playerMode = "walking",
    blocked = false
  } = {}) {
    if (playerMode !== "walking") return null;
    if (blocked) return null;
    if (!equippedId) return null;

    const weapon = CATALOG_BY_ID.get(equippedId);
    const ammoState = inventory[equippedId];

    if (!weapon || !ammoState || !ammoState.owned) return null;
    if (ammoState.ammo <= 0) return null;

    const wantsToFire = weapon.automatic ? fireHeld : fireJustPressed;
    if (!wantsToFire) return null;
    if (cooldown > 0) return null;

    ammoState.ammo -= 1;
    cooldown = weapon.fireInterval;
    muzzlePulse = 1;

    return {
      weaponId: weapon.id,
      label: weapon.label,
      shortLabel: weapon.shortLabel,
      range: weapon.range,
      hitRadius: weapon.hitRadius,
      visualTracerLength: weapon.visualTracerLength,
      visualTracerThickness: weapon.visualTracerThickness,
      visualTracerColor: weapon.visualTracerColor,
      visualTracerLife: weapon.visualTracerLife
    };
  }

  function getShopPrompt(money) {
    const presentation = getShopItemPresentation();
    const { item, weapon, label, price } = presentation;

    if (!item || !weapon) {
      return "Armería Atlas";
    }

    if (item.kind === "weapon") {
      if (inventory[weapon.id].owned) {
        return `Armería Atlas · ${label} ya comprada · [Q/F] cambiar`;
      }

      const prefix = money >= price ? "[E] Comprar" : "Falta dinero para";
      return `Armería Atlas · [Q/F] cambiar · ${prefix} ${label} · $${price}`;
    }

    if (!inventory[weapon.id].owned) {
      return `Armería Atlas · Compra antes ${weapon.shortLabel} · [Q/F] cambiar`;
    }

    const prefix = money >= price ? "[E] Comprar" : "Falta dinero para";
    return `Armería Atlas · [Q/F] cambiar · ${prefix} ${label} · $${price}`;
  }

  function getHUDState(inShop = false) {
    const equippedWeapon = equippedId ? CATALOG_BY_ID.get(equippedId) : null;
    const ammo = equippedId ? inventory[equippedId].ammo : 0;
    const ownedCount = getOwnedWeaponIds().length;
    const shopPresentation = getShopItemPresentation();

    return {
      hasEquippedWeapon: !!equippedWeapon,
      equippedId,
      equippedLabel: equippedWeapon?.label ?? "Sin arma",
      equippedShortLabel: equippedWeapon?.shortLabel ?? "Sin arma",
      ammo,
      ownedCount,
      muzzlePulse,
      inShop,
      selectedShopLabel: shopPresentation.label,
      selectedShopPrice: shopPresentation.price
    };
  }

  function getInventoryEntries() {
    return WEAPON_CATALOG
      .filter((weapon) => inventory[weapon.id].owned)
      .map((weapon) => ({
        id: weapon.id,
        kind: "weapon",
        label: weapon.shortLabel,
        ammo: inventory[weapon.id].ammo,
        equipped: equippedId === weapon.id
      }));
  }

  function getVisualState() {
    return {
      equippedId,
      hasEquippedWeapon: !!equippedId && !holstered,
      muzzlePulse
    };
  }

  function reset() {
    for (const weapon of WEAPON_CATALOG) {
      inventory[weapon.id].owned = false;
      inventory[weapon.id].ammo = 0;
    }

    equippedId = null;
    holstered = false;
    shopIndex = 0;
    cooldown = 0;
    muzzlePulse = 0;

    fireHeld = false;
    fireJustPressed = false;
    prevFireHeld = false;

    prevShopPrev = false;
    prevShopNext = false;
    prevSelect1 = false;
    prevSelect2 = false;
    prevSelect3 = false;
  }

  return {
    reset,
    update,
    tryBuy,
    tryFire,
    grantWeapon,
    equipWeapon,
    holsterWeapon,
    getShopPrompt,
    getHUDState,
    getVisualState,
    getInventoryEntries
  };
}
