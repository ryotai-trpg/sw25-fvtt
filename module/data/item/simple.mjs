import {
  SW25ItemDataModel,
  baseFields,
  commonFields,
  itemFields,
  rollFields,
  abilityFields,
  castFields,
  costFields,
  elementsFields,
  resistFields,
  magicItemFields,
  derivedString,
  StringField,
} from "./_shared.mjs";

/**
 * 共有フィールドの組み合わせが主で、独自フィールドがほとんど無い型。
 * template.json では "templates" しか書かれていなかったもの。
 */

/** 所持品。base + item + roll に属性と魔法のアイテム情報が付く */
export class ItemItemData extends SW25ItemDataModel {
  static defineSchema() {
    return {
      ...baseFields(),
      ...commonFields(),
      ...itemFields(),
      ...rollFields(),
      ...elementsFields(),
      ...magicItemFields(),
      // 種別の表示名。system.type から毎回引き直す
      typename: derivedString(),
    };
  }

  static LOCALIZATION_PREFIXES = ["SW25.Item.item"];
}

/**
 * 種族特徴。
 *
 * template.json は templates: ["base", "roll"] としか書いていないが、
 * シートは特技系(ability)と魔法のアイテム、対象・射程の入力まで出す。
 * 実際に描画したシートの name="system.*" と突き合わせて拾った。
 */
export class RaceabilityData extends SW25ItemDataModel {
  static defineSchema() {
    return {
      ...baseFields(),
      ...commonFields(),
      ...rollFields(),
      ...abilityFields(),
      ...castFields(),
      ...costFields(),
      ...elementsFields(),
      ...resistFields(),
      ...magicItemFields(),
      race: new StringField({ required: true, blank: true }),
    };
  }

  static LOCALIZATION_PREFIXES = ["SW25.Item.raceability"];
}
