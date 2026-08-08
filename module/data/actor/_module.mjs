import { CharacterData } from "./character.mjs";
import { MonsterData } from "./monster.mjs";
import { NpcData } from "./npc.mjs";

/**
 * DataModel へ移行済みのアクター型。
 *
 * ここに載せた型は template.json からフィールド定義を消してよい。
 * ただし Actor.types の配列からは消さないこと —
 * 型が存在するかどうかは今も template.json(game.model)が決めている。
 */
export const actorDataModels = {
  character: CharacterData,
  monster: MonsterData,
  npc: NpcData,
};
