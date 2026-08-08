const { HTMLField, StringField, NumberField, BooleanField, SchemaField } =
  foundry.data.fields;

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

export { HTMLField, StringField, NumberField, BooleanField, SchemaField };
