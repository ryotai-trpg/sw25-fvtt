/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActiveEffectConfig}
 */
export class SW25ActiveEffectConfigV2 extends foundry.applications.sheets
  .ActiveEffectConfig {
  static PARTS = {
    header: { template: "templates/sheets/active-effect/header.hbs" },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    details: {
      template: "templates/sheets/active-effect/details.hbs",
      scrollable: [""],
    },
    duration: { template: "templates/sheets/active-effect/duration.hbs" },
    changes: {
      template: "systems/sw25/templates/effect/changes.hbs",
      scrollable: ["ol[data-changes]"],
    },
    footer: { template: "templates/generic/form-footer.hbs" },
  };

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext() {
    const context = await super._prepareContext();

    const systemPrefixedEffects = {};
    for (const [category, entries] of Object.entries(CONFIG.SW25.Effect)) {
      if (category === "keyClassifications") {
        systemPrefixedEffects[category] = entries;
        continue;
      }

      systemPrefixedEffects[category] = Object.fromEntries(
        Object.entries(entries).map(([key, value]) => [`system.${key}`, value])
      );
    }

    context.effectOptions = systemPrefixedEffects;

    // checkinput , input 
    if (context.source?.changes) {
      context.source.changes = context.source.changes.map((change) => {
        if (!change.key) return change;

        const match = change.key.match(/^system\.effect\.checkinputmod\.(.+)$/);

        if (match) {
          const [, checkname] = match;
          change.keyClassification = "checkinput";
          change.checkname = checkname;
        } else {
          let isInput = true;

          const categories = Object.keys(systemPrefixedEffects).filter(k => k !== "keyClassifications");
          for (const category of categories) {
            const keys = Object.keys(systemPrefixedEffects[category]);
            if (keys.includes(change.key)) isInput = false;
          }
          if (isInput) {
            change.keyClassification = "input";
          }
        }
        return change;
      });
    }

    return context;
  }

  /** @override */
  async _onRender(context, options) {
    await super._onRender(context, options);

    // 同じ関数参照を渡しているので、再描画で何度呼ばれても
    // addEventListener 側が重複を弾く。
    this.element.addEventListener("change", this.#onKeynameChange);
  }

  /**
   * 「判定名を入力」「直接入力」を選んだら、その場でテキスト入力欄を出す。
   * このシートは submitOnChange ではないため、選択しただけでは再描画が走らず、
   * テンプレート側の {{#if}} による入力欄はまだ存在しない。
   * @param {Event} event
   */
  #onKeynameChange = (event) => {
    const select = event.target.closest("select.select-keyname");
    if (!select) return;

    const container = select.closest(".key");
    if (!container) return;

    container
      .querySelectorAll("input.dynamic-input")
      .forEach((el) => el.remove());

    if (select.value !== "checkinput" && select.value !== "input") return;

    const input = document.createElement("input");
    input.type = "text";
    input.classList.add("dynamic-input");
    input.style.maxWidth = "calc(60% - 7px)";
    input.name = select.name;

    container.appendChild(input);
  };
}
