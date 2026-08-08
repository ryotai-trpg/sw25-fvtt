import {
  SW25ItemDataModel,
  baseFields,
  commonFields,
  itemFields,
  rollFields,
  battleFields,
  elementsFields,
  magicItemFields,
  derivedString,
  NumberField,
  StringField,
} from "./_shared.mjs";

const str = () => new StringField({ required: true, blank: true });
const num = () => new NumberField({ required: true, nullable: false, initial: 0 });

/** 武器・防具・装身具に共通の土台 */
const equipmentBase = () => ({
  ...baseFields(),
  ...commonFields(),
  ...itemFields(),
  ...rollFields(),
  ...battleFields(),
  ...elementsFields(),
  ...magicItemFields(),
  // 分類の表示名。category から毎回引き直す
  categoryname: derivedString(),
});

/** 武器 */
export class WeaponData extends SW25ItemDataModel {
  static defineSchema() {
    return {
      ...equipmentBase(),
      // itemFields の type とは別物。武器種別(ソード等)
      usage: str(),
      hit: num(),
      dmod: num(),
      range: str(),

      /* ---- 派生値 ---- */
      typename: derivedString(),
      usagename: derivedString(),
      // 判定に使う技能の表示用。checkskill から引く
      showskill: derivedString(),
    };
  }

  static LOCALIZATION_PREFIXES = ["SW25.Item.weapon"];
}

/** 防具・盾 */
export class ArmorData extends SW25ItemDataModel {
  static defineSchema() {
    return {
      ...equipmentBase(),
      dodge: num(),
      pp: num(),
      mpp: num(),
      // template.json では武器にしか宣言が無いが、防具のシートにも入力欄がある
      usage: str(),
    };
  }

  static LOCALIZATION_PREFIXES = ["SW25.Item.armor"];
}

/** 装身具 */
export class AccessoryData extends SW25ItemDataModel {
  static defineSchema() {
    return {
      ...equipmentBase(),
      accpart: str(),
      deffect: str(),

      /* ---- 派生値 ---- */
      accpartname: derivedString(),
      deffectname: derivedString(),
    };
  }

  static LOCALIZATION_PREFIXES = ["SW25.Item.accessory"];
}
