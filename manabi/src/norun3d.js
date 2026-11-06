/* =========================================================
   応援ののるん（norun-v4.glb）
   ふだん：ぷにぷに跳ねて ゆらゆら / 正解：ジャンプ / まちがい：「お」の口で 首をふる / 終わり：よろこぶ
   画面ごとの大きさ・場所は CSS（#norunView）で決める。描画は1つのキャンバスだけ
   ========================================================= */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/GLTFLoader.js";

const canvas = document.getElementById("norunView");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
camera.position.set(0, 1.0, 5.2);
camera.lookAt(0, 0.62, 0);
scene.add(new THREE.HemisphereLight(0xffffff, 0xd9c8ff, 1.7));
const sun = new THREE.DirectionalLight(0xffffff, 1.0);
sun.position.set(2, 4, 5);
scene.add(sun);

const root = new THREE.Group();
scene.add(root);
const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.75, 24),
  new THREE.MeshBasicMaterial({ color: 0x3b2a5a, transparent: true, opacity: 0.15, depthWrite: false }));
shadow.rotation.x = -Math.PI / 2;
scene.add(shadow);

const N = { body: null, hat: null, mouth: null, eyeL: null, eyeR: null, starL: null, starR: null, hatMats: [], openMouth: null };
let ready = false;

export async function loadNorun3D() {
  const g = await new GLTFLoader().loadAsync("assets/models/norun-v4.glb");
  const m = g.scene;
  const get = (n) => m.getObjectByName(n);
  Object.assign(N, { body: get("Body"), hat: get("Hat"), mouth: get("Mouth"), eyeL: get("Eye_L"), eyeR: get("Eye_R"), starL: get("Star_L"), starR: get("Star_R") });
  for (const k of ["hat", "starL", "starR"]) N[k].userData.base = { p: N[k].position.clone(), q: N[k].quaternion.clone() };
  m.traverse((o) => {
    if (o.isMesh && o.material.name === "M_Hat") {
      o.material = o.material.clone();
      o.material.userData.baseColor = o.material.color.clone();
      N.hatMats.push(o.material);
    }
  });
  // 「お」の口（まちがえた時に 元の口と入れかえる）
  N.mouthParts = [...N.mouth.children];
  const om = new THREE.Group();
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.075, 24), new THREE.MeshBasicMaterial({ color: 0x4a2340 }));
  hole.scale.set(1, 1.2, 1);
  const tongue = new THREE.Mesh(new THREE.CircleGeometry(0.045, 20), new THREE.MeshBasicMaterial({ color: 0xff8fa8 }));
  tongue.scale.set(1.2, 0.7, 1);
  tongue.position.set(0, -0.045, 0.002);
  om.add(hole, tongue);
  om.position.set(0, -0.005, 0.035);
  om.visible = false;
  N.mouth.add(om);
  N.openMouth = om;
  root.add(m);
  ready = true;
}

export function setHatColor(color) {
  for (const mat of N.hatMats) {
    if (color == null) mat.color.copy(mat.userData.baseColor);
    else mat.color.set(color);
  }
}

/* 反応：ok / ng / cheer */
const st = { y: 0, vy: 0, squash: 0, sway: 0, swayPh: 0, shake: 0, surprise: 0, spin: 0, blinkT: 2, blink: 0, star: 0, starV: 0 };
export function react(kind) {
  if (kind === "ok") { st.vy = 5.2; st.squash = -0.18; }
  else if (kind === "ng") { st.shake = 0.5; st.surprise = 1; st.vy = 2.2; }
  else if (kind === "cheer") { st.vy = 6.5; st.spin = Math.PI * 2; }
}

const clock = new THREE.Clock();
let lastW = 0, lastH = 0;
function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  // キャンバスの大きさに合わせる
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (w && h && (w !== lastW || h !== lastH)) {
    lastW = w; lastH = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  if (ready && w && h) {
    // 跳ねる
    st.vy -= 18 * dt;
    st.y += st.vy * dt;
    if (st.y <= 0) {
      if (st.vy < -2) st.squash = Math.min(0.28, -st.vy * 0.04);
      st.y = 0;
      st.vy = 2.6;                     // ふだんの ぷにぷに跳ね
    }
    st.squash += (0 - st.squash) * Math.min(1, dt * 10);
    const sq = st.squash + (st.y > 0.05 ? -0.05 : 0);
    N.body.scale.set(1 + sq * 0.8, 1 - sq, 1 + sq * 0.8);
    // ゆらゆら
    st.swayPh += dt * 6;
    st.sway = Math.sin(st.swayPh) * 0.1;
    // まちがえ：首をふる
    st.shake = Math.max(0, st.shake - dt);
    const shake = st.shake > 0 ? Math.sin(t * 40) * 0.2 * (st.shake / 0.5) : 0;
    N.body.rotation.set(0, shake, st.sway);
    // よろこび：くるっと回る
    if (st.spin > 0) { const d = Math.min(st.spin, dt * 9); st.spin -= d; root.rotation.y += d; } else root.rotation.y = 0;
    root.position.y = st.y;
    shadow.scale.setScalar(1 - Math.min(st.y / 3, 0.5));
    // 「お」の口・帽子がぴょこっと浮く
    st.surprise = Math.max(0, st.surprise - dt * 1.6);
    const om = st.surprise > 0.2;
    N.openMouth.visible = om;
    N.mouthParts.forEach((c) => { c.visible = !om; });
    const hb = N.hat.userData.base;
    N.hat.position.copy(hb.p);
    N.hat.position.y += st.surprise * 0.35;
    N.hat.quaternion.copy(hb.q);
    N.hat.rotateZ(-st.sway * 0.6 + (st.surprise > 0 ? Math.sin(t * 20) * 0.08 * st.surprise : 0));
    // 星：ゆれの勢いで ばね
    st.starV += (-st.star * 60 - st.starV * 5 - Math.cos(st.swayPh) * 0.6 * 6) * dt;
    st.star += st.starV * dt;
    for (const [s, sign] of [[N.starL, 1], [N.starR, -1]]) {
      s.quaternion.copy(s.userData.base.q);
      s.rotateZ(Math.max(-0.7, Math.min(0.7, st.star)) + Math.sin(t * 2) * 0.05 * sign);
    }
    // まばたき
    st.blinkT -= dt;
    if (st.blinkT <= 0) { st.blink = 0.13; st.blinkT = 2 + Math.random() * 3; }
    st.blink = Math.max(0, st.blink - dt);
    const bk = st.blink > 0 ? 0.15 : 1;
    N.eyeL.scale.set(1, bk, 1);
    N.eyeR.scale.set(1, bk, 1);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(tick);
}
tick();
