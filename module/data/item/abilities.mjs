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
  textareaEditorFields,
  derivedNumber,
  derivedString,
  BooleanField,
  NumberField,
  SchemaField,
  StringField,
} from "./_shared.mjs";

const str = (initial = "") =>
  new StringField({ required: true, blank: true, initial });
const num = (initial = 0) =>
  new NumberField({ required: true, nullable: false, initial });
const nullableNum = () =>
  new NumberField({ required: true, nullable: true, initial: null });
const bool = () => new BooleanField({ initial: false });

/**
 * 特技・魔法系に共通の土台。
 * template.json の templates: ["base", "roll", "ability"] に、
 * 宣言されていなかった共有フィールドを足したもの。
 */
const abilityBase = () => ({
  ...baseFields(),
  ...commonFields(),
  ...rollFields(),
  ...abilityFields(),
  ...castFields(),
  ...costFields(),
  ...elementsFields(),
  ...resistFields(),
  // 抵抗の種別。template.json にあるが読み書きしている箇所が見当たらない。
  // 既存データを落とさないために宣言だけ残す
  resist: str(),
});

/** 魔法 */
export class SpellData extends SW25ItemDataModel {
  static defineSchema() {
    return {
      ...abilityBase(),
      type: str(),
      faith: str(),
      sect: str(),
      magispfere: str(),
      fairytype: str(),
      fairyprop: str(),
      hpresist: bool(),
      excost1: str(),
      extime1: str(),
      excost2: str(),
      extime2: str(),
      // display 側を読んでいる箇所はまだ無いが、フックが書くので宣言しておく
      ...textareaEditorFields("expansion1"),
      ...textareaEditorFields("expansion2"),

      /* ---- 派生値 ---- */
      efallmgpmod: derivedNumber(),
      typename: derivedString(),
      fairytypename: derivedString(),
      fairypropname: derivedString(),
    };
  }

  static LOCALIZATION_PREFIXES = ["SW25.Item.spell"];
}

/** 練技 */
export class EnhanceartsData extends SW25ItemDataModel {
  static defineSchema() {
    return { ...abilityBase() };
  }

  static LOCALIZATION_PREFIXES = ["SW25.Item.enhancearts"];
}

/** 呪歌 */
export class MagicalsongData extends SW25ItemDataModel {
  static defineSchema() {
    return {
      ...abilityBase(),
      type: str(),
      sing: str(),
      pet: str(),
      singpoint: num(),
      upget: num(),
      downget: num(),
      charmget: num(),
      upadd: num(),
      downadd: num(),
      charmadd: num(),
      upcond: num(),
      downcond: num(),
      charmcond: num(),
      upcost: num(),
      downcost: num(),
      charmcost: num(),

      /* ---- 派生値 ---- */
      typename: derivedString(),
    };
  }

  static LOCALIZATION_PREFIXES = ["SW25.Item.magicalsong"];
}

/** 騎芸 */
export class RidingtrickData extends SW25ItemDataModel {
  static defineSchema() {
    return {
      ...abilityBase(),
      premise: str(),
      support: str(),
      rtpart: str(),
    };
  }

  static LOCALIZATION_PREFIXES = ["SW25.Item.ridingtrick"];
}

/** 賦術 */
export class AlchemytechData extends SW25ItemDataModel {
  static defineSchema() {
    return {
      ...abilityBase(),
      red: num(),
      green: num(),
      black: num(),
      white: num(),
      gold: num(),
      // template.json には無いが、シートに効果値の入力がある
      effectvalue: new SchemaField({
        type: str(),
        a: nullableNum(),
        b: nullableNum(),
        s: nullableNum(),
        ss: nullableNum(),
      }),
    };
  }

  static LOCALIZATION_PREFIXES = ["SW25.Item.alchemytech"];
}

/** 相域 */
export class PhaseareaData extends SW25ItemDataModel {
  static defineSchema() {
    return {
      ...abilityBase(),
      type: str(),
      mincost: num(),
      maxcost: num(),

      /* ---- 派生値 ---- */
      typename: derivedString(),
    };
  }

  static LOCALIZATION_PREFIXES = ["SW25.Item.phasearea"];
}

/** 戦術 */
export class TacticsData extends SW25ItemDataModel {
  static defineSchema() {
    return {
      ...abilityBase(),
      type: str(),
      cost: nullableNum(),
      line: str(),
      // 装備品の rank(B / A / S / SS)とは別物で、こちらは数値
      rank: nullableNum(),
      get: str(),
      premise: str(),
      cond: str(),

      /* ---- 派生値 ---- */
      typename: derivedString(),
      linename: derivedString(),
    };
  }

  static LOCALIZATION_PREFIXES = ["SW25.Item.tactics"];
}

/** 附与 */
export class InfusionData extends SW25ItemDataModel {
  static defineSchema() {
    return {
      ...abilityBase(),
      premise: str(),
      ipart: str(),
      humanoid: str(),
      type: str(),
      race: str(),
      itpart: str(),
    };
  }

  static LOCALIZATION_PREFIXES = ["SW25.Item.infusion"];
}

/** 蛮族技 */
export class BarbarousskillData extends SW25ItemDataModel {
  static defineSchema() {
    return {
      ...abilityBase(),
      race: str(),
      base: str(),
      resistbase: str("-"),
      // 装備品の rank と同じ B / A / S / SS のセレクト
      rank: str(),
    };
  }

  static LOCALIZATION_PREFIXES = ["SW25.Item.barbarousskill"];
}

/** 秘技 */
export class EssenceweaveData extends SW25ItemDataModel {
  static defineSchema() {
    return {
      ...abilityBase(),
      premise: str(),
    };
  }

  static LOCALIZATION_PREFIXES = ["SW25.Item.essenceweave"];
}

/** 戦闘特技 */
export class CombatabilityData extends SW25ItemDataModel {
  static defineSchema() {
    return {
      ...abilityBase(),
      type: str(),
      vag: bool(),
      dancer: bool(),
      condtype: str(),
      cond: str(),
      use: str(),
      app: str(),
      risk: str(),
      secret: bool(),
      scholl: str(),
      school: str(),
      honercost: num(),
      sectype: str(),
      limcond: str(),

      /* ---- 派生値 ---- */
      typename: derivedString(),
      condtypename: derivedString(),
    };
  }

  static LOCALIZATION_PREFIXES = ["SW25.Item.combatability"];
}

/** その他の特技。ability テンプレートは使わないがシートの中身はほぼ同じ */
export class OtherfeatureData extends SW25ItemDataModel {
  static defineSchema() {
    return {
      ...abilityBase(),
      type: str(),
    };
  }

  static LOCALIZATION_PREFIXES = ["SW25.Item.otherfeature"];
}
