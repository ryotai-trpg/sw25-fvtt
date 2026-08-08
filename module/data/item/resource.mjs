import {
  SW25ItemDataModel,
  baseFields,
  itemFields,
  rollFields,
  BooleanField,
  SchemaField,
  StringField,
} from "./_shared.mjs";

const str = () => new StringField({ required: true, blank: true });
/** 種別から毎回引き直される真偽値 */
const derivedFlag = () => new BooleanField({ initial: false, persisted: false });

/**
 * リソース。base + item + roll に加えて resource.* を持つ。
 *
 * **resource.* は丸ごと template.json に無かった。**
 * シートに name="system.resource.type" などの入力欄があり、
 * prepare が種別から is* の真偽値を立てている。
 *
 * 元の実装は `if (!systemData.resource) systemData.resource = []` と
 * 配列を入れてからオブジェクトのプロパティを生やしていた。
 * スキーマで宣言したので、この場当たりの初期化は不要になる。
 */
export class ResourceData extends SW25ItemDataModel {
  static defineSchema() {
    return {
      ...baseFields(),
      ...itemFields(),
      ...rollFields(),

      resource: new SchemaField({
        type: str(),
        notetype: str(),
        materialtype: str(),
        materialrank: str(),
        lifelinetype: str(),
        magitechtype: str(),
        abyssextype: str(),
        isNotBattle: new BooleanField({ initial: false }),

        /* ---- 以下は type から毎回立て直す ---- */
        isNote: derivedFlag(),
        isMaterial: derivedFlag(),
        isLifeline: derivedFlag(),
        isTacsPower: derivedFlag(),
        isMagitech: derivedFlag(),
        isAbyssEx: derivedFlag(),
      }),
    };
  }

  static LOCALIZATION_PREFIXES = ["SW25.Item.resource"];
}
