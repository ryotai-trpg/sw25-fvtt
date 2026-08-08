import {
  AlchemytechData,
  BarbarousskillData,
  CombatabilityData,
  EnhanceartsData,
  EssenceweaveData,
  InfusionData,
  MagicalsongData,
  OtherfeatureData,
  PhaseareaData,
  RidingtrickData,
  SpellData,
  TacticsData,
} from "./abilities.mjs";
import { CheckData } from "./check.mjs";
import { AccessoryData, ArmorData, WeaponData } from "./equipment.mjs";
import { LanguageData } from "./language.mjs";
import { ActionData, MonsterabilityData } from "./monster.mjs";
import { ResourceData } from "./resource.mjs";
import { SessionData } from "./session.mjs";
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
  action: ActionData,
  alchemytech: AlchemytechData,
  armor: ArmorData,
  barbarousskill: BarbarousskillData,
  check: CheckData,
  combatability: CombatabilityData,
  enhancearts: EnhanceartsData,
  essenceweave: EssenceweaveData,
  infusion: InfusionData,
  item: ItemItemData,
  language: LanguageData,
  magicalsong: MagicalsongData,
  monsterability: MonsterabilityData,
  otherfeature: OtherfeatureData,
  phasearea: PhaseareaData,
  raceability: RaceabilityData,
  resource: ResourceData,
  ridingtrick: RidingtrickData,
  session: SessionData,
  skill: SkillData,
  spell: SpellData,
  tactics: TacticsData,
  weapon: WeaponData,
};
