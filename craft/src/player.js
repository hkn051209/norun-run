/* =========================================================
   のるんの 動きと 当たり判定（箱 vs ブロック）
   - 位置 (x, y, z) は 足もとの まんなか
   - 横に ぶつかった 時、1段（1マス）なら 自動で 乗りこえる
   - 世界の はしは 見えない かべ
   ========================================================= */
import { WORLD, PLAYER } from "./config.js";
import { B } from "./blocks.js";

export class Player {
  constructor(world) {
    this.world = world;
    this.w = 0.8; this.h = 0.9;
    this.x = 0; this.y = 0; this.z = 0;
    this.vx = 0; this.vy = 0; this.vz = 0;
    this.onGround = false;
    this.inWater = false; this.waterT = 0;
    this.stepVis = 0;   // 段を 乗りこえた 時の 見た目の なめらかさ用（0 へ もどる）
    this.landT = 0;     // 着地の ぺちゃんこ（1 → 0）
    this.jumped = false;
  }
  setSize(w, h) { this.w = w; this.h = h; }
  place(p) { this.x = p.x; this.y = p.y; this.z = p.z; this.vx = this.vy = this.vz = 0; this.stepVis = 0; }

  collides(x, y, z) {
    const hw = this.w / 2;
    if (x - hw < 0 || z - hw < 0 || x + hw > WORLD.sx || z + hw > WORLD.sz) return true;
    const x0 = Math.floor(x - hw), x1 = Math.floor(x + hw - 1e-7);
    const y0 = Math.floor(y), y1 = Math.floor(y + this.h - 1e-7);
    const z0 = Math.floor(z - hw), z1 = Math.floor(z + hw - 1e-7);
    for (let yy = y0; yy <= y1; yy++) for (let zz = z0; zz <= z1; zz++) for (let xx = x0; xx <= x1; xx++) {
      if (this.world.solid(xx, yy, zz)) return true;
    }
    return false;
  }
  /* その マスに ブロックを 置くと のるんに めりこむか */
  overlapsCell(bx, by, bz) {
    const hw = this.w / 2;
    return this.x + hw > bx && this.x - hw < bx + 1 && this.z + hw > bz && this.z - hw < bz + 1 && this.y + this.h > by && this.y < by + 1;
  }

  moveH(axis, d, canStep) {
    if (!d) return;
    const nx = this.x + (axis === 0 ? d : 0), nz = this.z + (axis === 2 ? d : 0);
    if (!this.collides(nx, this.y, nz)) { this.x = nx; this.z = nz; return; }
    // 1段の 乗りこえ
    const up = 1.001;
    if (canStep && !this.collides(this.x, this.y + up, this.z) && !this.collides(nx, this.y + up, nz)) {
      this.y += up; this.x = nx; this.z = nz; this.stepVis -= up;
      if (this.vy < 0) this.vy = 0;
      return;
    }
    const hw = this.w / 2, e = 1e-4;
    if (axis === 0) { this.x = d > 0 ? Math.floor(nx + hw) - hw - e : Math.floor(nx - hw) + 1 + hw + e; this.vx = 0; }
    else { this.z = d > 0 ? Math.floor(nz + hw) - hw - e : Math.floor(nz - hw) + 1 + hw + e; this.vz = 0; }
  }

  /* wishX, wishZ：行きたい 向き（長さ 0〜1）。jump：ジャンプを おして いるか */
  update(dt, wishX, wishZ, jump) {
    const w = this.world;
    this.inWater = w.get(Math.floor(this.x), Math.floor(this.y + 0.3), Math.floor(this.z)) === B.WATER;
    this.waterT = this.inWater ? 0.35 : Math.max(0, this.waterT - dt);

    const sp = PLAYER.speed * (this.inWater ? 0.6 : 1);
    const k = Math.min(1, dt * (this.onGround ? 14 : 6));
    this.vx += (wishX * sp - this.vx) * k;
    this.vz += (wishZ * sp - this.vz) * k;

    this.jumped = false;
    if (jump) {
      if (this.inWater) this.vy = Math.max(this.vy, 6);          // 水の 中は およいで 上がる
      else if (this.onGround) { this.vy = PLAYER.jumpV; this.onGround = false; this.jumped = true; }
    }

    const canStep = (this.onGround || this.waterT > 0) && this.vy <= 6.01;
    this.moveH(0, this.vx * dt, canStep);
    this.moveH(2, this.vz * dt, canStep);

    if (this.inWater) { this.vy -= 7 * dt; if (this.vy < -2.5) this.vy = -2.5; }
    else { this.vy -= PLAYER.gravity * dt; if (this.vy < -PLAYER.maxFall) this.vy = -PLAYER.maxFall; }
    const ny = this.y + this.vy * dt;
    const wasGround = this.onGround;
    if (!this.collides(this.x, ny, this.z)) { this.y = ny; this.onGround = false; }
    else if (this.vy <= 0) {
      this.y = Math.floor(ny) + 1;
      if (!wasGround && this.vy < -7) this.landT = 1;
      this.onGround = true; this.vy = 0;
    } else { this.y = Math.floor(ny + this.h) - this.h - 1e-4; this.vy = 0; }

    // 万一 うまって しまったら 上へ にがす（読みこみ直後など）
    let guard = 0;
    while (this.collides(this.x, this.y, this.z) && guard++ < WORLD.sy) this.y = Math.floor(this.y) + 1;

    this.stepVis *= Math.exp(-dt * 13);
    if (Math.abs(this.stepVis) < 0.002) this.stepVis = 0;
    this.landT = Math.max(0, this.landT - dt * 5);
  }
}
