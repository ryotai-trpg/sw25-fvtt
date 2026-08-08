import {
  SW25ActorDataModel,
  abilityEffectFields,
  baseFields,
  effectFields,
  effectAttributeFields,
  effectTopLevelFields,
  fellowFields,
  fellowAttributeFields,
  languageFields,
  magicSchoolModFields,
  modParamsField,
  derivedAny,
  derivedBool,
  derivedNullableNumber,
  derivedNumber,
  derivedString,
  effectNumber,
  nullableNum,
  num,
  bool,
  str,
  ArrayField,
  NumberField,
  SchemaField,
} from "./_shared.mjs";

/** 魔法系統の略号。トップレベルの {系統}skill と派生値の {系統}base に使う */
const MAGIC_SCHOOLS = [
  "sc",
  "cn",
  "wz",
  "pr",
  "mt",
  "fr",
  "dr",
  "dm",
  "ab",
  "bm",
];

/**
 * 能力値。
 *
 * 素早さ・生命力・精神力の racevalue は prepare が
 * 器用度・筋力・知力からコピーするので保存しない。
 * シートの入力(`{{#if (isEven @index)}}`)もその 3 つにしか出ない。
 *
 * @param {boolean} raceIsDerived racevalue が派生値かどうか
 * @param {string} basename シートに出す A〜F のラベル
 */
const abilityFields = (raceIsDerived, basename) =>
  new SchemaField({
    racevalue: raceIsDerived ? derivedNumber() : nullableNum(),
    valuebase: nullableNum(),
    valuegrowth: num(),
    valuemodify: num(),
    // シートに出すだけの見出し。template.json の "A"〜"F"
    basename: str(basename),
    ...abilityEffectFields(),

    /* ---- 派生値 ---- */
    value: derivedNumber(),
    mod: derivedNumber(),
    // 冒険者レベル + 能力ボーナス。checkskills.hbs と chatbutton.mjs が読む
    advbase: derivedNumber(),
  });

/**
 * PC。
 *
 * template.json の宣言と実態が食い違っていた点:
 *
 * - **技能の選択はトップレベル。** シートが送るのは `system.scskill` /
 *   `system.hitweapon` / `system.dodgeskill` などで、宣言側の
 *   `attributes.scskill` / `attributes.hitweapon` は参照が 0。
 *   一方で修正値は `attributes.scmod` のまま(こちらは宣言と一致)
 * - `class` は参照が 0 の死骸。生きているのは宣言に無い `classType`
 *   (シートのセレクト、helpers/damagesupport.mjs が与ダメージのタグに使う)
 * - `isEdit` / `isSidebar` / `isToken` は宣言に無いがシートの状態そのもの。
 *   isEdit を落とすとシートが丸ごと読み取り専用になる
 * - `attributes.fairy.{6 属性}` も宣言に無い。name= ではなく
 *   `data-path` 属性 + actor-sheet.mjs のクリックハンドラで更新される
 * - `money` は Actor.templates にあるが character の templates から
 *   参照されていない。シートは読み書きしている
 * - `attributes.{系統}power` は宣言では入力値のように見えるが派生値。
 *   `attributes.{系統}cast` と `{系統}base` に至っては宣言が無い
 */
