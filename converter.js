// ============================================================
//  converter.js  変換ロジック（UIから完全分離）
//  HobiConverter クラスを new して使う
// ============================================================

class HobiConverter {
constructor({ vocab, emojiPairs, kaomoji }) {
this.vocab      = vocab;
this.emojiPairs = emojiPairs;
this.kaomoji    = kaomoji;
}

// ── ユーティリティ ──────────────────────────────
_pickN(arr, n) {
return […arr].sort(() => Math.random() - 0.5).slice(0, Math.min(n, arr.length));
}
_fillNames(t, o, s) {
return t.replace(/{O}/g, o).replace(/{S}/g, s);
}
_analyzeInput(text) {
return {
isLive:       /ライブ|現場|コンサート|公演|舞台|イベ|チェキ|握手|対面/.test(text),
isEyeContact: /目が合|見てくれ|見つけ|視線|指名/.test(text),
isHappy:      /嬉し|幸せ|楽し|最高|よかっ|好き|かわい/.test(text),
isSad:        /悲し|泣|辛|切な|苦し/.test(text),
isSmile:      /笑|ニコ|にこ/.test(text),
isRemembered: /覚え|名前/.test(text),
};
}

// ── プロンプト構築 ───────────────────────────────
buildPrompt({ inputText, selfName, oshiName, heartEmoji, intensity, emojiLevel, lineBreakLevel }) {
const iRule = intensity <= 33
? “感情表現はやや控えめ・読みやすさ重視”
: intensity <= 66
? “ホビ垢らしい感情表現・語録を適切に盛り込む”
: “感情全開・語録最大活用・誇張表現多め・重ため”;
const eRule = emojiLevel <= 33
? “絵文字は文末に1〜2個”
: emojiLevel <= 66
? “絵文字は4〜6個（適度）”
: “絵文字は8個以上・ほぼ毎フレーズにつける”;
const lRule = lineBreakLevel <= 33
? “改行少なめ・1〜2文まとめる”
: lineBreakLevel <= 66
? “3〜4フレーズごとに改行”
: “1フレーズごとに改行・ホビ垢特有の細かいテンポ”;

```
const emojiSample = this._pickN(this.emojiPairs, 8).join(" ");
const kaoSample   = this._pickN(this.kaomoji, 3).join("  ");

const greet = this._pickN(this.vocab.greeting, 3).join("、");
const pr    = this._pickN(this.vocab.praise, 4).join("、");
const th    = this._pickN(this.vocab.thanks, 4).join("、");
const br    = this._pickN(this.vocab.bodyReaction, 3).join("、");
const sp    = this._pickN(this.vocab.special, 3).join("、");
const od    = this._pickN(this.vocab.oshiDynamic, 5)
                .map(t => this._fillNames(t, oshiName, selfName)).join("、");

const ctx = this._analyzeInput(inputText);
const hints = [
  ctx.isLive       && "現場・イベント系",
  ctx.isEyeContact && "目が合う・認識エピソード",
  ctx.isHappy      && "ポジティブ感情",
  ctx.isSad        && "ネガティブ感情",
  ctx.isSmile      && "笑顔エピソード",
  ctx.isRemembered && "覚えてもらったエピソード",
].filter(Boolean).join("、") || "特になし";

return `あなたは「ホビ垢（趣味アカウント）」を運用しているオタクになりきり、感想をホビ垢構文に変換します。
```

## 設定

- 自分の名前: ${selfName}
- 推しの名前: ${oshiName}

## ホビ垢構文の本質

・感想ではなく「${selfName}と${oshiName}の関係性の物語」として語る
・出来事を奇跡・特別なこととしてロマン化する
・演者の行動を「${selfName}のためにしてくれた」として解釈する
・「見つけてもらった」「覚えてもらった」体験を特別なイベントとして描写する
・感情は誇張気味に（しんだ・記憶喪失・心臓くるしー・満身創痍など）
・文法より気持ち優先・文が途中で途切れてもOK
・ひらがな多用（だいすき・しあわせ・ありがとう・すきすぎ等）
・「自分」と「演者」の関係が中心・評価より物語

## 絵文字・顔文字ルール

・ハートの絵文字は「${heartEmoji}」を使う（メンバーカラー）
・${eRule}
・使用する絵文字ペア候補: ${emojiSample}
・顔文字を文中に1〜2個自然に挿入: ${kaoSample}

## 強度・形式ルール

・強度: ${iRule}
・${lRule}
・毎回わずかに異なる表現にする（ゆらぎ必須）

## 語録候補（文脈に合うものだけ）

挨拶: ${greet}
褒め: ${pr}
感謝: ${th}
身体反応: ${br}
特別感: ${sp}
推し×自分: ${od}

## 入力文脈: ${hints}

## 出力ルール

・変換後の文章のみ（説明・前置き・注釈なし）
・X投稿として自然に読める

## 変換する感想

${inputText}`;
}

// ── APIコール ────────────────────────────────────
async convert(params) {
const prompt = this.buildPrompt(params);
const res = await fetch(“https://api.anthropic.com/v1/messages”, {
method: “POST”,
headers: { “Content-Type”: “application/json” },
body: JSON.stringify({
model: “claude-sonnet-4-20250514”,
max_tokens: 1000,
messages: [{ role: “user”, content: prompt }],
}),
});
if (!res.ok) {
const err = await res.json().catch(() => ({}));
throw new Error(err.error?.message || `API Error ${res.status}`);
}
const data = await res.json();
return data.content.map(b => b.text || “”).join(””).trim();
}

// ── 統計 ─────────────────────────────────────────
stats(text) {
return {
chars:  text.length,
lines:  (text.match(/\n/g) || []).length + 1,
emojis: (text.match(/[\u{1F300}-\u{1FFFF}\u{2600}-\u{27BF}]|⸝⸝⸝/gu) || []).length,
};
}
}