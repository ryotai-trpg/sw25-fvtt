const {
  AnyField,
  ArrayField,
  BooleanField,
  HTMLField,
  NumberField,
  SchemaField,
  StringField,
} = foundry.data.fields;

/**
 * すべてのアイテム型の土台。
 *
 * template.json は型が「存在する」ことの宣言(Item.types)だけに残し、
 * フィールドの定義はこちらへ移していく。
 * template.json は実態を表していない — シートのフォームが送るだけで
 * 宣言されていないフィールド(skill の dedicated など)や、
 * 宣言されているのに毎回上書きされる派生値が混ざっている。
 * 移行するときは template.json ではなく、
 * シートの name="system.*" と prepare 系の代入を見て決めること。
 */
export class SW25ItemDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {};
  }
}

/* -------------------------------------------- */
/*  短縮ヘルパ                                   */
/* -------------------------------------------- */

/** 入力欄のある数値。空欄を 0 と区別したいものは nullable にする。 */
const num = (initial = 0) =>
  new NumberField({ required: true, nullable: false, initial });
const nullableNum = () =>
  new NumberField({ required: true, nullable: true, initial: null });
const bool = (initial = false) => new BooleanField({ initial });
const str = (initial = "") =>
  new StringField({ required: true, blank: true, initial });

/* -------------------------------------------- */
/*  共有フィールド                               */
/*  template.json の Item.templates.* に対応     */
/* -------------------------------------------- */

/** Item.templates.base */
export const baseFields = () => ({
  description: new HTMLField({ required: true, blank: true }),
  // 選択肢は型ごとに違う(武器だけ rescost があるなど)ので、
  // スキーマ側では絞らずシートのテンプレートに任せる。
  clickitem: new StringField({ required: true, blank: true, initial: "all" }),
});

/**
 * template.json のどのテンプレートにも無いが、ほぼ全型のシートが持っている入力。
 *
 * isEdit はシートの編集モード切り替え。テンプレート側で
 * {{#unless system.isEdit}} disabled {{/unless}} として使われているので、
 * 宣言し忘れるとシートが丸ごと読み取り専用になる。
 *
 * equip は Item.templates.battle にもあり、そちらは初期値 true。
 * battleFields() を後に展開すれば装備品だけ true になる。
 */
export const commonFields = () => ({
  isEdit: bool(),
  selfbuff: bool(),
  bookmark: bool(),
  equip: bool(),
  overview: str(),
});

/** prepare が毎回入れ直す表示名 */
export const derivedString = () =>
  new StringField({ required: true, blank: true, persisted: false });

/**
 * `.textarea-editor` の 1 組。
 *
 * sw25.mjs の blur フックが data-path を見て
 * `system.<name>`(生のテキスト)と `system.display<name>`(改行を <br> にしたもの)を
 * まとめて update する。display 側は名前がテンプレートに直接書かれていないので
 * `name="system.*"` の grep では拾えない。宣言し忘れると DataModel が捨てるため、
 * `{{{system.display<name>}}}` で読んでいる側が空になる。
 *
 * @param {string} name data-path に書いてある名前
 */
export const textareaEditorFields = (name) => ({
  [name]: str(),
  [`display${name}`]: str(),
});

/**
 * 番号付きの判定ブロック(label1 / checkbase1 …)。
 * 魔物能力は 3 本、行動は 2 本(そちらは技能と適用ボタンも付く)。
 *
 * @param {number} i 何本目か
 * @param {{skill?: boolean, buttons?: boolean, usedice?: boolean}} [opts]
 */
