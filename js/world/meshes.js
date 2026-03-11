import * as THREE from "three";
import { CONFIG } from "../config.js";

export function createRoadMaterial(color) {
  return new THREE.MeshStandardMaterial({ color });
}

export function createStraightRoadMesh(length, horizontal) {
  const group = new THREE.Group();

  const shoulderMat = createRoadMaterial(0x555555);
  const roadMat = createRoadMaterial(0x2f3135);
  const lineMat = createRoadMaterial(0xffffff);

  const roadWidth = CONFIG.roadWidth;
  const shoulderWidth = roadWidth + 4;

  if (!horizontal) {
    const shoulder = new THREE.Mesh(
      new THREE.BoxGeometry(shoulderWidth, 0.1, length),
      shoulderMat
    );
    group.add(shoulder);

    const road = new THREE.Mesh(
      new THREE.BoxGeometry(roadWidth, 0.12, length),
      roadMat
    );
    road.position.y = 0.02;
    group.add(road);

    const edgeLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.13, length),
      lineMat
    );
    edgeLeft.position.set(-roadWidth / 2, 0.1, 0);
    group.add(edgeLeft);

    const edgeRight = edgeLeft.clone();
    edgeRight.position.x = roadWidth / 2;
    group.add(edgeRight);

    for (let i = 1; i < CONFIG.laneCount; i++) {
      const x = -roadWidth / 2 + (roadWidth / CONFIG.laneCount) * i;

      const dash = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.13, length * 0.45),
        lineMat
      );
      dash.position.set(x, 0.1, 0);
      group.add(dash);
    }
  } else {
    const shoulder = new THREE.Mesh(
      new THREE.BoxGeometry(length, 0.1, shoulderWidth),
      shoulderMat
    );
    group.add(shoulder);

    const road = new THREE.Mesh(
      new THREE.BoxGeometry(length, 0.12, roadWidth),
      roadMat
    );
    road.position.y = 0.02;
    group.add(road);

    const edgeTop = new THREE.Mesh(
      new THREE.BoxGeometry(length, 0.13, 0.28),
      lineMat
    );
    edgeTop.position.set(0, 0.1, -roadWidth / 2);
    group.add(edgeTop);

    const edgeBottom = edgeTop.clone();
    edgeBottom.position.z = roadWidth / 2;
    group.add(edgeBottom);

    for (let i = 1; i < CONFIG.laneCount; i++) {
      const z = -roadWidth / 2 + (roadWidth / CONFIG.laneCount) * i;

      const dash = new THREE.Mesh(
        new THREE.BoxGeometry(length * 0.45, 0.13, 0.12),
        lineMat
      );
      dash.position.set(0, 0.1, z);
      group.add(dash);
    }
  }

  return group;
}

function createArcLine(radius, startAngle, endAngle, opacity = 0.35) {
  const curve = new THREE.ArcCurve(0, 0, radius, startAngle, endAngle, false);
  const points = curve.getPoints(24).map((p) => new THREE.Vector3(p.x, 0.11, p.y));
  const geom = new THREE.BufferGeometry().setFromPoints(points);

  return new THREE.Line(
    geom,
    new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity
    })
  );
}

export function createIntersectionMesh() {
  const group = new THREE.Group();

  const size = CONFIG.intersectionSize;
  const half = size / 2;
  const roadWidth = CONFIG.roadWidth;

  const shoulderMat = createRoadMaterial(0x555555);
  const roadMat = createRoadMaterial(0x2f3135);
  const lineMat = createRoadMaterial(0xffffff);

  const shoulderA = new THREE.Mesh(
    new THREE.BoxGeometry(roadWidth + 4, 0.1, size),
    shoulderMat
  );
  group.add(shoulderA);

  const shoulderB = new THREE.Mesh(
    new THREE.BoxGeometry(size, 0.1, roadWidth + 4),
    shoulderMat
  );
  group.add(shoulderB);

  const roadA = new THREE.Mesh(
    new THREE.BoxGeometry(roadWidth, 0.12, size),
    roadMat
  );
  roadA.position.y = 0.02;
  group.add(roadA);

  const roadB = new THREE.Mesh(
    new THREE.BoxGeometry(size, 0.12, roadWidth),
    roadMat
  );
  roadB.position.y = 0.02;
  group.add(roadB);

  const edgeVLeft = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.13, size),
    lineMat
  );
  edgeVLeft.position.set(-roadWidth / 2, 0.1, 0);
  group.add(edgeVLeft);

  const edgeVRight = edgeVLeft.clone();
  edgeVRight.position.x = roadWidth / 2;
  group.add(edgeVRight);

  const edgeHTop = new THREE.Mesh(
    new THREE.BoxGeometry(size, 0.13, 0.28),
    lineMat
  );
  edgeHTop.position.set(0, 0.1, -roadWidth / 2);
  group.add(edgeHTop);

  const edgeHBottom = edgeHTop.clone();
  edgeHBottom.position.z = roadWidth / 2;
  group.add(edgeHBottom);

  const radius = half;
  const arcDefs = [
    { x: -radius, z: -radius, a0: 0, a1: Math.PI / 2 },
    { x: radius, z: -radius, a0: Math.PI / 2, a1: Math.PI },
    { x: -radius, z: radius, a0: -Math.PI / 2, a1: 0 },
    { x: radius, z: radius, a0: Math.PI, a1: Math.PI * 1.5 }
  ];

  for (const arc of arcDefs) {
    const line = createArcLine(radius, arc.a0, arc.a1, 0.35);
    line.position.set(arc.x, 0, arc.z);
    group.add(line);
  }

  return group;
}