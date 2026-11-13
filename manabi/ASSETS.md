# のるん まなび 素材の出どころとライセンス

| 素材 | ファイル | 出どころ | ライセンス・権利 |
|---|---|---|---|
| キャラクター「のるん」 | — | ひこのさんのオリジナルキャラクター | 権利はひこのさん |
| のるんの3Dモデル | assets/models/norun-v7.glb | ひこのさんから 受けとった v7（帽子の バッジ 3スロット×6種 入り） | ひこのさんのキャラクターに基づく制作物 |
| くらげ・パンの3Dモデル | assets/models/norun-kurage.glb, norun-pan.glb | ひこのさんから 受けとった ファイル（2026-11-07）。体・顔・足（Foot_L/R）・触手（Tentacles 7本）を そのまま 使用 | ひこのさんのキャラクターに基づく制作物 |
| おばけ・ペンギンの3Dモデル | assets/models/norun-obake.glb, norun-penguin.glb | ひこのさんから 受けとった ファイル（2026-11-07）。おばけ：Ghost_Outline・M_Ghost・M_Face を すりぬけで 切りかえ。ペンギン：Flipper_L/R・Foot_L/R を うごかす（顔ノードの 変形は そのまま） | ひこのさんのキャラクターに基づく制作物 |
| 3D描画ライブラリ | lib/three.module.min.js, lib/addons/*.js | three.js r160 | MIT（lib/THREE-LICENSE.txt） |
| 遊びのラン・アスレ・ASMRタワーの 障害物・アイテム・コースの部品・しかけ・素材の もよう・看板 | src/run3d.js, src/tower3d.js | three.js の 基本の形と その場で描いた模様で クロドが制作（外部素材なし） | — |
| ASMRタワーの 踏み音（ざくざく・スライム・ふわふわ・ぱりぱり・ころころ・チョコマシュマロ・プッシュポップ・キーボードの 生成版） | assets/audio/step_*.mp3, land_*.mp3（zaku / slime / fuwa / pari / koro / choco / push、step_key_gen・land_key_gen） | ElevenLabs で 生成（利用者本人＝ひこのさんが 生成） | ElevenLabs の 利用規約に したがう（生成した 本人の 利用）。この ZIP には ふくまれない（公開先に 置いてある） |
| ASMRタワーの 踏み音（キーボードの 実録版） | assets/audio/step_key.mp3, step_key_alt.mp3, land_key.mp3 | ひこのさんが 録音した 実際の キーボードの 音 | 権利は ひこのさん |
| ASMRタワーの 踏み音（しゃりしゃり・ぷにぷに・ねばねば） | assets/audio/step_shari / puni / neba・land_* | ひこのさんが 用意（第4弾で 公開ずみ。しゃりしゃりは Kenney の 雪の 足音 → ElevenLabs 生成版に 差し替え予定：step_shari_gen / land_shari_gen でも 可） | Kenney は CC0 |
| 丸い 文字（フォント） | assets/fonts/mplus-rounded-1c-Medium.woff, -ExtraBold.woff | M PLUS Rounded 1c（M+ Fonts Project／Google Fonts）。ゲームで つかう 文字だけに しぼった サブセット | SIL Open Font License 1.1（assets/fonts/OFL.txt） |
| UIの イラスト（あとから 足す） | assets/ui/*.png | ひこのさんが ChatGPT で 生成（指定は ILLUST.md） | 生成した 本人の 利用（OpenAI の 利用規約に したがう） |
| 部屋の かざり（ガーランド・うかぶ ほし・はちのす もよう・スプーン・はちみつの びん） | src/asmr-rooms.js | three.js の 基本の形と その場で描いた模様で クロドが制作 | — |
| 効果音 | src/sound.js | ブラウザの音源で その場で合成（音声ファイルなし） | — |
| 読み上げ | — | 端末の読み上げ機能（Web Speech API） | 端末の機能を使うだけ |
| 漢字の出題データ（最初のデータ） | src/kokugo-data.js | 文部科学省「学年別漢字配当表」（2020年度〜）の 小4（202字）・小5（193字）を もとに、ことば・よみ・送り仮名を クロドが作成。熟語は1字につき2語（2語目は 音読み／訓読みが ちがう読みを優先）。並び順は 光村図書『国語』令和6年度版の 新出漢字の順（kodomoprint.com の「令和6年改訂版対応」の 学期別一覧を参照）。一部のことばは 光村図書の 教材名・単元名（同社「令和6年度版 小学校『国語』出典一覧」など）から | 漢字表は公的な資料。ことばの選び方・読みは 保護者の方の確認をおすすめします（保護者画面で直せます） |
| 合言葉の絵・アイコン | 絵文字 | 端末の絵文字フォント | 表示は端末依存。販売時は自前の絵に差し替え推奨 |

## データの扱い
- 名前・記録・持ち物は 端末内（localStorage）のみ。外部への送信はしない。
- 保存キーは `norunmanabi.v1.p.<id>` で、プロフィールごとに完全に分かれている。
- 保護者の暗証番号と合言葉は「きょうだいが まちがえて入らない」ための かんたんな鍵で、強い暗号ではありません。

## 第11弾：本物の 素材（もちゃおさん 収集・2026-11-09）
音は 元の 録音から「1回 ぶん」を 短く 切りだし（頭の 無音なし・最後は フェード）、音量を そろえて mp3 に した。写真は まんなかを 正方形に 切りぬいて 512px に した。

| ファイル | 元の 素材 | 出典 | ライセンス |
|---|---|---|---|
| assets/audio/step_puni_r1・r2 | 8 Wet Squish & Slurp Impacts（splat01） | OpenGameArt / qubodup | CC0 |
| assets/audio/land_puni_r1 | 同（splat03） | OpenGameArt / qubodup | CC0 |
| assets/audio/step_neba_r1 | 同（splat02） | OpenGameArt / qubodup | CC0 |
| assets/audio/step_shari_r1〜r3 | Crunchy Snow Walking Sound Effect | Wikimedia Commons / Free Sounds Library | **CC BY 3.0（クレジット要。保護者画面に 表示）** |
| assets/audio/land_shari_r1・r2 | Walking through snow | Wikimedia Commons / Lukas Beck | **CC BY 4.0（クレジット要。保護者画面に 表示）** |
| assets/audio/step_zaku_r1〜r4 | 7 Eating Crunches（crunch1・crunch2） | OpenGameArt | CC0 |
| assets/audio/step_zaku_r5 | Apple Bite | OpenGameArt | CC0 |
| assets/audio/land_zaku_r1・r2 | Crunching munching grinding | Wikimedia Commons / stephan | パブリックドメイン |
| assets/audio/land_zaku_r3 | Crunch (Gravity Sound) | Wikimedia Commons / Gravity Sound | **CC BY 4.0（クレジット要。保護者画面に 表示）** |
| assets/audio/step_slime_r1・r2・land_slime_r1 | 40 CC0 Water Splash & Slime SFX（slime01〜03） | OpenGameArt | CC0 |
| assets/audio/step_pari_r1・r2 | 5 break, crunch impacts（01・02） | OpenGameArt / qubodup | CC0 |
| assets/audio/land_pari_r1 | 75 CC0 breaking / falling / hit sfx（break01） | OpenGameArt | CC0 |
| assets/audio/step_koro_r1〜r3 | 2 dice roll (29 throws) | OpenGameArt | CC0 |
| assets/audio/land_koro_r1 | Wooden dice on wodden table roll | OpenGameArt | CC0 |
| assets/audio/land_choco_r1 | 75 CC0 breaking / falling / hit sfx（break02） | OpenGameArt | CC0 |
| assets/audio/land_choco_r2 | 5 break, crunch impacts（04） | OpenGameArt / qubodup | CC0 |
| assets/audio/step_push_r1 | bubbles 'pop' | OpenGameArt | CC0 |
| assets/audio/step_push_r2・r3 | 3 Pop Sounds | OpenGameArt | CC0 |
| assets/tex/key-floor | Keyboard Close Up | Wikimedia Commons | CC0 |
| assets/tex/puni-floor | Karl Gummies top view | Wikimedia Commons | CC0 |
| assets/tex/shari-floor・pool-ice | Snow 01（diffuse 1k） | Poly Haven | CC0 |
| assets/tex/zaku-floor・obj-cookie | Choc-Chip-Cookie | Wikimedia Commons | パブリックドメイン |
| assets/tex/fuwa-floor・pool-cotton | Cotton candy in pastel pink, Shimla India | Wikimedia Commons | CC0 |
| assets/tex/pari-floor・obj-senbei | Senbei 005 | Wikimedia Commons | CC0 |
| assets/tex/koro-floor | Asobono ball pool | Wikimedia Commons | CC0 |
| assets/tex/choco-floor・pool-choco・obj-chocoinner | 3-Musketeers-Broken | Wikimedia Commons | パブリックドメイン |

つかわなかった もの：White Marshmallows・Dipper stick and honey in a jar（CC BY 2.0。写真が 物の 全体で、床や 足場に はれる 部分が 少ないため）、Cotton Jersey（布の 写真で わたあめに 見えにくい ため）。
