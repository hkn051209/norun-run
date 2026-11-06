# のるん まなび 素材の出どころとライセンス

| 素材 | ファイル | 出どころ | ライセンス・権利 |
|---|---|---|---|
| キャラクター「のるん」 | — | ひこのさんのオリジナルキャラクター | 権利はひこのさん |
| のるんの3Dモデル | assets/models/norun-v7.glb | ひこのさんから 受けとった v7（帽子の バッジ 3スロット×6種 入り） | ひこのさんのキャラクターに基づく制作物 |
| くらげ・パンの3Dモデル | assets/models/norun-kurage.glb, norun-pan.glb | ひこのさん側で 公開ずみの ファイル（この ZIP には ふくまれない。更新の時に 消さないこと） | ひこのさんのキャラクターに基づく制作物 |
| 3D描画ライブラリ | lib/three.module.min.js, lib/addons/*.js | three.js r160 | MIT（lib/THREE-LICENSE.txt） |
| 遊びのラン・アスレ・ASMRタワーの 障害物・アイテム・コースの部品・しかけ・素材の もよう・看板 | src/run3d.js, src/tower3d.js | three.js の 基本の形と その場で描いた模様で クロドが制作（外部素材なし） | — |
| 効果音 | src/sound.js | ブラウザの音源で その場で合成（音声ファイルなし） | — |
| 読み上げ | — | 端末の読み上げ機能（Web Speech API） | 端末の機能を使うだけ |
| 漢字の出題データ（最初のデータ） | src/kokugo-data.js | 文部科学省「学年別漢字配当表」（2020年度〜）の 小4（202字）・小5（193字）を もとに、ことば・よみ・送り仮名を クロドが作成。熟語は1字につき2語（2語目は 音読み／訓読みが ちがう読みを優先）。並び順は 光村図書『国語』令和6年度版の 新出漢字の順（kodomoprint.com の「令和6年改訂版対応」の 学期別一覧を参照）。一部のことばは 光村図書の 教材名・単元名（同社「令和6年度版 小学校『国語』出典一覧」など）から | 漢字表は公的な資料。ことばの選び方・読みは 保護者の方の確認をおすすめします（保護者画面で直せます） |
| 合言葉の絵・アイコン | 絵文字 | 端末の絵文字フォント | 表示は端末依存。販売時は自前の絵に差し替え推奨 |
| BGM | assets/audio/bgm_menu.mp3, bgm_run.mp3, bgm_tower.mp3 | ひこのさんが Gemini で生成（2026-11-07）。末尾の無音をカットしループ接続を整形 | ひこのさんの生成物 |
| 効果音ファイル | assets/audio/se_*.mp3（7点） | Kenney の素材集（Interface Sounds / Digital Audio / Music Jingles）から選定・整形 | CC0 |
| ASMRタワーの足音 | assets/audio/step_shari.mp3, land_shari.mp3 | Kenney「Impact Sounds」の footstep_snow 系を整形 | CC0 |
| ASMRタワーの足音 | assets/audio/step_puni.mp3, land_puni.mp3 | OpenGameArt の ezduzziteh「Squish Sound Effects」「Boings」を整形 | CC0 |
| ASMRタワーの足音 | assets/audio/step_neba.mp3, land_neba.mp3 | OpenGameArt の rubberduck「25 CC0 mud sfx」を整形 | CC0 |

## データの扱い
- 名前・記録・持ち物は 端末内（localStorage）のみ。外部への送信はしない。
- 保存キーは `norunmanabi.v1.p.<id>` で、プロフィールごとに完全に分かれている。
- 保護者の暗証番号と合言葉は「きょうだいが まちがえて入らない」ための かんたんな鍵で、強い暗号ではありません。
