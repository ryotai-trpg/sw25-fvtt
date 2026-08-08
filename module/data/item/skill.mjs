import {
  SW25ItemDataModel,
  baseFields,
  commonFields,
  derivedNumber,
  derivedSchema,
  BooleanField,
  NumberField,
  StringField,
} from "./_shared.mjs";

/**
 * 技能。
 *
 * template.json の宣言と実態が食い違っていた点:
 * - dedicated(専心)は Item.templates.battle 側にあり skill には無いが、
 *   シートに name="system.dedicated" があるので実際には保存されていた。
 *   invoke の算出でも読んでいるので、こちらで正式に宣言する
 * - skillmod は template.json では文字列 "0" だが、
 *   シートの input が data-dtype="Number" なので数値として入ってくる
 * - skillexp / efall*mod / skillbase.* は毎回計算されるだけで、
 *   保存する意味が無い
 * - skillbase の *nef(効果抜き)と invoke は template.json に無いまま
 *   実行時に生えていた
 */
export class SkillData extends SW25ItemDataModel {
  static defineSchema() {
    return {
      ...baseFields(),
      ...commonFields(),

      skilllevel: new NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 1,
        min: 0,
      }),
      // 選択肢は CONFIG.SW25.skillTypes / exptables だが、
      // 既存データに空文字や "-" が入っている可能性があるので choices では縛らない。
      skilltype: new StringField({ required: true, blank: true }),
      exptable: new StringField({ required: true, blank: true }),
      skillmod: new NumberField({ required: true, nullable: false, initial: 0 }),
      dedicated: new BooleanField({ initial: false }),

      /* ---- 以下は prepareDerivedData で毎回入れ直す ---- */
      skillexp: derivedNumber(),
      efallskmod: derivedNumber(),
      efallscmod: derivedNumber(),
      efallacmod: derivedNumber(),
      skillbase: derivedSchema({
        dex: derivedNumber(),
        agi: derivedNumber(),
        str: derivedNumber(),
        vit: derivedNumber(),
        int: derivedNumber(),
        mnd: derivedNumber(),
        // 効果を含まない値
        dexnef: derivedNumber(),
        aginef: derivedNumber(),
        strnef: derivedNumber(),
        vitnef: derivedNumber(),
        intnef: derivedNumber(),
        mndnef: derivedNumber(),
        // 魔法行使(専心の +2 を含む)
        invoke: derivedNumber(),
      }),
    };
  }

  static LOCALIZATION_PREFIXES = ["SW25.Item.skill"];
}
