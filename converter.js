// ============================================================
//  converter.js — 変換ロジック（UIから完全分離）
// ============================================================

class HobiConverter {
constructor(vocab, emojiSets, styles, xModes) {
this.vocab    = vocab;
this.emojiSets = emojiSets;
this.styles   = styles;
this.xModes   = xModes;
}

// ユーティリティ：配列からランダム選択
_pick(arr, exclude = []) {
const filtered = arr.filter(x => !exclude.includes(x));
return filtered[Math.floor(Math.random() * filtered.length)] || arr[0];
}

// ユーティリティ：配列からランダムにN個選ぶ（重複なし）
_pickN(arr, n) {
const shuffled = […arr].sort(() => Math.random() - 0.5);
return shuffled.slice(0, Math.min(n, shuffled.length));
}

// 絵文字セット選択
_getEmojiSet(emojiLevel) {
if (emojiLevel <= 33) return this.emojiSets.light;
if (emojiLevel <= 66) return this.emojiSets.normal;
return this.emojiSets.heavy;
}

// 絵文字をランダムに生成
_randEmoji(emojiLevel, count = 1) {
const set = this._getEmojiSet(emojiLevel);
return Array.from({ length: count }, () => this._pick(set)).join(’’);
}

// {O}={推し名} {S}={自分名} のプレースホルダ置換
_fillNames(text, oshiName, selfName) {
return text.replace(/{O}/g, oshiName).replace(/{S}/g, selfName);
}

// 入力テキストから文脈キーワードを抽出
_analyzeInput(text) {
const keywords = {
isLive:    /ライブ|現場|コンサート|公演|舞台|イベ|チェキ|握手|対面/.test(text),
isEyeContact: /目が合|見てくれ|見つけ|視線/.test(text),
isHappy:   /嬉し|幸せ|楽し|最高|よかっ|好き|かわい|最強/.test(text),
isSad:     /悲し|泣|辛|切な|苦し/.test(text),
isSmile:   /笑|ニコ|にこ|わらい/.test(text),
hasName:   text.match(/([ぁ-ん]{2,4}くん|[ぁ-ん]{2,4}ちゃん|[ァ-ン]{2,4}|[一-龯]{1,3}くん)/)?.[0] || null,
};
return keywords;
}

// プロンプト構築
buildPrompt({ inputText, selfName, oshiName, styleKey, intensity, emojiLevel, lineBreakLevel, xMode, safeMode }) {
const style = this.styles[styleKey];
const emojiCount = emojiLevel <= 33 ? “2〜3個程度（控えめ）” : emojiLevel <= 66 ? “4〜6個（適度）” : “8個以上（多め、毎文につける）”;
const lineBreakRule = lineBreakLevel <= 33 ? “改行は少なめ、1〜2文をまとめる” : lineBreakLevel <= 66 ? “適度に改行し、3〜4文節ごとに1回” : “ホビ垢特有の細かい改行、ほぼ1フレーズごとに改行”;
const intensityRule = intensity <= 33 ? “感情表現はやや控えめ、読みやすさ重視” : intensity <= 66 ? “ホビ垢らしい感情表現で、語録を適切に盛り込む” : “感情全開、語録を最大限活用、語彙は重ため”;
const xRule = xMode === ‘none’ ? ‘’ : xMode === ‘tree’ ? `\n・必ず140字以内の複数ツイートに分け、「1/n」「2/n」形式で番号をつけ、ツリー形式で出力` : `\n・必ず${this.xModes[xMode]?.max}字以内に収める`;
const safeRule = safeMode ? “\n・露骨な独占欲や嫉妬の表現は避け、炎上リスクのある過激な表現はマイルドにする（炎上予防モード）” : “”;
const ctx = this._analyzeInput(inputText);
const contextHint = [
ctx.isLive       && “（現場・イベント系の出来事が含まれています）”,
ctx.isEyeContact && “（目が合う・見つけてくれる系のエピソードが含まれています）”,
ctx.isHappy      && “（ポジティブ・幸せ感情が含まれています）”,
ctx.isSad        && “（ネガティブ・切ない感情が含まれています）”,
ctx.isSmile      && “（笑顔・笑いに関するエピソードが含まれています）”,
ctx.hasName      && `（「${ctx.hasName}」という名前が含まれています）`,
].filter(Boolean).join(’\n’);

```
// 語録からランダムにいくつか選んでプロンプトに含める（ゆらぎ）
const vocabSamples = {
  greeting:     this._pickN(this.vocab.greeting, 3).join('、'),
  praise:       this._pickN(this.vocab.praise, 4).join('、'),
  thanks:       this._pickN(this.vocab.thanks, 4).join('、'),
  bodyReaction: this._pickN(this.vocab.bodyReaction, 3).join('、'),
  special:      this._pickN(this.vocab.special, 3).join('、'),
  oshiDynamic:  this._pickN(this.vocab.oshiDynamic, 4).map(t => this._fillNames(t, oshiName, selfName)).join('、'),
};
const negativeVocab = this._pickN(this.vocab.negative, 2).join('、');

return `あなたは「ホビ垢（趣味アカウント）」を運用しているオタクになりきってください。
```

ユーザーの感想を、指定されたスタイルと語録に基づいてホビ垢構文に変換します。

## 自分の名前: ${selfName}

## 推しの名前: ${oshiName}

## スタイル: ${style.label}

${style.persona}

## スタイル固有ルール

${style.rules}

## 変換ルール（共通）

・強度レベル: ${intensityRule}
・絵文字: ${emojiCount}（以下の絵文字セットを使用: 🤍 ✨ 🎀 💭 🌸 😭 🏆 ⸝⸝⸝ ՞ ̥_ ̫ _ ̥՞ 🌷 🫧 🥹 💗 🩷 🫶 🌙 🐣 🩰）
・改行: ${lineBreakRule}
・ひらがな多用（例：愛しい→いとちー、可愛い→かあいー、やさしい→やさしくて）
・語録の使用（以下からいくつか必ず盛り込む）${xRule}${safeRule}

## 今回使う語録候補（全部使わなくていい、文脈に合うものを選ぶ）

- 挨拶系: ${vocabSamples.greeting}
- 褒め言葉: ${vocabSamples.praise}
- 感謝系: ${vocabSamples.thanks}
- 身体反応: ${vocabSamples.bodyReaction}
- 特別感: ${vocabSamples.special}
- 推し×自分動的語録: ${vocabSamples.oshiDynamic}
- ネガポジ: ${negativeVocab}

## 入力テキストの分析メモ

${contextHint || “（特になし）”}

## 出力ルール

・変換後の文章のみ出力（説明・前置き・括弧による注釈は一切不要）
・X投稿として自然に読める文体
・毎回ランダム性を持たせ、同じ入力でも毎回少し違う変換にする

## 入力テキスト

${inputText}`;
}

// APIコール
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

// 統計情報
stats(text) {
const charCount  = text.length;
const lineCount  = (text.match(/\n/g) || []).length + 1;
const emojiRe    = /[\u{1F300}-\u{1FFFF}\u{2600}-\u{27BF}]|՞ ̥_ ̫ _ ̥՞|⸝⸝⸝/gu;
const emojiCount = (text.match(emojiRe) || []).length;
const xOver140   = charCount > 140;
const xOver280   = charCount > 280;
return { charCount, lineCount, emojiCount, xOver140, xOver280 };
}
}