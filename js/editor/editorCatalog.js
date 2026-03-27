function createPrimitiveItem({
  id,
  label,
  hint,
  color,
  primitiveType,
  category = "misc"
}) {
  return {
    id,
    label,
    hint,
    color,
    kind: "primitive",
    primitiveType,
    category
  };
}

function createGlbItem({
  id,
  label,
  hint,
  color,
  category,
  modelUrl,
  fit
}) {
  return {
    id,
    label,
    hint,
    color,
    kind: "glb",
    category,
    modelUrl,
    fit
  };
}

const MODEL_BASE_PATH = "../../assets/models/";
const modelPath = (fileName) =>
  `${MODEL_BASE_PATH}${encodeURIComponent(fileName)}`;

const VEHICLE_MODEL_BASE_PATH = "../../assets/models/vehicles/cars/";
const vehicleModelPath = (fileName) =>
  `${VEHICLE_MODEL_BASE_PATH}${encodeURIComponent(fileName)}`;

const LEGACY_EDITOR_ITEMS = [
  createPrimitiveItem({
    id: "building",
    label: "Edificio",
    hint: "Bloque urbano",
    color: "#60a5fa",
    primitiveType: "building",
    category: "building"
  }),
  createPrimitiveItem({
    id: "tree",
    label: "Árbol",
    hint: "Vegetación",
    color: "#22c55e",
    primitiveType: "tree",
    category: "decor"
  }),
  createPrimitiveItem({
    id: "road",
    label: "Carretera",
    hint: "Tramo recto",
    color: "#f59e0b",
    primitiveType: "road",
    category: "road"
  }),
  createPrimitiveItem({
    id: "crossroad",
    label: "Cruce",
    hint: "Intersección",
    color: "#fb7185",
    primitiveType: "crossroad",
    category: "road"
  }),
  createPrimitiveItem({
    id: "house",
    label: "Casa",
    hint: "Vivienda baja",
    color: "#a78bfa",
    primitiveType: "house",
    category: "building"
  }),
  createPrimitiveItem({
    id: "lamp",
    label: "Farola",
    hint: "Luz urbana",
    color: "#f8fafc",
    primitiveType: "lamp",
    category: "decor"
  })
];

const BUILDING_GLB_ITEMS = [
  ...Array.from({ length: 28 }, (_, index) => {
    const number = index + 1;
    const pad = String(number).padStart(2, "0");

    return createGlbItem({
      id: `edif-${pad}`,
      label: `Edif ${pad}`,
      hint: "Modelo GLB",
      color: "#38bdf8",
      category: "building",
      modelUrl: modelPath(`Edif ${number}.glb`),
      fit: { units: "grid", width: 0.92, depth: 0.92, height: 2.8 }
    });
  }),

  createGlbItem({
    id: "house-glb-01",
    label: "House 01",
    hint: "Casa GLB",
    color: "#818cf8",
    category: "building",
    modelUrl: modelPath("House 1.glb"),
    fit: { units: "grid", width: 0.86, depth: 0.86, height: 1.9 }
  }),
  createGlbItem({
    id: "house-glb-02",
    label: "House 02",
    hint: "Casa GLB",
    color: "#818cf8",
    category: "building",
    modelUrl: modelPath("House 2.glb"),
    fit: { units: "grid", width: 0.86, depth: 0.86, height: 1.9 }
  }),
  createGlbItem({
    id: "iglesia-01",
    label: "Iglesia 01",
    hint: "Edificio especial",
    color: "#c084fc",
    category: "building",
    modelUrl: modelPath("Iglesia 1.glb"),
    fit: { units: "grid", width: 1.05, depth: 1.05, height: 2.4 }
  }),
  createGlbItem({
    id: "iglesia-02",
    label: "Iglesia 02",
    hint: "Edificio especial",
    color: "#c084fc",
    category: "building",
    modelUrl: modelPath("Iglesia 2.glb"),
    fit: { units: "grid", width: 1.05, depth: 1.05, height: 2.4 }
  })
];

const DECOR_GLB_ITEMS = [
  createGlbItem({
    id: "cartel-01",
    label: "Cartel",
    hint: "Prop urbano",
    color: "#34d399",
    category: "decor",
    modelUrl: modelPath("Cartel.glb"),
    fit: { units: "grid", width: 0.82, depth: 0.42, height: 1.1 }
  }),
  createGlbItem({
    id: "grua-01",
    label: "Grúa",
    hint: "Prop grande",
    color: "#34d399",
    category: "decor",
    modelUrl: modelPath("Grua.glb"),
    fit: { units: "grid", width: 1.35, depth: 1.35, height: 3.2 }
  }),
  createGlbItem({
    id: "noria-01",
    label: "Noria",
    hint: "Prop grande",
    color: "#34d399",
    category: "decor",
    modelUrl: modelPath("Noria.glb"),
    fit: { units: "grid", width: 1.35, depth: 1.35, height: 3.0 }
  })
];

const VEHICLE_GLB_ITEMS = Array.from({ length: 15 }, (_, index) => {
  const number = index + 1;
  const pad = String(number).padStart(2, "0");

  return createGlbItem({
    id: `vehicle-car-${pad}`,
    label: `Coche ${pad}`,
    hint: "Vehículo aparcado",
    color: "#f43f5e",
    category: "vehicle",
    modelUrl: vehicleModelPath(`Car ${number}.glb`),
    fit: { units: "world", width: 2.5, depth: 5.4, height: 2.2 }
  });
});

export const EDITOR_ITEMS = [
  ...LEGACY_EDITOR_ITEMS,
  ...BUILDING_GLB_ITEMS,
  ...DECOR_GLB_ITEMS,
  ...VEHICLE_GLB_ITEMS
];

export function getEditorItem(id) {
  return EDITOR_ITEMS.find((item) => item.id === id) ?? null;
}