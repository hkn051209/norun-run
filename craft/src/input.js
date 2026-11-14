/* =========================================================
   操作（タブレット前提、パソコンでも 遊べる）
   タッチ：
     - 画面の 左半分を さわる → その 場所に パッドが 出る（指を ずらした 向きと 量で 歩く）
     - 右半分を スワイプ → 見まわす
     - パッドの 指を おいた まま、べつの 指は どこを スワイプしても 見まわし
       （見まわしの 指が 先なら、べつの 指は どこを さわっても パッド）
     - ボタン（ジャンプ・こわす・おく・ホットバー・メニュー）の 上では パッドは 出ない
   パソコン：
     - WASD／矢印＝歩く、スペース＝ジャンプ、マウスドラッグ＝見まわす
     - 左クリック＝こわす、右クリック＝おく、1〜9・ホイール＝ブロックを えらぶ
   ========================================================= */
import { CAM } from "./config.js";

export class Input {
  constructor(canvas, els, handlers) {
    this.canvas = canvas; this.els = els; this.h = handlers;
    this.padX = 0; this.padY = 0;         // パッド（-1〜1。上が -1）
    this.keys = new Set();
    this.jumpBtn = false;
    this.lookDX = 0; this.lookDY = 0;     // たまった スワイプ量（px）。main が 毎コマ 取り出す
    this.touchMode = matchMedia("(pointer: coarse)").matches;
    this.mouse = { x: 0, y: 0, inside: false };
    this.pad = null; this.look = null; this.drag = null;
    this.enabled = true;

    const c = canvas;
    c.addEventListener("pointerdown", (e) => this.down(e));
    c.addEventListener("pointermove", (e) => this.move(e));
    c.addEventListener("pointerup", (e) => this.up(e));
    c.addEventListener("pointercancel", (e) => this.up(e));
    c.addEventListener("contextmenu", (e) => e.preventDefault());
    c.addEventListener("wheel", (e) => { e.preventDefault(); this.h.cycle(e.deltaY > 0 ? 1 : -1); }, { passive: false });
    c.addEventListener("pointerleave", () => { this.mouse.inside = false; });

    addEventListener("keydown", (e) => {
      if (!this.enabled || e.target.tagName === "TEXTAREA") return;
      if (e.code === "Space" || e.code.startsWith("Arrow")) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code);
      if (/^Digit[1-9]$/.test(e.code)) this.h.select(+e.code.slice(5) - 1);
    });
    addEventListener("keyup", (e) => this.keys.delete(e.code));
    addEventListener("blur", () => this.releaseAll());
    document.addEventListener("visibilitychange", () => { if (document.hidden) this.releaseAll(); });

