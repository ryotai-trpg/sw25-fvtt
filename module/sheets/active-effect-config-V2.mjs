/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActiveEffectConfig}
 */
export class SW25ActiveEffectConfig extends ActiveEffectConfig {
  /** @override */
  // static DEFAULT_OPTIONS = {
  //     classes: ["sw25", "active-effect-sheet"],
  //   };

  static PARTS = {
    header: {template: "templates/sheets/active-effect/header.hbs"},
    tabs: {template: "templates/generic/tab-navigation.hbs"},
    details: {template: "templates/sheets/active-effect/details.hbs", scrollable: [""]},
    duration: {template: "templates/sheets/active-effect/duration.hbs"},
    changes: {template: "systems/sw25/templates/effect/changes.hbs", scrollable: ["ol[data-changes]"]},
    footer: {template: "templates/generic/form-footer.hbs"}
  };


  /* -------------------------------------------- */

  /** @override */
  async _prepareContext() {
    // Retrieve base data structure.
    const context = await super._prepareContext();

    context.effectOptions = CONFIG.SW25.EffectV2;

    // Use a safe clone of the actor data for further operations.
    const effectData = context.source;

    // Set  keyClassification and kename of exsisting keys
    for (let i = 0; i < effectData.changes.length; i++) {
      let change = effectData.changes[i];
      if (change.key.slice(7) in context.effectOptions.battle) {
        change.keyClassification = "battle";
        change.keyname = change.key.replace(/^system\./, "");
      } else if (change.key.slice(7) in context.effectOptions.check) {
        change.keyClassification = "check";
        change.keyname = change.key.replace(/^system\./, "");
      } else if (change.key.slice(7) in context.effectOptions.parameter) {
        change.keyClassification = "parameter";
        change.keyname = change.key.replace(/^system\./, "");
      } else if (change.key.slice(7) in context.effectOptions.magicpower) {
        change.keyClassification = "magicpower";
        change.keyname = change.key.replace(/^system\./, "");
      } else if (change.key.slice(7) in context.effectOptions.magicckroll) {
        change.keyClassification = "magicckroll";
        change.keyname = change.key.replace(/^system\./, "");
      } else if (change.key.slice(7) in context.effectOptions.magicpwroll) {
        change.keyClassification = "magicpwroll";
        change.keyname = change.key.replace(/^system\./, "");
      } else if (change.key.slice(7) in context.effectOptions.mpsave) {
        change.keyClassification = "mpsave";
        change.keyname = change.key.replace(/^system\./, "");
      } else if (change.key.slice(7) in context.effectOptions.feature) {
        change.keyClassification = "feature";
        change.keyname = change.key.replace(/^system\./, "");
      } else if (change.key === "system.") {
        change.key = "";
      } else if (change.key === null || change.key === "") {
        change.keyname = "";
        change.keyClassification = "";
      // } else {
      //   change.keyClassification = "input";
      }
    }
    console.log(context)
    return context;
  }
  /** @override */
   _onRender(context, options) {
     super._onRender(context, options);
     const html = $(this.element)

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
    console.log(this)
    const effectData = this.document;
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
    const changeData = duplicate(effectData.changes); // Create a copy of changes array

    keytData.keyname = selected;
    keytData.key = "system." + selected;
    changeData[index].keyname = selected;
    changeData[index].key = "system." + selected;

    await this.object.update({ changeData });

    if (effectData.sheet.rendered)
      await effectData.sheet.render(true, { focus: false });
  }
}
