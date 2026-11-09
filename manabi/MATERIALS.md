# 本物の 素材（写真・録音）の 入れ方（第11弾）

ひこのさんの 要望：「全てのものが、もし素材で取れるなら取ってきてほしい（音だけでなく、見た目の素材も）」。
集めるのは もちゃおさん、ゲームへの 組みこみは クロド。**ファイルを 決まった 名前で 置くだけで 自動で つかう** ように した（ない 物は いまの 絵・合成音の まま）。

## いま 入って いる もの（第11弾・もちゃおさんの 素材ZIPから）
- **写真**：床＝キーボード・ぷにぷに（グミ）・しゃりしゃり（雪）・ざくざく（クッキー）・ふわふわ（わたあめ）・ぱりぱり（せんべい）・ころころ（ボールプール）・チョコマシュマロ（チョコ）。
  足場＝クッキーと せんべいの 上の面、チョコマシュマロの われた 中。プール＝かき氷（雪）・わたあめ（つぶ）・とろとろチョコ。
- **音**：ぷにぷに・しゃりしゃり・ねばねば・ざくざく・スライム・ぱりぱり・ころころ・チョコマシュマロ（われる 音）・プッシュポップ に 本物の 録音を 足した（`step_<id>_r1`…・`land_<id>_r1`…）。今までの 音と ランダムに まざる。ぷにぷにの 合成の 踏み音は 本物に おきかえ。
- まだ ない もの：ねばねば・スライム・プッシュポップの 写真、ふわふわ（わたあめ）の 音、マシュマロが つぶれる 音。かべは パステルの 市松の まま（写真を 置けば かわる）。
- 出典と ライセンスは ASSETS.md。CC BY の 3つ（雪の 音2つ・Crunch）は 保護者画面の「クレジット」にも 表示。

## 写真を 足す 時の きまり
- `assets/tex/` に JPG を 置いて、**`assets/tex/list.json` に 名前（.jpg なし）を 足す**。list.json に ない 名前は 読みに いかない（ない ファイルを 何回も 取りに いかない ため）。

## ライセンスの きまり
- **CC0（パブリックドメイン）** が いちばん 安心。CC-BY なら 作者名を ASSETS.md に 書けば OK。
- 「商用不可」「改変不可」「再配布不可」は つかわない。
- 取ってきた 所（サイト名・URL・作者・ライセンス）を ASSETS.md の 表に 1行ずつ 足す。
- さがしやすい 所：写真＝ Poly Haven（CC0）・ambientCG（CC0）・Pexels（無料・クレジット不要）、音＝ Freesound（CC0 で しぼる）・Kenney（CC0）・Sonniss の 無料パック。

## 見た目（写真）：`assets/tex/` に JPG
- 正方形（512×512 〜 1024×1024）・**つなぎめなく くりかえせる**（seamless / tileable）もの。1まい 300KB 以下に 圧縮。
- 床は タイル1まい（2.5m）に 1まい、かべは 4.4m ごとに 1まい 貼る。

| ファイル | 部屋 | 中身の 例（さがす 言葉） |
|---|---|---|
| `key-floor.jpg` / `key-wall.jpg` | キーボード | キーボードを 上から（keyboard keys top view）／パステルの 壁 |
| `puni-floor.jpg` / `puni-wall.jpg` | ぷにぷに | グミの アップ（gummy candy texture） |
| `shari-floor.jpg` / `shari-wall.jpg` | しゃりしゃり | かき氷・氷の アップ（shaved ice / crushed ice texture） |
| `neba-floor.jpg` / `neba-wall.jpg` | ねばねば | はちみつ（honey texture）／はちの す（honeycomb） |
| `zaku-floor.jpg` / `zaku-wall.jpg` | ざくざく | クッキー（cookie texture / biscuit） |
| `slime-floor.jpg` / `slime-wall.jpg` | スライム | スライム（slime texture / green jelly） |
| `fuwa-floor.jpg` / `fuwa-wall.jpg` | ふわふわ | わたあめ（cotton candy texture） |
| `pari-floor.jpg` / `pari-wall.jpg` | ぱりぱり | せんべい（rice cracker / senbei texture） |
| `koro-floor.jpg` / `koro-wall.jpg` | ころころ | ビーズ（beads texture / colorful beads） |
| `choco-floor.jpg` / `choco-wall.jpg` | チョコマシュマロ | チョコ（chocolate texture）／マシュマロ |
| `push-floor.jpg` / `push-wall.jpg` | プッシュポップ | シリコン（silicone texture / pop it） |
| `pool-slime.jpg` | スライムプール | スライムの 表面 |
| `pool-ice.jpg` | かきごおりプール | かき氷の 表面（シロップ つき でも よい） |
| `pool-choco.jpg` | とろとろチョコ | とけた チョコの 表面（melted chocolate） |

- ビーズプール・わたあめプールは 1つぶずつ 3Dで 動かしているので、写真は いらない。
- 足場の 物（キー・グミ・スプーン・びん・クッキー・せんべい・チョコマシュマロ…）は 3Dの 形で 作っているので、まずは 床・かべ・プールの 写真から。足場にも 写真を 貼りたい 時は 言ってください（物ごとに 組みこみが いる）。

## 音（録音）：`assets/audio/` に MP3
- **足音では なく、その 素材 そのものから 出る 音**（第11弾の 芯）。人が 歩く「コツコツ」「ザッザッ」は 入れない。くわしい 中身と 名前は AUDIO.md の「素材の 音」。
- 例：せんべい＝われる「パリッ」、スライム＝つぶれる「ぶちゅっ」、ビーズ＝こすれて ながれる「じゃらっ」、かき氷＝つぶれる「しゃくっ」、チョコマシュマロ＝チョコが われる「パキッ」→ 中が つぶれる「ふにゅっ」。
- 1つの 音に つき 2〜4本 あると、ランダムに まぜて あきにくく なる（`step_<id>.mp3` ＋ `step_<id>_gen.mp3` など。まぜる 名前を ふやしたい 時は 言ってください）。
