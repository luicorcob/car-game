import * as THREE from "three";

function createCanvasLabel(text, bg = "#1f2937", fg = "#f8fafc", accent = "#60a5fa") {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = accent;
  ctx.fillRect(18, 18, 24, canvas.height - 36);

  ctx.fillStyle = fg;
  ctx.font = "bold 66px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2 + 14, canvas.height / 2);

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

function createHouseVisual(def) {
  const group = new THREE.Group();
  group.userData.editorRemovable = true;
  group.position.set(def.x, 0, def.z);
  group.rotation.y = def.rotY;

  const driveway = new THREE.Mesh(
    new THREE.BoxGeometry(5.3, 0.08, 32),
    new THREE.MeshStandardMaterial({
      color: 0x6b7280,
      roughness: 0.9
    })
  );
  driveway.position.set(0, 0.05, 20.5);
  group.add(driveway);

  const walkway = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.1, 9),
    new THREE.MeshStandardMaterial({
      color: 0xd1d5db,
      roughness: 0.74
    })
  );
  walkway.position.set(0, 0.08, 10.2);
  group.add(walkway);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(10.6, 5.2, 8.6),
    new THREE.MeshStandardMaterial({
      color: def.bodyColor,
      roughness: 0.92
    })
  );
  body.position.y = 2.6;
  group.add(body);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(7.2, 3.2, 4),
    new THREE.MeshStandardMaterial({
      color: def.roofColor,
      roughness: 0.82
    })
  );
  roof.position.y = 6.5;
  roof.rotation.y = Math.PI / 4;
  group.add(roof);

  const porch = new THREE.Mesh(
    new THREE.BoxGeometry(4.6, 0.16, 2.6),
    new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.74
    })
  );
  porch.position.set(0, 0.09, 5.55);
  group.add(porch);

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 2.6, 0.12),
    new THREE.MeshStandardMaterial({
      color: 0x7c2d12,
      roughness: 0.7
    })
  );
  door.position.set(0, 1.3, 4.37);
  group.add(door);

  const knob = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 10, 10),
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.42,
      roughness: 0.3
    })
  );
  knob.position.set(0.52, 1.3, 4.46);
  group.add(knob);

  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x9ed6ff,
    emissive: 0x08131f,
    emissiveIntensity: 0.28,
    roughness: 0.18
  });

  const frontWindowA = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 1.25, 0.08),
    windowMat
  );
  frontWindowA.position.set(-2.7, 2.8, 4.37);
  group.add(frontWindowA);

  const frontWindowB = frontWindowA.clone();
  frontWindowB.position.x = 2.7;
  group.add(frontWindowB);

  const sideWindow = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 1.2, 1.7),
    windowMat.clone()
  );
  sideWindow.position.set(5.35, 2.8, -1.3);
  group.add(sideWindow);

  const sideWindow2 = sideWindow.clone();
  sideWindow2.position.x = -5.35;
  group.add(sideWindow2);

  const mailboxPole = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 1.1, 0.12),
    new THREE.MeshStandardMaterial({ color: 0xd1d5db })
  );
  mailboxPole.position.set(-3.8, 0.55, 8.3);
  group.add(mailboxPole);

  const mailboxBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.42, 0.48),
    new THREE.MeshStandardMaterial({ color: 0xdc2626 })
  );
  mailboxBox.position.set(-3.8, 1.15, 8.3);
  group.add(mailboxBox);

  const hedge = new THREE.Mesh(
    new THREE.BoxGeometry(11.8, 0.82, 1.1),
    new THREE.MeshStandardMaterial({
      color: 0x2f7d32,
      roughness: 0.95
    })
  );
  hedge.position.set(0, 0.42, -5.35);
  group.add(hedge);

  const marker = new THREE.Group();
  marker.visible = false;

  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.42, 6.8, 16),
    new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.16
    })
  );
  beam.position.y = 6.5;
  marker.add(beam);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.55, 0.08, 10, 30),
    new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.9
    })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.14;
  marker.add(ring);

  const label = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 1.2),
    new THREE.MeshBasicMaterial({
      map: createCanvasLabel(def.label),
      side: THREE.DoubleSide,
      transparent: true
    })
  );
  label.position.y = 10.1;
  marker.add(label);

  group.add(marker);

  return {
    group,
    marker,
    ring,
    beam,
    label
  };
}

