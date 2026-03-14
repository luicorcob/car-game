import * as THREE from "three";

function createCanvasLabel(text, bg = "#111827", fg = "#f8fafc", accent = "#ef4444") {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = accent;
  ctx.fillRect(18, 18, 26, canvas.height - 36);

  ctx.fillStyle = fg;
  ctx.font = "bold 68px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2 + 16, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function rotateLocal(x, z, rotY) {
  const c = Math.cos(rotY);
  const s = Math.sin(rotY);
  return {
    x: x * c - z * s,
    z: x * s + z * c
  };
}

function localToWorld(center, rotY, x, z) {
  const p = rotateLocal(x, z, rotY);
  return {
    x: center.x + p.x,
    z: center.z + p.z
  };
}

function worldToLocal(center, rotY, x, z) {
  const dx = x - center.x;
  const dz = z - center.z;
  const c = Math.cos(-rotY);
  const s = Math.sin(-rotY);

  return {
    x: dx * c - dz * s,
    z: dx * s + dz * c
  };
}

function createWeaponCrate(color = 0x374151) {
  const group = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.6, 1.1),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.8
    })
  );
  base.position.y = 0.3;
  group.add(base);

  const lid = new THREE.Mesh(
    new THREE.BoxGeometry(1.68, 0.08, 1.18),
    new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.72
    })
  );
  lid.position.y = 0.64;
  group.add(lid);

  return group;
}

function createRifleProp() {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.7
  });

  const barrel = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.08, 1.1),
    bodyMat
  );
  barrel.position.z = 0.36;
  group.add(barrel);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.16, 0.72),
    bodyMat
  );
  body.position.z = -0.08;
  group.add(body);

  const stock = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.18, 0.42),
    bodyMat
  );
  stock.position.z = -0.54;
  group.add(stock);

  return group;
}

