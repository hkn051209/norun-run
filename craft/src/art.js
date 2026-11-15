/* =========================================================
   おえかき画面：描いた 絵が 武器・ペット・道具の 見た目に なる
   - 標準の Canvas だけで 描く（192×192、すきとおった 地）
   - 色は 解放ずみの 色だけ。太さ 3つ・けしごむ・もどす・ぜんぶ けす
   - 保存枠：武器 3つ・ペット 3つ・道具は 種類ごとに 1つ（ピッケル・おの・シャベル・つりざお）
   - 絵は PNG（data URL）と、ぬった 広さ（area：0〜1）で スロットの セーブに 入る
   ========================================================= */
import { COLORS, COLOR_INDEX } from "./colors.js";
import { TOOLS, TOOL_KEYS } from "./items.js";

const SIZE = 192;
const WIDTHS = [5, 11, 20];
const $ = (id) => document.getElementById(id);

export class ArtScreen {
  /* api：{ g, changed(kind, key), toast, close() } */
  constructor(api) {
    this.api = api;
    this.kind = "weapon"; this.index = 0; this.toolKey = "pick";
    this.color = "kuro"; this.width = 1; this.eraser = false;
    this.undo = []; this.dirty = false; this.drawing = null;
    this.cv = $("artCv"); this.ctx = this.cv.getContext("2d");
    this.cv.width = this.cv.height = SIZE;

    for (const t of document.querySelectorAll("#artTabs button")) t.addEventListener("click", () => this.setKind(t.dataset.kind));
    $("artUndo").addEventListener("click", () => this.undoOne());
    $("artClear").addEventListener("click", () => { this.push(); this.ctx.clearRect(0, 0, SIZE, SIZE); this.dirty = true; });
    $("artEraser").addEventListener("click", () => { this.eraser = !this.eraser; this.refreshTools(); });
    document.querySelectorAll("#artWidths button").forEach((b, i) => b.addEventListener("click", () => { this.width = i; this.refreshTools(); }));
    $("artSave").addEventListener("click", () => this.save(true));
    $("artOff").addEventListener("click", () => this.takeOff());
    $("artClose").addEventListener("click", () => this.api.close());

    const cv = this.cv;
    const pos = (e) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * SIZE, y: (e.clientY - r.top) / r.height * SIZE }; };
    cv.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      if (this.drawing) return;
      try { cv.setPointerCapture(e.pointerId); } catch (err) { /* 合成イベント */ }
      this.push();
      const p = pos(e); this.drawing = { id: e.pointerId, x: p.x, y: p.y };
      this.stroke(p.x, p.y, p.x + 0.01, p.y + 0.01);
    });
    cv.addEventListener("pointermove", (e) => {
      const d = this.drawing; if (!d || d.id !== e.pointerId) return;
      const p = pos(e); this.stroke(d.x, d.y, p.x, p.y); d.x = p.x; d.y = p.y;
    });
    const end = (e) => { if (this.drawing && this.drawing.id === e.pointerId) this.drawing = null; };
    cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);
  }

  stroke(x0, y0, x1, y1) {
    const c = this.ctx;
    c.globalCompositeOperation = this.eraser ? "destination-out" : "source-over";
    c.strokeStyle = COLORS[COLOR_INDEX[this.color]].hex;
    c.lineWidth = WIDTHS[this.width] * (this.eraser ? 1.4 : 1); c.lineCap = "round"; c.lineJoin = "round";
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    c.globalCompositeOperation = "source-over";
    this.dirty = true;
  }
  push() { this.undo.push(this.ctx.getImageData(0, 0, SIZE, SIZE)); if (this.undo.length > 20) this.undo.shift(); }
  undoOne() { const im = this.undo.pop(); if (im) { this.ctx.putImageData(im, 0, 0); this.dirty = true; } }

  /* いま えらんで いる 枠の 絵（なければ null） */
  entry() {
    const a = this.api.g.art;
    return this.kind === "weapon" ? a.weapons[this.index] : this.kind === "pet" ? a.pets[this.index] : a.tools[this.toolKey];
  }
  setEntry(v) {
    const a = this.api.g.art;
    if (this.kind === "weapon") a.weapons[this.index] = v; else if (this.kind === "pet") a.pets[this.index] = v; else a.tools[this.toolKey] = v;
  }

  open() {
    const g = this.api.g;
    if (!g.colors.includes(this.color)) this.color = g.colors.includes("kuro") ? "kuro" : g.colors[0];
    this.refreshAll(); this.loadEntry();
  }
  setKind(k) { this.kind = k; this.refreshAll(); this.loadEntry(); }
  pick(i) { if (this.kind === "tool") this.toolKey = i; else this.index = i; this.refreshSlots(); this.loadEntry(); }

  loadEntry() {
    this.undo.length = 0; this.dirty = false;
    this.ctx.clearRect(0, 0, SIZE, SIZE);
    const e = this.entry();
    if (e) { const im = new Image(); im.onload = () => { if (this.entry() === e && !this.dirty) this.ctx.drawImage(im, 0, 0, SIZE, SIZE); }; im.src = e.img; }
    this.refreshButtons();
  }

  refreshAll() { this.refreshTabs(); this.refreshSlots(); this.refreshPalette(); this.refreshTools(); this.refreshButtons(); }
  refreshTabs() { for (const t of document.querySelectorAll("#artTabs button")) t.classList.toggle("sel", t.dataset.kind === this.kind); }
  refreshSlots() {
    const g = this.api.g, box = $("artSlots"); box.innerHTML = "";
    const add = (key, entry, label, sel, mark) => {
      const b = document.createElement("button"); b.className = "aslot" + (sel ? " sel" : ""); b.dataset.key = key;
      if (entry) { const im = document.createElement("img"); im.src = entry.img; im.alt = ""; b.appendChild(im); }
      else { const s = document.createElement("span"); s.className = "plus"; s.textContent = "＋"; b.appendChild(s); }
      const l = document.createElement("span"); l.className = "lab"; l.textContent = label + (mark ? " ★" : ""); b.appendChild(l);
      b.addEventListener("click", () => this.pick(key));
      box.appendChild(b);
    };
    if (this.kind === "tool") for (const k of TOOL_KEYS) add(k, g.art.tools[k], TOOLS[k].name, k === this.toolKey, false);
    else {
      const list = this.kind === "weapon" ? g.art.weapons : g.art.pets;
      const eq = this.kind === "weapon" ? g.equip.weapon : g.equip.pet;
      for (let i = 0; i < list.length; i++) add(i, list[i], (this.kind === "weapon" ? "ぶき" : "ペット") + (i + 1), i === this.index, eq === i);
    }
  }
  refreshPalette() {
    const g = this.api.g, box = $("artPal"); box.innerHTML = "";
    COLORS.forEach((c) => {
      const have = g.colors.includes(c.key);
      const b = document.createElement("button"); b.className = "sw" + (have ? "" : " lock") + (c.key === this.color && !this.eraser ? " sel" : "");
      b.dataset.color = c.key; b.title = have ? c.name : "まだ みつけて いない いろ";
      if (have) { b.style.background = c.hex; b.addEventListener("click", () => { this.color = c.key; this.eraser = false; this.refreshPalette(); this.refreshTools(); }); }
      else b.textContent = "？";
      box.appendChild(b);
    });
    $("artColorName").textContent = this.eraser ? "けしごむ" : COLORS[COLOR_INDEX[this.color]].name;
  }
  refreshTools() {
    document.querySelectorAll("#artWidths button").forEach((b, i) => b.classList.toggle("sel", i === this.width));
    $("artEraser").classList.toggle("sel", this.eraser);
    this.refreshPalette();
  }
  refreshButtons() {
    const g = this.api.g, e = this.entry();
    const hint = { weapon: "かいた えが ぶきに なるよ。「たたく」で ふるよ", pet: "かいた えが ペットに なって ついて くるよ", tool: "つくった どうぐの みためが この えに なるよ" }[this.kind];
    $("artHint").textContent = hint;
    $("artSave").textContent = this.kind === "weapon" ? "ほぞん して もつ" : this.kind === "pet" ? "ほぞん して よぶ" : "ほぞん して つかう";
    const on = this.kind === "weapon" ? g.equip.weapon === this.index : this.kind === "pet" ? g.equip.pet === this.index : !!e;
    $("artOff").textContent = this.kind === "weapon" ? "はずす" : this.kind === "pet" ? "かえす" : "もとの みために もどす";
    $("artOff").disabled = !on;
  }

  /* ぬった 広さ（0〜1） */
  area() {
    const d = this.ctx.getImageData(0, 0, SIZE, SIZE).data; let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 40) n++;
    return n / (SIZE * SIZE);
  }

  /* 保存。use：そのまま 装備／召喚する */
  save(use) {
    const g = this.api.g, area = this.area();
    if (area < 0.002) {            // なにも 描いて いない ＝ その 枠を 空に する
      this.setEntry(null);
      if (this.kind === "weapon" && g.equip.weapon === this.index) g.equip.weapon = -1;
      if (this.kind === "pet" && g.equip.pet === this.index) g.equip.pet = -1;
      this.api.toast("えが ないので からに したよ");
    } else {
      this.setEntry({ img: this.cv.toDataURL("image/png"), area: Math.round(area * 1000) / 1000 });
      if (use && this.kind === "weapon") g.equip.weapon = this.index;
      if (use && this.kind === "pet") g.equip.pet = this.index;
      this.api.toast(this.kind === "weapon" ? "ぶきが できた！" : this.kind === "pet" ? "ペットが うまれた！" : "どうぐの みためが かわったよ");
    }
    this.dirty = false;
    this.api.changed(this.kind, use);
    this.refreshSlots(); this.refreshButtons();
  }
  takeOff() {
    const g = this.api.g;
    if (this.kind === "weapon") g.equip.weapon = -1;
    else if (this.kind === "pet") g.equip.pet = -1;
    else { this.setEntry(null); this.ctx.clearRect(0, 0, SIZE, SIZE); }
    this.api.changed(this.kind, false);
    this.refreshSlots(); this.refreshButtons();
  }
}
