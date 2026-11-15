/* =========================================================
   端末の 間で セーブを 共有する（Firebase Realtime Database の REST。fetch だけ）
   - 「あいことば」1つ ＝ 最新の セーブ 1件（上書き）
   - データベースの 中の 場所：<dbUrl>/norun-craft/v2/shares/<あいことばの SHA-256>.json
     あいことば そのものは 送らない（ハッシュだけ）。一覧は 読めない ルールに する（DESIGN.md）
   - 失敗は { code } つきの Error で 返す：
       config（URL が 未設定）／offline（ネットなし）／short（あいことばが 短い）
       notfound（その あいことばの データが ない）／net（通信の 失敗）／bad（中身が こわれて いる）
   ========================================================= */
import { SHARE } from "./config.js";

let dbUrl = SHARE.dbUrl;
export function setDbUrl(u) { dbUrl = u; }
export const configured = () => /^https:\/\/[^/]+/.test(dbUrl) && !dbUrl.includes("YOUR-PROJECT");

const fail = (code, msg) => Object.assign(new Error(msg), { code });
export const MESSAGES = {
  config: "きょうゆうの じゅんびが まだだよ（おうちの ひとへ：src/config.js の dbUrl）",
  offline: "いまは ネットに つながって いないので、きょうゆうは つかえないよ",
  short: `あいことばは ${SHARE.minLen}もじ いじょうに してね`,
  notfound: "その あいことばの データは みつからなかったよ",
  net: "うまく つうしん できなかったよ。あとで もういちど ためしてね",
  bad: "とどいた データが こわれて いたよ",
};

const norm = (pass) => String(pass || "").normalize("NFKC").trim();

/* あいことば → データベースの キー（SHA-256 の 16進） */
export async function keyOf(pass) {
  const p = norm(pass);
  if ([...p].length < SHARE.minLen) throw fail("short", MESSAGES.short);
  if (!(globalThis.crypto && crypto.subtle)) throw fail("net", MESSAGES.net);
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("norun-craft:" + p));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function request(pass, init) {
  if (!configured()) throw fail("config", MESSAGES.config);
  const key = await keyOf(pass);
  if (navigator.onLine === false) throw fail("offline", MESSAGES.offline);
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), SHARE.timeoutMs);
  let res;
  try { res = await fetch(`${dbUrl.replace(/\/+$/, "")}/${SHARE.path}/${key}.json`, { ...init, signal: ac.signal, cache: "no-store" }); }
  catch (e) { throw fail(navigator.onLine === false ? "offline" : "net", navigator.onLine === false ? MESSAGES.offline : MESSAGES.net); }
  finally { clearTimeout(timer); }
  if (!res.ok) throw fail("net", MESSAGES.net);
  return res.json();
}

/* 送る：code（書き出しコード）を あいことばの 場所へ 上書き */
export async function send(pass, code, name) {
  await request(pass, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: code, name: String(name || "").slice(0, 12), savedAt: Date.now() }) });
  return true;
}
/* 受けとる：{ data（書き出しコード）, name, savedAt } */
export async function receive(pass) {
  const v = await request(pass, { method: "GET" });
  if (v === null) throw fail("notfound", MESSAGES.notfound);
  if (!v || typeof v.data !== "string") throw fail("bad", MESSAGES.bad);
  return v;
}
