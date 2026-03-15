import * as THREE from "three";

const STORAGE_KEY_CURRENT = "road-driver-3d-editor-layout-current";
const STORAGE_KEY_LIBRARY = "road-driver-3d-editor-layout-library";
const GRID_SIZE = 14;
const ROTATION_STEP = Math.PI / 2;

const EDITOR_ITEMS = [
  {
    id: "building",
    label: "Edificio",
    hint: "Bloque urbano",
    color: "#60a5fa"
  },
  {
    id: "tree",
    label: "Árbol",
    hint: "Vegetación",
    color: "#22c55e"
  },
  {
    id: "road",
    label: "Carretera",
    hint: "Tramo recto",
    color: "#f59e0b"
  },
  {
    id: "crossroad",
    label: "Cruce",
    hint: "Intersección",
    color: "#fb7185"
  },
  {
    id: "house",
    label: "Casa",
    hint: "Vivienda baja",
    color: "#a78bfa"
  },
  {
    id: "lamp",
    label: "Farola",
    hint: "Luz urbana",
    color: "#f8fafc"
  }
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function snapToGrid(value) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function createSharedMaterials() {
  return {
    road: new THREE.MeshStandardMaterial({ color: 0x2f3135, roughness: 0.94 }),
    shoulder: new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.98 }),
    line: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.32 }),
    building: new THREE.MeshStandardMaterial({ color: 0x8b9bb4, roughness: 0.84 }),
    glass: new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      emissive: 0x112244,
      emissiveIntensity: 0.2,
      roughness: 0.18,
      metalness: 0.16
    }),
    trunk: new THREE.MeshStandardMaterial({ color: 0x7c4a1f, roughness: 0.9 }),
    leaves: new THREE.MeshStandardMaterial({ color: 0x2f7d32, roughness: 0.86 }),
    houseWall: new THREE.MeshStandardMaterial({ color: 0xf3e8d5, roughness: 0.92 }),
    roof: new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.78 }),
    lampPole: new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.6 }),
    lampHead: new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: 0xfff2a8,
      emissiveIntensity: 0.34,
      roughness: 0.18
    })
  };
}

function createRoadPiece(materials) {
  const group = new THREE.Group();

  const shoulder = new THREE.Mesh(
    new THREE.BoxGeometry(GRID_SIZE, 0.08, GRID_SIZE),
    materials.shoulder
  );
  group.add(shoulder);

  const road = new THREE.Mesh(
    new THREE.BoxGeometry(GRID_SIZE, 0.1, GRID_SIZE * 0.72),
    materials.road
  );
  road.position.y = 0.02;
  group.add(road);

  const edgeA = new THREE.Mesh(
    new THREE.BoxGeometry(GRID_SIZE, 0.11, 0.18),
    materials.line
  );
  edgeA.position.set(0, 0.06, -GRID_SIZE * 0.36);
  group.add(edgeA);

  const edgeB = edgeA.clone();
  edgeB.position.z = GRID_SIZE * 0.36;
  group.add(edgeB);

  const lane = new THREE.Mesh(
    new THREE.BoxGeometry(GRID_SIZE * 0.72, 0.12, 0.12),
    materials.line
  );
  lane.position.y = 0.07;
  group.add(lane);

  return group;
}

function createCrossroadPiece(materials) {
  const group = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(GRID_SIZE, 0.08, GRID_SIZE),
    materials.shoulder
  );
  group.add(base);

  const roadX = new THREE.Mesh(
    new THREE.BoxGeometry(GRID_SIZE, 0.1, GRID_SIZE * 0.74),
    materials.road
  );
  roadX.position.y = 0.02;
  group.add(roadX);

  const roadZ = new THREE.Mesh(
    new THREE.BoxGeometry(GRID_SIZE * 0.74, 0.1, GRID_SIZE),
    materials.road
  );
  roadZ.position.y = 0.02;
  group.add(roadZ);

  const lineW = new THREE.Mesh(
    new THREE.BoxGeometry(GRID_SIZE * 0.24, 0.11, 0.12),
    materials.line
  );
  lineW.position.set(-GRID_SIZE * 0.32, 0.06, 0);
  group.add(lineW);

  const lineE = lineW.clone();
  lineE.position.x = GRID_SIZE * 0.32;
  group.add(lineE);

  const lineN = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.11, GRID_SIZE * 0.24),
    materials.line
  );
  lineN.position.set(0, 0.06, -GRID_SIZE * 0.32);
  group.add(lineN);

  const lineS = lineN.clone();
  lineS.position.z = GRID_SIZE * 0.32;
  group.add(lineS);

  return group;
}

