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

  /**
   * CONFIG.SW25.Effect のカテゴリを、実際の change.key に合わせて
   * system. を付けた形に直したもの。キー選択の optgroup に使う。
   * @returns {Record<string, Record<string, string>>}
   */
  static #systemPrefixedEffects() {
    const options = {};
    for (const [category, entries] of Object.entries(CONFIG.SW25.Effect)) {
      if (category === "keyClassifications") {
        options[category] = entries;
        continue;
      }
      options[category] = Object.fromEntries(
        Object.entries(entries).map(([key, value]) => [`system.${key}`, value])
      );
    }
    return options;
  }

  /* -------------------------------------------- */

  /**
   * 1 行分の change を描画する。
   *
   * core の実装(client/applications/sheets/active-effect-config.mjs)は
   * templates/sheets/active-effect/change.hbs を描くだけなので、
   * キーの欄だけを本システム用に差し替えた change.hbs を代わりに描く。
   * name のパスは core と同じ system.changes.<index>.<field> を使う。
   *
   * @override
   */
  async _renderChange(context) {
    const { change, index } = context;

    if ("value" in change && typeof change.value !== "string") {
      change.value = JSON.stringify(change.value);
    }
    Object.assign(
      change,
      ["key", "type", "value", "phase", "priority"].reduce((paths, field) => {
        if (field in change) {
          paths[`${field}Path`] = `system.changes.${index}.${field}`;
        }
        return paths;
      }, {})
    );

    context.changeType = ActiveEffect.CHANGE_TYPES[change.type];

    const effectOptions = SW25ActiveEffectConfigV2.#systemPrefixedEffects();
    context.effectOptions = effectOptions;

    // 既存のキーが「判定名を入力」「直接入力」のどちらで作られたのかを復元する。
    // どのカテゴリにも無いキーは直接入力されたものとみなす。
    const key = change.key ?? "";
    const checkinput = key.match(/^system\.effect\.checkinputmod\.(.+)$/);
    if (checkinput) {
      change.keyClassification = "checkinput";
      change.checkname = checkinput[1];
    } else if (key) {
      const known = Object.entries(effectOptions).some(
        ([category, entries]) =>
          category !== "keyClassifications" && key in entries
      );
      if (!known) change.keyClassification = "input";
    }

    return foundry.applications.handlebars.renderTemplate(
      "systems/sw25/templates/effect/change.hbs",
      context
    );
  }

  /* -------------------------------------------- */

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
