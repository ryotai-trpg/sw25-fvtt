import { CheckData } from "./check.mjs";
import { AccessoryData, ArmorData, WeaponData } from "./equipment.mjs";
import { LanguageData } from "./language.mjs";
import { ResourceData } from "./resource.mjs";
import { ItemItemData, RaceabilityData } from "./simple.mjs";
import { SkillData } from "./skill.mjs";

/**
 * DataModel へ移行済みのアイテム型。
 *
 * ここに載せた型は template.json からフィールド定義を消してよい。
 * ただし Item.types の配列からは消さないこと —
 * 型が存在するかどうかは今も template.json(game.model)が決めている。
 */
export const itemDataModels = {
  accessory: AccessoryData,
  armor: ArmorData,
  check: CheckData,
  item: ItemItemData,
  language: LanguageData,
  raceability: RaceabilityData,
  resource: ResourceData,
  skill: SkillData,
  weapon: WeaponData,
};

export {
  AccessoryData,
  ArmorData,
  CheckData,
  ItemItemData,
  LanguageData,
  RaceabilityData,
  ResourceData,
  SkillData,
  WeaponData,
};
