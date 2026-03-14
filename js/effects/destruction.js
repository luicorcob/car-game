import * as THREE from "three";

function createRadialTexture(stops) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");

  const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 56);
  for (const [offset, color] of stops) {
    g.addColorStop(offset, color);
  }

  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function randRange(min, max) {
  return min + Math.random() * (max - min);
}

export function createDestructionController(scene) {
  const group = new THREE.Group();
  scene.add(group);

  const smokeTexture = createRadialTexture([
    [0, "rgba(240,240,240,0.95)"],
    [0.28, "rgba(180,180,180,0.72)"],
    [0.62, "rgba(95,95,95,0.34)"],
    [1, "rgba(40,40,40,0)"]
  ]);

  const fireTexture = createRadialTexture([
    [0, "rgba(255,255,210,1)"],
    [0.22, "rgba(255,220,120,0.98)"],
    [0.5, "rgba(255,120,30,0.72)"],
    [0.8, "rgba(180,40,0,0.22)"],
    [1, "rgba(0,0,0,0)"]
  ]);

  const sparkTexture = createRadialTexture([
    [0, "rgba(255,255,255,1)"],
    [0.3, "rgba(255,240,160,0.92)"],
    [0.72, "rgba(255,160,40,0.35)"],
    [1, "rgba(0,0,0,0)"]
  ]);

  const metalGeom = new THREE.BoxGeometry(0.14, 0.09, 0.22);
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x4b5563,
    roughness: 0.75,
    metalness: 0.24
  });

  const emberMat = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    emissive: 0xff7b00,
    emissiveIntensity: 0.95,
    roughness: 0.48,
    metalness: 0.08
  });

  const ragdollGeometries = {
    torso: new THREE.BoxGeometry(0.64, 0.82, 0.34),
    head: new THREE.SphereGeometry(0.22, 16, 16),
    arm: new THREE.BoxGeometry(0.16, 0.64, 0.16),
    leg: new THREE.BoxGeometry(0.18, 0.78, 0.2)
  };

  const ragdollMaterials = {
    shirt: new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      roughness: 0.58
    }),
    trousers: new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.7
    }),
    skin: new THREE.MeshStandardMaterial({
      color: 0xf1c27d,
      roughness: 0.86
    })
  };

  const spritePool = [];
  const chunkPool = [];
  const persistentEmitters = [];
  const dynamicRigidBodies = [];

  const tempVec = new THREE.Vector3();
  const tempVecB = new THREE.Vector3();

  function createSpriteSlot() {
    const material = new THREE.SpriteMaterial({
      map: smokeTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0,
      color: 0xffffff
    });

    const sprite = new THREE.Sprite(material);
    sprite.visible = false;
    sprite.scale.setScalar(0.01);
    group.add(sprite);

    return {
      active: false,
      sprite,
      velocity: new THREE.Vector3(),
      age: 0,
      life: 1,
      startScale: 0.2,
      endScale: 1,
      startOpacity: 0.8,
      endOpacity: 0,
      damping: 0.92,
      driftY: 0,
      spin: 0,
      kind: "smoke"
    };
  }

  function createChunkSlot() {
    const mesh = new THREE.Mesh(metalGeom, metalMat);
    mesh.visible = false;
    group.add(mesh);

    return {
      active: false,
      mesh,
      velocity: new THREE.Vector3(),
      angular: new THREE.Vector3(),
      age: 0,
      life: 1,
      gravity: 0.016,
      bounce: 0.35,
      friction: 0.84,
      halfHeight: 0.07
    };
  }

  for (let i = 0; i < 96; i++) {
    spritePool.push(createSpriteSlot());
  }

  for (let i = 0; i < 28; i++) {
    chunkPool.push(createChunkSlot());
  }

  function allocSprite() {
    for (const slot of spritePool) {
      if (!slot.active) return slot;
    }
    return spritePool[0];
  }

  function allocChunk() {
    for (const slot of chunkPool) {
      if (!slot.active) return slot;
    }
    return chunkPool[0];
  }

  function emitSprite(kind, position, velocity, options = {}) {
    const slot = allocSprite();

    slot.active = true;
    slot.kind = kind;
    slot.age = 0;
    slot.life = options.life ?? 1;
    slot.startScale = options.startScale ?? 0.2;
    slot.endScale = options.endScale ?? 1;
    slot.startOpacity = options.startOpacity ?? 0.85;
    slot.endOpacity = options.endOpacity ?? 0;
    slot.damping = options.damping ?? 0.93;
    slot.driftY = options.driftY ?? 0;
    slot.spin = randRange(-2.2, 2.2);

    slot.sprite.visible = true;
    slot.sprite.position.copy(position);
    slot.sprite.scale.setScalar(slot.startScale);
    slot.sprite.material.opacity = slot.startOpacity;
    slot.sprite.material.color.setHex(options.color ?? 0xffffff);
    slot.sprite.material.map =
      kind === "fire"
        ? fireTexture
        : kind === "spark"
          ? sparkTexture
          : smokeTexture;

    slot.velocity.copy(velocity);

    if (kind === "fire" || kind === "spark") {
      slot.sprite.material.blending = THREE.AdditiveBlending;
    } else {
      slot.sprite.material.blending = THREE.NormalBlending;
    }
  }

  function emitChunk(position, velocity, options = {}) {
    const slot = allocChunk();

    slot.active = true;
    slot.age = 0;
    slot.life = options.life ?? randRange(1.8, 3.4);
    slot.gravity = options.gravity ?? 0.017;
    slot.bounce = options.bounce ?? 0.34;
    slot.friction = options.friction ?? 0.82;
    slot.halfHeight = 0.05 + Math.random() * 0.06;

    slot.mesh.visible = true;
    slot.mesh.position.copy(position);
    slot.mesh.rotation.set(
      randRange(0, Math.PI * 2),
      randRange(0, Math.PI * 2),
      randRange(0, Math.PI * 2)
    );

    const sx = randRange(0.6, 1.4);
    const sy = randRange(0.6, 1.25);
    const sz = randRange(0.7, 1.6);
    slot.mesh.scale.set(sx, sy, sz);

    slot.mesh.material = Math.random() < 0.18 ? emberMat : metalMat;

    slot.velocity.copy(velocity);
    slot.angular.set(
      randRange(-0.28, 0.28),
      randRange(-0.34, 0.34),
      randRange(-0.28, 0.28)
    );
  }

  function spawnRagdollPart(geometry, material, origin, velocity, halfHeight) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(origin);
    mesh.rotation.set(
      randRange(0, Math.PI * 2),
      randRange(0, Math.PI * 2),
      randRange(0, Math.PI * 2)
    );
    group.add(mesh);

    dynamicRigidBodies.push({
      mesh,
      velocity: velocity.clone(),
      angular: new THREE.Vector3(
        randRange(-0.24, 0.24),
        randRange(-0.28, 0.28),
        randRange(-0.24, 0.24)
      ),
      age: 0,
      life: randRange(3.8, 5.4),
      gravity: 0.015,
      bounce: 0.28,
      friction: 0.78,
      halfHeight
    });
  }

  function triggerVehicleCrash(target, options = {}) {
    if (!target) return;

    target.getWorldPosition(tempVec);
    const base = tempVec.clone();
    base.y += options.height ?? 1.15;

    const intensity = options.intensity ?? 1;
    const forward = options.forward ?? new THREE.Vector3(0, 0, 1);

    for (let i = 0; i < 10; i++) {
      tempVecB.set(
        randRange(-0.045, 0.045),
        randRange(0.02, 0.075),
        randRange(-0.045, 0.045)
      );
      emitSprite("fire", base, tempVecB, {
        life: randRange(0.38, 0.82),
        startScale: randRange(0.48, 0.78) * intensity,
        endScale: randRange(1.6, 2.8) * intensity,
        startOpacity: 0.95,
        driftY: 0.0018
      });
    }

    for (let i = 0; i < 14; i++) {
      tempVecB.set(
        randRange(-0.03, 0.03),
        randRange(0.028, 0.07),
        randRange(-0.03, 0.03)
      );
      tempVecB.addScaledVector(forward, randRange(-0.01, 0.055));
      emitSprite("smoke", base, tempVecB, {
        life: randRange(1.6, 2.8),
        startScale: randRange(0.32, 0.6),
        endScale: randRange(2.8, 4.2) * intensity,
        startOpacity: 0.7,
        driftY: 0.0042,
        damping: 0.965
      });
    }

    for (let i = 0; i < 12; i++) {
      tempVecB.set(
        randRange(-0.16, 0.16),
        randRange(0.045, 0.15),
        randRange(-0.16, 0.16)
      );
      emitSprite("spark", base, tempVecB, {
        life: randRange(0.24, 0.52),
        startScale: randRange(0.08, 0.16),
        endScale: randRange(0.2, 0.42),
        startOpacity: 1,
        driftY: 0.0006,
        damping: 0.92,
        color: 0xfff2b5
      });
    }

    for (let i = 0; i < 10; i++) {
      tempVecB.set(
        randRange(-0.13, 0.13),
        randRange(0.05, 0.17),
        randRange(-0.13, 0.13)
      );
      emitChunk(base, tempVecB, {
        life: randRange(2.1, 4.2)
      });
    }

    persistentEmitters.push({
      type: "vehicle-fire",
      target,
      age: 0,
      duration: randRange(12, 18),
      smokeAccumulator: 0,
      fireAccumulator: 0,
      offsetY: 1.0 + Math.random() * 0.3,
      intensity
    });
  }

  function triggerPedestrianHit(position, heading, impulse = 1) {
    const origin = new THREE.Vector3(position.x, 1.0, position.z);
    const forward = new THREE.Vector3(Math.sin(heading), 0, -Math.cos(heading));
    const right = new THREE.Vector3(Math.cos(heading), 0, Math.sin(heading));

    for (let i = 0; i < 7; i++) {
      tempVecB.copy(forward)
        .multiplyScalar(randRange(0.01, 0.07) * impulse)
        .addScaledVector(right, randRange(-0.06, 0.06))
        .setY(randRange(0.03, 0.09));

      emitSprite("smoke", origin, tempVecB, {
        life: randRange(0.85, 1.5),
        startScale: randRange(0.18, 0.32),
        endScale: randRange(1.1, 1.9),
        startOpacity: 0.5,
        driftY: 0.0034,
        damping: 0.95
      });
    }

    const torsoOrigin = origin.clone().add(new THREE.Vector3(0, 0.4, 0));
    const headOrigin = origin.clone().add(new THREE.Vector3(0, 0.98, 0));

    spawnRagdollPart(
      ragdollGeometries.torso,
      ragdollMaterials.shirt,
      torsoOrigin,
      forward.clone().multiplyScalar(randRange(0.06, 0.13) * impulse)
        .addScaledVector(right, randRange(-0.05, 0.05))
        .add(new THREE.Vector3(0, randRange(0.12, 0.18), 0)),
      0.41
    );

    spawnRagdollPart(
      ragdollGeometries.head,
      ragdollMaterials.skin,
      headOrigin,
      forward.clone().multiplyScalar(randRange(0.05, 0.11) * impulse)
        .addScaledVector(right, randRange(-0.04, 0.04))
        .add(new THREE.Vector3(0, randRange(0.16, 0.24), 0)),
      0.22
    );

    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1;

      spawnRagdollPart(
        ragdollGeometries.arm,
        ragdollMaterials.shirt,
        origin.clone().add(new THREE.Vector3(side * 0.28, 0.72, 0)),
        forward.clone().multiplyScalar(randRange(0.07, 0.14) * impulse)
          .addScaledVector(right, side * randRange(0.06, 0.12))
          .add(new THREE.Vector3(0, randRange(0.11, 0.18), 0)),
        0.32
      );

      spawnRagdollPart(
        ragdollGeometries.leg,
        ragdollMaterials.trousers,
        origin.clone().add(new THREE.Vector3(side * 0.14, 0.38, 0)),
        forward.clone().multiplyScalar(randRange(0.08, 0.16) * impulse)
          .addScaledVector(right, side * randRange(0.04, 0.08))
          .add(new THREE.Vector3(0, randRange(0.09, 0.15), 0)),
        0.39
      );
    }
  }

  function updateSprites(dt) {
    for (const slot of spritePool) {
      if (!slot.active) continue;

      slot.age += dt;
      if (slot.age >= slot.life) {
        slot.active = false;
        slot.sprite.visible = false;
        slot.sprite.material.opacity = 0;
        continue;
      }

      const t = slot.age / slot.life;

      slot.sprite.position.addScaledVector(slot.velocity, dt * 60);
      slot.sprite.position.y += slot.driftY * dt * 60;

      slot.velocity.multiplyScalar(Math.pow(slot.damping, dt * 60));
      slot.sprite.material.opacity = THREE.MathUtils.lerp(
        slot.startOpacity,
        slot.endOpacity,
        t
      );
      slot.sprite.scale.setScalar(
        THREE.MathUtils.lerp(slot.startScale, slot.endScale, t)
      );
      slot.sprite.material.rotation += slot.spin * dt;
    }
  }

  function updateChunks(dt) {
    for (const slot of chunkPool) {
      if (!slot.active) continue;

      slot.age += dt;
      if (slot.age >= slot.life) {
        slot.active = false;
        slot.mesh.visible = false;
        continue;
      }

      slot.velocity.y -= slot.gravity * dt * 60;
      slot.mesh.position.addScaledVector(slot.velocity, dt * 60);

      slot.mesh.rotation.x += slot.angular.x * dt * 60;
      slot.mesh.rotation.y += slot.angular.y * dt * 60;
      slot.mesh.rotation.z += slot.angular.z * dt * 60;

      if (slot.mesh.position.y <= slot.halfHeight) {
        slot.mesh.position.y = slot.halfHeight;
        slot.velocity.y *= -slot.bounce;
        slot.velocity.x *= slot.friction;
        slot.velocity.z *= slot.friction;
        slot.angular.multiplyScalar(0.88);
      }
    }

    for (let i = dynamicRigidBodies.length - 1; i >= 0; i--) {
      const body = dynamicRigidBodies[i];
      body.age += dt;

      if (body.age >= body.life) {
        group.remove(body.mesh);
        dynamicRigidBodies.splice(i, 1);
        continue;
      }

      body.velocity.y -= body.gravity * dt * 60;
      body.mesh.position.addScaledVector(body.velocity, dt * 60);

      body.mesh.rotation.x += body.angular.x * dt * 60;
      body.mesh.rotation.y += body.angular.y * dt * 60;
      body.mesh.rotation.z += body.angular.z * dt * 60;

      if (body.mesh.position.y <= body.halfHeight) {
        body.mesh.position.y = body.halfHeight;
        body.velocity.y *= -body.bounce;
        body.velocity.x *= body.friction;
        body.velocity.z *= body.friction;
        body.angular.multiplyScalar(0.9);
      }
    }
  }

  function updateEmitters(dt) {
    for (let i = persistentEmitters.length - 1; i >= 0; i--) {
      const emitter = persistentEmitters[i];
      emitter.age += dt;

      if (emitter.age >= emitter.duration) {
        persistentEmitters.splice(i, 1);
        continue;
      }

      emitter.target.getWorldPosition(tempVec);
      tempVec.y += emitter.offsetY;

      const lifeT = emitter.age / emitter.duration;
      const smokeRate = THREE.MathUtils.lerp(11, 4, lifeT) * emitter.intensity;
      const fireRate = THREE.MathUtils.lerp(6, 0.4, lifeT) * emitter.intensity;

      emitter.smokeAccumulator += dt * smokeRate;
      emitter.fireAccumulator += dt * fireRate;

      while (emitter.smokeAccumulator >= 1) {
        emitter.smokeAccumulator -= 1;

        tempVecB.set(
          randRange(-0.012, 0.012),
          randRange(0.012, 0.03),
          randRange(-0.012, 0.012)
        );

        emitSprite("smoke", tempVec, tempVecB, {
          life: randRange(1.5, 2.7),
          startScale: randRange(0.22, 0.36),
          endScale: randRange(1.9, 3.2),
          startOpacity: 0.54,
          driftY: 0.0038,
          damping: 0.968
        });
      }

      while (emitter.fireAccumulator >= 1) {
        emitter.fireAccumulator -= 1;

        tempVecB.set(
          randRange(-0.008, 0.008),
          randRange(0.012, 0.026),
          randRange(-0.008, 0.008)
        );

        emitSprite("fire", tempVec, tempVecB, {
          life: randRange(0.28, 0.54),
          startScale: randRange(0.18, 0.28),
          endScale: randRange(0.72, 1.2),
          startOpacity: 0.82,
          driftY: 0.0014
        });
      }
    }
  }

  function update(dt) {
    updateEmitters(dt);
    updateSprites(dt);
    updateChunks(dt);
  }

  function reset() {
    persistentEmitters.length = 0;

    for (const slot of spritePool) {
      slot.active = false;
      slot.sprite.visible = false;
      slot.sprite.material.opacity = 0;
      slot.sprite.scale.setScalar(0.01);
    }

    for (const slot of chunkPool) {
      slot.active = false;
      slot.mesh.visible = false;
    }

    for (const body of dynamicRigidBodies) {
      group.remove(body.mesh);
    }
    dynamicRigidBodies.length = 0;
  }

  return {
    triggerVehicleCrash,
    triggerPedestrianHit,
    update,
    reset
  };
}