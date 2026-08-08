import {
  SW25ItemDataModel,
  baseFields,
  itemFields,
  rollFields,
  StringField,
} from "./_shared.mjs";

/**
 * 共有フィールドの組み合わせが主で、独自フィールドがほとんど無い型。
 * template.json では "templates" しか書かれていなかったもの。
 */

/** 所持品。base + item + roll */
export class ItemItemData extends SW25ItemDataModel {
  static defineSchema() {
    return {
      ...baseFields(),
      ...itemFields(),
      ...rollFields(),
      // 種別の表示名。system.type から毎回引き直すだけで template.json には無かった
      typename: new StringField({
        required: true,
        blank: true,
        persisted: false,
      }),
    };
  }

  static LOCALIZATION_PREFIXES = ["SW25.Item.item"];
}

/** 種族特徴。base + roll。独自フィールドも派生値も無い */
export class RaceabilityData extends SW25ItemDataModel {
  static defineSchema() {
    return { ...baseFields(), ...rollFields() };
  }

  static LOCALIZATION_PREFIXES = ["SW25.Item.raceability"];
}
