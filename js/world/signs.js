import { CONFIG } from "../config.js";
import { DIR_TO_HEADING } from "./constants.js";
import { dirVector, rightVectorFromDir, vec2 } from "./math.js";
import { createSignGroup } from "./props.js";

export function createChoiceSignController(scene, getNode) {
  const signPool = {
    left: createSignGroup("left"),
    straight: createSignGroup("straight"),
    right: createSignGroup("right")
  };

  for (const sign of Object.values(signPool)) {
    sign.visible = false;
    scene.add(sign);
  }

  function hideSigns() {
    signPool.left.visible = false;
    signPool.straight.visible = false;
    signPool.right.visible = false;
  }

  function updateChoiceSigns(playerPose, upcomingInfo) {
    hideSigns();

    if (!upcomingInfo) return;
    if (upcomingInfo.remaining > CONFIG.player.choiceWindow) return;
    if (upcomingInfo.remaining < 4) return;

    const node = getNode(upcomingInfo.nodeId);
    if (!node) return;

    const dir = upcomingInfo.dir;
    const forward = dirVector(dir);
    const right = rightVectorFromDir(dir);

    const entryBase = vec2(node.x, node.z).add(
      forward.clone().multiplyScalar(-(CONFIG.intersectionSize / 2 + 16))
    );

    const faceRotation = -DIR_TO_HEADING[dir];
    const sideOffset = CONFIG.roadWidth / 2 + 5.2;

    if (upcomingInfo.validTurns.includes(-1)) {
      const pos = entryBase.clone().add(right.clone().multiplyScalar(-sideOffset));
      signPool.left.visible = true;
      signPool.left.position.set(pos.x, 0, pos.y);
      signPool.left.rotation.y = faceRotation;
    }

    if (upcomingInfo.validTurns.includes(0)) {
      const pos = entryBase.clone().add(forward.clone().multiplyScalar(7));
      signPool.straight.visible = true;
      signPool.straight.position.set(pos.x, 0, pos.y);
      signPool.straight.rotation.y = faceRotation;
    }

    if (upcomingInfo.validTurns.includes(1)) {
      const pos = entryBase.clone().add(right.clone().multiplyScalar(sideOffset));
      signPool.right.visible = true;
      signPool.right.position.set(pos.x, 0, pos.y);
      signPool.right.rotation.y = faceRotation;
    }
  }

  return {
    updateChoiceSigns
  };
}