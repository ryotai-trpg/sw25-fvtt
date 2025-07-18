/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActiveEffectConfig}
 */
export class SW25ActiveEffectConfigV1 extends ActiveEffectConfig {
  /** @override */
  static get defaultOptions() {
    //return mergeObject(super.defaultOptions, {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["sw25", "sheet", "active-effect-sheet"],
      template: "systems/sw25/templates/effect/active-effect-config.hbs",
    });
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    // Retrieve base data structure.
    const context = await super.getData();

    context.effectOptions = CONFIG.SW25.Effect;

    // Use a safe clone of the actor data for further operations.
    const effectData = context.data;

    // Set  keyClassification and kename of exsisting keys
    for (let i = 0; i < effectData.changes.length; i++) {
      let change = effectData.changes[i];
      change.keyname = change.key.replace(/^system\./, "");
      if (change.keyname in context.effectOptions.battle) {
        change.keyClassification = "battle";
      } else if (change.keyname in context.effectOptions.check) {
        change.keyClassification = "check";
      } else if (change.keyname in context.effectOptions.parameter) {
        change.keyClassification = "parameter";
      } else if (change.keyname in context.effectOptions.magicpower) {
        change.keyClassification = "magicpower";
      } else if (change.keyname in context.effectOptions.magicckroll) {
        change.keyClassification = "magicckroll";
      } else if (change.keyname in context.effectOptions.magicpwroll) {
        change.keyClassification = "magicpwroll";
      } else if (change.keyname in context.effectOptions.mpsave) {
        change.keyClassification = "mpsave";
      } else if (change.keyname in context.effectOptions.feature) {
        change.keyClassification = "feature";
      } else if (change.keyname in context.effectOptions.powertable) {
        change.keyClassification = "powertable";
      } else if (change.keyname in context.effectOptions.classPdamage) {
        change.keyClassification = "classPdamage";
      } else if (change.keyname in context.effectOptions.classPdecay) {
        change.keyClassification = "classPdecay";
      } else if (change.keyname in context.effectOptions.elementPdamage) {
        change.keyClassification = "elementPdamage";
      } else if (change.keyname in context.effectOptions.elementPdecay) {
        change.keyClassification = "elementPdecay";
      } else if (change.keyname in context.effectOptions.classMdamage) {
        change.keyClassification = "classMdamage";
      } else if (change.keyname in context.effectOptions.classMdecay) {
        change.keyClassification = "classMdecay";
      } else if (change.keyname in context.effectOptions.elementMdamage) {
        change.keyClassification = "elementMdamage";
      } else if (change.keyname in context.effectOptions.elementMdecay) {
        change.keyClassification = "elementMdecay";
      } else if (change.keyname.startsWith("effect.checkinputmod.")) {
        change.keyClassification = "checkname";
        change.checkname = change.key.replace(/^system\.effect\.checkinputmod\./, "");
      } else if (change.key === "system.") {
        change.key = "";
      } else if (change.key === null || change.key === "") {
        change.keyname = "";
      } else {
        change.keyClassification = "input";
      }
    }
    return context;
  }
  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    html
      .find(".select-keyClassification")
      .change(this._selectKeyClassification.bind(this));
    html.find(".select-keyname").change(this._selectKeyname.bind(this));
  }

  async _selectKeyClassification(event) {
    event.preventDefault();
    const selected = $(event.currentTarget).val();
    const index = $(event.currentTarget)
      .closest(".effect-change")
      .data("index");
    const effectData = this.object;
    const keytData = effectData.changes[index];

    keytData.keyClassification = selected;
    keytData.keyname = "";
    keytData.key = "";

    if (effectData.sheet.rendered)
      await effectData.sheet.render(true, { focus: false });
  }

  async _selectKeyname(event) {
    event.preventDefault();
    const selected = $(event.currentTarget).val();
    const index = $(event.currentTarget)
      .closest(".effect-change")
      .data("index");
    const effectData = this.object;
    const keytData = effectData.changes[index];
    const changeData = foundry.utils.duplicate(effectData.changes); // Create a copy of changes array

    keytData.keyname = selected;
    keytData.key = "system." + selected;
    changeData[index].keyname = selected;
    changeData[index].key = "system." + selected;

    await this.object.update({ changeData });

    if (effectData.sheet.rendered)
      await effectData.sheet.render(true, { focus: false });
  }
}