export class CharacterData extends SW25ActorDataModel {
  static defineSchema() {
    return {
      ...baseFields(),
      ...fellowFields("fellow"),
      ...effectFields(),
      ...effectTopLevelFields(),
      ...modParamsField(),

      race: str(),
      classType: str(),
      money: nullableNum(),
      lootmod: num(),

      // シートの表示状態
      isEdit: bool(),
      isSidebar: bool(),
      isToken: bool(),

      color: new SchemaField({
        main: new SchemaField({ bg: str("#000000"), text: str("#ffffff") }),
        sub: new SchemaField({ bg: str("#efe6d8"), text: str("#000000") }),
      }),

      abilities: new SchemaField({
        dex: abilityFields(false, "A"),
        agi: abilityFields(true, "B"),
        str: abilityFields(false, "C"),
        vit: abilityFields(true, "D"),
        int: abilityFields(false, "E"),
        mnd: abilityFields(true, "F"),
      }),

      // 判定・行使に使う技能名。すべてトップレベル
      hitweapon: str(),
      attackskill: str(),
      dodgeskill: str(),
      herbskill: str(),
      potionskill: str(),
      repairskill: str(),
      ...Object.fromEntries(MAGIC_SCHOOLS.map((s) => [`${s}skill`, str()])),

      attributes: new SchemaField({
        ...fellowAttributeFields("fellow"),
        ...effectAttributeFields(),
        ...languageFields(),
        ...magicSchoolModFields(),

        advlevel: new SchemaField({
          // 所持している技能の最大レベルから毎回決まる
          value: derivedNumber(),
          mod: num(),
        }),
        mglevel: new SchemaField({ value: derivedNumber() }),
        move: new SchemaField({
          movemod: nullableNum(),
          efmovemod: effectNumber(),
          /* ---- 派生値 ---- */
          limited: derivedNumber(3),
          normal: derivedNumber(),
          max: derivedNumber(),
        }),
        honer: new SchemaField({ rank: str("-"), value: num() }),
        // 妖精との契約。data-path 属性で更新される
        fairy: new SchemaField({
          earth: bool(),
          water: bool(),
          fire: bool(),
          wind: bool(),
          light: bool(),
          dark: bool(),
        }),

        age: nullableNum(),
        gender: str(),
        born: str(),
        faith: str(),
        grace: bool(true),
        impurity: num(),
        fumble: num(),
        totalexp: num(3000),
        hitmod: num(),
        dmod: num(),
        ltmod: num(),
        crmod: num(),
        dodgemod: num(),
        ppmod: num(),
        mppmod: num(),
        dreduce: num(),
        showfeature: bool(),
        showspell: bool(),

        /* ---- 派生値 ---- */
        // 所持している技能の経験点の合計
        useexp: derivedNumber(),
        protectionpoint: derivedNumber(),
        magicprotection: derivedNumber(),
        // 系統ごとの魔力と行使判定
        ...Object.fromEntries(
          MAGIC_SCHOOLS.flatMap((s) => [
            [`${s}power`, derivedNumber()],
            [`${s}cast`, derivedNumber()],
          ])
        ),
        // 魔導書魔法のランクごとの上限と装備数
        bibRankMax: new ArrayField(new NumberField(), {
          required: true,
          persisted: false,
        }),
        bibRankEquip: new ArrayField(new NumberField(), {
          required: true,
          persisted: false,
        }),
      }),

      /* ---- 派生値 ---- */
      // 効果の合計。prepare が systemData に直接足し込む
      efallskadvmod: derivedNumber(),
      efallmgpacmod: derivedNumber(),
      efallscmod: derivedNumber(),
      efallacmod: derivedNumber(),

      // 系統ごとの魔法行使の基礎値(技能の invoke から引く)
      ...Object.fromEntries(
        MAGIC_SCHOOLS.map((s) => [`${s}base`, derivedNumber()])
      ),
      // 妖精魔法の使用ランク。契約数によって "8/2" のような文字列にもなる
      frRank: derivedAny(),
      // 魔導書魔法の技能レベル
      bmlv: derivedNullableNumber(),

      // 専心の防具・盾を装備しているか
      armorDedicated: derivedBool(),
      shieldDedicated: derivedBool(),

      // 選択中の武器(system.hitweapon)からコピーしてくる一式。
      // 武器を選んでいないときは null / "" のままにして、
      // シートが「0」を描かないようにする
      itemname: derivedString(),
      itemid: derivedString(),
      itemhitformula: derivedAny(),
      itemhitbase: derivedNullableNumber(),
      itempowerformula: derivedString(),
      itempower: derivedNullableNumber(),
      itemcvalue: derivedNullableNumber(),
      itempowerbase: derivedNullableNumber(),
      itempowertable: derivedAny(),
      itemapplycheck: derivedString(),
      itemapplypower: derivedString(),
      itemchecktype: derivedAny(),
      itempowertype: derivedAny(),
      resuse: derivedString(),
      resusequantity: derivedNullableNumber(),

      // 回避・防護点の内訳
      skillagidodge: derivedNumber(),
      itemdodge: derivedNumber(),
      dodgebase: derivedNumber(),
      itempp: derivedNumber(),
      itemmpp: derivedNumber(),
      barepp: derivedNumber(),
      barempp: derivedNumber(),
      baredreduce: derivedNumber(),
    };
  }

  static LOCALIZATION_PREFIXES = ["SW25.Actor.character"];
}
