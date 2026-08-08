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
  overview: str(),
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
  checkbase: derivedNumber(),
  powerbase: derivedNumber(),
  totalcvalue: new NumberField({
    required: true,
    nullable: true,
    initial: null,
    persisted: false,
  }),
  formula: new StringField({
    required: true,
    blank: true,
    initial: "2d6",
    persisted: false,
  }),
  // 数値と criticalray の文字列が混ざるので要素の型は縛らない
  powertable: new ArrayField(new AnyField(), {
    required: true,
    initial: [],
    persisted: false,
  }),
  // シートのセレクト用に組み立てられる一覧
  skilllist: new StringField({
    required: true,
    blank: true,
    persisted: false,
  }),
  itemlist: new StringField({ required: true, blank: true, persisted: false }),
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