export const numberedCheckFields = (i, opts = {}) => {
  const { skill = false, buttons = false, usedice = false } = opts;
  return {
    [`usedice${i}`]: bool(usedice),
    [`label${i}`]: str(`Label${i}`),
    [`checkbasefix${i}`]: num(7),
    [`checkbasemod${i}`]: num(),
    [`usefix${i}`]: bool(),
    [`checkmod${i}`]: num(),
    [`customdice${i}`]: bool(),
    [`customformula${i}`]: str("2d6"),
    // checkbase は毎回計算される
    [`checkbase${i}`]: derivedNumber(),
    ...(skill && { [`checkskill${i}`]: str(), [`checkabi${i}`]: str() }),
    ...(buttons && {
      [`ckpdbt${i}`]: bool(true),
      [`ckmdbt${i}`]: bool(true),
      [`ckcdbt${i}`]: bool(true),
      [`ckhrbt${i}`]: bool(true),
      [`ckmrbt${i}`]: bool(true),
    }),
  };
};

/** 属性(武器・防具から呪文まで 10 型以上が持つ)。template.json には無い。 */
export const elementsFields = () => ({
  elements: new SchemaField({
    type: str(),
    physical: new SchemaField({
      blade: bool(),
      blow: bool(),
      gun: bool(),
      mithril: bool(),
    }),
    magic: new SchemaField({
      fire: bool(),
      ice: bool(),
      thunder: bool(),
      wind: bool(),
      earth: bool(),
      energy: bool(),
      impact: bool(),
      cut: bool(),
      poison: bool(),
      disease: bool(),
      curse: bool(),
      mental: bool(),
      mentalw: bool(),
      healing: bool(),
    }),
  }),
});

/** 抵抗の指定。template.json には無い。 */
export const resistFields = () => ({
  resistinfo: new SchemaField({
    type: str(),
    input: str(),
    result: str(),
  }),
  // 表示名は毎回引き直す
  resistname: new StringField({
    required: true,
    blank: true,
    persisted: false,
  }),
});

/** 対象・射程形状・時間・属性。呪文や特技系が広く持つ。template.json には無い。 */
export const castFields = () => ({
  target: str(),
  rangeshape: str(),
  time: str(),
  prop: str(),
  // 属性の表示名は毎回引き直す
  propname: new StringField({
    required: true,
    blank: true,
    persisted: false,
  }),
});

/**
 * HP / MP 消費。装備品から呪文・特技まで広く持つ。
 *
 * basehpcost だけ入力が String(「2点」のような書き方を許している)。
 * hpcost / mpcost は base から毎回引き直す。
 */
export const costFields = () => ({
  basehpcost: str(),
  basempcost: nullableNum(),
  maxhpcost: nullableNum(),
  hpcost: new StringField({ required: true, blank: true, persisted: false }),
  mpcost: derivedNumber(),
});

/** 魔法のアイテムまわり(製作・名誉点)。template.json には無い。 */
export const magicItemFields = () => ({
  info: new SchemaField({
    category: str(),
    create: str(),
    popularity: str(),
    shape: str(),
  }),
  honor: nullableNum(),
  isHonoritem: bool(),
  isMagicitem: bool(),
});

/** Item.templates.item — 個数と価格を持つ「モノ」。 */
export const itemFields = () => ({
  // 上限・下限を超えると prepare 側で丸められるが、入力値そのものは保存する
  quantity: new NumberField({
    required: true,
    nullable: false,
    integer: true,
    initial: 1,
  }),
  qmax: nullableNum(),
  qmin: nullableNum(),
  // 型ごとにテキスト入力だったりセレクトだったりするが、どちらも文字列
  type: str(),
  price: nullableNum(),
});

/** Item.templates.battle — 装備品。 */
export const battleFields = () => ({
  equip: bool(true),
  dedicated: bool(),
  category: str(),
  // CONFIG.SW25.ranks は B / A / S / SS の文字列。
  // 練技(tactics)などにも rank の入力欄があるが、あちらは数値で
  // battle テンプレートも使っていない別物なので、各型の側で宣言する。
  rank: str(),
  reqstr: nullableNum(),
});

