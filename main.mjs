

export class PtuBsi {// not typescript //  implements SystemApi {
  //
  // FROM https://github.com/AngryBeaver/beavers-system-interface/blob/0858e8330f50297b6cb9a50be35273d85c49a87a/src/types.ts
  //

  // version: number;
  // id: string;
  // init?: () => Promise<void>;
  // configSkills: SkillConfig[];
  // configAbilities: AbilityConfig[];
  // configCurrencies: CurrencyConfig[];
  // configCanRollAbility: boolean;
  // configLootItemType: string;
  // actorRollSkill: (actor, skillId: string) => Promise<Roll | null>;
  // actorRollAbility: (actor, abilityId: string) => Promise<Roll | null>;
  // actorRollTool?: (actor, item) => Promise<Roll | null>;
  // actorCurrenciesAdd?: (actor, currencies: Currencies) => Promise<void>; //deprecated
  // actorCurrenciesGet?: (actor) => Currencies;
  // actorCurrenciesStore?: (actor, currencies: Currencies) => Promise<void>;
  // actorSheetAddTab: (sheet, html, actor, tabData: {
  //     id: string,
  //     label: string,
  //     html: string
  // }, tabBody: string) => void;
  // componentIsSame?: (a: ComponentData, b: ComponentData) => boolean,
  // componentFromEntity?: (entity, hasJsonData?: boolean) => Component,
  // componentDefaultData?: ComponentData,
  // itemQuantityAttribute: string,
  // itemPriceAttribute: string,
  // itemSheetReplaceContent?: (app, html, element) => void;

  // interface SkillConfig {
  //   id: string,
  //   label: string,
  //   uuid?: string //system dependent if this is an item
  // }

  // interface CurrencyConfig {
  //   id: string,
  //   label: string,
  //   factor: number, //factor how often the lowest currency fits into this currency
  //   uuid?: string, //system dependent if this is an item
  //   component?: Component //will get automatically attached when an uuid is given
  // }

  get version() { return 1; }
  
  get id() { return "ptu"; }
  
  get configSkills() {
    return CONFIG.PTU.data.skills.keys.map(k=>({
      id: k,
      label: game.i18n.localize(`PTU.Skills.${k}`),
    }));
  }

  get configAbilities() {
    return CONFIG.PTU.data.stats.keys.map(k=>({
      id: k,
      label: game.i18n.localize(`PTU.Stats.${k}`),
    }));
  }

  get configCurrencies() {
    return [{
      id: "money",
      label: game.i18n.localize("PTU.Money"),
      factor: 1,
    }]
  }

  get configCanRollAbility() { return false; }

  get configLootItemType() { return "bsa-ptu.loot"; }

  async actorRollSkill(actor, skillId) {
    return actor.attributes.skills[skillId]?.roll().then(roll=>roll?.rolls?.[0]);
  }

  async actorRollAbility(actor, abilityId) {
    throw new Exception("actorRollAbility is not implemented because you can't roll a stat in PTU/PTR1e");
  }

  actorCurrenciesGet(actor) {
    return {
      "money": actor.system.money
    };
  }

  async actorCurrenciesStore(actor, currencies){
    if (currencies?.money === undefined) return;
    await actor.update({system: {money: currencies?.money}});
  }

  actorSheetAddTab(sheet, html, actor, tabData, tabBody) {
    const tabs = $(html).find('.tabs[data-group="primary"]');
    const icon = (()=>{
      switch (tabData.label) {
        case "Crafting": return `<i class="fa-solid fa-screwdriver-wrench"></i>`;
      }
      return `<i class="fa-solid fa-block-question"></i>`;
    })();
    const tabItem = $(`<a class="item" data-tab="${tabData.id}" data-tooltip="${tabData.label}">${icon}</a>`);
    tabs.append(tabItem);
    const body = $(html).find(".sheet-body");
    const tabContent = $('<div class="tab" data-group="primary" data-tab="' + tabData.id + '"></div>');
    body.append(tabContent);
    tabContent.append(tabBody);
  }

