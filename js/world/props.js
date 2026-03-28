import * as THREE from "three";
import { makeRng } from "./math.js";

function createArrowCanvas(type) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#1d4ed8";
  ctx.fillRect(0, 0, 256, 256);

  ctx.lineWidth = 16;
  ctx.strokeStyle = "white";
  ctx.strokeRect(20, 20, 216, 216);

  ctx.strokeStyle = "white";
  ctx.lineWidth = 22;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();

  if (type === "left") {
    ctx.moveTo(190, 72);
    ctx.lineTo(112, 72);
    ctx.lineTo(112, 116);
    ctx.lineTo(72, 116);
    ctx.moveTo(72, 116);
    ctx.lineTo(122, 176);
    ctx.moveTo(72, 116);
    ctx.lineTo(122, 56);
    ctx.moveTo(112, 116);
    ctx.lineTo(188, 116);
  } else if (type === "right") {
    ctx.moveTo(66, 72);
    ctx.lineTo(144, 72);
    ctx.lineTo(144, 116);
    ctx.lineTo(184, 116);
    ctx.moveTo(184, 116);
    ctx.lineTo(134, 176);
    ctx.moveTo(184, 116);
    ctx.lineTo(134, 56);
    ctx.moveTo(144, 116);
    ctx.lineTo(68, 116);
  } else {
    ctx.moveTo(128, 190);
    ctx.lineTo(128, 72);
    ctx.moveTo(128, 72);
    ctx.lineTo(92, 108);
    ctx.moveTo(128, 72);
    ctx.lineTo(164, 108);
  }

  ctx.stroke();
  return canvas;
}

export function createSignGroup(type) {
  const group = new THREE.Group();

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 2.6, 10),
    new THREE.MeshStandardMaterial({ color: 0x777777 })
  );
  pole.position.y = 1.3;
  group.add(pole);

  const texture = new THREE.CanvasTexture(createArrowCanvas(type));
  texture.needsUpdate = true;

  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(1.9, 1.9),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
    })
  );
  panel.position.set(0, 2.4, 0.12);
  group.add(panel);

  return group;
}

export function createBuilding(seed, width, depth, height, rotY = 0) {
  const rnd = makeRng(seed);
  const group = new THREE.Group();

  const wallPalette = [0xc9d2e3, 0xe4d8c8, 0xd7d7d7, 0xd3c6b8, 0xbfc8d6];
  const wallColor = wallPalette[Math.floor(rnd() * wallPalette.length)];

  const wallMat = new THREE.MeshStandardMaterial({ color: wallColor });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x666666 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x6aaed6,
    emissive: 0x112233,
    metalness: 0.15,
    roughness: 0.25
  });
  const darkGlassMat = new THREE.MeshStandardMaterial({
    color: 0x35495e,
    metalness: 0.2,
    roughness: 0.3
  });

  const main = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    wallMat
  );
  main.position.y = height / 2;
  group.add(main);

  const roof = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.92, 0.8, depth * 0.92),
    roofMat
  );
  roof.position.y = height + 0.4;
  group.add(roof);

  const floors = Math.max(2, Math.floor(height / 3.3));
  const columns = Math.max(2, Math.floor(width / 3.4));

  const frontZ = depth / 2 + 0.03;
  const sideX = width / 2 + 0.03;

  for (let floor = 0; floor < floors - 1; floor++) {
    for (let col = 0; col < columns; col++) {
      const wx = -width / 2 + 1.2 + (col + 0.5) * ((width - 2.4) / columns);
      const wy = 2 + floor * 3;

      const frontWindow = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 1.2, 0.08),
        glassMat
      );
      frontWindow.position.set(wx, wy, frontZ);
      group.add(frontWindow);

      const backWindow = frontWindow.clone();
      backWindow.position.z = -frontZ;
      group.add(backWindow);
    }
  }

  const sideFloors = Math.max(2, Math.floor(height / 3.5));
  const sideColumns = Math.max(1, Math.floor(depth / 3.8));

  for (let floor = 0; floor < sideFloors - 1; floor++) {
    for (let col = 0; col < sideColumns; col++) {
      const wz = -depth / 2 + 1.2 + (col + 0.5) * ((depth - 2.4) / sideColumns);
      const wy = 2 + floor * 3;

      const leftWindow = new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 1.1, 0.9),
        darkGlassMat
      );
      leftWindow.position.set(sideX, wy, wz);
      group.add(leftWindow);

      const rightWindow = leftWindow.clone();
      rightWindow.position.x = -sideX;
      group.add(rightWindow);
    }
  }

  if (rnd() > 0.62) {
    const rooftopBox = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.2, 1.6, depth * 0.2),
      new THREE.MeshStandardMaterial({ color: 0x888888 })
    );
    rooftopBox.position.set(
      (rnd() - 0.5) * width * 0.4,
      height + 1.1,
      (rnd() - 0.5) * depth * 0.4
    );
    group.add(rooftopBox);
  }

  group.rotation.y = rotY;
  return group;
}

