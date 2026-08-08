import {
  SW25ItemDataModel,
  baseFields,
  commonFields,
  rollFields,
  BooleanField,
  NumberField,
  SchemaField,
  StringField,
} from "./_shared.mjs";

const str = () => new StringField({ required: true, blank: true });
const bool = () => new BooleanField({ initial: false });

/**
 * セッション記録。
 *
 * template.json には character しか宣言が無かったが、
 * シートには session.* と result.* の入力がひととおり並んでいる。
 */
export class SessionData extends SW25ItemDataModel {
  static defineSchema() {
    return {
      ...baseFields(),
      ...commonFields(),
      ...rollFields(),

      character: new NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 1,
      }),

      session: new SchemaField({
        date: str(),
        gamemaster: str(),
        player: str(),
        pcnum: str(),
        mission: new SchemaField({
          exp: str(),
          gamel: str(),
          honor: str(),
        }),
        middle: new SchemaField({
          exp: str(),
          gamel: str(),
          sword: str(),
          tresure: str(),
          abyss: str(),
        }),
      }),

      result: new SchemaField({
        basic: bool(),
        character: bool(),
        sword: bool(),
        custom: bool(),
      }),
    };
  }

  static LOCALIZATION_PREFIXES = ["SW25.Item.session"];
}