/** Item.templates.ability — 特技・練技などの共通部分。 */
export const abilityFields = () => ({
  // 戦術(tactics)だけは prepare が system.type から入れ直すが、
  // 他の型では素の入力なので保存対象のままにする
  constant: bool(),
  prep: bool(),
  main: bool(),
  aux: bool(),
  decla: bool(),
  // overview は commonFields 側にある
  level: new NumberField({
    required: true,
    nullable: false,
    integer: true,
    initial: 1,
  }),
});

/**
 * Item.templates.roll — 判定と威力のロール設定。24 型中 20 型が使う。
 *
 * 判定・威力それぞれの ck*bt / pw*bt は、チャットカードに
 * どのダメージ適用ボタンを出すかの指定。
 */
export const rollFields = () => ({
  /* ---- 判定 ---- */
  checkskill: str(),
  checkabi: str(),
  checkmod: num(),
  ckpdbt: bool(true),
  ckmdbt: bool(true),
  ckcdbt: bool(true),
  ckhrbt: bool(true),
  ckmrbt: bool(true),

  /* ---- 威力 ---- */
  powerskill: str(),
  powerabi: str(),
  powermod: num(),
  pwpdbt: bool(true),
  pwmdbt: bool(true),
  pwcdbt: bool(true),
  pwhrbt: bool(true),
  pwmrbt: bool(true),

  usepower: bool(),
  usedice: bool(),
  customdice: bool(),
  customformula: str(),
  power: nullableNum(),
  cvalue: nullableNum(),
  showpowmod: bool(),
  halfpow: bool(),
  halfpowmod: nullableNum(),
  lethaltech: nullableNum(),
  criticalray: str(),
  pharmtool: nullableNum(),
  powup: nullableNum(),

  /* ---- 威力表の各行 ----
     template.json には無いが、シートに name="system.pt3" 〜 pt12 があり
     powertable の組み立てでも読んでいる。実行時に生えていたので宣言する。 */
  pt3: nullableNum(),
  pt4: nullableNum(),
  pt5: nullableNum(),
  pt6: nullableNum(),
  pt7: nullableNum(),
  pt8: nullableNum(),
  pt9: nullableNum(),
  pt10: nullableNum(),
  pt11: nullableNum(),
  pt12: nullableNum(),

  /* ---- 適用先 ---- */
  applycheck: str("-"),
  applycheck1: str("-"),
  applycheck2: str("-"),
  applycheck3: str("-"),
  applypower: str("on"),

  /* ---- リソース消費 ---- */
  autouseres: bool(),
  resuse: str(),
  resusequantity: num(),

  /* ---- 以下は prepareDerivedData が毎回入れ直す ---- */
  ...derivedRollFields(),
});

/**
 * documents/item.mjs の判定・威力の準備が毎回書く値。
 *
 * 宣言しないと `toObject(false)` から落ちる。V1 シートは
 * `document.toObject(false)` でコンテキストを作り、アクターシートの
 * アイテム行も `context.data.items`(= 同じく toObject 経由)なので、
 * **未宣言の派生値はシート上で空になる**。SchemaField#toObject が
 * 宣言済みフィールドだけを回すため、persisted: false でも宣言は要る。
 *
 * 番号付きの 1〜3 は、番号付きブロックを持たない型(武器・装飾品など)にも
 * 無条件で書かれる。numberedCheckFields() を使う型では、そちらを後に
 * 展開して保存対象の入力で上書きする。
 */
