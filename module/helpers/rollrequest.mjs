import { SW25 } from "./config.mjs";

const { DialogV2 } = foundry.applications.api;

/**
 * Execute roll request dialog.
 */
export async function rollreq() {
  // 判定方法・判定名・参照能力値はダイアログの中で変わる。
  // 変わるたびに #variablearea だけを描き直す。
  const state = { method: "skill", checkname: "", ability: "" };

  const tokens = canvas.tokens.placeables;
  const skills = new Set();
  const checks = new Set();
  for (const token of tokens) {
    if (token.actor) {
      const items = token.actor.items;
      for (const item of items) {
        if (item.type === "skill") skills.add(item);
        if (item.type === "check") checks.add(item);
      }
    }
  }
  const skilllist = Array.from(skills);
  const checklist = Array.from(checks);
  const abilities = SW25.abilityAbbreviations;

  const renderBody = () =>
    foundry.applications.handlebars.renderTemplate(
      "systems/sw25/templates/roll/rollreq-dialog.hbs",
      {
        method: state.method,
        checkname: state.checkname,
        ability: state.ability,
        skilllist,
        checklist,
        abilities,
      }
    );

  const content = await renderBody();

  await DialogV2.wait({
    window: { title: game.i18n.localize("SETTING.rollRequest") },
    content,
    buttons: [
      {
        action: "rollreq",
        label: game.i18n.localize("SETTING.rollRequest"),
        default: true,
        callback: async (event, button, dialog) => {
          const root = dialog.element;
          const valueOf = (name) =>
            root.querySelector(`[name="${name}"]`)?.value;

          const message = valueOf("message");
          const checkName = valueOf("checkname");
          const inputName = valueOf("inputcheckname");
          const refAbility = valueOf("ability");
          const modifier = parseInt(valueOf("modifier"), 10);
          const targetValue = parseInt(valueOf("target-value"), 10);

          const chatData = {
            speaker: ChatMessage.getSpeaker({ alias: "Gamemaster" }),
            flags: {
              sw25: {
                checkName: checkName,
                inputName: inputName,
                refAbility: refAbility,
                modifier: modifier,
                targetValue: targetValue,
                method: state.method,
              },
            },
          };
          chatData.content = "";
          let name = checkName;
          if (checkName == "di") name = inputName;
          if (state.method == "skill" && checkName && checkName != "") {
            let abi =
              " + " +
              game.i18n.localize(
                `SW25.Ability.${refAbility.capitalize()}.abbr`
              );
            if (refAbility == "") abi = "";
            name = `${name}${abi}`;
            if (checkName == "adv")
              name = `${game.i18n.localize("SW25.Attributes.Advlevel")}${abi}`;
          }
          let difficulty = targetValue
            ? game.i18n.localize("SW25.Difficulty")
            : "";

          let mod = "";
          if (modifier) {
            mod = modifier > 0 ? `+${modifier}` : modifier;
          }

          chatData.content =
            await foundry.applications.handlebars.renderTemplate(
              "systems/sw25/templates/roll/rollreq-card.hbs",
              {
                checkName: name,
                message: message,
                difficulty: difficulty,
                targetValue: targetValue,
                mod: mod,
              }
            );
          ChatMessage.create(chatData);
        },
      },
      { action: "cancel", label: game.i18n.localize("Cancel") },
    ],
    render: (event, dialog) => {
      const root = dialog.element;

      // ダイアログ本体に 1 つだけ委譲して張る。
      // #variablearea を差し替えても張り直しが要らないので、
      // 旧実装のような再帰的な再バインドをしなくて済む。
      root.addEventListener("change", async (ev) => {
        const target = ev.target;
        if (target.name !== "method" && target.name !== "checkname") return;

        if (target.name === "method") state.method = target.value;
        if (target.name === "checkname") state.checkname = target.value;
        state.ability =
          root.querySelector('[name="ability"]')?.value ?? state.ability;

        const area = root.querySelector("#variablearea");
        if (!area) return;

        const parsed = document.createElement("div");
        parsed.innerHTML = await renderBody();
        const next = parsed.querySelector("#variablearea");
        if (next) area.replaceChildren(...next.childNodes);
      });
    },
  });
}
