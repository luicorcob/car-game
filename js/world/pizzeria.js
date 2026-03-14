import * as THREE from "three";

function createCanvasLabel(text, bg = "#9a3412", fg = "#fff7ed", accent = "#f59e0b") {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = accent;
  ctx.fillRect(20, 18, 26, canvas.height - 36);

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

function createTableSet() {
  const group = new THREE.Group();

  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(1.05, 1.05, 0.14, 18),
    new THREE.MeshStandardMaterial({
      color: 0x8b5e3c,
      roughness: 0.68
    })
  );
  top.position.y = 0.88;
  group.add(top);

  const leg = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.16, 0.9, 12),
    new THREE.MeshStandardMaterial({
      color: 0x374151,
      roughness: 0.74,
      metalness: 0.1
    })
  );
  leg.position.y = 0.42;
  group.add(leg);

  const chairGeom = new THREE.BoxGeometry(0.56, 0.1, 0.56);
  const chairBackGeom = new THREE.BoxGeometry(0.56, 0.62, 0.08);
  const chairMat = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    roughness: 0.76
  });

  const chairOffsets = [
    [1.45, 0, -Math.PI / 2],
    [-1.45, 0, Math.PI / 2],
    [0, 1.45, Math.PI],
    [0, -1.45, 0]
  ];

  for (const [x, z, rot] of chairOffsets) {
    const chair = new THREE.Group();

    const seat = new THREE.Mesh(chairGeom, chairMat);
    seat.position.y = 0.5;
    chair.add(seat);

    const back = new THREE.Mesh(chairBackGeom, chairMat);
    back.position.set(0, 0.82, -0.24);
    chair.add(back);

    chair.position.set(x, 0, z);
    chair.rotation.y = rot;
    group.add(chair);
  }

  return group;
}

function createPizzaBoxMesh() {
  const group = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.07, 0.72),
    new THREE.MeshStandardMaterial({
      color: 0xf3e8d1,
      roughness: 0.8
    })
  );
  group.add(base);

  const lid = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.04, 0.72),
    new THREE.MeshStandardMaterial({
      color: 0xf8f1e2,
      roughness: 0.8
    })
  );
  lid.position.y = 0.055;
  group.add(lid);

  const sticker = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.01, 0.22),
    new THREE.MeshStandardMaterial({
      color: 0xb91c1c,
      emissive: 0x4c0000,
      emissiveIntensity: 0.15
    })
  );
  sticker.position.set(0, 0.08, 0);
  group.add(sticker);

  return group;
}

