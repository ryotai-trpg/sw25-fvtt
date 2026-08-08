import {
  SW25ActorDataModel,
  baseFields,
  effectFields,
  effectAttributeFields,
  effectTopLevelFields,
  fellowFields,
  fellowAttributeFields,
  languageFields,
  magicSchoolModFields,
  modParamsField,
  unidentifiedFields,
  derivedBool,
  derivedNumber,
  nullableNum,
  num,
  bool,
  str,
  HTMLField,
  SchemaField,
} from "./_shared.mjs";

/**
 * 魔物。
 *
 * template.json の宣言と実態が食い違っていた点:
 * - `classType`(種族分類)がまるごと宣言に無い。シートにセレクトがあり、
 *   helpers/migrator.mjs が 2.1.2 移行で書き込み、
 *   helpers/damagesupport.mjs が与ダメージのタグ付けに使う。
 *   宣言側にある `type` は「その他」を選んだときの自由入力のほう
 * - `summonmp` / `weakapply` も宣言に無いがシートに入力がある
 * - 概要は .textarea-editor なので、宣言に無い `displayoverview` が
 *   実際には保存されている
 * - `attributes.{系統}power` と `attributes.{系統}skill` は
 *   character の block をそのまま複製したもので、魔物では読み書きが 0。
 *   魔物の呪文が読むのは `attributes.{系統}mod` と効果側の ef* だけ
 * - `exp` / `pp` / `mpp` / `showimp` / `showpt` は宣言では入力値のように
 *   見えるが、すべて prepare が毎回入れ直す派生値
 */
export class MonsterData extends SW25ActorDataModel {
  static defineSchema() {
    return {
      ...baseFields(),
      ...fellowFields("daemon"),
      ...unidentifiedFields(),
      ...effectFields(),
      ...effectTopLevelFields(),
      ...modParamsField(),

      monlevel: num(1),
      hpbase: num(),
      mpbase: num(),
      ppbase: num(),
      mppbase: num(),

      // 種族分類(CONFIG.SW25.actorClasses)。"Other" のときだけ type を出す
      classType: str(),
      type: str(),
      intelligence: str(),
      perception: str(),
      reaction: str(),
      language: str(),
      habitat: str(),
      weakness: str(),
      move: str(),
      // 「部位」は data-dtype="String"。prepare は 0 / null と比較して
      // 表示するかどうかだけ決めている
      part: str(),
      corepart: str(),
      impurity: nullableNum(),
      popularity: nullableNum(),
      weakpoint: nullableNum(),
      preemptive: nullableNum(),
      summonmp: nullableNum(),
      weakapply: bool(),
      usespell: bool(),
      loot: new HTMLField({ required: true, blank: true }),

      attributes: new SchemaField({
        ...fellowAttributeFields("daemon"),
        ...effectAttributeFields(),
        ...languageFields(),
        ...magicSchoolModFields(),

        hitmod: num(),
        dmod: num(),
        dodgemod: num(),
        ppmod: num(),
        mppmod: num(),
        dreduce: num(),
      }),

      /* ---- 派生値 ---- */
      exp: derivedNumber(),
      pp: derivedNumber(),
      mpp: derivedNumber(),
      showimp: derivedBool(),
      showpt: derivedBool(),
      // シートは防護点の内訳(素の値 + 減少)を読むが、
      // _prepareMonsterData は character と違ってこれらを計算していない。
      // 読み手があるので宣言はする(既存の挙動どおり常に 0 = 非表示)
      barepp: derivedNumber(),
      barempp: derivedNumber(),
      baredreduce: derivedNumber(),
    };
  }

  static LOCALIZATION_PREFIXES = ["SW25.Actor.monster"];
}
