const {
  AnyField,
  ArrayField,
  BooleanField,
  HTMLField,
  NumberField,
  SchemaField,
  StringField,
  TypedObjectField,
} = foundry.data.fields;

/**
 * すべてのアクター型の土台。
 *
 * アイテム側(module/data/item)と同じ方針で、template.json は
 * 型が「存在する」ことの宣言(Actor.types)だけに残す。
 *
 * アイテムと決定的に違う点が 2 つある。
 *
 * 1. **ActiveEffect の適用先がここ。** `CONFIG.SW25.Effect` の 17 カテゴリは
 *    すべて `system.effect.*` / `system.attributes.ef*` を指す。v14 の
 *    `ActiveEffect.applyChange` は `system.` で始まるキーを
 *    `system.getFieldForProperty()` で解決し、見つかれば型付きで、
 *    見つからなければ `_applyChangeUnguided` で(値を文字列のまま)適用する。
 *    宣言してあるほうが正しく数値になるので、効果の適用先は
 *    persisted: false で宣言する。`DataField#persisted` の doc comment が
 *    「非保存の値も初期化され、ActiveEffect は変更適用に使える」と明言している
 *    (common/data/fields.mjs)。
 *
 * 2. **未宣言の派生値はシートから消える。** V1 シートは
 *    `document.toObject(false)` でコンテキストを作り、
 *    `SchemaField#toObject` は宣言済みフィールドだけを回す。
 *    prepareDerivedData が実行時に生やしている値も宣言が要る。
 */
export class SW25ActorDataModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {};
  }
}

/* -------------------------------------------- */
/*  短縮ヘルパ                                   */
/* -------------------------------------------- */

/** シートの input が data-dtype="Number" で、空欄を許す数値 */
export const nullableNum = () =>
  new NumberField({ required: true, nullable: true, initial: null });
export const num = (initial = 0) =>
  new NumberField({ required: true, nullable: false, initial });
export const bool = (initial = false) => new BooleanField({ initial });
export const str = (initial = "") =>
  new StringField({ required: true, blank: true, initial });

/** prepareDerivedData が毎回入れ直す数値 */
export const derivedNumber = (initial = 0) =>
  new NumberField({
    required: true,
    nullable: false,
    initial,
    persisted: false,
  });

/** prepareDerivedData が毎回入れ直す文字列 */
export const derivedString = (initial = "") =>
  new StringField({ required: true, blank: true, initial, persisted: false });

/** prepareDerivedData が毎回入れ直す真偽値 */
export const derivedBool = (initial = false) =>
  new BooleanField({ initial, persisted: false });

/**
 * 条件が揃ったときだけ prepare が入れる数値。
 *
 * 初期値を 0 にすると、値が無いときにシートが "0" を描いてしまう
 * (装備武器を選んでいないのに「命中 : 0」と出るなど)。
 * null なら Handlebars は空文字を描くので、移行前の undefined と同じ見え方になる。
 */
export const derivedNullableNumber = () =>
  new NumberField({
    required: true,
    nullable: true,
    initial: null,
    persisted: false,
  });

/**
 * 型を縛らない派生値。
 *
 * AnyField は serializable: false が既定で `toObject` が素通しなので、
 * 数値と文字列が混ざる値(npc の total* は number / "+3" / null)や、
 * Document を含む構造をそのままシートへ渡せる。
 */
export const derivedAny = () =>
  new AnyField({ required: false, persisted: false });

/** 派生値だけを集めた SchemaField(まとめて保存対象から外す) */
export const derivedSchema = (fields) =>
  new SchemaField(fields, { persisted: false });

/**
 * ActiveEffect が書き込むだけの数値。
 *
 * シートに入力欄は無く、prepare も読むだけなので保存しない。
 * 効果が付いていないときは initial の 0 が入る。
 */
export const effectNumber = () => derivedNumber();

/**
 * 未登録のキーへの変更を 0 からの適用として扱う数値。
 *
 * TypedObjectField の要素は、そのキーがまだ無いあいだ `undefined` なので、
 * 素の NumberField だと `add` が `undefined + 4` = NaN になり
 * 「must be a number」で棄却されてしまう(効果が一度も乗らない)。
 * DataModel 化する前は未宣言のパスとして `_applyChangeUnguided` に落ち、
 * 値が文字列のまま書き込まれることで動いていた。
 */
class EffectNumberField extends NumberField {
  /** @inheritDoc */
  applyChange(value, model, change, options) {
    return super.applyChange(value ?? 0, model, change, options);
  }
}

/**
 * キーが可変の効果適用先。
 *
 * TypedObjectField は `_getField` が要素の型まで解決する
 * (common/data/fields.mjs)ので、任意のキーでも型付きで適用される。
 * SchemaField で固定キーを並べてはいけないものがここに来る —
 * damage / decay は `DamageSupporter.createChatTag` が `Object.keys()` で
 * 「効果が付いているキーだけ」を列挙してチャットタグを組み立てるため、
 * 全キーを 0 で初期化するとタグが一度に 29 個出てしまう。
 */
