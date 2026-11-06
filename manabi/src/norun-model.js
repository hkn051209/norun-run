/* =========================================================
   のるんの モデル（norun-v7.glb）の 共通の あつかい
   - 帽子の右に バッジの スロットが3つ（Slot_1〜3）。各スロットに 6種（panda / star / moon / heart / paw / fish）
   - 読みこんだ直後は ぜんぶ見えているので 初期化する（userData.defaultVisible が true のものだけ）
   - 切りかえは 名前ではなく userData.badgeId で 判定（three.js が 同じ名前の ノードを 改名するため）
   ========================================================= */
export const MODEL_URL = "assets/models/norun-v7.glb";

/* モデルの中の スロットを さがす：[{ slot: 1, items: [{ id, obj, def }] }, ...] */
export function findPinSlots(root) {
  const slots = [];
  root.traverse((o) => {
    const n = o.userData && o.userData.slot;
    if (!n) return;
    const items = [];
    for (const c of o.children) if (c.userData && c.userData.badgeId) items.push({ id: c.userData.badgeId, obj: c, def: !!c.userData.defaultVisible });
    slots[n - 1] = { slot: n, items };
  });
  applyPins(slots, null);
  return slots;
}

/* pins: スロットごとの badgeId（または null＝空き）。pins が null なら モデルの 初期の見た目 */
export function applyPins(slots, pins) {
  slots.forEach((s, i) => {
    if (!s) return;
    const want = pins ? pins[i] || null : undefined;
    for (const it of s.items) it.obj.visible = pins ? it.id === want : it.def;
  });
}
