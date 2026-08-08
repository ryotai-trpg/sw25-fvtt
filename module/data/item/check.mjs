import {
  SW25ItemDataModel,
  baseFields,
  commonFields,
  rollFields,
  resistFields,
  derivedNumber,
  BooleanField,
  NumberField,
  StringField,
} from "./_shared.mjs";

/**
 * 判定。template.json では templates: ["base", "roll"] + 独自 5 個。
 *
 * efckmod / efallckmod はアクターの効果から毎回引き直すだけなので保存しない。
 */
export class CheckData extends SW25ItemDataModel {
  static defineSchema() {
    return {
      ...baseFields(),
      ...commonFields(),
      ...rollFields(),
      ...resistFields(),

      checkfixmod: new NumberField({
        required: true,
        nullable: true,
        initial: null,
      }),
      showbtcheck: new BooleanField({ initial: false }),
      checkmethod: new StringField({
        required: true,
        blank: true,
        initial: "normal",
      }),
      // template.json には無いがシートにセレクトがある
      checkpackage: new StringField({ required: true, blank: true }),

      /* ---- 派生値 ---- */
      efckmod: derivedNumber(),
      efallckmod: derivedNumber(),
    };
  }

  static LOCALIZATION_PREFIXES = ["SW25.Item.check"];
}
