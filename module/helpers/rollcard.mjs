// ロールの結果からチャットカードを組む
import { DamageSupporter } from "./damagesupport.mjs";

/**
 * 対象のコマを、カードが持つ形(id の配列と表示用の文字列)に直す。
 *
 * @param {Set<Token>} [targetTokens]
 * @returns {{target: ?string[], targetName: ?string}}
 */
function targetInfo(targetTokens) {
  if (!targetTokens) return { target: null, targetName: null };

  const targetArray = Array.from(targetTokens);
  return {
    target: targetArray.map((token) => token.id),
    targetName: targetArray
      .map((token) => `>>> ${token.document.name}`)
      .join("<br>"),
  };
}

/**
 * 属性・系統のタグ。ダメージ適用のときに増減と減衰を引くのに要る。
 *
 * @param {Actor|null} actor
 * @param {Item|null} item
 */
function elementTags(actor, item) {
  const elements = item ? item.system.elements : null;
  const damage = actor ? actor.system.attributes.damage : null;
  const classType = actor ? actor.system.classType : null;
  const isWeapon = DamageSupporter.getWeaponAttributes(item);

  return {
    elements,
    damage,
    tags: DamageSupporter.createChatTag(elements, damage, classType, isWeapon),
  };
}

/**
 * 威力ロールのカードを出す。
 *
 * 入口は 3 つ(アイテムのアイコン / アクターシートの行 / チャットカードの
 * ボタン)あるが、`powerRoll()` の結果をカードに直すところは同じなので
 * ここに 1 本化する。入口ごとに違うのは発言者・見出し・適用先・
 * ボタンの種別・対象のコマだけ。
 *
 * @param {object} options
 * @param {Actor|null} options.actor
 * @param {Item|null} options.item          属性タグを引くアイテム
 * @param {object} options.roll             `powerRoll()` の戻り値
 * @param {string} options.label            カードの見出し
 * @param {string} options.apply            適用先("-" / "on" / "custom")
 * @param {string[]|string} options.powertype  custom のときに出すボタン
 * @param {Set<Token>} [options.targetTokens]
 * @returns {Promise<{roll: object, chatMessageId: string}>}
 */
export async function createPowerCard({
  actor,
  item,
  roll,
  label,
  apply,
  powertype,
  targetTokens,
}) {
  let cValueFormula = "@" + roll.cValue;
  let halfFormula = "";
  let lethalTechFormula = "";
  let criticalRayFormula = "";
  let pharmToolFormula = "";
  let powupFormula = "";
  if (roll.cValue == 100) cValueFormula = "@13";
  if (roll.halfPow == 1) halfFormula = "h+" + roll.halfPowMod;
  else if (roll.halfPowMod && roll.halfPowMod != 0)
    halfFormula = "+" + roll.halfPowMod;
  if (roll.lethalTech != 0) lethalTechFormula = "#" + roll.lethalTech;
  if (roll.criticalRay > 0) criticalRayFormula = "$+" + roll.criticalRay;
  else if (roll.criticalRay != 0) criticalRayFormula = "$" + roll.criticalRay;
  if (roll.pharmTool != 0) pharmToolFormula = "tf" + roll.pharmTool;
  if (roll.powup != 0) powupFormula = "r" + roll.powup;

  const chatFormula =
    "k" +
    roll.power +
    cValueFormula +
    "+" +
    roll.powMod +
    lethalTechFormula +
    criticalRayFormula +
    pharmToolFormula +
    powupFormula +
    halfFormula;

  let chatPower = roll.power;
  let chatLethalTech = null;
  let chatCriticalRay = null;
  let chatPharmTool = null;
  let chatPowup = null;
  let chatResult = roll.eachPowerResult;
  let chatMod = roll.powMod;
  let chatModTotal = roll.powMod;
  if (roll.halfPow == 0 && roll.halfPowMod && roll.halfPowMod != 0)
    chatModTotal += roll.halfPowMod;
  let chatHalf = null;
  let chatResults = roll.rawPowerResult;
  let chatTotal = roll.powerResult;
  let chatExtraRoll = null;
  let chatFumble = null;
  if (roll.halfPow == 1) chatHalf = roll.halfPowMod;
  if (roll.lethalTech != 0) chatLethalTech = roll.lethalTech;
  if (roll.criticalRay != 0) chatCriticalRay = roll.criticalRay;
  if (roll.pharmTool != 0) chatPharmTool = roll.pharmTool;
  if (roll.powup != 0) chatPowup = roll.powup;
  if (roll.rollCount > 0) chatExtraRoll = roll.rollCount;
  if (roll.fumble == 1) chatFumble = roll.fumble;

  let showhalf = true;
  let shownoc = true;
  if (roll.halfPow == 1) {
    showhalf = false;
    shownoc = false;
  }
  if (roll.cValue == 100 || chatExtraRoll == null) shownoc = false;

  const { target, targetName } = targetInfo(targetTokens);
  const { elements, damage, tags } = elementTags(actor, item);
  const tooltip = await roll.fakeResult.getTooltip();

  const chatData = {
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: label,
    rolls: [roll.fakeResult],
    flags: {
      sw25: {
        formula: chatFormula,
        tooltip: tooltip,
        power: chatPower,
        lethalTech: chatLethalTech,
        criticalRay: chatCriticalRay,
        pharmTool: chatPharmTool,
        powup: chatPowup,
        result: chatResult,
        mod: chatMod,
        modTotal: chatModTotal,
        half: chatHalf,
        results: chatResults,
        total: chatTotal,
        extraRoll: chatExtraRoll,
        fumble: chatFumble,
        orghalf: roll.halfPowMod,
        orgtotal: chatTotal,
        orgextraRoll: chatExtraRoll,
        showhalf: showhalf,
        shownoc: shownoc,
        apply: apply,
        powertype: powertype,
        target,
        targetName: targetName,
        elements: elements,
        damage: damage,
        tags: tags,
      },
    },
    content: await foundry.applications.handlebars.renderTemplate(
      "systems/sw25/templates/roll/roll-power.hbs",
      {
        formula: chatFormula,
        tooltip: tooltip,
        power: chatPower,
        lethalTech: chatLethalTech,
        criticalRay: chatCriticalRay,
        pharmTool: chatPharmTool,
        powup: chatPowup,
        result: chatResult,
        mod: chatModTotal,
        half: chatHalf,
        results: chatResults,
        total: chatTotal,
        extraRoll: chatExtraRoll,
        fumble: chatFumble,
        showhalf: showhalf,
        shownoc: shownoc,
        apply: apply,
        powertype: powertype,
        targetName: targetName,
        tags: tags,
      }
    ),
  };

  const messageMode = game.settings.get("core", "messageMode");
  let chatMessageId;
  await ChatMessage.create(chatData, { messageMode }).then((chatMessage) => {
    chatMessageId = chatMessage.id;
  });

  return { roll, chatMessageId };
}