export function createParkedCar(color = 0x3366ff) {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({ color });
  const windowMat = new THREE.MeshStandardMaterial({ color: 0x8db7d7 });
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.8, 4.5),
    bodyMat
  );
  body.position.y = 0.85;
  group.add(body);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.75, 2.1),
    windowMat
  );
  cabin.position.set(0, 1.45, -0.15);
  group.add(cabin);

  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.38, 14);

  for (const x of [-1.1, 1.1]) {
    for (const z of [-1.35, 1.35]) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.4, z);
      group.add(wheel);
    }
  }

  return group;
}

export function createPedestrian(seed, options = {}) {
  const rnd = makeRng(seed);
  const group = new THREE.Group();
  const hostile = !!options.hostile;

  const trouserColors = [0x33415c, 0x2b2d42, 0x3a5a40, 0x5c677d];

  const shirtColor = hostile ? 0xdc2626 : 0xffb703;
  const hasRedShirt = hostile;
  const shirtMat = new THREE.MeshStandardMaterial({
    color: shirtColor
  });
  const trouserMat = new THREE.MeshStandardMaterial({
    color: trouserColors[Math.floor(rnd() * trouserColors.length)]
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: hasRedShirt ? 0x8d5524 : 0xf1c27d
  });

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.8, 0.26),
    shirtMat
  );
  body.position.y = 1.25;
  group.add(body);

  if (hostile) {
    const chestBand = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.16, 0.28),
      new THREE.MeshStandardMaterial({
        color: 0xfee2e2,
        emissive: 0x5f1010,
        emissiveIntensity: 0.35
      })
    );
    chestBand.position.set(0, 1.22, 0.01);
    group.add(chestBand);
  }

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 12, 12),
    skinMat
  );
  head.position.y = 1.85;
  group.add(head);

  const armLeft = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.7, 0.14),
    shirtMat
  );
  armLeft.position.set(-0.35, 1.2, 0);

  const armRight = armLeft.clone();
  armRight.position.x = 0.35;

  const legLeft = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.78, 0.16),
    trouserMat
  );
  legLeft.position.set(-0.12, 0.45, 0);

  const legRight = legLeft.clone();
  legRight.position.x = 0.12;

  group.add(armLeft, armRight, legLeft, legRight);

  let weapon = null;
  if (hostile) {
    weapon = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.14, 0.42),
      new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.55 })
    );
    weapon.position.set(0.06, -0.08, -0.18);
    armRight.add(weapon);

    const armBand = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.1, 0.16),
      new THREE.MeshStandardMaterial({
        color: 0xff3b30,
        emissive: 0x6a120b,
        emissiveIntensity: 0.45
      })
    );
    armBand.position.set(0, 0.12, 0);
    armLeft.add(armBand);
  }

  return {
    group,
    armLeft,
    armRight,
    legLeft,
    legRight,
    weapon,
    hostile
  };
}
