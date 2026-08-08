/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class SW25ItemSheetV2 extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.sheets.ItemSheetV2) {

  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ["sw25", "sheet", "item", "standard-form" ],
    position: {
      width: 620,
      height: 480,
    },
    form: {
      submitOnChange: true
    }
  };

  /** @override */
  async _prepareContext(options) {
    // Retrieve base data structure.
    const context = await super._prepareContext(options);
    console.log(context)

    // Use a safe clone of the item data for further operations.
    const itemData = context.document;

    // Add the item's data to context.data for easier access, as well as flags.
    context.system = itemData.system;
    context.systemFields = itemData.system.schema.fields;
    context.flags = itemData.flags;
    context.config = CONFIG.SW25;

    // if (itemData.type == "language") {
    //   this._prepareItemRollData(context);
    //   this._prepareLanguageData(context);
    // }
    //
    // Retrieve the roll data for TinyMCE editors.
    // context.rollData = this.item._prepareContext();


    return context;
  }

  _prepareLanguageData(context) {}

}

export class SW25LanguageSheet extends SW25ItemSheetV2{
  /** @override */
  static PARTS = {
    header: {
      template: "systems/sw25/templates/item/header.hbs",
    },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    description: {
      template: "systems/sw25/templates/item/description.hbs",
      scrollable: [""],
    },
  };

  /** @override */
  static TABS = {
    primary: {
      tabs: [{ id: "description" } ],
      labelPrefix: "SW25.CharacterSheet.TABS",
      initial: "description",
    },
  };
}