export const effectMap = () =>
  new TypedObjectField(
    new EffectNumberField({ required: true, nullable: false, initial: 0 }),
    { persisted: false }
  );

/* -------------------------------------------- */
/*  共有フィールド                               */
/* -------------------------------------------- */

/** Actor.templates.base — 3 型すべてが持つ */
export const baseFields = () => ({
  hp: new SchemaField({
    // template.json では "" だが、シートの input は data-dtype="Number"
    value: nullableNum(),
    hpmod: nullableNum(),
    // 効果の適用先
    efhpmod: effectNumber(),
    // 毎回計算される
    max: derivedNumber(),
  }),
  mp: new SchemaField({
    value: nullableNum(),
    min: num(),
    mpmod: nullableNum(),
    efmpmod: effectNumber(),
    max: derivedNumber(),
  }),
  race: str(),
  biography: new HTMLField({ required: true, blank: true }),

  /* ---- 3 型共通の派生値 ---- */
  // SW25Combat#rollInitiative が読む
  initiativeFormula: derivedString("2d6"),
});

/**
 * Actor.templates.fellow / daemon。
 *
 * template.json の fellow / daemon は初期値だけが違う同じ形。
 * 死んでいるフィールドは持ち込まない —
 * `fellowtype` と、トップレベルの `showaction`(生きているのは
 * `attributes.showaction` のほう)、`attributes.skill` は参照が 0。
 *
 * @param {"fellow"|"daemon"} kind
 */
export const fellowFields = (kind) => ({
  toFellow: bool(),
  fellowmemo: str(),
  tabletype: str(kind),
  canceldialog: str(),
});

/** fellow / daemon のうち attributes の下に入るもの */
export const fellowAttributeFields = (kind) => ({
  fellowexp: bool(kind === "fellow"),
  fellowreward: bool(kind === "fellow"),
  showaction: bool(),
  // 所持している language アイテム(または monster/npc の language 欄)から毎回組み立てる
  langlist: derivedString(),
});

/**
 * Polyglot 連携用の言語一覧。
 * helpers/sw25languageprovider.mjs が読む。毎回組み立て直す。
 */
export const languageFields = () => ({
  languages: derivedSchema({
    conv: new ArrayField(new StringField(), { required: true }),
    read: new ArrayField(new StringField(), { required: true }),
  }),
});

/**
 * `system.effect.*` — ActiveEffect の適用先。
 *
 * template.json の `Actor.templates.effect` はどの型の templates からも
 * 参照されていないので、実行時は効果が付くまで生えてこなかった。
 * だから documents/item.mjs には `if (!actorData.effect)` のガードが
 * 散らばっている。宣言すれば常在するようになる。
 *
 * template.json の `hit` / `dmg` / `dodge` は参照が 0 なので持ち込まない。
 */
export const effectFields = () => ({
  effect: derivedSchema({
    vitres: effectNumber(),
    mndres: effectNumber(),
    init: effectNumber(),
    mknow: effectNumber(),
    allck: effectNumber(),
    allsk: effectNumber(),
    // allsc / allac は template.json に無いが CONFIG.SW25.Effect.check にある
    allsc: effectNumber(),
    allac: effectNumber(),
    allmgp: effectNumber(),
    efcvalue: effectNumber(),
    efspellcvalue: effectNumber(),
    // 判定パッケージごとの補正(documents/item.mjs が checkpackage で引く)
    package: new SchemaField({
      fine: effectNumber(),
      move: effectNumber(),
      obse: effectNumber(),
      know: effectNumber(),
    }),
    // 「任意の判定名」フリーテキスト。キーが判定アイテムの名前なので可変
    checkinputmod: effectMap(),
  }),
});

/**
 * `system.attributes.*` のうち ActiveEffect の適用先。
 * CONFIG.SW25.Effect の battle / magicpower / magicckroll / magicpwroll /
 * mpsave / feature / powertable / class*damage / element*decay に対応する。
 */
export const effectAttributeFields = () => ({
  /* battle */
  efhitmod: effectNumber(),
  efdmod: effectNumber(),
  efwphalfmod: effectNumber(),
  efsphalfmod: effectNumber(),
  efdodgemod: effectNumber(),
  efppmod: effectNumber(),
  efmppmod: effectNumber(),
  efdreduce: effectNumber(),
  // ターン終了時の HP / MP 回復(sw25.mjs の updateCombat フックが読む)
  turnend: derivedSchema({
    hpregenmod: effectNumber(),
    mpregenmod: effectNumber(),
  }),
  // 移動力。character はこの後ろで本物の move を宣言して上書きする
  move: derivedSchema({ efmovemod: effectNumber() }),

  /* 魔力・行使・威力・MP 消費(系統ごと + 全系統) */
  ...magicSchoolEffectFields(),

  /* 特技系 */
  efmsckmod: effectNumber(),
  efmspwmod: effectNumber(),
  efatckmod: effectNumber(),
  efewckmod: effectNumber(),
  efewpwmod: effectNumber(),

  // アイテム種別ごとの威力表補正。helpers/chatbutton.mjs が
  // actor.system.attributes.powertablemod[itemType] で引く
  powertablemod: effectMap(),

  // 与ダメージ / 減衰の系統別・属性別。
  // helpers/damagesupport.mjs が Object.keys() で列挙するので
  // 空オブジェクト始まりでなければならない
  damage: damageTableFields(),
  decay: damageTableFields(),
});