function createBuildingPiece(materials) {
  const group = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.BoxGeometry(GRID_SIZE * 0.86, 0.6, GRID_SIZE * 0.86),
    materials.building
  );
  base.position.y = 0.3;
  group.add(base);

  const tower = new THREE.Mesh(
    new THREE.BoxGeometry(GRID_SIZE * 0.64, GRID_SIZE * 1.7, GRID_SIZE * 0.64),
    materials.building
  );
  tower.position.y = GRID_SIZE * 0.85;
  group.add(tower);

  for (const x of [-GRID_SIZE * 0.17, GRID_SIZE * 0.17]) {
    for (const y of [GRID_SIZE * 0.48, GRID_SIZE * 0.85, GRID_SIZE * 1.22]) {
      const windowMesh = new THREE.Mesh(
        new THREE.BoxGeometry(GRID_SIZE * 0.12, GRID_SIZE * 0.16, 0.12),
        materials.glass
      );
      windowMesh.position.set(x, y, GRID_SIZE * 0.32 + 0.08);
      group.add(windowMesh);
    }
  }

  return group;
}

function createTreePiece(materials) {
  const group = new THREE.Group();

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.82, 5.2, 10),
    materials.trunk
  );
  trunk.position.y = 2.6;
  group.add(trunk);

  const crownA = new THREE.Mesh(
    new THREE.ConeGeometry(3.2, 4.8, 10),
    materials.leaves
  );
  crownA.position.y = 6.6;
  group.add(crownA);

  const crownB = new THREE.Mesh(
    new THREE.ConeGeometry(2.4, 3.9, 10),
    materials.leaves
  );
  crownB.position.y = 8.6;
  group.add(crownB);

  return group;
}

function createHousePiece(materials) {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(GRID_SIZE * 0.72, 6.2, GRID_SIZE * 0.66),
    materials.houseWall
  );
  body.position.y = 3.1;
  group.add(body);

  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(GRID_SIZE * 0.52, 3.6, 4),
    materials.roof
  );
  roof.position.y = 7.7;
  roof.rotation.y = Math.PI / 4;
  group.add(roof);

  const door = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 2.8, 0.18),
    materials.trunk
  );
  door.position.set(0, 1.4, GRID_SIZE * 0.33 + 0.08);
  group.add(door);

  return group;
}

function createLampPiece(materials) {
  const group = new THREE.Group();

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.22, 8.4, 10),
    materials.lampPole
  );
  pole.position.y = 4.2;
  group.add(pole);

  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.18, 2.8),
    materials.lampPole
  );
  arm.position.set(0, 7.8, 1.1);
  group.add(arm);

  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.34, 0.72),
    materials.lampHead
  );
  head.position.set(0, 7.4, 2.2);
  group.add(head);

  return group;
}

function createPieceMesh(type, materials) {
  if (type === "road") return createRoadPiece(materials);
  if (type === "crossroad") return createCrossroadPiece(materials);
  if (type === "building") return createBuildingPiece(materials);
  if (type === "tree") return createTreePiece(materials);
  if (type === "house") return createHousePiece(materials);
  if (type === "lamp") return createLampPiece(materials);
  return new THREE.Group();
}

function makeGhost(material) {
  return material.clone();
}

function applyGhostStyle(object) {
  object.traverse((child) => {
    if (!child.isMesh) return;
    child.material = makeGhost(child.material);
    child.material.transparent = true;
    child.material.opacity = 0.55;
    child.material.depthWrite = false;
  });
}

function createPaletteButtons(paletteEl, onSelect) {
  const buttons = new Map();

  for (const item of EDITOR_ITEMS) {
    const button = document.createElement("button");
    button.type = "button";
    button.innerHTML = `<strong>${item.label}</strong><span>${item.hint}</span>`;
    button.style.boxShadow = `inset 0 0 0 1px ${item.color}22`;
    button.addEventListener("click", () => onSelect(item.id));
    paletteEl.appendChild(button);
    buttons.set(item.id, button);
  }

  return buttons;
}

