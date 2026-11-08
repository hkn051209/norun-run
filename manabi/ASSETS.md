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
| ASMRタワーの足音 | assets/audio/step_key.mp3, land_key.mp3, step_key_alt.mp3 | OpenGameArt の unicaegames「Keyboard Soundpack #1」（Cherry KC 1000 の実録）から選定・整形 | CC0 |
| ASMRタワーの足音 | assets/audio/step_shari.mp3, land_shari.mp3 | Kenney「Impact Sounds」の footstep_snow 系を整形 | CC0 |
| ASMRタワーの足音 | assets/audio/step_shari_gen.mp3, land_shari_gen.mp3 | ElevenLabs で生成（ひこのさんが生成） | ElevenLabs の利用規約にしたがう |
| ASMRタワーの足音 | assets/audio/step_puni.mp3 | 自前で合成（ぽよん系のピッチ変化音） | 自作 |
| ASMRタワーの足音 | assets/audio/land_puni.mp3 | OpenGameArt の ezduzziteh「Squish Sound Effects」「Boings」を整形 | CC0 |
| ASMRタワーの足音 | assets/audio/step_neba.mp3, land_neba.mp3 | OpenGameArt の rubberduck「25 CC0 mud sfx」を整形 | CC0 |
| BGM | assets/audio/bgm_menu.mp3, bgm_run.mp3, bgm_tower.mp3 | ひこのさんが Gemini で生成（2026-11-07）。末尾の無音をカットしループ接続を整形 | ひこのさんの生成物 |
| 効果音ファイル | assets/audio/se_*.mp3（7点） | Kenney の素材集（Interface Sounds / Digital Audio / Music Jingles）から選定・整形 | CC0 |
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
