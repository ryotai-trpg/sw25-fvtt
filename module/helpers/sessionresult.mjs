/**
 * セッション記録の「結果を出力」。
 * `SW25SessionSheet` の `sessionResult` アクションから呼ぶ。
 */
export async function sessionResult(item) {
  let chatData = null;
  let roll = null;
  let formula = null;
  let tooltip = null;
  let total = null;
  let isRoll = false;

  const label = game.i18n.localize("SW25.Item.Session.Result.Label");

  const title = item.name;
  const pcNum = Number(item.system.session.pcnum);

  const gamel =
    Number(item.system.session.mission.gamel) +
    Number(item.system.session.middle.gamel);
  const keepGamel = gamel % pcNum;
  const getGamel = Math.floor((gamel - keepGamel) / pcNum);

  let getExp =
    Number(item.system.session.mission.exp) +
    Number(item.system.session.middle.exp);

  const abyss = Number(item.system.session.middle.abyss);
  const keepAbyss = abyss % pcNum;
  const getAbyss = Math.floor((abyss - keepAbyss) / pcNum);
  const getTresure = Number(item.system.session.middle.tresure);

  const getSword = Number(item.system.session.middle.sword);

  let getHonor = Number(item.system.session.mission.honor);

  // basic info.
  const isBasic = item.system.result.character;
  const date = item.system.session.date;
  const gm = item.system.session.gamemaster;
  const player = item.system.session.player;

  // character result.
  let characterNames = item.system.result.character
    ? canvas.tokens.placeables
        .filter((token) => token.actor?.type === "character")
        .map((token) => token.name)
    : [];

  let isCharaExp = false;
  let charaResult = [];
  if (0 < characterNames.length) {
    isCharaExp = true;
    for (let name of characterNames) {
      const targetActor = game.actors.find((a) => a.name === name);
      if (targetActor) {
        const oneRollValue = targetActor.system.attributes.fumble ?? 0;
        charaResult.push({ name: name, value: oneRollValue });
      }
    }
  }

  // custom items.
  const fieldsRaw = item.system.customFields;
  const customItems = Object.values(fieldsRaw);
  const isCustom = item.system.result.custom && customItems;

  // sword shard result.
  if (item.system.result.sword && 0 < getSword) {
    isRoll = true;
    formula = getSword + "d6";
    roll = new Roll(formula);
    await roll.evaluate({ async: true });
    tooltip = await roll.getTooltip();
    total = roll.total;

    getHonor += Number(roll.total);
    chatData = {
      speaker: ChatMessage.getSpeaker(),
      flavor: label,
      rolls: [roll],
    };
  } else {
    chatData = {
      speaker: ChatMessage.getSpeaker(),
      flavor: label,
    };
  }
  const isGamel = 0 < getGamel || 0 < keepGamel;
  const isHonor = 0 < getHonor || 0 < getSword;
  const isAbyss = 0 < getAbyss || 0 < keepAbyss;

  chatData.content = await foundry.applications.handlebars.renderTemplate(
    "systems/sw25/templates/roll/session-info.hbs",
    {
      title: title,
      isGamel: isGamel,
      getGamel: getGamel,
      keepGamel: keepGamel,
      getExp: getExp,
      isHonor: isHonor,
      getHonor: getHonor,
      getSword: getSword,
      isAbyss: isAbyss,
      getAbyss: getAbyss,
      keepAbyss: keepAbyss,
      getTresure: getTresure,
      isBasic: isBasic,
      date: date,
      gm: gm,
      player: player,
      isCharaExp: isCharaExp,
      charaResult: charaResult,
      isCustom: isCustom,
      customItems: customItems,
      isRoll: isRoll,
      formula: formula,
      tooltip: tooltip,
      total: total,
    }
  );

  ChatMessage.create(chatData);
}