  get itemQuantityAttribute() { return "system.quantity"; }

  get itemPriceAttribute() { return "system.cost"; }

  itemSheetReplaceContent(app, html, element) {
    html.find(".sheet-tabs").remove();
    const header = html.find('.window-content form header').clone();
    const sheetBody = html.find('.window-content form');
    sheetBody.css("flex-direction", "column");
    sheetBody.empty();
    sheetBody.append(header);
    sheetBody.append(element);
  }
}

class SkillTest { // not typescript// implements TestClass<"skill"|"dc"> {
  type =  "SkillTest"
  _choices = {};
  constructor(){
      this._choices = beaversSystemInterface.configSkills.reduce((object, skill) => {
          object[skill.id] = { text: skill.label };
          return object;
      }, {})
  }
  create(data){
      const result = new SkillTestCustomized();
      result.data = data;
      result.parent = this;
      return result;
  }
  informationField = {
      name: "type",
      type: "info",
      label: game['i18n'].localize("beaversSystemInterface.tests.skillTest.info.label"),
      note: game['i18n'].localize("beaversSystemInterface.tests.skillTest.info.note")
  }

  get customizationFields() {
      return {
          skill: {
              name: "skill",
              label: "skill",
              note: "Skill",
              type: "selection",
              choices: this._choices
          },
          dc: {
              name: "dc",
              label: "dc",
              note: "Difficulty Class ",
              defaultValue: 8,
              type: "number",
          }
      };
  }
  renderTypes = {
      skill:"config",
      dc: "config"
  }

}

class SkillTestCustomized { // not typescript // implements Test<"skill"|"dc"> {

  parent
  data = {dc:8,skill:""}

  action = async (initiatorData) => {
      const actor = beaversSystemInterface.initiator(initiatorData).actor;
      const roll = await beaversSystemInterface.actorRollSkill(actor,this.data.skill);
      return {
          success:roll.total>=this.data.dc?1:0,
          fail: roll.total<this.data.dc?1:0
      }
  }

  render = () => {
      const skill = this.parent._choices[this.data.skill]?.text||"process";
      return `${skill}:dc ${this.data.dc}`;
  };

}


Hooks.on("init", ()=>{
  //
  // Beaver's Recipe relies on a very bad implementation of "not" in handlebars. Fix the handlebars implementation
  //
  Handlebars.unregisterHelper("not");
  Handlebars.registerHelper("not", (a)=>!a);



  class LootClass extends CONFIG.PTU.Item.documentClasses.item {
    async _preCreate(data, options, user) {
      this._source.system.rules ??= [];
      await super._preCreate(data, options, user);
    }
  }

  class LootSheet extends CONFIG.PTU.Item.sheetClasses.item {
    get template() {
      return `systems/ptu/static/templates/item/item-sheet.hbs`;
    }

    async getData() {
      const data = await super.getData();
      return data;
    }

    async _updateObject(event, formData) {
      console.log("_updateObject", this.object, event, formData);
      return ItemSheet.prototype._updateObject.bind(this)(event, formData);
    }
  }

  const LC_NAME = "bsa-ptu.loot";

  Object.assign(CONFIG.PTU.Item.documentClasses, {
    [LC_NAME]: LootClass,
  });
  Object.assign(CONFIG.PTU.Item.sheetClasses, {
    [LC_NAME]: LootSheet,
  });
  Items.registerSheet("ptu", LootSheet, {
    types: [LC_NAME],
    makeDefault: true,
    label: "BSAPTU.SheetClassLoot"
  });
});

Hooks.on("beavers-system-interface.init", async function(){
  beaversSystemInterface.register(new PtuBsi());
});

Hooks.on("beavers-system-interface.ready", async function(){
  beaversSystemInterface.registerTestClass(new SkillTest());
});