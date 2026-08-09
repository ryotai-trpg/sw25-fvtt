// 「対象を取ってからロールする」流れ
import { targetRollDialog } from "./dialogs.mjs";

/**
 * ロールの種別。アイテムの 5 つの入口はどれもこの 5 種類のどれかを指す。
 *
 * シートのアイコンクリック(`system.clickitem`)とチャットカードのボタン
 * (`data-buttontype`)は名前が違うだけで同じものなので、呼び出し側で
 * 種別に直してから渡す。
 */
export const CLICKITEM_ROLL_KINDS = {
  dice: "check",
  dice1: "check1",
  dice2: "check2",
  dice3: "check3",
  power: "power",
};

/** @see CLICKITEM_ROLL_KINDS */
export const CHAT_BUTTON_ROLL_KINDS = {
  buttoncheck: "check",
  buttoncheck1: "check1",
  buttoncheck2: "check2",
  buttoncheck3: "check3",
  buttonpower: "power",
};

/** 種別ごとに、適用先と一括適用カードのボタンをどのフィールドから読むか。 */
const ROLL_KIND_FIELDS = {
  check: { apply: "applycheck", checktype: "checkTypesButton" },
  check1: { apply: "applycheck1", checktype: "checkTypesButton1" },
  check2: { apply: "applycheck2", checktype: "checkTypesButton2" },
  check3: { apply: "applycheck3", checktype: "checkTypesButton3" },
  power: { apply: "applypower", powertype: "powerTypesButton" },
};

/**
 * ロールの見出し。`<アイテム名> (<種別名>)`。
 *
 * @param {Item} item
 * @param {string} kind
 * @returns {string}
 */
function itemRollLabel(item, kind) {
  const suffix = {
    check: game.i18n.localize("SW25.Check"),
    check1: item.system.label1,
    check2: item.system.label2,
    check3: item.system.label3,
    power:
      item.type == "monsterability"
        ? item.system.labelmonpow
        : game.i18n.localize("SW25.Item.Power"),
  }[kind];

  return `${item.name} (${suffix})`;
}

/**
 * アイテムのロールを `rollWithTargets` に渡す形にする。
 *
 * アクターシートのアイテム行は同じ値を `data-*` で持っているので、
 * そちら側は dataset から直接組み立てる。
 *
 * @param {Item} item
 * @param {string} kind  `CLICKITEM_ROLL_KINDS` / `CHAT_BUTTON_ROLL_KINDS` の値
 * @returns {{label: string, apply: string, checktype: ?string[], powertype: ?string[]}}
 */
export function itemRollTargets(item, kind) {
  const fields = ROLL_KIND_FIELDS[kind];

  return {
    label: itemRollLabel(item, kind),
    apply: item.system[fields.apply],
    checktype: fields.checktype ? item.system[fields.checktype] : null,
    powertype: fields.powertype ? item.system[fields.powertype] : null,
  };
}

/**
 * 対象を取ってからロールする。
 *
 * 適用先が無いか対象を取っていなければそのまま 1 回振る。対象があれば
 * まとめて振るか 1 体ずつ振るかを訊き、1 体ずつなら出したカードの id を
 * 集めて「まとめて適用」のカードを出す。そのカードのボタンは
 * `flags.sw25.targetMessage` を辿って各カードのボタンを押しに行く。
 *
 * @param {object} options
 * @param {Actor|null} options.actor        まとめて適用するカードの発言者
 * @param {string} options.label            ダイアログの見出しとカードの見出し
 * @param {string} options.apply            適用先("-" / "on" / "custom")
 * @param {string[]|string} [options.checktype]  custom のときに出す判定側のボタン
 * @param {string[]|string} [options.powertype]  custom のときに出す威力側のボタン
 * @param {(targetTokens?: Set<Token>) => Promise<{chatMessageId: string}>} options.exec
 *   実際にロールしてカードを出す処理。1 体ずつのときは対象 1 つだけの Set で呼ぶ
 */
export async function rollWithTargets({
  actor,
  label,
  apply,
  checktype = null,
  powertype = null,
  exec,
}) {
  const targetTokens = game.user.targets;

  if (!apply || apply == "-" || targetTokens.size === 0) {
    await exec();
    return;
  }

  const rollMethod = await targetRollDialog(targetTokens, label);
  if (rollMethod == "once") {
    await exec(targetTokens);
    return;
  }
  if (rollMethod != "individual") return; // "cancel"

  const targetMessage = [];
  for (const token of targetTokens) {
    const result = await exec(new Set([token]));
    targetMessage.push(result.chatMessageId);
  }

  // rendar apply all message
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `${label} - <b>${game.i18n.localize("SW25.Applyall")}</b>`,
    flags: { sw25: { targetMessage } },
    content: await foundry.applications.handlebars.renderTemplate(
      "systems/sw25/templates/roll/roll-applyall.hbs",
      { apply, checktype, powertype }
    ),
  });
}
