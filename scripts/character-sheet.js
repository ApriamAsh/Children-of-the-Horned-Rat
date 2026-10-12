import { ADVANCE_COSTS, characteristicAdvanceCost, skillAdvanceCost, talentCost } from "./advancement.js";
import { CHARACTERISTICS, SKILLS } from "./data-models.js";

export class CareerlessCharacterSheet extends foundry.appv1.sheets.ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["careerless-wfrp", "sheet", "actor"],
      width: 1050,
      height: 760,
      resizable: true,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "overview" }]
    });
  }

  get template() {
    return "systems/careerless-wfrp/templates/character-sheet.hbs";
  }

  getData(options = {}) {
    const data = super.getData(options);
    const actor = this.actor;
    const system = actor.system;

    data.characteristics = CHARACTERISTICS.map(([key, label, short, aptitudes]) => ({
      key, label, short, aptitudePair: aptitudes.join(" / "), cost: characteristicAdvanceCost(actor, key, aptitudes), ...system.characteristics[key]
    }));
    data.skills = SKILLS.map(([key, label, characteristic, aptitudes]) => ({
      key, label, characteristic, aptitudes: aptitudes.join(" / "), cost: skillAdvanceCost(actor, aptitudes, system.skills[key]), ...system.skills[key]
    }));
    data.aptitudeGroups = [
      ["Characteristics", ["weaponSkill", "ballisticSkill", "strength", "toughness", "agility", "intelligence", "perception", "willpower", "fellowship"]],
      ["General Aptitudes", ["general", "offence", "finesse", "defence", "knowledge", "fieldcraft", "leadership", "social", "magic"]]
    ];
    data.xpAvailable = system.xpAvailable;
    data.strengthBonus = system.strengthBonus;
    data.toughnessBonus = system.toughnessBonus;
    data.agilityBonus = system.agilityBonus;
    data.intelligenceBonus = system.intelligenceBonus;
    data.willpowerBonus = system.willpowerBonus;
    data.fellowshipBonus = system.fellowshipBonus;
    data.perceptionBonus = system.perceptionBonus;
    data.initiative = system.initiative;
    data.items = actor.items.contents;
    data.talents = data.items.filter(i => i.type === "talent").map(i => ({ item: i, cost: talentCost(actor, i) }));
        data.weapons = data.items.filter(i => i.type === "weapon");
    data.armors = data.items.filter(i => i.type === "armor");
    data.equipment = data.items.filter(i => i.type === "equipment");
    data.canEdit = actor.isOwner;
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".roll-test").click(ev => this._onRollTest(ev));
    html.find(".advance-characteristic").click(ev => this._onAdvanceCharacteristic(ev));
    html.find(".advance-skill").click(ev => this._onAdvanceSkill(ev));
    html.find(".add-item").click(ev => this._onAddItem(ev));
    html.find(".buy-talent").click(ev => this._onBuyTalent(ev));
    html.find(".delete-item").click(ev => this._onDeleteItem(ev));
    html.find(".item-edit").click(ev => this._onEditItem(ev));
  }

  async _onRollTest(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const type = element.dataset.testType;
    const key = element.dataset.key;
    let target = 0;
    let label = "Test";
    if (type === "characteristic") {
      const c = this.actor.system.characteristics[key];
      target = c.total;
      label = CONFIG.CareerlessWFRP.characteristicLabels[key] ?? key;
    } else {
      const s = this.actor.system.skills[key];
      target = s.total;
      label = CONFIG.CareerlessWFRP.skillLabels[key] ?? key;
    }

    const roll = await new Roll("1d100").evaluate();
    const success = roll.total <= target;
    const degrees = Math.floor(Math.abs(target - roll.total) / 10);
    const degreeText = success ? `+${degrees + (roll.total % 10 === target % 10 ? 0 : 0)} SL` : `-${degrees + 1} SL`;
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `<strong>${label}</strong> — target ${target}: ${success ? "SUCCESS" : "FAILURE"} (${degreeText})`
    });
  }

  async _onAdvanceCharacteristic(event) {
    event.preventDefault();
    const key = event.currentTarget.dataset.key;
    const c = this.actor.system.characteristics[key];
    if (!c || c.advances >= 5) return;
    const config = CHARACTERISTICS.find(([k]) => k === key);
    const cost = characteristicAdvanceCost(this.actor, key, config?.[3] ?? [key]);
    if (this.actor.system.xpAvailable < cost) return ui.notifications.warn(`Not enough XP. Cost: ${cost}.`);
    await this.actor.update({
      [`system.characteristics.${key}.advances`]: c.advances + 1,
      "system.xp.spent": this.actor.system.xp.spent + cost
    });
  }

  async _onAdvanceSkill(event) {
    event.preventDefault();
    const key = event.currentTarget.dataset.key;
    const s = this.actor.system.skills[key];
    if (!s) return;
    const config = SKILLS.find(([k]) => k === key);
    let cost;
    let update;
    if (!s.known) {
      cost = skillAdvanceCost(this.actor, config?.[3] ?? [], s);
      update = { [`system.skills.${key}.known`]: true };
    } else if (s.advances < 3) {
      cost = skillAdvanceCost(this.actor, config?.[3] ?? [], s);
      update = { [`system.skills.${key}.advances`]: s.advances + 1 };
    } else return;
    if (this.actor.system.xpAvailable < cost) return ui.notifications.warn(`Not enough XP. Cost: ${cost}.`);
    update["system.xp.spent"] = this.actor.system.xp.spent + cost;
    await this.actor.update(update);
  }

  async _onAddItem(event) {
    event.preventDefault();
    const type = event.currentTarget.dataset.type;
    await Item.create({ name: type === "talent" ? "New Talent" : "New Item", type, system: {} }, { parent: this.actor });
  }

  async _onBuyTalent(event) {
    event.preventDefault();
    const item = this.actor.items.get(event.currentTarget.dataset.itemId);
    if (!item) return;
    const cost = talentCost(this.actor, item);
    if (this.actor.system.xpAvailable < cost) return ui.notifications.warn(`Not enough XP. Cost: ${cost}.`);
    await this.actor.update({ "system.xp.spent": this.actor.system.xp.spent + cost });
  }

  async _onDeleteItem(event) {
    event.preventDefault();
    const item = this.actor.items.get(event.currentTarget.dataset.itemId);
    if (item) await item.delete();
  }

  async _onEditItem(event) {
    event.preventDefault();
    const item = this.actor.items.get(event.currentTarget.dataset.itemId);
    if (item) item.sheet.render(true);
  }
}