export const derivedRollFields = () => ({
  checkbase: derivedNumber(),
  powerbase: derivedNumber(),
  totalcvalue: new NumberField({
    required: true,
    nullable: true,
    initial: null,
    persisted: false,
  }),
  formula: derivedFormula(),
  // 判定・威力それぞれのダイス式。usefix が立つと数値の 7 が入るので型は縛らない
  checkformula: derivedFormula(),
  powerformula: derivedFormula(),
  checkformula1: derivedFormula(),
  checkformula2: derivedFormula(),
  checkformula3: derivedFormula(),
  checkbase1: derivedNumber(),
  checkbase2: derivedNumber(),
  checkbase3: derivedNumber(),
  checkbasefix1: derivedNumber(7),
  checkbasefix2: derivedNumber(7),
  checkbasefix3: derivedNumber(7),
  // ck*bt / pw*bt から組み立てられる ["pd","md",…]。
  // チャットカードにどのダメージ適用ボタンを出すかの指定
  checkTypesButton: derivedStringArray(),
  checkTypesButton1: derivedStringArray(),
  checkTypesButton2: derivedStringArray(),
  checkTypesButton3: derivedStringArray(),
  powerTypesButton: derivedStringArray(),
  // 効果・装備の有無(チャットカードのボタン表示に使う)
  useeffect: new BooleanField({ initial: false, persisted: false }),
  useequip: new BooleanField({ initial: false, persisted: false }),
  // 数値と criticalray の文字列が混ざるので要素の型は縛らない
  powertable: new ArrayField(new AnyField(), {
    required: true,
    initial: [],
    persisted: false,
  }),
  // シートのセレクト用に組み立てられる一覧。
  // skilllist は技能アイテムそのものの配列、itemlist は {itemId, itemName} の配列。
  // ArrayField(ObjectField) にすると toObject で deepClone が走って
  // skilllist の Document が壊れるので、素通しの AnyField にする
  skilllist: derivedAny(),
  itemlist: derivedAny(),
});

/* -------------------------------------------- */
/*  派生値                                       */
/* -------------------------------------------- */

/**
 * prepareDerivedData で毎回入れ直される数値。
 *
 * persisted: false なので保存されない。スキーマに残しておくのは、
 * 「このフィールドは存在する」ことを一箇所で読めるようにするため。
 * ActiveEffect の適用先はアイテムではなくアクター側の
 * system.effect.* / system.attributes.ef* なので、
 * アイテムの派生値を保存対象から外しても効果の参照先は壊れない。
 *
 * @param {number} [initial]
 * @returns {NumberField}
 */
export const derivedNumber = (initial = 0) =>
  new NumberField({
    required: true,
    nullable: false,
    initial,
    persisted: false,
  });

/**
 * prepare が毎回入れ直すダイス式。
 * 通常は "2d6" などの文字列だが、固定値(usefix)のときは数値の 7 が入る。
 */
export const derivedFormula = () =>
  new AnyField({ required: false, initial: "2d6", persisted: false });

/** prepare が毎回組み立てる文字列の配列 */
export const derivedStringArray = () =>
  new ArrayField(new StringField(), { required: true, persisted: false });

/**
 * 型を縛らない派生値の一覧(skilllist / itemlist)。
 *
 * AnyField は serializable: false が既定で、`toObject` が素通し
 * (`DataField#toObject` が値をそのまま返す)。Document を含む配列を
 * シートへ渡している箇所があるので、deepClone される field は使えない。
 *
 * **初期値の空配列は必須。** これらを埋めるのは documents/item.mjs の
 * `_prepareItemRollData` / `_prepareCheckData` で、どちらも
 * 「アクターが持っているアイテム」でしか呼ばれない(prepareDerivedData の
 * `if (actor)` の中)。つまり持ち主のいないアイテムでは値が生えない。
 * 初期値が undefined だと、V1 シートの
 * `{{selectOptions system.itemlist …}}`(11 型)と
 * `{{selectOptions system.skilllist …}}`(action / check)が
 * `Object.entries(undefined)` で落ち、シートが開かなくなる。
 * template.json では空文字列("")が入っていて `Object.entries("")` は
 * 空配列になるので落ちなかった — DataModel 化で入った退行。
 */
export const derivedAny = () =>
  new AnyField({ required: false, initial: () => [], persisted: false });

/** 派生値だけを集めた SchemaField(まとめて保存対象から外す) */
export const derivedSchema = (fields) =>
  new SchemaField(fields, { persisted: false });

export {
  AnyField,
  ArrayField,
  BooleanField,
  HTMLField,
  NumberField,
  SchemaField,
  StringField,
};
