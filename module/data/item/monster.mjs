import {
  SW25ItemDataModel,
  baseFields,
  commonFields,
  rollFields,
  abilityFields,
  castFields,
  costFields,
  elementsFields,
  resistFields,
  numberedCheckFields,
  textareaEditorFields,
  derivedNumber,
  derivedString,
  NumberField,
  SchemaField,
  StringField,
} from "./_shared.mjs";

const str = (initial = "") =>
  new StringField({ required: true, blank: true, initial });

/** 判定ごとの抵抗指定(dice1.resist など)。template.json には無い */
const diceResist = () => ({
  resist: new SchemaField({
    type: str(),
    input: str(),
    result: str(),
  }),
});

/**
 * 魔物能力。判定を 3 本持つ。
 * template.json では label1 / checkbase1 … を 3 セット直書きしていた。
 */
export class MonsterabilityData extends SW25ItemDataModel {
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

      remark: str(),
      ...numberedCheckFields(1),
      ...numberedCheckFields(2),
      ...numberedCheckFields(3),
      dice1: new SchemaField(diceResist()),
      dice2: new SchemaField(diceResist()),
      dice3: new SchemaField(diceResist()),
      labelmonpow: str("PowerLabel"),

      /* ---- 派生値 ---- */
      efmod: derivedNumber(),
      efallckmod: derivedNumber(),
      efallmgpmod: derivedNumber(),
      efallscmod: derivedNumber(),
      efallacmod: derivedNumber(),
    };
  }

  static LOCALIZATION_PREFIXES = ["SW25.Item.monsterability"];
}

/**
 * 行動(フェロー・魔神の行動表)。判定を 2 本持ち、
 * こちらは技能と適用ボタンの指定も付く。
 */
export class ActionData extends SW25ItemDataModel {
  static defineSchema() {
    return {
      ...baseFields(),
      ...commonFields(),
      ...rollFields(),
      ...castFields(),
      ...costFields(),
      ...elementsFields(),
      ...resistFields(),

      ...numberedCheckFields(1, { skill: true, buttons: true, usedice: true }),
      ...numberedCheckFields(2, { skill: true, buttons: true }),
      dice1: new SchemaField(diceResist()),

      actiondice: str(),
      actionresult: str(),
      actionvalue: str(),
      dialog: str(),
      // actor-actions*.hbs が {{{system.displayaction}}} /
      // {{{system.displayactioneffect}}} を読む
      ...textareaEditorFields("action"),
      ...textareaEditorFields("actioneffect"),

      /* ---- 派生値 ---- */
      actiondicename: derivedString(),
      efmod: derivedNumber(),
      efallckmod: derivedNumber(),
      efallmgpmod: derivedNumber(),
      efallscmod: derivedNumber(),
      efallacmod: derivedNumber(),
    };
  }

  static LOCALIZATION_PREFIXES = ["SW25.Item.action"];
}
