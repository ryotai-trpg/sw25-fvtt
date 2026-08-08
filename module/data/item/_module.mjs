import { CheckData } from "./check.mjs";
import { LanguageData } from "./language.mjs";
import { SkillData } from "./skill.mjs";

/**
 * DataModel へ移行済みのアイテム型。
 *
 * ここに載せた型は template.json からフィールド定義を消してよい。
 * ただし Item.types の配列からは消さないこと —
 * 型が存在するかどうかは今も template.json(game.model)が決めている。
 */
export const itemDataModels = {
  check: CheckData,
  language: LanguageData,
  skill: SkillData,
};

export { CheckData, LanguageData, SkillData };
