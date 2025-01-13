import { powerRoll } from "../helpers/powerroll.mjs";
import { mpCost, hpCost } from "../helpers/mpcost.mjs";
import {
  effectVitResPC,
  effectMndResPC,
  effectInitPC,
  effectMKnowPC,
  effectVitResMon,
  effectMndResMon,
  effectHitMon,
  effectDmgMon,
  effectDodgeMon,
  effectScpMon,
  effectCnpMon,
  effectWzpMon,
  effectPrpMon,
  effectMtpMon,
  effectFrpMon,
  effectDrpMon,
  effectDmpMon,
  effectAbpMon,
} from "../sw25.mjs";
import { targetRollDialog } from "../helpers/dialogs.mjs";

let quantityWarn = false;

/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class SW25Item extends Item {
  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  constructor(data, context) {
    if (typeof data.img === "undefined") {
      if (data.type === "weapon") {
        data.img = "icons/svg/sword.svg";
      } else if (data.type === "armor") {
        data.img = "icons/svg/shield.svg";
      } else if (data.type === "accessory") {
        data.img = "icons/svg/wing.svg";
      } else if (data.type === "item") {
        data.img = "icons/svg/item-bag.svg";
      } else if (data.type === "spell") {
        data.img = "icons/svg/daze.svg";
      } else if (
        data.type === "enhancearts" ||
        data.type === "magicalsong" ||
        data.type === "ridingtrick" ||
        data.type === "alchemytech" ||
        data.type === "phasearea" ||
        data.type === "tactics" ||
        data.type === "essenceweave" ||
        data.type === "otherfeature"
      ) {
        data.img = "icons/svg/upgrade.svg";
      } else if (data.type === "check") {
        data.img = "icons/svg/circle.svg";
      } else if (data.type === "resource") {
        data.img = "icons/svg/coins.svg";
      } else if (data.type === "combatability") {
        data.img = "icons/svg/combat.svg";
      } else if (data.type === "skill") {
        data.img = "icons/svg/regen.svg";
      } else if (data.type === "raceability") {
        data.img = "icons/svg/paralysis.svg";
      } else if (data.type === "language") {
        data.img = "icons/svg/book.svg";
      } else if (
        data.type === "monsterability" ||
        data.type === "infusion" ||
        data.type === "barbarousskill"
      ) {
        data.img = "icons/svg/skull.svg";
      } else if (data.type === "action") {
        data.img = "icons/svg/ice-aura.svg";
      }
    }
    // Default behavior, just call super() and do all the default Item inits
    super(data, context);
  }

  prepareData() {
    // As with the actor class, items are documents that can have their data
    // preparation methods overridden (such as prepareBaseData()).
    super.prepareData();
  }

  prepareDerivedData() {
    const itemData = this;
    const systemData = itemData.system;
    const flags = itemData.flags.sw25 || {};
    const actor = itemData.actor ? game.actors.get(itemData.actor._id) : null;
    if (actor) {
      this._prepareSkillData(itemData, actor);
      this._prepareCheckData(itemData, actor);
      this._prepareItemRollData(itemData, actor);
      this._prepareResourceData(itemData, actor);
      this._prepareLanguageData(itemData, actor);
    }
    this._prepareWeaponData(itemData);
    this._prepareArmorData(itemData);
    this._prepareAccessoryData(itemData);
    this._prepareItemData(itemData);
    this._prepareCombatabilityData(itemData);
    this._prepareEnhanceartsData(itemData);
    this._prepareMagicalsongData(itemData);
    this._prepareRidingtrickData(itemData);
    this._prepareAlchemytechData(itemData);
    this._preparePhaseareaData(itemData);
    this._prepareTacticsData(itemData);
    this._prepareInfusionData(itemData);
    this._prepareBarbarousskillData(itemData);
    this._prepareEssenceweaveData(itemData);
    this._prepareOtherFeatureData(itemData);
    this._prepareRaceabilityData(itemData);
    this._prepareSpellData(itemData);
    this._prepareMonsterabilityData(itemData);
    this._prepareActionData(itemData);
  }

  async _prepareSkillData(itemData, actor) {
    if (itemData.type !== "skill") return;

    // Make modifications to data here. For example:
    const systemData = itemData.system;
    await actor.update({});
    const actorData = itemData.actor.system;

    //Calculate SkillBase
    if (!actorData.effect) systemData.efallskmod = 0;
    else if (actorData.effect.allsk)
      systemData.efallskmod = Number(actorData.effect.allsk);
    else systemData.efallskmod = 0;

    actorData.abilities.agi.racevalue = actorData.abilities.dex.racevalue;
    actorData.abilities.vit.racevalue = actorData.abilities.str.racevalue;
    actorData.abilities.mnd.racevalue = actorData.abilities.int.racevalue;

    const abilities = ['dex', 'agi', 'str', 'vit', 'int', 'mnd'];

    abilities.forEach((ability) => {
      const mod = Math.floor(
        (actorData.abilities[ability].racevalue +
          actorData.abilities[ability].valuebase +
          actorData.abilities[ability].valuegrowth +
          actorData.abilities[ability].valuemodify +
          actorData.abilities[ability].efvaluemodify) /
        6 +
        Number(actorData.abilities[ability].efmodify)
      );

      systemData.skillbase[ability] = 
        Number(systemData.skilllevel) + 
        Number(mod) + 
        Number(systemData.skillmod) + 
        Number(systemData.efallskmod);

      systemData.skillbase[`${ability}nef`] = 
        Number(systemData.skilllevel) + 
        Number(mod) + 
        Number(systemData.skillmod)
      });

    // Calculate Exp
    if (systemData.exptable == "-") {
      systemData.skillexp = 0;
    }
    if (systemData.exptable == "A") {
      const expA = [
        0, 1000, 2000, 3500, 5000, 7000, 9500, 12500, 16500, 21500, 27500,
        35000, 44000, 54500, 66500, 80000,
      ];
      systemData.skillexp = expA[systemData.skilllevel];
    }
    if (systemData.exptable == "B") {
      const expB = [
        0, 500, 1500, 2500, 4000, 5500, 7500, 10000, 13000, 17000, 22000, 28000,
        35500, 44500, 55000, 67000,
      ];
      systemData.skillexp = expB[systemData.skilllevel];
    }

    // Sheet refresh
    await itemData.update({});
    if (itemData.sheet.rendered)
      await itemData.sheet.render(true, { focus: false });
  }

  async _prepareCheckData(itemData, actor) {
    if (itemData.type !== "check") return;

    // Make modifications to data here. For example:
    const systemData = itemData.system;
    const actorData = itemData.actor.system;
    const actoritemData = itemData.actor.items;

    // Calculate Base Number

    let levelmod = 0;
    if (!Array.isArray(systemData.skilllist)) {
      systemData.skilllist = [];
    }
    actoritemData.forEach((item) => {
      if (item.type != "skill") return;
      if (!systemData.skilllist.includes(item.name)) {
        systemData.skilllist.push(item.name);
      }
      if (systemData.checkskill == "adv") {
        if (
          item.system.skilltype == "fighterskill" ||
          item.system.skilltype == "magicuserskill" ||
          item.system.skilltype == "otherskill"
        ) {
          if (item.system.skilllevel > levelmod)
            levelmod = item.system.skilllevel;
        }
      }
      if (systemData.checkskill == item.name) {
        levelmod = Number(item.system.skilllevel);
      }
    });

    await actor.update({});
    let abimod = 0;

    actorData.abilities.agi.racevalue = actorData.abilities.dex.racevalue;
    actorData.abilities.vit.racevalue = actorData.abilities.str.racevalue;
    actorData.abilities.mnd.racevalue = actorData.abilities.int.racevalue;

    if (
      systemData.checkabi == "dex" ||
      systemData.checkabi == "agi" ||
      systemData.checkabi == "str" ||
      systemData.checkabi == "vit" ||
      systemData.checkabi == "int" ||
      systemData.checkabi == "mnd"
    ) {
      abimod = Math.floor(
        (actorData.abilities[systemData.checkabi].racevalue +
          actorData.abilities[systemData.checkabi].valuebase +
          actorData.abilities[systemData.checkabi].valuegrowth +
          actorData.abilities[systemData.checkabi].valuemodify +
          actorData.abilities[systemData.checkabi].efvaluemodify) /
          6 +
          Number(actorData.abilities[systemData.checkabi].efmodify)
      );
    }

    if (!actorData.effect) systemData.efckmod = 0;
    else {
      switch (itemData.name) {
        case effectVitResPC:
          if (actorData.effect.vitres)
            systemData.efckmod = Number(actorData.effect.vitres);
          break;
        case effectMndResPC:
          if (actorData.effect.mndres)
            systemData.efckmod = Number(actorData.effect.mndres);
          break;
        case effectInitPC:
          if (actorData.effect.init)
            systemData.efckmod = Number(actorData.effect.init);
          break;
        case effectMKnowPC:
          if (actorData.effect.mknow)
            systemData.efckmod = Number(actorData.effect.mknow);
          break;
        default:
          systemData.efckmod = 0;
          break;
      }
      if (actorData.effect.allck)
        systemData.efallckmod = Number(actorData.effect.allck);
    }

    systemData.checkbase =
      Number(systemData.checkmod) +
      Number(systemData.checkfixmod) +
      Number(systemData.efckmod) +
      Number(systemData.efallckmod) +
      Number(levelmod) +
      Number(abimod);

    // prepare apply button
    systemData.checkTypesButton = [];
    if (systemData.applycheck == "custom") {
      if (systemData.ckpdbt) systemData.checkTypesButton.push("pd");
      if (systemData.ckmdbt) systemData.checkTypesButton.push("md");
      if (systemData.ckcdbt) systemData.checkTypesButton.push("cd");
      if (systemData.ckhrbt) systemData.checkTypesButton.push("hr");
      if (systemData.ckmrbt) systemData.checkTypesButton.push("mr");
    }
    systemData.powerTypesButton = [];
    if (systemData.applypower == "custom") {
      if (systemData.pwpdbt) systemData.powerTypesButton.push("pd");
      if (systemData.pwmdbt) systemData.powerTypesButton.push("md");
      if (systemData.pwcdbt) systemData.powerTypesButton.push("cd");
      if (systemData.pwhrbt) systemData.powerTypesButton.push("hr");
      if (systemData.pwmrbt) systemData.powerTypesButton.push("mr");
    }

    // Roll Setting
    if (systemData.checkmethod == "normal") systemData.formula = "2d6";
    if (systemData.checkmethod == "dice")
      systemData.formula = systemData.customformula;
    if (systemData.checkmethod == "power") {
      systemData.formula = "2d6";
    }

    if (systemData.cvalue == null || systemData.cvalue == 0)
      systemData.cvalue = 10;
    if (!actorData.effect) actorData.efcmod = 0;
    else if (actorData.effect.efcvalue)
      actorData.efcmod = Number(actorData.effect.efcvalue);
    else actorData.efcmod = 0;
    systemData.totalcvalue =
      Number(systemData.cvalue) + Number(actorData.efcmod);

    let halfpow, halfpowmod, lethaltech, criticalray, pharmtool, powup;
    if (systemData.halfpow == true) halfpow = 1;
    else halfpow = 0;
    if (systemData.halfpowmod == null || systemData.halfpowmod == 0)
      halfpowmod = 0;
    else halfpowmod = systemData.halfpowmod;
    if (systemData.lethaltech == null || systemData.lethaltech == 0)
      lethaltech = 0;
    else lethaltech = systemData.lethaltech;
    if (systemData.criticalray == null || systemData.criticalray == 0)
      criticalray = 0;
    else criticalray = systemData.criticalray;
    if (systemData.pharmtool == null || systemData.pharmtool == 0)
      pharmtool = 0;
    else pharmtool = systemData.pharmtool;
    if (systemData.powup == null || systemData.powup == 0) powup = 0;
    else powup = systemData.powup;

    systemData.powertable = [
      systemData.power,
      systemData.totalcvalue,
      0,
      systemData.pt3,
      systemData.pt4,
      systemData.pt5,
      systemData.pt6,
      systemData.pt7,
      systemData.pt8,
      systemData.pt9,
      systemData.pt10,
      systemData.pt11,
      systemData.pt12,
      systemData.checkbase,
      halfpow,
      halfpowmod,
      lethaltech,
      criticalray,
      pharmtool,
      powup,
    ];

    // Sheet refresh
    await actor.update({});
    if (actor.sheet.rendered) await actor.sheet.render(true, { focus: false });
    await itemData.update({});
    if (itemData.sheet.rendered)
      await itemData.sheet.render(true, { focus: false });
  }

  async _prepareItemRollData(itemData, actor) {
    if (
      itemData.type !== "skill" &&
      itemData.type !== "weapon" &&
      itemData.type !== "armor" &&
      itemData.type !== "accessory" &&
      itemData.type !== "item" &&
      itemData.type !== "spell" &&
      itemData.type !== "enhancearts" &&
      itemData.type !== "magicalsong" &&
      itemData.type !== "ridingtrick" &&
      itemData.type !== "alchemytech" &&
      itemData.type !== "phasearea" &&
      itemData.type !== "tactics" &&
      itemData.type !== "infusion" &&
      itemData.type !== "barbarousskill" &&
      itemData.type !== "essenceweave" &&
      itemData.type !== "otherfeature" &&
      itemData.type !== "resource" &&
      itemData.type !== "combatability" &&
      itemData.type !== "raceability" &&
      itemData.type !== "monsterability" &&
      itemData.type !== "action"
    )
      return;

    // Make modifications to data here. For example:
    const systemData = itemData.system;
    const actorData = itemData.actor.system;
    const actoritemData = itemData.actor.items;
    if (itemData.effects.size > 0) systemData.useeffect = true;
    else systemData.useeffect = false;

    // Calculate Base Number

    if (!Array.isArray(systemData.skilllist)) {
      systemData.skilllist = [];
    }

    let checklevelmod = 0;
    let checklevelmod1 = 0;
    let checklevelmod2 = 0;
    let checklevelmod3 = 0;
    let powerlevelmod = 0;
    actoritemData.forEach((item) => {
      if (item.type != "skill") return;
      if (!systemData.skilllist.includes(item.name)) {
        systemData.skilllist.push(item.name);
      }
      if (systemData.checkskill == "adv") {
        if (
          item.system.skilltype == "fighterskill" ||
          item.system.skilltype == "magicuserskill" ||
          item.system.skilltype == "otherskill"
        ) {
          if (item.system.skilllevel > checklevelmod)
            checklevelmod = item.system.skilllevel;
        }
      }
      if (systemData.checkskill == item.name) {
        checklevelmod = Number(item.system.skilllevel);
      }
      if (systemData.checkskill1 == "adv") {
        if (
          item.system.skilltype == "fighterskill" ||
          item.system.skilltype == "magicuserskill" ||
          item.system.skilltype == "otherskill"
        ) {
          if (item.system.skilllevel > checklevelmod1)
            checklevelmod1 = item.system.skilllevel;
        }
      }
      if (systemData.checkskill1 == item.name) {
        checklevelmod1 = Number(item.system.skilllevel);
      }
      if (systemData.checkskill2 == "adv") {
        if (
          item.system.skilltype == "fighterskill" ||
          item.system.skilltype == "magicuserskill" ||
          item.system.skilltype == "otherskill"
        ) {
          if (item.system.skilllevel > checklevelmod2)
            checklevelmod2 = item.system.skilllevel;
        }
      }
      if (systemData.checkskill2 == item.name) {
        checklevelmod2 = Number(item.system.skilllevel);
      }
      if (systemData.checkskill3 == "adv") {
        if (
          item.system.skilltype == "fighterskill" ||
          item.system.skilltype == "magicuserskill" ||
          item.system.skilltype == "otherskill"
        ) {
          if (item.system.skilllevel > checklevelmod3)
            checklevelmod3 = item.system.skilllevel;
        }
      }
      if (systemData.checkskill3 == item.name) {
        checklevelmod3 = Number(item.system.skilllevel);
      }
      if (systemData.powerskill == "adv") {
        if (
          item.system.skilltype == "fighterskill" ||
          item.system.skilltype == "magicuserskill" ||
          item.system.skilltype == "otherskill"
        ) {
          if (item.system.skilllevel > powerlevelmod)
            powerlevelmod = item.system.skilllevel;
        }
      }
      if (systemData.powerskill == item.name) {
        powerlevelmod = Number(item.system.skilllevel);
      }
    });

    if (!Array.isArray(systemData.itemlist)) {
      systemData.itemlist = [];
    }

    actoritemData.forEach((item) => {
      if (item.type != "resource") return;
      const itemExists = systemData.itemlist.some(
        (existingItem) => existingItem.itemId === item._id
      );

      if (!itemExists) {
        systemData.itemlist.push({
          itemId: item._id,
          itemName: item.name,
        });
      }
    });

    if (systemData.resuse == "-") systemData.autouseres = false;

    await actor.update({});
    let checkabimod = 0;
    let checkabimod1 = 0;
    let checkabimod2 = 0;
    let checkabimod3 = 0;
    let powerabimod = 0;
    if (actor.type == "character") {
      actorData.abilities.agi.racevalue = actorData.abilities.dex.racevalue;
      actorData.abilities.vit.racevalue = actorData.abilities.str.racevalue;
      actorData.abilities.mnd.racevalue = actorData.abilities.int.racevalue;

      if (
        systemData.checkabi == "dex" ||
        systemData.checkabi == "agi" ||
        systemData.checkabi == "str" ||
        systemData.checkabi == "vit" ||
        systemData.checkabi == "int" ||
        systemData.checkabi == "mnd"
      ) {
        checkabimod = Math.floor(
          ( actorData.abilities[systemData.checkabi].racevalue +
            actorData.abilities[systemData.checkabi].valuebase +
            actorData.abilities[systemData.checkabi].valuegrowth +
            actorData.abilities[systemData.checkabi].valuemodify +
            actorData.abilities[systemData.checkabi].efvaluemodify) /
          6 +
          Number(actorData.abilities[systemData.checkabi].efmodify)
        );
      }
      if (
        systemData.powerabi == "dex" ||
        systemData.powerabi == "agi" ||
        systemData.powerabi == "str" ||
        systemData.powerabi == "vit" ||
        systemData.powerabi == "int" ||
        systemData.powerabi == "mnd"
      ) {
        powerabimod = Math.floor(
          (actorData.abilities[systemData.powerabi].racevalue +
            actorData.abilities[systemData.powerabi].valuebase +
            actorData.abilities[systemData.powerabi].valuegrowth +
            actorData.abilities[systemData.powerabi].valuemodify +
            actorData.abilities[systemData.powerabi].efvaluemodify) /
            6 +
            Number(actorData.abilities[systemData.powerabi].efmodify)
        );
      }
    }

    if (actor.type == "character" || actor.type == "npc") {
      actorData.abilities.agi.racevalue = actorData.abilities.dex.racevalue;
      actorData.abilities.vit.racevalue = actorData.abilities.str.racevalue;
      actorData.abilities.mnd.racevalue = actorData.abilities.int.racevalue;

      if (
        systemData.checkabi1 == "dex" ||
        systemData.checkabi1 == "agi" ||
        systemData.checkabi1 == "str" ||
        systemData.checkabi1 == "vit" ||
        systemData.checkabi1 == "int" ||
        systemData.checkabi1 == "mnd"
      ) {
        checkabimod1 = Math.floor(
          (actorData.abilities[systemData.checkabi1].racevalue +
            actorData.abilities[systemData.checkabi1].valuebase +
            actorData.abilities[systemData.checkabi1].valuegrowth +
            actorData.abilities[systemData.checkabi1].valuemodify +
            actorData.abilities[systemData.checkabi1].efvaluemodify) /
            6 +
            Number(actorData.abilities[systemData.checkabi1].efmodify)
        );
      }

      if (
        systemData.checkabi2 == "dex" ||
        systemData.checkabi2 == "agi" ||
        systemData.checkabi2 == "str" ||
        systemData.checkabi2 == "vit" ||
        systemData.checkabi2 == "int" ||
        systemData.checkabi2 == "mnd"
      ) {
        checkabimod2 = Math.floor(
          (actorData.abilities[systemData.checkabi2].racevalue +
            actorData.abilities[systemData.checkabi2].valuebase +
            actorData.abilities[systemData.checkabi2].valuegrowth +
            actorData.abilities[systemData.checkabi2].valuemodify +
            actorData.abilities[systemData.checkabi2].efvaluemodify) /
            6 +
            Number(actorData.abilities[systemData.checkabi2].efmodify)
          );
      }

      if (
        systemData.checkabi3 == "dex" ||
        systemData.checkabi3 == "agi" ||
        systemData.checkabi3 == "str" ||
        systemData.checkabi3 == "vit" ||
        systemData.checkabi3 == "int" ||
        systemData.checkabi3 == "mnd"
      ) {
        checkabimod3 = Math.floor(
          (actorData.abilities[systemData.checkabi3].racevalue +
            actorData.abilities[systemData.checkabi3].valuebase +
            actorData.abilities[systemData.checkabi3].valuegrowth +
            actorData.abilities[systemData.checkabi3].valuemodify +
            actorData.abilities[systemData.checkabi3].efvaluemodify) /
          6 +
          Number(actorData.abilities[systemData.checkabi3].efmodify)
        );
      }
    }

    systemData.checkbase =
      Number(systemData.checkmod) + Number(checklevelmod) + Number(checkabimod);
    systemData.powerbase =
      Number(systemData.powermod) + Number(powerlevelmod) + Number(powerabimod);

    systemData.checkbase1 =
      Number(systemData.checkbasemod1) +
      Number(systemData.checkmod1) +
      Number(checklevelmod1) +
      Number(checkabimod1);
    systemData.checkbasefix1 = Number(systemData.checkbase1) + 7;
    systemData.checkbase2 =
      Number(systemData.checkbasemod2) +
      Number(systemData.checkmod2) +
      Number(checklevelmod2) +
      Number(checkabimod2);
    systemData.checkbasefix2 = Number(systemData.checkbase2) + 7;
    systemData.checkbase3 =
      Number(systemData.checkbasemod3) +
      Number(systemData.checkmod3) +
      Number(checklevelmod3) +
      Number(checkabimod3);
    systemData.checkbasefix3 = Number(systemData.checkbase3) + 7;

    // prepare apply button
    systemData.checkTypesButton = [];
    systemData.checkTypesButton1 = [];
    systemData.checkTypesButton2 = [];
    systemData.checkTypesButton3 = [];
    if (systemData.applycheck == "custom") {
      if (systemData.ckpdbt) systemData.checkTypesButton.push("pd");
      if (systemData.ckmdbt) systemData.checkTypesButton.push("md");
      if (systemData.ckcdbt) systemData.checkTypesButton.push("cd");
      if (systemData.ckhrbt) systemData.checkTypesButton.push("hr");
      if (systemData.ckmrbt) systemData.checkTypesButton.push("mr");
    }
    if (systemData.applycheck1 == "custom") {
      if (systemData.ckpdbt1) systemData.checkTypesButton1.push("pd");
      if (systemData.ckmdbt1) systemData.checkTypesButton1.push("md");
      if (systemData.ckcdbt1) systemData.checkTypesButton1.push("cd");
      if (systemData.ckhrbt1) systemData.checkTypesButton1.push("hr");
      if (systemData.ckmrbt1) systemData.checkTypesButton1.push("mr");
    }
    if (systemData.applycheck2 == "custom") {
      if (systemData.ckpdbt2) systemData.checkTypesButton2.push("pd");
      if (systemData.ckmdbt2) systemData.checkTypesButton2.push("md");
      if (systemData.ckcdbt2) systemData.checkTypesButton2.push("cd");
      if (systemData.ckhrbt2) systemData.checkTypesButton2.push("hr");
      if (systemData.ckmrbt2) systemData.checkTypesButton2.push("mr");
    }
    if (systemData.applycheck3 == "custom") {
      if (systemData.ckpdbt3) systemData.checkTypesButton3.push("pd");
      if (systemData.ckmdbt3) systemData.checkTypesButton3.push("md");
      if (systemData.ckcdbt3) systemData.checkTypesButton3.push("cd");
      if (systemData.ckhrbt3) systemData.checkTypesButton3.push("hr");
      if (systemData.ckmrbt3) systemData.checkTypesButton3.push("mr");
    }
    systemData.powerTypesButton = [];
    if (systemData.applypower == "custom") {
      if (systemData.pwpdbt) systemData.powerTypesButton.push("pd");
      if (systemData.pwmdbt) systemData.powerTypesButton.push("md");
      if (systemData.pwcdbt) systemData.powerTypesButton.push("cd");
      if (systemData.pwhrbt) systemData.powerTypesButton.push("hr");
      if (systemData.pwmrbt) systemData.powerTypesButton.push("mr");
    }

    if (itemData.type == "weapon") {
      systemData.checkbase =
        Number(systemData.checkbase) +
        Number(systemData.hit) +
        Number(actorData.attributes.hitmod) +
        Number(actorData.attributes.efhitmod);
      systemData.powerbase =
        Number(systemData.powerbase) +
        Number(systemData.dmod) +
        Number(actorData.attributes.dmod) +
        Number(actorData.attributes.efdmod);
      systemData.listpowerbase = systemData.powerbase;
      if (systemData.halfpowmod && systemData.halfpowmod != 0)
        systemData.listpowerbase += Number(systemData.halfpowmod);
      if (
        actorData.attributes.efwphalfmod &&
        actorData.attributes.efwphalfmod != 0
      )
        systemData.listpowerbase += Number(actorData.attributes.efwphalfmod);
    }

    if (itemData.type == "spell") {
      if (!actorData.effect) systemData.efallmgpmod = 0;
      else if (actorData.effect.allmgp)
        systemData.efallmgpmod = Number(actorData.effect.allmgp);
      else systemData.efallmgpmod = 0;
      systemData.checkbase =
        Number(systemData.checkbase) + Number(systemData.efallmgpmod);
      systemData.powerbase =
        Number(systemData.powerbase) + Number(systemData.efallmgpmod);

      function calculateSkillValues(type) {
        const mod = actorData.attributes[`${type}mod`];
        const efMod = actorData.attributes[`ef${type}mod`];
        const efCheckMod = actorData.attributes[`ef${type}ckmod`];
        const efPowerMod = actorData.attributes[`ef${type}pwmod`];
        const efMPCostMod = actorData.attributes[`efmp${type}`];
        const efMPWall = actorData.attributes.efmpwall;
        const efMCkAll = actorData.attributes.efmckall;

        systemData.checkbase = Number(mod) + Number(efMod) + Number(efCheckMod) + Number(efMCkAll);
        systemData.powerbase = Number(mod) + Number(efMod) + Number(efPowerMod) + Number(efMPWall);
        systemData.mpcost = Number(systemData.basempcost) - Number(efMPCostMod) - Number(actorData.attributes.efmpall);

        if (systemData.mpcost < 1) systemData.mpcost = 1;
      }

      const validTypes = ["sc", "cn", "wz", "pr", "mt", "fr", "dr", "dm", "ab"];

      if (validTypes.includes(systemData.type)) calculateSkillValues(systemData.type);
    }

    if (itemData.type == "magicalsong") {
      systemData.checkbase =
        Number(systemData.checkbase) + Number(actorData.attributes.efmsckmod);
      systemData.powerbase =
        Number(systemData.powerbase) + Number(actorData.attributes.efmspwmod);
    }

    if (itemData.type == "alchemytech") {
      systemData.checkbase =
        Number(systemData.checkbase) + Number(actorData.attributes.efatckmod);
    }

    if (itemData.type == "enhancearts") {
      systemData.mpcost =
        Number(systemData.basempcost) - Number(actorData.attributes.efmpall);
      if (systemData.mpcost < 1) systemData.mpcost = 1;
    }

    if (itemData.type == "barbarousskill") {
      systemData.mpcost = Number(systemData.basempcost);
    }

    if (itemData.type == "essenceweave") {
      systemData.checkbase =
        Number(systemData.checkbase) + Number(actorData.attributes.efewckmod);
      systemData.powerbase =
        Number(systemData.powerbase) + Number(actorData.attributes.efewpwmod);
      systemData.hpcost = systemData.basehpcost;
    }

    if (itemData.type == "otherfeature") {
      systemData.mpcost =
        Number(systemData.basempcost) - Number(actorData.attributes.efmpall);
      if (systemData.mpcost < 1) systemData.mpcost = 1;
      if (systemData.basempcost == 0 || systemData.basempcost == null)
        systemData.mpcost = 0;
    }

    if (itemData.type == "monsterability" || itemData.type == "action") {
      if (!actorData.effect) {
        systemData.efmod = 0;
        systemData.efallckmod = 0;
        systemData.efallmgpmod = 0;
        actorData.effect = {
          allck: "",
          allmgp: "",
          vitres: "",
          mndres: "",
        };
      }
      for (let i = 1; i <= 3; i++) {
        if (actorData.effect.allck)
          systemData.efallckmod = Number(actorData.effect.allck);
        else systemData.efallckmod = 0;
        if (actorData.effect.allmgp)
          systemData.efallmgpmod = Number(actorData.effect.allmgp);
        else systemData.efallmgpmod = 0;
        systemData.efmod = 0;
        switch (itemData.system[`label${i}`]) {
          case effectVitResMon:
            if (actorData.effect.vitres)
              systemData.efmod = Number(actorData.effect.vitres);
            break;
          case effectMndResMon:
            if (actorData.effect.mndres)
              systemData.efmod = Number(actorData.effect.mndres);
            break;
          case effectHitMon:
            if (actorData.attributes.efhitmod)
              systemData.efmod = Number(actorData.attributes.efhitmod);
            break;
          case effectDmgMon:
            if (actorData.attributes.efdmod)
              systemData.efmod = Number(actorData.attributes.efdmod);
            systemData.efallckmod = 0;
            break;
          case effectDodgeMon:
            if (actorData.attributes.efdodgemod)
              systemData.efmod = Number(actorData.attributes.efdodgemod);
            break;
          case effectScpMon:
            if (actorData.attributes.efscmod)
              systemData.efmod =
                Number(actorData.attributes.efscmod) +
                Number(systemData.efallmgpmod);
            else systemData.efmod = Number(systemData.efallmgpmod);
            systemData.efallckmod = 0;
            break;
          case effectCnpMon:
            if (actorData.attributes.efcnmod)
              systemData.efmod =
                Number(actorData.attributes.efcnmod) +
                Number(systemData.efallmgpmod);
            else systemData.efmod = Number(systemData.efallmgpmod);
            systemData.efallckmod = 0;
            break;
          case effectWzpMon:
            if (actorData.attributes.efwzmod)
              systemData.efmod =
                Number(actorData.attributes.efwzmod) +
                Number(systemData.efallmgpmod);
            else systemData.efmod = Number(systemData.efallmgpmod);
            systemData.efallckmod = 0;
            break;
          case effectPrpMon:
            if (actorData.attributes.efprmod)
              systemData.efmod =
                Number(actorData.attributes.efprmod) +
                Number(systemData.efallmgpmod);
            else systemData.efmod = Number(systemData.efallmgpmod);
            systemData.efallckmod = 0;
            break;
          case effectMtpMon:
            if (actorData.attributes.efmtmod)
              systemData.efmod =
                Number(actorData.attributes.efmtmod) +
                Number(systemData.efallmgpmod);
            else systemData.efmod = Number(systemData.efallmgpmod);
            systemData.efallckmod = 0;
            break;
          case effectFrpMon:
            if (actorData.attributes.effrmod)
              systemData.efmod =
                Number(actorData.attributes.effrmod) +
                Number(systemData.efallmgpmod);
            else systemData.efmod = Number(systemData.efallmgpmod);
            systemData.efallckmod = 0;
            break;
          case effectDrpMon:
            if (actorData.attributes.efdrmod)
              systemData.efmod =
                Number(actorData.attributes.efdrmod) +
                Number(systemData.efallmgpmod);
            else systemData.efmod = Number(systemData.efallmgpmod);
            systemData.efallckmod = 0;
            break;
          case effectDmpMon:
            if (actorData.attributes.efdmmod)
              systemData.efmod =
                Number(actorData.attributes.efdmmod) +
                Number(systemData.efallmgpmod);
            else systemData.efmod = Number(systemData.efallmgpmod);
            systemData.efallckmod = 0;
            break;
          case effectAbpMon:
            if (actorData.attributes.efabmod)
              systemData.efmod =
                Number(actorData.attributes.efabmod) +
                Number(systemData.efallmgpmod);
            else systemData.efmod = Number(systemData.efallmgpmod);
            systemData.efallckmod = 0;
            break;
          default:
            systemData.efmod = 0;
            break;
        }
        systemData[`checkbase${i}`] =
          Number(systemData[`checkbasemod${i}`]) +
          Number(systemData[`checkmod${i}`]) +
          Number(systemData.efmod) +
          Number(systemData.efallckmod);
        switch (i) {
          case 1:
            systemData.checkbase1 +=
              Number(checklevelmod1) + Number(checkabimod1);
            break;
          case 2:
            systemData.checkbase2 +=
              Number(checklevelmod2) + Number(checkabimod2);
            break;
          case 3:
            systemData.checkbase3 +=
              Number(checklevelmod3) + Number(checkabimod3);
            break;
        }
        systemData[`checkbasefix${i}`] =
          Number(systemData[`checkbase${i}`]) + 7;

        if (actorData.effect.allmgp)
          systemData.efallmgpmod = Number(actorData.effect.allmgp);
        else systemData.efallmgpmod = 0;
        systemData.efmod = 0;
        switch (itemData.system.labelmonpow) {
          case effectScpMon:
            if (actorData.attributes.efscmod)
              systemData.efmod =
                Number(actorData.attributes.efscmod) +
                Number(systemData.efallmgpmod);
            else systemData.efmod = Number(systemData.efallmgpmod);
            systemData.efallckmod = 0;
            break;
          case effectCnpMon:
            if (actorData.attributes.efcnmod)
              systemData.efmod =
                Number(actorData.attributes.efcnmod) +
                Number(systemData.efallmgpmod);
            else systemData.efmod = Number(systemData.efallmgpmod);
            systemData.efallckmod = 0;
            break;
          case effectWzpMon:
            if (actorData.attributes.efwzmod)
              systemData.efmod =
                Number(actorData.attributes.efwzmod) +
                Number(systemData.efallmgpmod);
            else systemData.efmod = Number(systemData.efallmgpmod);
            systemData.efallckmod = 0;
            break;
          case effectPrpMon:
            if (actorData.attributes.efprmod)
              systemData.efmod =
                Number(actorData.attributes.efprmod) +
                Number(systemData.efallmgpmod);
            else systemData.efmod = Number(systemData.efallmgpmod);
            systemData.efallckmod = 0;
            break;
          case effectMtpMon:
            if (actorData.attributes.efmtmod)
              systemData.efmod =
                Number(actorData.attributes.efmtmod) +
                Number(systemData.efallmgpmod);
            else systemData.efmod = Number(systemData.efallmgpmod);
            systemData.efallckmod = 0;
            break;
          case effectFrpMon:
            if (actorData.attributes.effrmod)
              systemData.efmod =
                Number(actorData.attributes.effrmod) +
                Number(systemData.efallmgpmod);
            else systemData.efmod = Number(systemData.efallmgpmod);
            systemData.efallckmod = 0;
            break;
          case effectDrpMon:
            if (actorData.attributes.efdrmod)
              systemData.efmod =
                Number(actorData.attributes.efdrmod) +
                Number(systemData.efallmgpmod);
            else systemData.efmod = Number(systemData.efallmgpmod);
            systemData.efallckmod = 0;
            break;
          case effectDmpMon:
            if (actorData.attributes.efdmmod)
              systemData.efmod =
                Number(actorData.attributes.efdmmod) +
                Number(systemData.efallmgpmod);
            else systemData.efmod = Number(systemData.efallmgpmod);
            systemData.efallckmod = 0;
            break;
          case effectAbpMon:
            if (actorData.attributes.efabmod)
              systemData.efmod =
                Number(actorData.attributes.efabmod) +
                Number(systemData.efallmgpmod);
            else systemData.efmod = Number(systemData.efallmgpmod);
            systemData.efallckmod = 0;
            break;
          default:
            systemData.efmod = 0;
            break;
        }
        systemData.powerbase =
          Number(systemData.powermod) +
          Number(powerlevelmod) +
          Number(powerabimod) +
          Number(systemData.efmod);
      }
    }
    if (itemData.type == "action") {
      systemData.actionvalue =
        Number(systemData.checkbase1) + Number(systemData.actionresult);
      systemData.mpcost = Number(systemData.basempcost);

      // label setting
      systemData.label1 = `<span style="font-size: 0.7em">${game.i18n.localize(
        "SW25.Item.Action.ActionValue"
      )}:</span>${systemData.actionvalue}`;
      systemData.label2 = game.i18n.localize("SW25.Check");
    }

    // Roll Setting
    if (systemData.clickitem == "all") systemData.formula = "2d6";
    if (systemData.clickitem == "dice") {
      if (systemData.customdice == true)
        systemData.formula = systemData.customformula;
      else systemData.formula = "2d6";
    }
    if (systemData.clickitem == "dice1") {
      systemData.checkbase = systemData.checkbase1;
      if (systemData.usefix1 == true) {
        systemData.formula = 7;
      } else if (systemData.customdice1 == true)
        systemData.formula = systemData.customformula1;
      else systemData.formula = "2d6";
    }
    if (systemData.clickitem == "dice2") {
      systemData.checkbase = systemData.checkbase2;
      if (systemData.usefix2 == true) {
        systemData.formula = 7;
      } else if (systemData.customdice2 == true)
        systemData.formula = systemData.customformula2;
      else systemData.formula = "2d6";
    }
    if (systemData.clickitem == "dice3") {
      systemData.checkbase = systemData.checkbase3;
      if (systemData.usefix2 == true) {
        systemData.formula = 7;
      } else if (systemData.customdice3 == true)
        systemData.formula = systemData.customformula3;
      else systemData.formula = "2d6";
    }
    if (systemData.clickitem == "power") systemData.formula = "2d6";
    if (systemData.clickitem == "description") systemData.formula = "";

    if (systemData.customdice == true)
      systemData.checkformula = systemData.customformula;
    else systemData.checkformula = "2d6";
    systemData.powerformula = "2d6";

    if (systemData.usefix1 == true) {
      systemData.checkformula1 = 7;
    } else if (systemData.customdice1 == true)
      systemData.checkformula1 = systemData.customformula1;
    else systemData.checkformula1 = "2d6";
    if (systemData.usefix2 == true) {
      systemData.checkformula2 = 7;
    } else if (systemData.customdice2 == true)
      systemData.checkformula2 = systemData.customformula2;
    else systemData.checkformula2 = "2d6";
    if (systemData.usefix3 == true) {
      systemData.checkformula3 = 7;
    } else if (systemData.customdice3 == true)
      systemData.checkformula3 = systemData.customformula3;
    else systemData.checkformula3 = "2d6";

    if (systemData.cvalue == null || systemData.cvalue == 0)
      systemData.cvalue = 10;
    if (!actorData.effect) actorData.efcmod = 0;
    else if (actorData.effect.efcvalue)
      actorData.efcmod = Number(actorData.effect.efcvalue);
    else actorData.efcmod = 0;
    if (itemData.type == "spell") {
      if (!actorData.effect) actorData.efcmod = 0;
      else if (actorData.effect.efspellcvalue)
        actorData.efcmod = Number(actorData.effect.efspellcvalue);
      else actorData.efcmod = 0;
    }
    systemData.totalcvalue =
      Number(systemData.cvalue) + Number(actorData.efcmod);

    let halfpow, halfpowmod, lethaltech, criticalray, pharmtool, powup;
    if (systemData.halfpow == true) halfpow = 1;
    else halfpow = 0;
    if (systemData.halfpowmod == null || systemData.halfpowmod == 0)
      halfpowmod = 0;
    else halfpowmod = systemData.halfpowmod;
    if (itemData.type == "weapon" && actorData.attributes.efwphalfmod)
      halfpowmod =
        Number(halfpowmod) + Number(actorData.attributes.efwphalfmod);
    if (itemData.type == "spell" && actorData.attributes.efsphalfmod)
      halfpowmod =
        Number(halfpowmod) + Number(actorData.attributes.efsphalfmod);
    if (systemData.lethaltech == null || systemData.lethaltech == 0)
      lethaltech = 0;
    else lethaltech = systemData.lethaltech;
    if (systemData.criticalray == null || systemData.criticalray == 0)
      criticalray = 0;
    else criticalray = systemData.criticalray;
    if (systemData.pharmtool == null || systemData.pharmtool == 0)
      pharmtool = 0;
    else pharmtool = systemData.pharmtool;
    if (systemData.powup == null || systemData.powup == 0) powup = 0;
    else powup = systemData.powup;

    systemData.powertable = [
      systemData.power,
      systemData.totalcvalue,
      0,
      systemData.pt3,
      systemData.pt4,
      systemData.pt5,
      systemData.pt6,
      systemData.pt7,
      systemData.pt8,
      systemData.pt9,
      systemData.pt10,
      systemData.pt11,
      systemData.pt12,
      systemData.powerbase,
      halfpow,
      halfpowmod,
      lethaltech,
      criticalray,
      pharmtool,
      powup,
    ];

    // Sheet refresh
    await actor.update({});
    if (actor.sheet.rendered) await actor.sheet.render(true, { focus: false });
    await itemData.update({});
    if (itemData.sheet.rendered)
      await itemData.sheet.render(true, { focus: false });
  }

  _prepareItemData(itemData) {
    if (itemData.type !== "item") return;

    // Make modifications to data here. For example:
    const systemData = itemData.system;

    if (systemData.type != "-") {
      const i18ntype =
        systemData.type.charAt(0).toUpperCase() + systemData.type.slice(1);
      systemData.typename = game.i18n.localize(`SW25.Item.Item.${i18ntype}`);
    } else systemData.typename = game.i18n.localize(`SW25.Item.Item.General`);

    if (itemData.actor !== null) {
      const actorData = itemData.actor.system;
      const actoritemData = itemData.actor.items;

      // Set default skill and ability
      if (systemData.type == "herb") {
        if (actorData.herbskill != "-") {
          if (systemData.checkskill == "-")
            systemData.checkskill = actorData.herbskill;
          if (systemData.checkabi == "-") systemData.checkabi = "dex";
          if (systemData.powerskill == "-")
            systemData.powerskill = actorData.herbskill;
          if (systemData.powerabi == "-") systemData.powerabi = "dex";
        }
      }
      if (systemData.type == "potion") {
        if (actorData.potionskill != "-") {
          if (systemData.checkskill == "-")
            systemData.checkskill = actorData.potionskill;
          if (systemData.checkabi == "-") systemData.checkabi = "int";
          if (systemData.powerskill == "-")
            systemData.powerskill = actorData.potionskill;
          if (systemData.powerabi == "-") systemData.powerabi = "int";
        }
      }
      if (systemData.type == "repair") {
        if (actorData.repairskill != "-") {
          if (systemData.checkskill == "-")
            systemData.checkskill = actorData.repairskill;
          if (systemData.checkabi == "-") systemData.checkabi = "dex";
          if (systemData.powerskill == "-")
            systemData.powerskill = actorData.repairskill;
          if (systemData.powerabi == "-") systemData.powerabi = "dex";
        }
      }
    }
  }
  async _prepareResourceData(itemData, actor) {
    if (itemData.type !== "resource") return;

    // Make modifications to data here. For example:
    const systemData = itemData.system;
    const actorData = itemData.actor.system;
    const actoritemData = itemData.actor.items;

    // Quantity limit
    if (systemData.qmax || systemData.qmax == 0) {
      /*
      if (systemData.quantity == systemData.qmax) {
        systemData.quantity = systemData.qmax;
        if (!quantityWarn) {
          ui.notifications.warn(
            `"${itemData.name}"${game.i18n.localize("SW25.isMax")}`
          );
          quantityWarn = true;
          setTimeout(() => {
            quantityWarn = false;
          }, 100);
        }
      }
      */
      if (systemData.qmax && systemData.quantity > systemData.qmax) {
        systemData.quantity = systemData.qmax;
        /*
        if (!quantityWarn) {
          ui.notifications.warn(
            `"${itemData.name}"${game.i18n.localize("SW25.isAlreadyMax")}`
          );
          quantityWarn = true;
          setTimeout(() => {
            quantityWarn = false;
          }, 100);
        }
        */
      }
    }
    if (systemData.qmin || systemData.qmin == 0) {
      /*
      if (systemData.quantity == systemData.qmin) {
        systemData.quantity = systemData.qmin;
        if (!quantityWarn) {
          ui.notifications.warn(
            `"${itemData.name}"${game.i18n.localize("SW25.isMin")}`
          );
          quantityWarn = true;
          setTimeout(() => {
            quantityWarn = false;
          }, 100);
        }
      }
      */
      if (systemData.qmin && systemData.quantity < systemData.qmin) {
        systemData.quantity = systemData.qmin;
        /*
        if (!quantityWarn) {
          ui.notifications.warn(
            `"${itemData.name}"${game.i18n.localize("SW25.isAlreadyMin")}`
          );
          quantityWarn = true;
          setTimeout(() => {
            quantityWarn = false;
          }, 100);
        }
        */
      }
    }

    // Sheet refresh
    await actor.update({});
    if (actor.sheet.rendered) await actor.sheet.render(true, { focus: false });
    await itemData.update({});
    if (itemData.sheet.rendered)
      await itemData.sheet.render(true, { focus: false });
  }

  _prepareWeaponData(itemData) {
    if (itemData.type !== "weapon") return;

    // Make modifications to data here. For example:
    const systemData = itemData.system;

    if (systemData.category != "-") {
      const i18ncat =
        systemData.category.charAt(0).toUpperCase() +
        systemData.category.slice(1);
      systemData.categoryname = game.i18n.localize(
        `SW25.Item.Weapon.${i18ncat}`
      );
    } else systemData.categoryname = "-";

    if (systemData.usage != "-") {
      const i18nusage = systemData.usage;
      systemData.usagename = game.i18n.localize(
        `SW25.Item.Weapon.${i18nusage}`
      );
    } else systemData.usage = "-";

    if (systemData.type != "-") {
      const i18ntype =
        systemData.type.charAt(0).toUpperCase() + systemData.type.slice(1);
      systemData.typename = game.i18n.localize(`SW25.Item.Weapon.${i18ntype}`);
    } else systemData.typename = "";

    if (systemData.checkskill == systemData.powerskill) {
      systemData.showskill = systemData.checkskill;
    } else
      systemData.showskill =
        systemData.checkskill + "/" + systemData.powerskill;
    if (systemData.checkskill == "-" || systemData.checkskill == null) {
      if (systemData.powerskill == "-" || systemData.powerskill == null)
        systemData.showskill = "";
      else systemData.showskill = systemData.powerskill;
    }
    if (systemData.powerskill == "-" || systemData.powerskill == null) {
      if (systemData.checkskill == "-" || systemData.checkskill == null)
        systemData.showskill = "";
      else systemData.showskill = systemData.checkskill;
    }

    if (itemData.actor !== null) {
      const actorData = itemData.actor.system;
      const actoritemData = itemData.actor.items;

      // Set default skill and ability
      if (actorData.attackskill != "-") {
        if (systemData.checkskill == "-")
          systemData.checkskill = actorData.attackskill;
        if (systemData.checkabi == "-") systemData.checkabi = "dex";
        if (systemData.powerskill == "-")
          systemData.powerskill = actorData.attackskill;
        if (systemData.powerabi == "-") systemData.powerabi = "str";
      }
    }
  }

  _prepareAccessoryData(itemData) {
    if (itemData.type !== "accessory") return;

    // Make modifications to data here. For example:
    const systemData = itemData.system;

    if (itemData.actor !== null) {
      const actorData = itemData.actor.system;
      const actoritemData = itemData.actor.items;
    }

    if (systemData.accpart != "-") {
      const i18npart =
        systemData.accpart.charAt(0).toUpperCase() +
        systemData.accpart.slice(1);
      systemData.accpartname = game.i18n.localize(
        `SW25.Item.Accessory.${i18npart}`
      );
    } else systemData.accpartname = "-";

    if (systemData.deffect != "-") {
      systemData.deffectname = ":" + systemData.deffect.toUpperCase();
    } else systemData.deffectname = "";
  }

  _prepareArmorData(itemData) {
    if (itemData.type !== "armor") return;

    // Make modifications to data here. For example:
    const systemData = itemData.system;

    if (itemData.actor !== null) {
      const actorData = itemData.actor.system;
      const actoritemData = itemData.actor.items;
    }

    if (systemData.category != "-") {
      const i18ncat =
        systemData.category.charAt(0).toUpperCase() +
        systemData.category.slice(1);
      systemData.categoryname = game.i18n.localize(
        `SW25.Item.Armor.${i18ncat}`
      );
    } else systemData.categoryname = "-";
  }

  _prepareCombatabilityData(itemData) {
    if (itemData.type !== "combatability") return;

    // Make modifications to data here. For example:
    const systemData = itemData.system;

    if (itemData.actor !== null) {
      const actorData = itemData.actor.system;
      const actoritemData = itemData.actor.items;
    }

    if (systemData.type != "-") {
      const i18ntype =
        systemData.type.charAt(0).toUpperCase() + systemData.type.slice(1);
      systemData.typename = game.i18n.localize(
        `SW25.Item.Combatability.${i18ntype}`
      );
    } else systemData.typename = "-";

    if (systemData.condtype != "-") {
      const i18ncondtype =
        systemData.condtype.charAt(0).toUpperCase() +
        systemData.condtype.slice(1);
      systemData.condtypename = game.i18n.localize(
        `SW25.Item.Combatability.${i18ncondtype}`
      );
    } else systemData.condtypename = "-";
  }

  _prepareEnhanceartsData(itemData) {}

  _prepareMagicalsongData(itemData) {
    if (itemData.type !== "magicalsong") return;

    // Make modifications to data here. For example:
    const systemData = itemData.system;

    if (itemData.actor !== null) {
      const actorData = itemData.actor.system;
      const actoritemData = itemData.actor.items;
    }

    if (systemData.type != "-") {
      const i18ntype =
        systemData.type.charAt(0).toUpperCase() + systemData.type.slice(1);
      systemData.typename = game.i18n.localize(
        `SW25.Item.Magicalsong.${i18ntype}`
      );
    } else systemData.typename = "-";

    if (systemData.resist != "-") {
      const i18nresist =
        systemData.resist.charAt(0).toUpperCase() + systemData.resist.slice(1);
      systemData.resistname = game.i18n.localize(`SW25.Item.${i18nresist}`);
    } else systemData.resistname = "-";

    if (systemData.prop != "-") {
      const i18nprop =
        systemData.prop.charAt(0).toUpperCase() + systemData.prop.slice(1);
      systemData.propname = game.i18n.localize(`SW25.Item.${i18nprop}`);
    } else systemData.propname = "-";

    if (systemData.upget == null) systemData.upget = 0;
    if (systemData.downget == null) systemData.downget = 0;
    if (systemData.charmget == null) systemData.charmget = 0;
    if (systemData.upadd == null) systemData.upadd = 0;
    if (systemData.downadd == null) systemData.downadd = 0;
    if (systemData.charmadd == null) systemData.charmadd = 0;
    if (systemData.upcond == null) systemData.upcond = 0;
    if (systemData.downcond == null) systemData.downcond = 0;
    if (systemData.charmcond == null) systemData.charmcond = 0;
    if (systemData.upcost == null) systemData.upcost = 0;
    if (systemData.downcost == null) systemData.downcost = 0;
    if (systemData.charmcost == null) systemData.charmcost = 0;
  }

  _prepareRidingtrickData(itemData) {}

  _prepareAlchemytechData(itemData) {
    if (itemData.type !== "alchemytech") return;

    // Make modifications to data here. For example:
    const systemData = itemData.system;

    if (itemData.actor !== null) {
      const actorData = itemData.actor.system;
      const actoritemData = itemData.actor.items;
    }

    if (systemData.resist != "-") {
      const i18nresist =
        systemData.resist.charAt(0).toUpperCase() + systemData.resist.slice(1);
      systemData.resistname = game.i18n.localize(`SW25.Item.${i18nresist}`);
    } else systemData.resistname = "-";

    if (systemData.red == null) systemData.red = 0;
    if (systemData.green == null) systemData.green = 0;
    if (systemData.black == null) systemData.black = 0;
    if (systemData.white == null) systemData.white = 0;
    if (systemData.gold == null) systemData.gold = 0;
  }

  _preparePhaseareaData(itemData) {
    if (itemData.type !== "phasearea") return;

    // Make modifications to data here. For example:
    const systemData = itemData.system;

    if (itemData.actor !== null) {
      const actorData = itemData.actor.system;
      const actoritemData = itemData.actor.items;
    }

    if (systemData.type != "-") {
      const i18ntype =
        systemData.type.charAt(0).toUpperCase() + systemData.type.slice(1);
      systemData.typename = game.i18n.localize(
        `SW25.Item.Phasearea.${i18ntype}`
      );
    } else systemData.typename = "-";

    if (systemData.prop != "-") {
      const i18nprop =
        systemData.prop.charAt(0).toUpperCase() + systemData.prop.slice(1);
      systemData.propname = game.i18n.localize(`SW25.Item.${i18nprop}`);
    } else systemData.propname = "-";

    if (systemData.mincost == null) systemData.mincost = 0;
    if (systemData.maxcost == null) systemData.maxcost = 0;
  }

  _prepareTacticsData(itemData) {
    if (itemData.type !== "tactics") return;

    // Make modifications to data here. For example:
    const systemData = itemData.system;

    if (itemData.actor !== null) {
      const actorData = itemData.actor.system;
      const actoritemData = itemData.actor.items;
    }

    if (systemData.type != "-") {
      const i18ntype =
        systemData.type.charAt(0).toUpperCase() + systemData.type.slice(1);
      systemData.typename = game.i18n.localize(`SW25.Item.Tactics.${i18ntype}`);
    } else systemData.typename = "-";

    if (systemData.line != "-") {
      const i18nline =
        systemData.line.charAt(0).toUpperCase() + systemData.line.slice(1);
      systemData.linename = game.i18n.localize(`SW25.Item.Tactics.${i18nline}`);
    } else systemData.linename = "-";
  }

  _prepareInfusionData(itemData) {}

  _prepareBarbarousskillData(itemData) {
    if (itemData.type !== "barbarousskill") return;

    // Make modifications to data here. For example:
    const systemData = itemData.system;

    if (itemData.actor !== null) {
      const actorData = itemData.actor.system;
      const actoritemData = itemData.actor.items;
    }

    if (systemData.resist != "-") {
      const i18nresist =
        systemData.resist.charAt(0).toUpperCase() + systemData.resist.slice(1);
      systemData.resistname = game.i18n.localize(`SW25.Item.${i18nresist}`);
    } else systemData.resistname = "-";
  }

  _prepareEssenceweaveData(itemData) {}
  _prepareOtherFeatureData(itemData) {}
  _prepareRaceabilityData(itemData) {}
  _prepareLanguageData(itemData, actor) {}

  _prepareSpellData(itemData) {
    if (itemData.type !== "spell") return;

    // Make modifications to data here. For example:
    const systemData = itemData.system;

    if (systemData.type != "-") {
      const i18ntype =
        systemData.type.charAt(0).toUpperCase() + systemData.type.slice(1);
      systemData.typename = game.i18n.localize(`SW25.Item.Spell.${i18ntype}`);
    } else systemData.typename = "-";

    if (systemData.resist != "-") {
      const i18nresist =
        systemData.resist.charAt(0).toUpperCase() + systemData.resist.slice(1);
      systemData.resistname = game.i18n.localize(`SW25.Item.${i18nresist}`);
    } else systemData.resistname = "-";

    if (systemData.prop != "-") {
      const i18nprop =
        systemData.prop.charAt(0).toUpperCase() + systemData.prop.slice(1);
      systemData.propname = game.i18n.localize(`SW25.Item.${i18nprop}`);
    } else systemData.propname = "-";

    if (systemData.fairytype != "-") {
      const i18nfairytype =
        systemData.fairytype.charAt(0).toUpperCase() +
        systemData.fairytype.slice(1);
      systemData.fairytypename = game.i18n.localize(
        `SW25.Item.Spell.${i18nfairytype}`
      );
    } else systemData.fairytypename = "-";

    if (systemData.fairyprop != "-") {
      const i18nfairyprop =
        systemData.fairyprop.charAt(0).toUpperCase() +
        systemData.fairyprop.slice(1);
      systemData.fairypropname = game.i18n.localize(
        `SW25.Item.Spell.${i18nfairyprop}`
      );
    } else systemData.fairypropname = "-";

    if (itemData.actor !== null) {
      const actorData = itemData.actor.system;
      const actoritemData = itemData.actor.items;

      // Set default skill and ability
      function setDefaultSkillAndAbility(type, skillKey, ability = "int") {
        const skill = actorData[skillKey];
        if (skill !== "-") {
          if (systemData.checkskill === "-") systemData.checkskill = skill;
          if (systemData.checkabi === "-") systemData.checkabi = ability;
          if (systemData.powerskill === "-") systemData.powerskill = skill;
          if (systemData.powerabi === "-") systemData.powerabi = ability;
        }
      }

      switch (systemData.type) {
        case "sorcerer":
          setDefaultSkillAndAbility("sorcerer", "scskill");
          break;
        case "conjurer":
          setDefaultSkillAndAbility("conjurer", "cnskill");
          break;
        case "wizard":
          setDefaultSkillAndAbility("wizard", "wzskill");
          break;
        case "priest":
          setDefaultSkillAndAbility("priest", "prskill");
          break;
        case "magitech":
          setDefaultSkillAndAbility("magitech", "mtskill");
          break;
        case "fairy":
          setDefaultSkillAndAbility("fairy", "frskill");
          break;
        case "druid":
          setDefaultSkillAndAbility("druid", "drskill");
          break;
        case "daemon":
          setDefaultSkillAndAbility("daemon", "dmskill");
          break;
        case "abyssal":
          setDefaultSkillAndAbility("abyssal", "abskill");
          break;
        default:
          break;
      }
    }
  }

  _prepareMonsterabilityData(itemData) {}

  _prepareActionData(itemData, actor) {
    if (itemData.type !== "action") return;

    // Make modifications to data here. For example:
    const systemData = itemData.system;

    if (itemData.actor !== null) {
      const actorData = itemData.actor.system;
      const actoritemData = itemData.actor.items;
    }

    // result setting
    switch (systemData.actiondice) {
      case "f1":
        systemData.actiondicename = game.i18n.localize("SW25.Fellow") + ":1-2";
        if (systemData.actionresult != 6) systemData.actionresult = 7;
        break;
      case "f3":
        systemData.actiondicename = game.i18n.localize("SW25.Fellow") + ":3-4";
        if (systemData.actionresult != 5) systemData.actionresult = 8;
        break;
      case "f5":
        systemData.actiondicename = game.i18n.localize("SW25.Fellow") + ":5";
        if (systemData.actionresult != 4) systemData.actionresult = 9;
        break;
      case "f6":
        systemData.actiondicename = game.i18n.localize("SW25.Fellow") + ":6";
        if (systemData.actionresult != 3) systemData.actionresult = 10;
        break;
      case "d1":
        systemData.actiondicename = game.i18n.localize("SW25.Daemon") + ":1";
        systemData.actionresult = 8;
        break;
      case "d2":
        systemData.actiondicename = game.i18n.localize("SW25.Daemon") + ":2-3";
        systemData.actionresult = 8;
        break;
      case "d4":
        systemData.actiondicename = game.i18n.localize("SW25.Daemon") + ":4-5";
        systemData.actionresult = 9;
        break;
      case "d6":
        systemData.actiondicename = game.i18n.localize("SW25.Daemon") + ":6";
        systemData.actionresult = 10;
        break;
      default:
        systemData.actiondicename = "-";
        systemData.actionresult = 0;
        break;
    }
  }

  /**
   * Prepare a data object which defines the data schema used by dice roll commands against this Item
   * @override
   */
  getRollData() {
    // Starts off by populating the roll data with `this.system`
    const rollData = { ...super.getRollData() };

    // Quit early if there's no parent actor
    if (!this.actor) return rollData;

    // If present, add the actor's roll data
    rollData.actor = this.actor.getRollData();

    return rollData;
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async roll() {
    if (
      this.system.clickitem == "dice" ||
      this.system.clickitem == "dice1" ||
      this.system.clickitem == "dice2" ||
      this.system.clickitem == "dice3" ||
      this.system.clickitem == "power"
    ) {
      const targetTokens = game.user.targets;

      let apply = "-";
      if (this.system.clickitem == "dice") apply = this.system.applycheck;
      if (this.system.clickitem == "dice1") apply = this.system.applycheck1;
      if (this.system.clickitem == "dice2") apply = this.system.applycheck2;
      if (this.system.clickitem == "dice3") apply = this.system.applycheck3;
      if (this.system.clickitem == "power") apply = this.system.applypower;
      if (apply == "-" || targetTokens.size === 0) {
        await this.rollExec();
        return;
      } else {
        const item = this;
        let label = `${item.name}`;
        const label0 = game.i18n.localize("SW25.Check");
        const label1 = item.system.label1;
        const label2 = item.system.label2;
        const label3 = item.system.label3;
        const labelmonpow = item.system.labelmonpow;
        if (item.system.clickitem == "dice")
          label = label + " (" + label0 + ")";
        if (item.system.clickitem == "dice1")
          label = label + " (" + label1 + ")";
        if (item.system.clickitem == "dice2")
          label = label + " (" + label2 + ")";
        if (item.system.clickitem == "dice3")
          label = label + " (" + label3 + ")";
        let powlabel = game.i18n.localize("SW25.Item.Power");
        if (item.type == "monsterability") powlabel = labelmonpow;
        if (item.system.clickitem == "power")
          label = label + " (" + powlabel + ")";

        const targetRoll = await targetRollDialog(targetTokens, label);
        if (targetRoll == "cancel") {
          return;
        } else if (targetRoll == "once") {
          await this.rollExec(targetTokens);
          return;
        } else if (targetRoll == "individual") {
          let chatMessageId = [];
          for (const [index, token] of Array.from(targetTokens).entries()) {
            const targetToken = new Set([token]);
            await this.rollExec(targetToken).then((result) => {
              chatMessageId.push(result.chatMessageId);
            });
          }

          // rendar apply all message
          const speaker = ChatMessage.getSpeaker({ actor: this.actor });
          let chatapply = "-";
          let checktype = null;
          let powertype = null;
          if (this.system.clickitem == "dice") {
            chatapply = this.system.applycheck;
            checktype = this.system.checkTypesButton;
          }
          if (this.system.clickitem == "dice1") {
            chatapply = this.system.applycheck1;
            checktype = this.system.checkTypesButton1;
          }
          if (this.system.clickitem == "dice2") {
            chatapply = this.system.applycheck2;
            checktype = this.system.checkTypesButton2;
          }
          if (this.system.clickitem == "dice3") {
            chatapply = this.system.applycheck3;
            checktype = this.system.checkTypesButton3;
          }
          if (this.system.clickitem == "power") {
            chatapply = this.system.applypower;
            powertype = this.system.powerTypesButton;
          }

          let chatData = {
            speaker: speaker,
            flavor: `${label} - <b>${game.i18n.localize("SW25.Applyall")}</b>`,
          };
          chatData.flags = {
            targetMessage: chatMessageId,
          };
          chatData.content = await renderTemplate(
            "systems/sw25/templates/roll/roll-applyall.hbs",
            {
              apply: chatapply,
              checktype: checktype,
              powertype: powertype,
            }
          );

          ChatMessage.create(chatData);
          return;
        }
      }
    }

    await this.rollExec();
  }
  async rollExec(targetTokens) {
    const item = this;

    // Initialize chat data.
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const rollMode = game.settings.get("core", "rollMode");
    const usedice = item.system.usedice;
    const usedice1 = item.system.usedice1;
    const usedice2 = item.system.usedice2;
    const usedice3 = item.system.usedice3;
    const label0 = game.i18n.localize("SW25.Check");
    const label1 = item.system.label1;
    const label2 = item.system.label2;
    const label3 = item.system.label3;
    const labelmonpow = item.system.labelmonpow;
    const usepower = item.system.usepower;
    const useeffect = item.system.useeffect;
    let label = `${item.name}`;
    let powlabel = game.i18n.localize("SW25.Item.Power");
    let spell = false;
    if (item.type == "spell") spell = true;
    let enhancearts = false;
    if (item.type == "enhancearts") enhancearts = true;
    let barbarousskill = false;
    if (item.type == "barbarousskill") barbarousskill = true;
    let essenceweave = false;
    if (item.type == "essenceweave") essenceweave = true;
    let actionmp = false;
    if (item.type == "action") {
      if (item.system.mpcost) actionmp = true;
    }
    let resource = false;
    if (item.type == "weapon") {
      if (item.system.resuse != "-") resource = true;
    }

    if (this.system.clickitem == "dice") label = label + " (" + label0 + ")";
    if (this.system.clickitem == "dice1") label = label + " (" + label1 + ")";
    if (this.system.clickitem == "dice2") label = label + " (" + label2 + ")";
    if (this.system.clickitem == "dice3") label = label + " (" + label3 + ")";
    if (this.type == "monsterability") powlabel = labelmonpow;
    if (this.system.clickitem == "power") label = label + " (" + powlabel + ")";

    if (this.system.clickitem == "all") {
      let chatData = {
        speaker: speaker,
        flavor: label,
        rollMode: rollMode,
      };

      let chatDescription = item.system.description;

      // action description
      if (item.type == "action") {
        chatDescription = "";
        if (item.system.target) {
          chatDescription += `<b>${game.i18n.localize("SW25.Target")}:</b><br>${
            item.system.target
          }<br>`;
        }
        if (item.system.displayaction) {
          chatDescription += `<b>${game.i18n.localize(
            "SW25.Item.Action.Action"
          )}:</b><br>${item.system.displayaction}<br>`;
        }
        if (item.system.displayactioneffect) {
          chatDescription += `<b>${game.i18n.localize(
            "SW25.Item.Action.ActionEffect"
          )}:</b><br>${item.system.displayactioneffect}<br>`;
        }
      }

      chatData.content = await renderTemplate(
        "systems/sw25/templates/roll/roll-item.hbs",
        {
          description: chatDescription,
          spell: spell,
          enhancearts: enhancearts,
          barbarousskill: barbarousskill,
          essenceweave: essenceweave,
          actionmp: actionmp,
          resource: resource,
          usedice: usedice,
          usedice1: usedice1,
          usedice2: usedice2,
          usedice3: usedice3,
          label0: label0,
          label1: label1,
          label2: label2,
          label3: label3,
          usepower: usepower,
          useeffect: useeffect,
          powlabel: powlabel,
        }
      );

      chatData.flags = {
        itemid: item._id,
      };

      ChatMessage.create(chatData);
    }

    if (
      this.system.clickitem == "dice" ||
      this.system.clickitem == "dice1" ||
      this.system.clickitem == "dice2" ||
      this.system.clickitem == "dice3"
    ) {
      const rollData = this.getRollData();

      let baseformula = this.system.formula;
      if (this.system.clickitem == "dice1")
        baseformula = this.system.checkformula1;
      if (this.system.clickitem == "dice2")
        baseformula = this.system.checkformula2;
      if (this.system.clickitem == "dice3")
        baseformula = this.system.checkformula3;
      let formula = baseformula + "+" + this.system.checkbase;

      let roll = new Roll(formula, rollData);
      await roll.evaluate();

      let chatData = {
        speaker: speaker,
        flavor: label,
        rollMode: rollMode,
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        rolls: [roll],
      };

      let chatapply = "-";
      if (this.system.clickitem == "dice") chatapply = this.system.applycheck;
      if (this.system.clickitem == "dice1") chatapply = this.system.applycheck1;
      if (this.system.clickitem == "dice2") chatapply = this.system.applycheck2;
      if (this.system.clickitem == "dice3") chatapply = this.system.applycheck3;

      let chatFormula = roll.formula;
      let chatCritical = null;
      let chatFumble = null;
      let chatTotal = roll.total;
      if (roll.terms[0].total == 12) chatCritical = 1;
      if (roll.terms[0].total == 2) chatFumble = 1;
      let checktype = [];
      if (this.system.clickitem == "dice")
        checktype = this.system.checkTypesButton;
      if (this.system.clickitem == "dice1")
        checktype = this.system.checkTypesButton1;
      if (this.system.clickitem == "dice2")
        checktype = this.system.checkTypesButton2;
      if (this.system.clickitem == "dice3")
        checktype = this.system.checkTypesButton3;

      // when selected target
      let target = null;
      let targetName = null;
      if (targetTokens) {
        const targetArray = Array.from(targetTokens);
        target = targetArray.map((target) => target.id);
        let targetNames = targetArray.map((target) => target.document.name);
        targetName = ``;
        for (let i = 0; i < targetNames.length; i++) {
          if (i != 0) targetName = targetName + `<br>`;
          targetName = targetName + `>>> ${targetNames[i]}`;
        }
        targetName = targetName + ``;
      }

      chatData.flags = {
        total: chatTotal,
        orgtotal: chatTotal,
        formula: roll.formula,
        rolls: roll,
        tooltip: await roll.getTooltip(),
        apply: chatapply,
        checktype: checktype,
        target,
        targetName: targetName,
      };

      chatData.content = await renderTemplate(
        "systems/sw25/templates/roll/roll-check.hbs",
        {
          formula: chatFormula,
          tooltip: await roll.getTooltip(),
          critical: chatCritical,
          fumble: chatFumble,
          total: chatTotal,
          apply: chatapply,
          checktype: checktype,
          targetName: targetName,
        }
      );

      let chatMessageId;
      await ChatMessage.create(chatData).then((chatMessage) => {
        chatMessageId = chatMessage.id;
      });

      return { roll, chatMessageId };
    }

    if (this.system.clickitem == "power") {
      const formula = this.system.formula;
      const powertable = this.system.powertable;

      let roll = await powerRoll(formula, powertable);

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
      else if (roll.criticalRay != 0)
        criticalRayFormula = "$" + roll.criticalRay;
      if (roll.pharmTool != 0) pharmToolFormula = "tf" + roll.pharmTool;
      if (roll.powup != 0) powupFormula = "r" + roll.powup;

      let chatFormula =
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

      let chatData = {
        speaker: speaker,
        flavor: label,
        rollMode: rollMode,
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        rolls: [roll.fakeResult],
      };

      let showhalf = true;
      let shownoc = true;
      if (roll.halfPow == 1) {
        showhalf = false;
        shownoc = false;
      }
      if (roll.cValue == 100 || chatExtraRoll == null) shownoc = false;
      let chatapply = this.system.applypower;
      let powertype = this.system.powerTypesButton;

      // when selected target
      let target = null;
      let targetName = null;
      if (targetTokens) {
        const targetArray = Array.from(targetTokens);
        target = targetArray.map((target) => target.id);
        let targetNames = targetArray.map((target) => target.document.name);
        targetName = ``;
        for (let i = 0; i < targetNames.length; i++) {
          if (i != 0) targetName = targetName + `<br>`;
          targetName = targetName + `>>> ${targetNames[i]}`;
        }
        targetName = targetName + ``;
      }

      chatData.flags = {
        formula: chatFormula,
        tooltip: await roll.fakeResult.getTooltip(),
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
        apply: chatapply,
        powertype: powertype,
        target,
        targetName: targetName,
      };

      chatData.content = await renderTemplate(
        "systems/sw25/templates/roll/roll-power.hbs",
        {
          formula: chatFormula,
          tooltip: await roll.fakeResult.getTooltip(),
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
          apply: chatapply,
          powertype: powertype,
          targetName: targetName,
        }
      );

      let chatMessageId;
      await ChatMessage.create(chatData).then((chatMessage) => {
        chatMessageId = chatMessage.id;
      });

      return { roll, chatMessageId };
    }

    if (this.system.clickitem == "mpcost") {
      const selectedTokens = canvas.tokens.controlled;
      if (selectedTokens.length === 0) {
        ui.notifications.warn(game.i18n.localize("SW25.Noselectwarn"));
        return;
      } else if (selectedTokens.length > 1) {
        ui.notifications.warn(game.i18n.localize("SW25.Multiselectwarn"));
        return;
      }
      const token = selectedTokens[0];
      const cost = item.system.mpcost;
      const name = item.name;
      const type = item.type;
      const meta = 1;
      mpCost(token, cost, name, type, meta);
    }

    if (this.system.clickitem == "hpcost") {
      const selectedTokens = canvas.tokens.controlled;
      if (selectedTokens.length === 0) {
        ui.notifications.warn(game.i18n.localize("SW25.Noselectwarn"));
        return;
      } else if (selectedTokens.length > 1) {
        ui.notifications.warn(game.i18n.localize("SW25.Multiselectwarn"));
        return;
      }
      const token = selectedTokens[0];
      const cost = item.system.hpcost;
      const max = item.system.maxhpcost;
      const name = item.name;
      const type = item.type;
      hpCost(token, cost, max, name, type);
    }

    if (this.system.clickitem == "rescost") {
      if (this.system.resuse != "-" || !this.system.resuse) {
        let resuse = this.system.resuse;
        let resusequantity = this.system.resusequantity;
        let actoritem = this.actor.items.get(resuse);
        let actoritemquantity = actoritem.system.quantity;
        let remainingquantity = actoritemquantity - resusequantity;
        let min = actoritem.system.qmin;

        if (actoritemquantity < resusequantity) {
          ui.notifications.warn(
            game.i18n.localize("SW25.Item.Noresquantitiywarn") + actoritem.name
          );
          return;
        } else if (remainingquantity < min) {
          ui.notifications.warn(
            game.i18n.localize("SW25.Item.Noresquantitiywarn") + actoritem.name
          );
          return;
        } else {
          actoritem.update({ "system.quantity": remainingquantity });

          let chatData = {
            speaker: speaker,
          };

          chatData.content = `<div style="text-align: right;">${actoritem.name}: ${actoritemquantity} >>> ${remainingquantity}</div>`;

          ChatMessage.create(chatData);
        }
      }
    }

    if (this.system.clickitem == "description" || !this.system.formula) {
      ChatMessage.create({
        speaker: speaker,
        flavor: label,
        rollMode: rollMode,
        content: item.system.description ?? "",
      });
    }
  }
}