export function createWeaponShopController(scene, graph, hooks = {}) {
  const center = { x: 140, z: 56 };
  const rotY = 0;

  const dims = {
    width: 28,
    depth: 20,
    wallThickness: 0.6,
    wallHeight: 5.2,
    roofHeight: 5.55,
    doorWidth: 5.8
  };

  const reservedAreas = [];
  const roofObjects = [];
  let counterPoint = { x: center.x, z: center.z };
  let interiorBounds = null;
  let built = false;

  function registerReservedArea(x, z, radius) {
    reservedAreas.push({ x, z, radius });
  }

  function isReservedArea(x, z, padding = 0) {
    return reservedAreas.some((area) => {
      const dx = x - area.x;
      const dz = z - area.z;
      const r = area.radius + padding;
      return dx * dx + dz * dz <= r * r;
    });
  }

  function registerBoxCollider(localX, localZ, width, depth, meta = {}) {
    if (!hooks.registerBoxCollider) return;
    const worldPos = localToWorld(center, rotY, localX, localZ);
    hooks.registerBoxCollider(worldPos.x, worldPos.z, width, depth, meta);
  }

  function registerCircleCollider(localX, localZ, radius, meta = {}) {
    if (!hooks.registerCircleCollider) return;
    const worldPos = localToWorld(center, rotY, localX, localZ);
    hooks.registerCircleCollider(worldPos.x, worldPos.z, radius, meta);
  }

  function buildShell() {
    const group = new THREE.Group();
    group.position.set(center.x, 0, center.z);
    group.rotation.y = rotY;

    const lot = new THREE.Mesh(
      new THREE.BoxGeometry(36, 0.12, 38),
      new THREE.MeshStandardMaterial({
        color: 0x5f6770,
        roughness: 0.94
      })
    );
    lot.position.set(0, 0.02, 8);
    group.add(lot);

    const storefrontPad = new THREE.Mesh(
      new THREE.BoxGeometry(8.5, 0.08, 13),
      new THREE.MeshStandardMaterial({
        color: 0xcbd5e1,
        roughness: 0.72
      })
    );
    storefrontPad.position.set(0, 0.08, 10.8);
    group.add(storefrontPad);

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xd6d3d1,
      roughness: 0.88
    });

    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      roughness: 0.62
    });

    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(dims.width, dims.wallHeight, dims.wallThickness),
      wallMat
    );
    backWall.position.set(0, dims.wallHeight * 0.5, -dims.depth * 0.5);
    group.add(backWall);

    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(dims.wallThickness, dims.wallHeight, dims.depth),
      wallMat
    );
    leftWall.position.set(-dims.width * 0.5, dims.wallHeight * 0.5, 0);
    group.add(leftWall);

    const rightWall = leftWall.clone();
    rightWall.material = leftWall.material.clone();
    rightWall.position.x = dims.width * 0.5;
    group.add(rightWall);

    const frontSideWidth = (dims.width - dims.doorWidth) * 0.5;

    const frontLeft = new THREE.Mesh(
      new THREE.BoxGeometry(frontSideWidth, dims.wallHeight, dims.wallThickness),
      wallMat
    );
    frontLeft.position.set(
      -dims.width * 0.5 + frontSideWidth * 0.5,
      dims.wallHeight * 0.5,
      dims.depth * 0.5
    );
    group.add(frontLeft);

    const frontRight = frontLeft.clone();
    frontRight.material = frontLeft.material.clone();
    frontRight.position.x = dims.width * 0.5 - frontSideWidth * 0.5;
    group.add(frontRight);

    const lintel = new THREE.Mesh(
      new THREE.BoxGeometry(dims.doorWidth, 1.3, dims.wallThickness),
      wallMat
    );
    lintel.position.set(0, dims.wallHeight - 0.65, dims.depth * 0.5);
    group.add(lintel);

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(dims.width + 1.1, 0.36, dims.depth + 1.1),
      new THREE.MeshStandardMaterial({
        color: 0x27272a,
        roughness: 0.82
      })
    );
    roof.position.set(0, dims.roofHeight, 0);
    group.add(roof);
    roofObjects.push(roof);

    const fascia = new THREE.Mesh(
      new THREE.BoxGeometry(dims.width + 1.2, 0.92, 0.46),
      trimMat
    );
    fascia.position.set(0, dims.roofHeight + 0.4, dims.depth * 0.5 + 0.2);
    group.add(fascia);
    roofObjects.push(fascia);

    const signPanel = new THREE.Mesh(
      new THREE.PlaneGeometry(8.4, 2.2),
      new THREE.MeshBasicMaterial({
        map: createCanvasLabel("ARMERÍA ATLAS", "#111827", "#f8fafc", "#ef4444"),
        side: THREE.DoubleSide
      })
    );
    signPanel.position.set(0, dims.roofHeight - 0.35, dims.depth * 0.5 + 0.72);
    group.add(signPanel);

    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(dims.doorWidth + 3.2, 0.2, 2.4),
      new THREE.MeshStandardMaterial({
        color: 0x7f1d1d,
        roughness: 0.58
      })
    );
    awning.position.set(0, 3.35, dims.depth * 0.5 + 1.02);
    group.add(awning);

    const counterBase = new THREE.Mesh(
      new THREE.BoxGeometry(11.8, 1.12, 1.5),
      new THREE.MeshStandardMaterial({
        color: 0x4b5563,
        roughness: 0.78
      })
    );
    counterBase.position.set(0, 0.58, -6.5);
    group.add(counterBase);

    const counterTop = new THREE.Mesh(
      new THREE.BoxGeometry(12.1, 0.12, 1.62),
      new THREE.MeshStandardMaterial({
        color: 0xd1d5db,
        roughness: 0.46
      })
    );
    counterTop.position.set(0, 1.19, -6.5);
    group.add(counterTop);

    const wallRack = new THREE.Mesh(
      new THREE.BoxGeometry(10.4, 2.6, 0.18),
      new THREE.MeshStandardMaterial({
        color: 0x1f2937,
        roughness: 0.78
      })
    );
    wallRack.position.set(0, 2.5, -9.35);
    group.add(wallRack);

    for (let i = 0; i < 4; i++) {
      const prop = createRifleProp();
      prop.position.set(-4.2 + i * 2.8, 2.55, -9.1);
      prop.rotation.x = Math.PI / 2;
      prop.rotation.z = Math.PI / 2;
      group.add(prop);
    }

    const cratePositions = [
      [-8.6, -1.6],
      [8.6, -1.8],
      [-7.4, 4.7],
      [7.4, 4.9]
    ];

    for (const [x, z] of cratePositions) {
      const crate = createWeaponCrate();
      crate.position.set(x, 0, z);
      group.add(crate);
    }

    const ammoShelf = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 2.8, 6.6),
      new THREE.MeshStandardMaterial({
        color: 0x374151,
        roughness: 0.78
      })
    );
    ammoShelf.position.set(11.2, 1.4, 0.4);
    group.add(ammoShelf);

    for (let i = 0; i < 5; i++) {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.22, 0.56),
        new THREE.MeshStandardMaterial({
          color: i % 2 === 0 ? 0xef4444 : 0x2563eb,
          roughness: 0.48
        })
      );
      box.position.set(11.45, 0.8 + i * 0.44, -2 + i * 0.9);
      group.add(box);
    }

    scene.add(group);

    registerBoxCollider(0, -dims.depth * 0.5, dims.width, dims.wallThickness + 0.18, { tag: "weaponshop-wall" });
    registerBoxCollider(-dims.width * 0.5, 0, dims.wallThickness + 0.18, dims.depth, { tag: "weaponshop-wall" });
    registerBoxCollider(dims.width * 0.5, 0, dims.wallThickness + 0.18, dims.depth, { tag: "weaponshop-wall" });

    registerBoxCollider(
      -dims.width * 0.5 + frontSideWidth * 0.5,
      dims.depth * 0.5,
      frontSideWidth,
      dims.wallThickness + 0.18,
      { tag: "weaponshop-wall" }
    );

    registerBoxCollider(
      dims.width * 0.5 - frontSideWidth * 0.5,
      dims.depth * 0.5,
      frontSideWidth,
      dims.wallThickness + 0.18,
      { tag: "weaponshop-wall" }
    );

    registerBoxCollider(0, -6.5, 12.1, 1.72, { tag: "weaponshop-counter" });

    for (const [x, z] of cratePositions) {
      registerCircleCollider(x, z, 1.05, { tag: "weaponshop-crate" });
    }

    counterPoint = localToWorld(center, rotY, 0, -4.55);

    interiorBounds = {
      minX: -dims.width * 0.5 + 1.2,
      maxX: dims.width * 0.5 - 1.2,
      minZ: -dims.depth * 0.5 + 1.0,
      maxZ: dims.depth * 0.5 - 1.0
    };
  }

  function build() {
    if (built) return;
    built = true;

    buildShell();
    registerReservedArea(center.x, center.z + 2, 34);
  }

  function isInsideInterior(playerPose) {
    if (!playerPose || !interiorBounds) return false;

    const local = worldToLocal(center, rotY, playerPose.x, playerPose.z);
    return (
      local.x >= interiorBounds.minX &&
      local.x <= interiorBounds.maxX &&
      local.z >= interiorBounds.minZ &&
      local.z <= interiorBounds.maxZ
    );
  }

  function isNearCounter(playerPose, radius = 2.3) {
    if (!playerPose) return false;
    if (!isInsideInterior(playerPose)) return false;

    const dx = playerPose.x - counterPoint.x;
    const dz = playerPose.z - counterPoint.z;
    return dx * dx + dz * dz <= radius * radius;
  }

  function setRoofHidden(hidden) {
    for (const mesh of roofObjects) {
      mesh.visible = !hidden;
    }
  }

  function update(playerPose, playerMode) {
    const hideRoof = playerMode === "walking" && isInsideInterior(playerPose);
    setRoofHidden(hideRoof);
  }

  function getInfo() {
    return {
      id: "weapon_shop_atlas",
      label: "Armería Atlas",
      center: { ...center },
      counterPoint: { ...counterPoint }
    };
  }

  return {
    build,
    update,
    getInfo,
    isReservedArea,
    isInsideInterior,
    isNearCounter
  };
}