export function createDeliveryHousesController(scene, graph, hooks = {}) {
  const houseDefs = [
    {
      id: "house_oak",
      label: "Casa Oak",
      x: -420,
      z: -324,
      rotY: 0,
      bodyColor: 0xe7d7c4,
      roofColor: 0x7c2d12
    },
    {
      id: "house_sunset",
      label: "Casa Sunset",
      x: 324,
      z: -420,
      rotY: -Math.PI / 2,
      bodyColor: 0xdbe4ef,
      roofColor: 0x334155
    },
    {
      id: "house_palm",
      label: "Casa Palm",
      x: -324,
      z: 420,
      rotY: Math.PI / 2,
      bodyColor: 0xe6d8b6,
      roofColor: 0x854d0e
    },
    {
      id: "house_maple",
      label: "Casa Maple",
      x: 420,
      z: 324,
      rotY: Math.PI,
      bodyColor: 0xe5e7eb,
      roofColor: 0x7f1d1d
    }
  ];

  const reservedAreas = [];
  const houseMap = new Map();
  let activeHouseId = null;

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

  function registerBoxCollider(x, z, width, depth, meta = {}) {
    if (!hooks.registerBoxCollider) return;
    hooks.registerBoxCollider(x, z, width, depth, meta);
  }

  function registerCircleCollider(x, z, radius, meta = {}) {
    if (!hooks.registerCircleCollider) return;
    hooks.registerCircleCollider(x, z, radius, meta);
  }

  function buildHouse(def) {
    const visual = createHouseVisual(def);
    scene.add(visual.group);

    hooks.beginEditorObject?.(visual.group);

    const doorPoint = localToWorld(
      { x: def.x, z: def.z },
      def.rotY,
      0,
      7.2
    );

    const porchPoint = localToWorld(
      { x: def.x, z: def.z },
      def.rotY,
      0,
      5.8
    );

    registerBoxCollider(def.x, def.z, 11.2, 9.1, { tag: "delivery-house" });
    registerCircleCollider(doorPoint.x, doorPoint.z, 0.95, { tag: "delivery-door" });
    hooks.endEditorObject?.(visual.group);
    registerReservedArea(def.x, def.z, 22);

    const house = {
      ...def,
      doorPoint,
      porchPoint,
      visual
    };

    houseMap.set(def.id, house);
  }

  function build() {
    for (const def of houseDefs) {
      buildHouse(def);
    }
  }

  function setActiveHouse(houseId) {
    activeHouseId = houseId ?? null;

    for (const house of houseMap.values()) {
      house.visual.marker.visible = house.visual.group.parent && house.id === activeHouseId;
    }
  }

  function getHouseById(houseId) {
    const house = houseMap.get(houseId) ?? null;
    if (!house?.visual.group.parent) return null;
    return house;
  }

  function getHouses() {
    return Array.from(houseMap.values())
      .filter((house) => house.visual.group.parent)
      .map((house) => ({
      id: house.id,
      label: house.label,
      doorPoint: { ...house.doorPoint },
      porchPoint: { ...house.porchPoint }
      }));
  }

  function getActiveHouse() {
    return activeHouseId ? getHouseById(activeHouseId) : null;
  }

  function getNearbyActiveHouse(playerPose, radius = 2.7) {
    const house = getActiveHouse();
    if (!house || !playerPose) return null;

    const dx = playerPose.x - house.doorPoint.x;
    const dz = playerPose.z - house.doorPoint.z;

    return dx * dx + dz * dz <= radius * radius ? house : null;
  }

  function update(dt) {
    const active = getActiveHouse();
    if (!active) return;

    const t = performance.now() * 0.001;
    active.visual.marker.position.y = Math.sin(t * 2.4) * 0.18;
    active.visual.ring.rotation.z += dt * 0.9;
    active.visual.ring.scale.setScalar(1 + Math.sin(t * 3.1) * 0.06);
    active.visual.beam.material.opacity = 0.11 + Math.abs(Math.sin(t * 2.1)) * 0.08;
  }

  return {
    build,
    update,
    setActiveHouse,
    getHouseById,
    getHouses,
    getNearbyActiveHouse,
    isReservedArea
  };
}
