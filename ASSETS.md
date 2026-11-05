# のるんラン 素材の出どころとライセンス

販売・配布用に作り直すときのための記録です。素材は差し替えできるように、1つずつファイルを分けています。

| 素材 | ファイル | 出どころ | ライセンス・権利 |
|---|---|---|---|
| キャラクター「のるん」 | — | ひこのさんのオリジナルキャラクター | 権利はひこのさん |
| のるんの3Dモデル | assets/models/norun-v4.glb | クロド制作（norun build.py） | ひこのさんのキャラクターに基づく制作物 |
| 道ばたの木・柵・草・花・茂み・小石・切り株・丸太・きのこ・立て札 | assets/models/nature/*.glb（26モデル） | Kenney「Nature Kit」2.1（www.kenney.nl） | CC0（クレジット表記は任意。assets/models/nature/KENNEY-LICENSE.txt） |
| 3D描画ライブラリ | lib/three.module.min.js, lib/addons/*.js | three.js r160 | MIT（lib/THREE-LICENSE.txt） |
| 背景・障害物・ゲート・ゴール・道の模様・山・演出 | src/main.js 内で図形と canvas から生成 | クロド制作（外部素材なし） | — |
| 図鑑の絵 | 絵文字 | 端末の絵文字フォント | 表示は端末依存。販売時は自前の絵に差し替え推奨 |
| BGM | assets/bgm.mp3（未同梱） | 未定 | 置けば自動で鳴る。出どころを追記すること |

## データの扱い
- プレイヤー名・進行・図鑑は、端末内（localStorage）のみに保存。外部への送信はしない。
- 保存キーは `norunrun.v1.player.<名前>` で、名前ごとに完全に分かれている。

## Kenney「Nature Kit」で使っているモデル
すべて CC0。元のファイル名のまま `assets/models/nature/` に入れています。葉っぱ・草の色だけ、ゲーム側（src/main.js の `KIT_RECOLOR`）で色を置きかえています（ファイルは無加工）。

| 用途 | モデル |
|---|---|
| 道の近くの大きな木・遠くの木（はらっぱ） | tree_oak, tree_default, tree_fat, tree_detailed |
| 同（森） | tree_oak_dark, tree_default_dark, tree_pineRoundA, tree_pineTallA_detailed |
| 同（夕焼け／エンドレス） | tree_oak_fall, tree_default_fall, tree_fat_fall |
| 柵 | fence_simple |
| 草むら・茂み | grass, grass_large, plant_bushDetailed, plant_bushLarge |
| 花 | flower_redA, flower_yellowA, flower_purpleA |
| 小石・切り株・丸太 | rock_smallA, rock_smallC, stump_round, log |
| きのこ（森） | mushroom_redGroup, mushroom_tanGroup |
| 立て札 | sign |
