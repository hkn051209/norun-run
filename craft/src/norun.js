/* =========================================================
   のるんの 3Dモデル（norun-v7.glb）を 読みこんで、ゲーム用に ととのえる
   - 読みこみは『のるん まなび』と 同じ：Three.js の GLTFLoader ＋ norun-model.js（バッジの 初期化）
   - モデルの 実寸を 測って、大きさ・当たり判定・カメラの きょりを 決める
   - モデルに アニメは 入って いないので、動き（ゆれ・のび ちぢみ）は コードで つける
   ========================================================= */
import * as THREE from "three";
import { GLTFLoader } from "../lib/addons/GLTFLoader.js";
import { MODEL_URL, findPinSlots } from "./norun-model.js";
import { PLAYER } from "./config.js";

/* 見えて いる メッシュだけで 箱を 測る */
function visibleBox(root, filter) {
  const box = new THREE.Box3();
  root.updateMatrixWorld(true);
  const visible = (o) => { for (let p = o; p; p = p.parent) { if (!p.visible) return false; if (p === root) break; } return true; };
  root.traverse((o) => {
    if (!o.isMesh || !visible(o) || (filter && !filter(o))) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    box.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld));
  });
  return box;
}

/* モデルが 読めなかった 時の かわり（白くて 丸い 体＋黒い ぼうし） */
function fallbackModel() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.75, 20, 14), new THREE.MeshLambertMaterial({ color: 0xffffff }));
  body.name = "Body"; body.scale.y = 0.62; body.position.y = 0.46; g.add(body);
  const hatM = new THREE.MeshLambertMaterial({ color: 0x2b1640 });
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.06, 20), hatM); brim.position.y = 0.86; g.add(brim);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.6, 16), hatM); cone.position.y = 1.16; g.add(cone);
  const eyeM = new THREE.MeshBasicMaterial({ color: 0x222222 });
  for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), eyeM); e.position.set(0.3 * s, 0.5, 0.66); g.add(e); }
  return g;
}

export async function loadNorun() {
  let model, source = "glb";
  try {
    const gltf = await new GLTFLoader().loadAsync(MODEL_URL);
    model = gltf.scene;
    findPinSlots(model);          // バッジを モデルの 初期の 見た目に（まなびと 同じ）
  } catch (e) {
    console.warn("norun model load failed, using fallback", e);
    model = fallbackModel(); source = "fallback";
  }

  // 実寸を 測る：ぜんたい と 体（Body）だけ
  const all = visibleBox(model);
  const bodyNode = model.getObjectByName("Body");
  let body = all;
  if (bodyNode) {
    const own = new Set(bodyNode.isMesh ? [bodyNode] : bodyNode.children.filter((c) => c.isMesh));
    const b = visibleBox(model, (o) => own.has(o));
    if (!b.isEmpty()) body = b;
  }
  const bodyW = body.max.x - body.min.x;
  const scale = PLAYER.bodyWidthBlocks / bodyW;      // 体の はばを 0.95マスに

  // 足もとの まんなかが 原点に 来るように
  model.scale.setScalar(scale);
  model.position.set(-(body.min.x + body.max.x) / 2 * scale, -all.min.y * scale, -(body.min.z + body.max.z) / 2 * scale);

  const inner = new THREE.Group(); inner.add(model);   // ゆれ・のび ちぢみ用
  const group = new THREE.Group(); group.add(inner);   // 位置・向き用

  const size = {
    scale,
    visualW: (all.max.x - all.min.x) * scale,          // ぼうしの つばまで
    visualH: (all.max.y - all.min.y) * scale,
    bodyW: bodyW * scale,
    // 当たり判定：はばは 体より 少し 細く（1マスの すき間を 通れる）、高さは ぼうしの 先まで
    hitW: Math.max(0.6, Math.min(0.9, bodyW * scale * 0.84)),
    hitH: Math.max(0.7, Math.min(1.8, (all.max.y - all.min.y) * scale)),
  };
  // モデルの 顔は +Z 向き
  return { group, inner, model, size, source, clips: 0 };
}