/** 魔法系統の略号。sc=ソーサラー … bm=ビブリオマンサー */
const MAGIC_SCHOOLS = [
  "sc",
  "cn",
  "wz",
  "pr",
  "mt",
  "fr",
  "dr",
  "dm",
  "ab",
  "bm",
];

/**
 * 系統ごとの魔力修正。
 *
 * character はシートに name="system.attributes.scmod" などの入力があり、
 * monster は入力こそ無いが documents/item.mjs の呪文の準備が
 * `actorData.attributes.scmod` を読むので、どちらも保存対象。
 */
export const magicSchoolModFields = () =>
  Object.fromEntries(MAGIC_SCHOOLS.map((s) => [`${s}mod`, num()]));

/** 魔法系統ごとの効果適用先。10 系統 × 4 種 + 全系統の 3 種 */
const magicSchoolEffectFields = () => {
  const schools = MAGIC_SCHOOLS;
  const fields = {};
  for (const s of schools) {
    // 魔力 / 行使判定 / 威力 / MP 消費
    fields[`ef${s}mod`] = effectNumber();
    fields[`ef${s}ckmod`] = effectNumber();
    fields[`ef${s}pwmod`] = effectNumber();
    fields[`efmp${s}`] = effectNumber();
  }
  fields.efmckall = effectNumber();
  fields.efmpwall = effectNumber();
  fields.efmpall = effectNumber();
  return fields;
};

/** damage / decay の中身。物理・魔法それぞれに種族別と属性別がある */
const damageTableFields = () =>
  derivedSchema({
    physical: new SchemaField({
      classType: effectMap(),
      element: new SchemaField({
        magic: effectMap(),
        physical: effectMap(),
      }),
    }),
    magic: new SchemaField({
      classType: effectMap(),
      element: new SchemaField({
        magic: effectMap(),
        physical: effectMap(),
      }),
    }),
  });

/**
 * 能力値ごとの効果適用先。character の本物の abilities に混ぜ込む。
 *
 * npc / monster には **abilities を生やさない**。効果設定 UI は
 * アクター型でカテゴリを絞らないので `parameter` カテゴリはどの型にも
 * 付けられるが、能力値の無い型では今も未宣言のパスとして
 * `_applyChangeUnguided` に落ちており、monster の _prepareMonsterData は
 * `abilities?.vit?.efvaluemodify ?? 0` で受けているので動く。
 * efvaluemodify / efmodify だけの中途半端な abilities を宣言すると、
 * documents/item.mjs の `actorData.abilities.dex.racevalue` が
 * 「例外」から「NaN」に変わって壊れ方が静かになるので、そこは触らない。
 */
export const abilityEffectFields = () => ({
  efvaluemodify: effectNumber(),
  efmodify: effectNumber(),
});

/**
 * トップレベルの効果適用先。
 * `lt`(必殺技)/ `cr`(魔法拡大)/ `eflootmod`(戦利品表)。
 */
export const effectTopLevelFields = () => ({
  lt: effectNumber(),
  cr: effectNumber(),
  eflootmod: effectNumber(),
  // アイテムやチャットボタンの側から書き込まれる(documents/item.mjs、
  // helpers/chatbutton.mjs が actor.system.efcmod に代入する)
  efcmod: derivedNumber(),
});

/**
 * 効果の一覧表示。`documents/actor.mjs#_getModParams` が組み立てる。
 * 値は正負の符号を付けた文字列になるので型は縛らない。
 */
export const modParamsField = () => ({
  modParams: derivedAny(),
});

/** GM 専用情報と「未識別」表示(npc / monster) */
export const unidentifiedFields = () => ({
  gminfo: new HTMLField({ required: true, blank: true }),
  udname: str(),
  // 概要は .textarea-editor なので、sw25.mjs の blur フックが
  // system.overview と system.displayoverview の両方を書く
  overview: str(),
  displayoverview: str(),

  /* ---- 派生値。閲覧者の権限から毎回決まる ---- */
  limited: derivedBool(),
  isgm: derivedBool(),
});

export {
  AnyField,
  ArrayField,
  BooleanField,
  HTMLField,
  NumberField,
  SchemaField,
  StringField,
  TypedObjectField,
};
