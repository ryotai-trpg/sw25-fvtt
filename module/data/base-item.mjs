const { HTMLField, BooleanField, NumberField, SchemaField, StringField } = foundry.data.fields;

/* -------------------------------------------- */
/*  Item Models                                 */
/* -------------------------------------------- */

class BaseItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
    };
  }
}

export class LanguageData extends BaseItemData {
  static defineSchema() {
    return {
      ...super.defineSchema(),
      description: new HTMLField({ required: true, blank: true }),
      conversation: new BooleanField({ initial: false }),
      reading: new BooleanField({ initial: false })
    }
  }
  static LOCALIZATION_PREFIXES = ["SW25.Item.language"];
}

// export class WeaponData extends BaseItemData {
//   static defineSchema() {
//     return {
//       ...super.defineSchema(),
//       damage: new NumberField({
//         required: true,
//         integer: true,
//         positive: true,
//         initial: 5,
//       }),
//     };
//   }
// }