    this.hold(els.jump, (on) => { this.jumpBtn = on; });
    this.repeat(els.brk, () => this.h.breakBlock());
    this.repeat(els.put, () => this.h.placeBlock());
  }

  releaseAll() {
    this.keys.clear(); this.jumpBtn = false;
    this.endPad(); this.look = null; this.drag = null;
    for (const b of [this.els.jump, this.els.brk, this.els.put]) b.classList.remove("on");
  }

  setTouchMode(on) {
    if (this.touchMode === on) return;
    this.touchMode = on;
    this.h.modeChanged(on);
  }

  /* おして いる 間だけ on */
  hold(el, fn) {
    const off = (e) => { if (el._pid !== undefined && (!e || e.pointerId === el._pid)) { el._pid = undefined; el.classList.remove("on"); fn(false); } };
    el.addEventListener("pointerdown", (e) => {
      e.preventDefault(); this.setTouchMode(e.pointerType !== "mouse"); this.h.gesture();
      el._pid = e.pointerId; el.classList.add("on"); fn(true);
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* 合成イベント */ }
    });
    el.addEventListener("pointerup", off); el.addEventListener("pointercancel", off);
    el.addEventListener("lostpointercapture", off);
    el.addEventListener("contextmenu", (e) => e.preventDefault());
  }
  /* おした 時に 1回、おしっぱなしで くりかえし */
  repeat(el, fn) {
    let timer = 0;
    this.hold(el, (on) => {
      clearInterval(timer);
      if (on) { fn(); timer = setInterval(fn, 280); }
    });
  }

  down(e) {
    if (!this.enabled) return;
    this.h.gesture();
    try { this.canvas.setPointerCapture(e.pointerId); } catch (err) { /* 合成イベント */ }
    if (e.pointerType === "mouse") {
      this.setTouchMode(false);
      if (e.button === 2) { this.h.placeBlock(); return; }
      if (e.button === 0) this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: 0, t: performance.now() };
      return;
    }
    this.setTouchMode(true);
    e.preventDefault();
    const wantPad = !this.pad && (this.look || e.clientX < innerWidth * 0.5);
    if (wantPad) {
      this.pad = { id: e.pointerId, x: e.clientX, y: e.clientY };
      const p = this.els.pad;
      p.style.left = e.clientX + "px"; p.style.top = e.clientY + "px";
      p.classList.add("show");
      this.els.knob.style.transform = "translate(-50%,-50%)";
    } else if (!this.look) {
      this.look = { id: e.pointerId, x: e.clientX, y: e.clientY };
    }
  }

  move(e) {
    if (e.pointerType === "mouse") {
      this.mouse.x = (e.clientX / innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / innerHeight) * 2 + 1;
      this.mouse.inside = true;
      const d = this.drag;
      if (d && d.id === e.pointerId) {
        const dx = e.clientX - d.x, dy = e.clientY - d.y;
        d.x = e.clientX; d.y = e.clientY; d.moved += Math.abs(dx) + Math.abs(dy);
        if (d.moved > 5) { this.lookDX += dx; this.lookDY += dy; }
      }
      return;
    }
    if (this.pad && e.pointerId === this.pad.id) {
      let dx = e.clientX - this.pad.x, dy = e.clientY - this.pad.y;
      const len = Math.hypot(dx, dy), full = CAM.padFull;
      if (len > full) { dx *= full / len; dy *= full / len; }
      this.els.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      if (len < CAM.padDead) { this.padX = 0; this.padY = 0; }
      else { this.padX = dx / full; this.padY = dy / full; }
    } else if (this.look && e.pointerId === this.look.id) {
      this.lookDX += e.clientX - this.look.x; this.lookDY += e.clientY - this.look.y;
      this.look.x = e.clientX; this.look.y = e.clientY;
    }
  }

  endPad() {
    this.pad = null; this.padX = 0; this.padY = 0;
    this.els.pad.classList.remove("show");
  }

  up(e) {
    if (e.pointerType === "mouse") {
      const d = this.drag;
      if (d && d.id === e.pointerId) {
        this.drag = null;
        // 動かさずに はなした ＝ クリック ＝ こわす
        if (e.type === "pointerup" && d.moved <= 5 && performance.now() - d.t < 400) this.h.breakBlock();
      }
      return;
    }
    if (this.pad && e.pointerId === this.pad.id) this.endPad();
    if (this.look && e.pointerId === this.look.id) this.look = null;
  }

  /* 歩く 向き（x：右が＋、y：前が −）。長さは 1 まで */
  moveVec() {
    let x = this.padX, y = this.padY;
    const k = this.keys;
    if (k.has("KeyA") || k.has("ArrowLeft")) x -= 1;
    if (k.has("KeyD") || k.has("ArrowRight")) x += 1;
    if (k.has("KeyW") || k.has("ArrowUp")) y -= 1;
    if (k.has("KeyS") || k.has("ArrowDown")) y += 1;
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    return { x, y };
  }
  get jump() { return this.jumpBtn || this.keys.has("Space"); }
  takeLook() { const r = { dx: this.lookDX, dy: this.lookDY }; this.lookDX = 0; this.lookDY = 0; return r; }
}
