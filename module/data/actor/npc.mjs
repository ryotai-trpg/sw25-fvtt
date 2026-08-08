import {
  SW25ActorDataModel,
  baseFields,
  effectFields,
  effectAttributeFields,
  effectTopLevelFields,
  fellowFields,
  fellowAttributeFields,
  languageFields,
  unidentifiedFields,
  derivedAny,
  derivedNumber,
  nullableNum,
  num,
  str,
  SchemaField,
} from "./_shared.mjs";

/**
 * NPC。
 *
 * template.json の宣言と実態が食い違っていた点:
 * - `hpbase` / `mpbase` は **npc の宣言に無い**(monster にはある)のに、
 *   シートに name="system.hpbase" / "system.mpbase" があり
 *   prepare も HP / MP 上限の計算に使っている
 * - 技能一覧はトップレベルの `skilllist` が生きていて、
 *   宣言されている `attributes.skilllist` のほうは参照が 0
 * - `langage`(綴り違い)は参照が 0。生きているのは `language`
 * - `attributes.languages.advlevel` という入れ子も参照が 0
 * - 概要は .textarea-editor なので、宣言に無い `displayoverview` が
 *   実際には保存されていて、シートの {{{system.displayoverview}}} が読む
 * - `pp` / `mpp` は宣言では入力値のように見えるが、実際は
 *   ppbase + 各種補正で毎回計算される派生値
 */
export class NpcData extends SW25ActorDataModel {
  static defineSchema() {
    return {
      ...baseFields(),
      ...fellowFields("fellow"),
      ...unidentifiedFields(),
      ...effectFields(),
      ...effectTopLevelFields(),

      hpbase: nullableNum(),
      mpbase: nullableNum(),
      ppbase: num(),
      mppbase: num(),
      skilllist: str(),
      // カンマ区切りの言語名。prepare が Polyglot 用に分解する
      language: str(),

      attributes: new SchemaField({
        ...fellowAttributeFields("fellow"),
        ...effectAttributeFields(),
        ...languageFields(),

        advlevel: new SchemaField({ value: nullableNum() }),
        age: nullableNum(),
        gender: str(),
        ppmod: num(),
        mppmod: num(),
        dreduce: num(),
      }),

      /* ---- 派生値 ---- */
      pp: derivedNumber(),
      mpp: derivedNumber(),
      // 効果の合計。符号付きの文字列にされることがあるので型は縛らない
      totalppmod: derivedAny(),
      totalmppmod: derivedAny(),
      totaldreduce: derivedAny(),
      totalhpmod: derivedAny(),
      totalmpmod: derivedAny(),
    };
  }

  static LOCALIZATION_PREFIXES = ["SW25.Actor.npc"];
}
