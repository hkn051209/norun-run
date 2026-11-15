/* =========================================================
   頭の 上の 名前（名札）
   - のるんの 頭の 上に、遊ぶ 人の 名前を 小さく 出す（一人称では 出さない）
   - 将来の 通信プレイでは、ほかの 人の キャラクターにも 同じ NameTag を 1つずつ 付ければ よい
     （new NameTag("なまえ") → tag.sprite を その キャラクターの グループに add、高さは tag.sprite.position.y）
   ========================================================= */
import * as THREE from "three";

export class NameTag {
  constructor(text = "") {
    this.canvas = document.createElement("canvas");
    this.canvas.width = 256; this.canvas.height = 64;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.texture, transparent: true, depthWrite: false, fog: false }));
    this.sprite.renderOrder = 5;
    this.text = null;
    this.set(text);
  }
  set(text) {
    text = String(text || "");
    if (text === this.text) return;
    this.text = text;
    const c = this.canvas.getContext("2d"), W = this.canvas.width, H = this.canvas.height;
    c.clearRect(0, 0, W, H);
    c.font = "800 30px 'Hiragino Maru Gothic ProN','Yu Gothic UI',system-ui,sans-serif";
    c.textAlign = "center"; c.textBaseline = "middle";
    const w = Math.min(W - 8, c.measureText(text).width + 28);
    c.fillStyle = "rgba(30,40,70,0.62)";
    c.beginPath(); c.roundRect((W - w) / 2, 10, w, 44, 14); c.fill();
    c.fillStyle = "#fff"; c.fillText(text, W / 2, 33, W - 24);
    this.texture.needsUpdate = true;
    this.sprite.scale.set(1.0, 0.25, 1);       // 小さめ（はば 1マス ぶんの 板）
    this.sprite.visible = !!text;
  }
}