export function createEditorMode(scene, camera, renderer, dom, options = {}) {
  const materials = createSharedMaterials();
  const raycaster = new THREE.Raycaster();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const cursorWorld = new THREE.Vector3();
  const cameraTarget = new THREE.Vector3(0, 0, 0);
  const previewPosition = new THREE.Vector3();

  const root = new THREE.Group();
  root.visible = false;
  scene.add(root);

  const placementGroup = new THREE.Group();
  placementGroup.name = "editor-placements";
  scene.add(placementGroup);

  const grid = new THREE.GridHelper(2400, Math.round(2400 / GRID_SIZE), 0x6ab8ff, 0x355172);
  grid.position.y = 0.04;
  root.add(grid);

  const previewGroup = new THREE.Group();
  root.add(previewGroup);

  let active = false;
  let selectedType = EDITOR_ITEMS[0].id;
  let rotation = 0;
  let zoom = 170;
  let toggleRequested = false;
  let objectCounter = 0;
  let selectedLayoutId = null;

  const placements = [];
  const placedMeshes = new Map();

  const keyState = {
    forward: false,
    backward: false,
    left: false,
    right: false
  };

  const paletteButtons = createPaletteButtons(dom.paletteEl, selectType);
  rebuildPreview();
  syncPalette();
  updateStatus();

  function rebuildPreview() {
    previewGroup.clear();
    const mesh = createPieceMesh(selectedType, materials);
    applyGhostStyle(mesh);
    mesh.rotation.y = rotation;
    previewGroup.add(mesh);
  }

  function syncPalette() {
    for (const [id, button] of paletteButtons.entries()) {
      button.classList.toggle("active", id === selectedType);
    }
  }

  function updateStatus() {
    const item = EDITOR_ITEMS.find((entry) => entry.id === selectedType);
    dom.selectedLabelEl.textContent = item?.label ?? "Ninguno";
    dom.cursorLabelEl.textContent = `${previewPosition.x.toFixed(0)}, ${previewPosition.z.toFixed(0)}`;
    dom.rotationLabelEl.textContent = `${Math.round((rotation * 180) / Math.PI)}°`;
    dom.countLabelEl.textContent = String(placements.length);
  }

  function selectType(type) {
    selectedType = type;
    rebuildPreview();
    syncPalette();
    updateStatus();
  }

  function rotateSelection() {
    rotation = (rotation + ROTATION_STEP) % (Math.PI * 2);
    rebuildPreview();
    updateStatus();
  }

  function toSerializable() {
    return {
      version: 1,
      gridSize: GRID_SIZE,
      items: placements.map((entry) => ({
        id: entry.id,
        type: entry.type,
        x: entry.x,
        z: entry.z,
        rotation: entry.rotation
      }))
    };
  }

  function saveCurrentLayout() {
    localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(toSerializable()));
  }

  function loadLibrary() {
    const raw = localStorage.getItem(STORAGE_KEY_LIBRARY);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("No se pudo leer la biblioteca interna del creador.", error);
      return [];
    }
  }

  function saveLibrary(layouts) {
    localStorage.setItem(STORAGE_KEY_LIBRARY, JSON.stringify(layouts));
  }

  function formatStamp(value) {
    const date = new Date(value);
    return date.toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function syncLayoutInput(layout = null) {
    if (!dom.layoutNameEl) return;
    dom.layoutNameEl.value = layout?.name ?? "";
  }

  function renderLibrary() {
    if (!dom.layoutListEl) return;

    const layouts = loadLibrary();
    dom.layoutListEl.innerHTML = "";

    if (!layouts.length) {
      const empty = document.createElement("div");
      empty.className = "editor-layout-empty";
      empty.textContent = "Aún no has guardado ninguna escena.";
      dom.layoutListEl.appendChild(empty);
      return;
    }

    for (const layout of layouts) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "editor-layout-item";
      item.classList.toggle("active", layout.id === selectedLayoutId);
      item.innerHTML = `<div><strong>${layout.name}</strong><span>${layout.items.length} piezas · ${formatStamp(layout.updatedAt)}</span></div>`;
      item.addEventListener("click", () => {
        selectedLayoutId = layout.id;
        syncLayoutInput(layout);
        renderLibrary();
      });
      dom.layoutListEl.appendChild(item);
    }
  }

  function buildSavedLayout(name, existingId = null) {
    return {
      id: existingId ?? `layout_${Date.now()}`,
      name: name || `Escena ${new Date().toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`,
      updatedAt: Date.now(),
      ...toSerializable()
    };
  }

  function saveNamedLayout() {
    const layouts = loadLibrary();
    const selected = layouts.find((entry) => entry.id === selectedLayoutId) ?? null;
    const name = dom.layoutNameEl?.value.trim() || selected?.name || "";
    const payload = buildSavedLayout(name, selected?.id ?? null);
    const next = layouts.filter((entry) => entry.id !== payload.id);
    next.unshift(payload);
    selectedLayoutId = payload.id;
    saveLibrary(next);
    syncLayoutInput(payload);
    renderLibrary();
  }

  function loadSelectedLayout() {
    const layouts = loadLibrary();
    const selected = layouts.find((entry) => entry.id === selectedLayoutId);
    if (!selected) return;
    loadLayout(selected, false);
    syncLayoutInput(selected);
  }

  function deleteSelectedLayout() {
    if (!selectedLayoutId) return;
    const layouts = loadLibrary().filter((entry) => entry.id !== selectedLayoutId);
    saveLibrary(layouts);
    selectedLayoutId = layouts[0]?.id ?? null;
    syncLayoutInput(layouts[0] ?? null);
    renderLibrary();
  }

  function addPlacement(definition) {
    const mesh = createPieceMesh(definition.type, materials);
    mesh.position.set(definition.x, 0, definition.z);
    mesh.rotation.y = definition.rotation;
    mesh.userData.editorPlacementId = definition.id;
    placementGroup.add(mesh);
    placedMeshes.set(definition.id, mesh);
    placements.push(definition);
  }

  function placeCurrent() {
    const id = `editor_${objectCounter++}`;
    addPlacement({
      id,
      type: selectedType,
      x: previewPosition.x,
      z: previewPosition.z,
      rotation
    });
    saveCurrentLayout();
    updateStatus();
  }

  function removePlacementAtCursor() {
    let best = null;
    let bestDistance = GRID_SIZE * 0.6;

    for (const entry of placements) {
      const distance = Math.hypot(entry.x - previewPosition.x, entry.z - previewPosition.z);
      if (distance <= bestDistance) {
        best = entry;
        bestDistance = distance;
      }
    }

    if (!best) return;

    const mesh = placedMeshes.get(best.id);
    if (mesh) {
      placementGroup.remove(mesh);
      placedMeshes.delete(best.id);
    }

    const index = placements.findIndex((entry) => entry.id === best.id);
    if (index >= 0) {
      placements.splice(index, 1);
    }

    saveCurrentLayout();
    updateStatus();
  }

  function getRemovableAncestor(object) {
    let current = object;

    while (current) {
      if (current === root || current === placementGroup || current === previewGroup) {
        return null;
      }

      if (current.userData?.editorRemovable) {
        return current;
      }

      current = current.parent;
    }

    return null;
  }

  function findRemovableDefaultObject(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera({ x, y }, camera);

    const hits = raycaster.intersectObjects(scene.children, true);

    for (const hit of hits) {
      const removable = getRemovableAncestor(hit.object);
      if (removable) {
        return removable;
      }
    }

    return null;
  }

  function removeDefaultObjectAtPointer(clientX, clientY) {
    const removable = findRemovableDefaultObject(clientX, clientY);
    if (!removable) return false;

    if (options.removeWorldObject) {
      return !!options.removeWorldObject(removable);
    }

    if (!removable.parent) return false;
    removable.parent.remove(removable);
    return true;
  }

  function clearAllPlacements() {
    placementGroup.clear();
    placedMeshes.clear();
    placements.length = 0;
    saveCurrentLayout();
    updateStatus();
  }

  function loadLayout(data, preserveSelection = true) {
    if (!data || !Array.isArray(data.items)) return;

    placementGroup.clear();
    placedMeshes.clear();
    placements.length = 0;

    for (const item of data.items) {
      if (!EDITOR_ITEMS.some((entry) => entry.id === item.type)) continue;
      addPlacement({
        id: item.id ?? `editor_${objectCounter++}`,
        type: item.type,
        x: snapToGrid(Number(item.x) || 0),
        z: snapToGrid(Number(item.z) || 0),
        rotation: Number(item.rotation) || 0
      });
    }

    if (!preserveSelection && data.id) {
      selectedLayoutId = data.id;
    }

    saveCurrentLayout();
    updateStatus();
    renderLibrary();
  }

  function tryLoadSavedLayout() {
    const raw = localStorage.getItem(STORAGE_KEY_CURRENT);
    if (!raw) return;

    try {
      loadLayout(JSON.parse(raw));
    } catch (error) {
      console.warn("No se pudo cargar el layout guardado del editor.", error);
    }
  }

  function updateCursorFromPointer(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera({ x, y }, camera);

    if (!raycaster.ray.intersectPlane(groundPlane, cursorWorld)) {
      return;
    }

    previewPosition.set(
      snapToGrid(cursorWorld.x),
      0,
      snapToGrid(cursorWorld.z)
    );

    previewGroup.position.copy(previewPosition);
    updateStatus();
  }

  function enter() {
    active = true;
    root.visible = true;
    dom.panelEl.classList.remove("hidden");
    document.body.classList.add("editor-active");
    updateStatus();
  }

  function exit() {
    active = false;
    root.visible = false;
    dom.panelEl.classList.add("hidden");
    document.body.classList.remove("editor-active");
  }

  function toggle() {
    if (active) {
      exit();
    } else {
      enter();
    }
  }

  function updateCamera(dt) {
    const moveSpeed = zoom * dt * 1.3;

    if (keyState.forward) cameraTarget.z -= moveSpeed;
    if (keyState.backward) cameraTarget.z += moveSpeed;
    if (keyState.left) cameraTarget.x -= moveSpeed;
    if (keyState.right) cameraTarget.x += moveSpeed;

    cameraTarget.x = clamp(cameraTarget.x, -1100, 1100);
    cameraTarget.z = clamp(cameraTarget.z, -1100, 1100);

    camera.position.x = THREE.MathUtils.damp(camera.position.x, cameraTarget.x, 7.5, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, zoom, 7.5, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, cameraTarget.z + zoom * 0.22, 7.5, dt);

    camera.lookAt(cameraTarget.x, 0, cameraTarget.z);
  }

  function update(dt) {
    if (!active) return;
    updateCamera(dt);
  }

  function consumeToggleRequested() {
    if (!toggleRequested) return false;
    toggleRequested = false;
    return true;
  }

  function onKeyDown(event) {
    if (event.code === "KeyM" && !event.repeat) {
      toggleRequested = true;
      event.preventDefault();
      return;
    }

    if (!active) return;

    if (event.code === "KeyR" && !event.repeat) {
      rotateSelection();
      event.preventDefault();
      return;
    }

    if (event.code === "KeyW" || event.code === "ArrowUp") keyState.forward = true;
    if (event.code === "KeyS" || event.code === "ArrowDown") keyState.backward = true;
    if (event.code === "KeyA" || event.code === "ArrowLeft") keyState.left = true;
    if (event.code === "KeyD" || event.code === "ArrowRight") keyState.right = true;
  }

  function onKeyUp(event) {
    if (event.code === "KeyW" || event.code === "ArrowUp") keyState.forward = false;
    if (event.code === "KeyS" || event.code === "ArrowDown") keyState.backward = false;
    if (event.code === "KeyA" || event.code === "ArrowLeft") keyState.left = false;
    if (event.code === "KeyD" || event.code === "ArrowRight") keyState.right = false;
  }

  function onPointerMove(event) {
    if (!active) return;
    updateCursorFromPointer(event.clientX, event.clientY);
  }

  function onPointerDown(event) {
    if (!active) return;

    if (event.target.closest("#editor-panel")) return;

    updateCursorFromPointer(event.clientX, event.clientY);

    if (event.button === 0) {
      placeCurrent();
      event.preventDefault();
    } else if (event.button === 2) {
      const removedDefault = removeDefaultObjectAtPointer(event.clientX, event.clientY);
      if (!removedDefault) {
        removePlacementAtCursor();
      }
      event.preventDefault();
    }
  }

  function onWheel(event) {
    if (!active) return;
    zoom = clamp(zoom + event.deltaY * 0.08, 70, 320);
    event.preventDefault();
  }

  function onContextMenu(event) {
    if (!active) return;
    event.preventDefault();
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("contextmenu", onContextMenu);

  dom.rotateBtn.addEventListener("click", rotateSelection);
  dom.clearBtn.addEventListener("click", clearAllPlacements);
  dom.closeBtn.addEventListener("click", () => {
    if (active) exit();
  });
  dom.saveSlotBtn.addEventListener("click", saveNamedLayout);
  dom.loadSlotBtn.addEventListener("click", loadSelectedLayout);
  dom.deleteSlotBtn.addEventListener("click", deleteSelectedLayout);

  tryLoadSavedLayout();
  selectedLayoutId = loadLibrary()[0]?.id ?? null;
  syncLayoutInput(loadLibrary()[0] ?? null);
  renderLibrary();

  return {
    update,
    isActive: () => active,
    consumeToggleRequested,
    enter,
    exit
  };
}