export function createPizzeriaController(scene, graph, hooks = {}) {
  const center = { x: -140, z: -56 };
  const rotY = 0;

  const dims = {
    width: 30,
    depth: 22,
    wallThickness: 0.6,
    wallHeight: 5.3,
    roofHeight: 5.7,
    doorWidth: 6.4
  };

  const reservedAreas = [];
  const roofObjects = [];
  let pickupPoint = { x: center.x, z: center.z };
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
    const rotated = Math.abs(Math.sin(rotY)) > 0.5;
    hooks.registerBoxCollider(
      worldPos.x,
      worldPos.z,
      rotated ? depth : width,
      rotated ? width : depth,
      meta
    );
  }

  function registerCircleCollider(localX, localZ, radius, meta = {}) {
    if (!hooks.registerCircleCollider) return;
    const worldPos = localToWorld(center, rotY, localX, localZ);
    hooks.registerCircleCollider(worldPos.x, worldPos.z, radius, meta);
  }

  function createShell() {
    const group = new THREE.Group();
    group.position.set(center.x, 0, center.z);
    group.rotation.y = rotY;

    const groundPad = new THREE.Mesh(
      new THREE.BoxGeometry(36, 0.12, 56),
      new THREE.MeshStandardMaterial({
        color: 0x5f6770,
        roughness: 0.95,
        metalness: 0.02
      })
    );
    groundPad.position.set(0, 0.02, 12);
    group.add(groundPad);

    const parkingFront = new THREE.Mesh(
      new THREE.BoxGeometry(24, 0.06, 30),
      new THREE.MeshStandardMaterial({
        color: 0x6b7280,
        roughness: 0.92
      })
    );
    parkingFront.position.set(0, 0.09, 26);
    group.add(parkingFront);

    for (const x of [-7.2, -2.4, 2.4, 7.2]) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.08, 11.5),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc })
      );
      stripe.position.set(x, 0.12, 25.7);
      group.add(stripe);
    }

    const walkway = new THREE.Mesh(
      new THREE.BoxGeometry(8, 0.08, 27),
      new THREE.MeshStandardMaterial({
        color: 0xcbd5e1,
        roughness: 0.74
      })
    );
    walkway.position.set(0, 0.11, 22.8);
    group.add(walkway);

    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xe7ddd0,
      roughness: 0.9
    });

    const trimMat = new THREE.MeshStandardMaterial({
      color: 0x9a3412,
      roughness: 0.58
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

    const frontLintel = new THREE.Mesh(
      new THREE.BoxGeometry(dims.doorWidth, 1.25, dims.wallThickness),
      wallMat
    );
    frontLintel.position.set(0, dims.wallHeight - 0.62, dims.depth * 0.5);
    group.add(frontLintel);

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(dims.width + 1.1, 0.34, dims.depth + 1.1),
      new THREE.MeshStandardMaterial({
        color: 0x3f3f46,
        roughness: 0.78
      })
    );
    roof.position.set(0, dims.roofHeight, 0);
    group.add(roof);
    roofObjects.push(roof);

    const parapetFront = new THREE.Mesh(
      new THREE.BoxGeometry(dims.width + 1.2, 0.82, 0.42),
      trimMat
    );
    parapetFront.position.set(0, dims.roofHeight + 0.42, dims.depth * 0.5 + 0.2);
    group.add(parapetFront);
    roofObjects.push(parapetFront);

    const signPanel = new THREE.Mesh(
      new THREE.PlaneGeometry(8.8, 2.4),
      new THREE.MeshBasicMaterial({
        map: createCanvasLabel("PIZZERÍA VESUVIO", "#7c2d12", "#fff7ed", "#f59e0b"),
        side: THREE.DoubleSide
      })
    );
    signPanel.position.set(0, dims.roofHeight - 0.35, dims.depth * 0.5 + 0.75);
    group.add(signPanel);

    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(dims.doorWidth + 2.1, 0.2, 2.6),
      new THREE.MeshStandardMaterial({
        color: 0xb91c1c,
        roughness: 0.54
      })
    );
    awning.position.set(0, 3.5, dims.depth * 0.5 + 1.02);
    group.add(awning);

    const awningTrim = new THREE.Mesh(
      new THREE.BoxGeometry(dims.doorWidth + 2.1, 0.18, 0.28),
      new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.3
      })
    );
    awningTrim.position.set(0, 3.35, dims.depth * 0.5 + 2.17);
    group.add(awningTrim);

    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(10.6, 1.15, 1.35),
      new THREE.MeshStandardMaterial({
        color: 0x8b5e3c,
        roughness: 0.74
      })
    );
    bar.position.set(0, 0.58, -6.8);
    group.add(bar);

    const counterTop = new THREE.Mesh(
      new THREE.BoxGeometry(11.0, 0.12, 1.5),
      new THREE.MeshStandardMaterial({
        color: 0xc9b79c,
        roughness: 0.5
      })
    );
    counterTop.position.set(0, 1.2, -6.8);
    group.add(counterTop);

    const ovenGlow = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 1.5, 0.2),
      new THREE.MeshStandardMaterial({
        color: 0x2f2f2f,
        emissive: 0xff5a1f,
        emissiveIntensity: 0.65,
        roughness: 0.46
      })
    );
    ovenGlow.position.set(0, 1.55, -9.55);
    group.add(ovenGlow);

    const menuBoard = new THREE.Mesh(
      new THREE.PlaneGeometry(5.6, 1.7),
      new THREE.MeshBasicMaterial({
        map: createCanvasLabel("MARGHERITA · PEPPERONI", "#111827", "#f8fafc", "#22c55e"),
        side: THREE.DoubleSide
      })
    );
    menuBoard.position.set(0, 3.55, -9.25);
    group.add(menuBoard);

    const pickupBox = createPizzaBoxMesh();
    pickupBox.position.set(0, 1.3, -6.45);
    group.add(pickupBox);

    const receiptLamp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 1.6, 10),
      new THREE.MeshStandardMaterial({ color: 0xd1d5db })
    );
    receiptLamp.position.set(-4.5, 0.84, -6.25);
    group.add(receiptLamp);

    const lampHead = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.18, 0.45),
      new THREE.MeshStandardMaterial({
        color: 0xf8f5d0,
        emissive: 0xfff4b2,
        emissiveIntensity: 0.45
      })
    );
    lampHead.position.set(-4.5, 1.7, -6.25);
    group.add(lampHead);

    const tablePositions = [
      [-7.2, -1.4],
      [7.2, -1.6],
      [-5.4, 4.6],
      [5.4, 4.8]
    ];

    for (const [x, z] of tablePositions) {
      const set = createTableSet();
      set.position.set(x, 0, z);
      group.add(set);
    }

    const decoShelf = new THREE.Mesh(
      new THREE.BoxGeometry(6.8, 0.18, 0.48),
      new THREE.MeshStandardMaterial({
        color: 0x7c2d12,
        roughness: 0.62
      })
    );
    decoShelf.position.set(8.1, 2.7, -8.9);
    group.add(decoShelf);

    for (let i = 0; i < 4; i++) {
      const bottle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 0.52, 10),
        new THREE.MeshStandardMaterial({
          color: i % 2 === 0 ? 0x16a34a : 0x1d4ed8,
          roughness: 0.26
        })
      );
      bottle.position.set(6.7 + i * 0.95, 3.06, -8.9);
      group.add(bottle);
    }

    scene.add(group);

    registerBoxCollider(0, -dims.depth * 0.5, dims.width, dims.wallThickness + 0.18, { tag: "pizzeria-wall" });
    registerBoxCollider(-dims.width * 0.5, 0, dims.wallThickness + 0.18, dims.depth, { tag: "pizzeria-wall" });
    registerBoxCollider(dims.width * 0.5, 0, dims.wallThickness + 0.18, dims.depth, { tag: "pizzeria-wall" });
    registerBoxCollider(
      -dims.width * 0.5 + frontSideWidth * 0.5,
      dims.depth * 0.5,
      frontSideWidth,
      dims.wallThickness + 0.18,
      { tag: "pizzeria-wall" }
    );
    registerBoxCollider(
      dims.width * 0.5 - frontSideWidth * 0.5,
      dims.depth * 0.5,
      frontSideWidth,
      dims.wallThickness + 0.18,
      { tag: "pizzeria-wall" }
    );
    registerBoxCollider(0, -6.8, 10.8, 1.55, { tag: "pizzeria-bar" });

    for (const [x, z] of tablePositions) {
      registerCircleCollider(x, z, 1.18, { tag: "pizzeria-table" });
    }

    pickupPoint = localToWorld(center, rotY, 0, -4.9);

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

    createShell();
    registerReservedArea(center.x, center.z + 5, 38);
  }

  function isInsideInterior(playerPose) {
    if (!playerPose) return false;

    const local = worldToLocal(center, rotY, playerPose.x, playerPose.z);
    return (
      local.x >= interiorBounds.minX &&
      local.x <= interiorBounds.maxX &&
      local.z >= interiorBounds.minZ &&
      local.z <= interiorBounds.maxZ
    );
  }

  function isNearPickup(playerPose, radius = 2.25) {
    if (!playerPose) return false;
    if (!isInsideInterior(playerPose)) return false;

    const dx = playerPose.x - pickupPoint.x;
    const dz = playerPose.z - pickupPoint.z;
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
      id: "pizzeria_vesuvio",
      label: "Pizzería Vesuvio",
      center: { ...center },
      pickupPoint: { ...pickupPoint }
    };
  }

  return {
    build,
    update,
    getInfo,
    isReservedArea,
    isInsideInterior,
    isNearPickup
  };
}