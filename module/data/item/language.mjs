import {
  SW25ItemDataModel,
  baseFields,
  commonFields,
  BooleanField,
} from "./_shared.mjs";

export class LanguageData extends SW25ItemDataModel {
  static defineSchema() {
    return {
      ...baseFields(),
      ...commonFields(),
      conversation: new BooleanField({ initial: false }),
      reading: new BooleanField({ initial: false }),
    };
  }

  static LOCALIZATION_PREFIXES = ["SW25.Item.language"];
}
