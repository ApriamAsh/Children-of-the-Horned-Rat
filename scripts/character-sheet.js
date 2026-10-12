import { characteristicAdvanceCost, skillAdvanceCost, talentCost } from "./advancement.js";
import { CHARACTERISTICS, SKILLS, APTITUDE_OPTIONS, HIT_LOCATIONS } from "./data-models.js";

export class CareerlessCharacterSheet extends foundry.appv1.sheets.ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["careerless-wfrp", "sheet", "actor"], width: 1150, height: 850, resizable: true,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "overview" }]
    });
  }
  get template() { return "systems/careerless-wfrp/templates/character-sheet.hbs"; }

  getData(options = {}) {
    const data = super.getData(options), actor = this.actor, system = actor.system;
    data.characteristics = CHARACTERISTICS.map(([key, label, short, aptitudes]) => ({ key, label, short, cost: characteristicAdvanceCost(actor, key, aptitudes), ...system.characteristics[key] }));
    data.skills = SKILLS.map(([key, label, characteristic, aptitudes]) => ({ key, label, characteristic, aptitudes: aptitudes.join(" / "), cost: skillAdvanceCost(actor, aptitudes, system.skills[key]), ...system.skills[key] }));
    data.characteristicOptions = CHARACTERISTICS.map(([value, label]) => ({ value, label }));
    data.aptitudeOptions = APTITUDE_OPTIONS.map(([value, label]) => ({ value, label }));
    data.aptitudeSlots = Object.entries(system.aptitudeSlots ?? {}).map(([key, value], i) => ({ key, label: `Aptitude Slot ${i + 1}`, value }));
    data.aptitudeGroups = [
      ["Characteristics", ["weaponSkill", "ballisticSkill", "strength", "toughness", "agility", "intelligence", "perception", "willpower", "fellowship"]],
      ["General Aptitudes", ["general", "offence", "finesse", "defence", "knowledge", "fieldcraft", "leadership", "social", "magic"]]
    ];
    for (const key of ["strengthBonus", "toughnessBonus", "agilityBonus", "intelligenceBonus", "willpowerBonus", "fellowshipBonus", "perceptionBonus", "initiative"]) data[key] = system[key];
    data.xpAvailable = system.xpAvailable;
    data.items = actor.items.contents;
    data.talents = data.items.filter(i => i.type === "talent").map(i => ({ item: i, cost: talentCost(actor, i) }));
    data.weapons = data.items.filter(i => i.type === "weapon");
    data.armors = data.items.filter(i => i.type === "armor");
    data.equipment = data.items.filter(i => i.type === "equipment");
    data.inventory = data.items.filter(i => ["weapon", "armor", "equipment"].includes(i.type));
    data.totalWeight = data.inventory.reduce((sum, item) => sum + (Number(item.system.weight) || 0) * (Number(item.system.quantity) || 0), 0);
    data.hitLocations = HIT_LOCATIONS.map(([key, label]) => {
      const manualKey = ({ head: "armourHead", body: "armourBody", rightArm: "armourRightArm", leftArm: "armourLeftArm", rightLeg: "armourRightLeg", leftLeg: "armourLeftLeg" })[key];
      const legacyKey = key.endsWith("Arm") ? "armourArms" : key.endsWith("Leg") ? "armourLegs" : manualKey;
      const manual = Number(system.combat[manualKey] ?? 0) + (manualKey !== legacyKey ? Number(system.combat[legacyKey] ?? 0) : 0);
      const equipped = data.armors.filter(item => item.system.equipped && (item.system.location === key || item.system.location === "all")).reduce((sum, item) => sum + (Number(item.system.armourPoints) || 0), 0);
      return { key, label, armour: manual + equipped };
    });
    data.canEdit = actor.isOwner;
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".roll-test").click(ev => this._onRollTest(ev));
    html.find(".roll-hit-location").click(ev => this._onRollHitLocation(ev));
    html.find(".advance-characteristic").click(ev => this._onAdvanceCharacteristic(ev));
    html.find(".advance-skill").click(ev => this._onAdvanceSkill(ev));
    html.find(".add-item").click(ev => this._onAddItem(ev));
    html.find(".buy-talent").click(ev => this._onBuyTalent(ev));
    html.find(".delete-item").click(ev => this._onDeleteItem(ev));
    html.find(".item-edit").click(ev => this._onEditItem(ev));
    html.find(".toggle-equipped").change(ev => this._onToggleEquipped(ev));
  }

  async _onRollTest(event) {
    event.preventDefault();
    const { testType: type, key } = event.currentTarget.dataset;
    let target = 0, label = "Test";
    if (type === "custom") {
      const custom = this.actor.system.customSkill, characteristic = this.actor.system.characteristics[custom.characteristic];
      label = custom.name.trim() || "Custom Skill";
      target = Math.max(0, Math.min(100, Number(characteristic?.total ?? 0) + Number(custom.modifier ?? 0)));
    } else if (type === "characteristic") {
      target = this.actor.system.characteristics[key].total;
      label = CONFIG.CareerlessWFRP.characteristicLabels[key] ?? key;
    } else {
      target = this.actor.system.skills[key].total;
      label = CONFIG.CareerlessWFRP.skillLabels[key] ?? key;
    }
    const roll = await new Roll("1d100").evaluate(), success = roll.total <= target;
    const degrees = success ? Math.floor((target - roll.total) / 10) + 1 : Math.floor((roll.total - target - 1) / 10) + 1;
    await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), flavor: `<strong>${label}</strong> — target ${target}: ${success ? "SUCCESS" : "FAILURE"} (${success ? "+" : "-"}${degrees} SL)` });
  }

  async _onRollHitLocation(event) {
    event.preventDefault();
    const roll = await new Roll("1d100").evaluate();
    const raw = roll.total === 100 ? "00" : String(roll.total).padStart(2, "0");
    const reversedDigits = raw.split("").reverse().join("");
    const reversed = reversedDigits === "00" ? 100 : Number(reversedDigits);
    const location = reversed <= 10 ? "Head" : reversed <= 20 ? "Right Arm" : reversed <= 30 ? "Left Arm" : reversed <= 70 ? "Body" : reversed <= 85 ? "Right Leg" : "Left Leg";
    await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), flavor: `<strong>Hit Location</strong> — reversed percentile ${String(reversed).padStart(2, "0")}: <strong>${location}</strong>` });
  }

  async _onToggleEquipped(event) {
    const item = this.actor.items.get(event.currentTarget.dataset.itemId);
    if (item) await item.update({ "system.equipped": event.currentTarget.checked });
  }

  async _onAdvanceCharacteristic(event) {
    event.preventDefault();
    const key = event.currentTarget.dataset.key, c = this.actor.system.characteristics[key];
    if (!c || c.advances >= 5) return;
    const config = CHARACTERISTICS.find(([k]) => k === key), cost = characteristicAdvanceCost(this.actor, key, config?.[3] ?? [key]);
    if (this.actor.system.xpAvailable < cost) return ui.notifications.warn(`Not enough XP. Cost: ${cost}.`);
    await this.actor.update({ [`system.characteristics.${key}.advances`]: c.advances + 1, "system.xp.spent": this.actor.system.xp.spent + cost });
  }

  async _onAdvanceSkill(event) {
    event.preventDefault();
    const key = event.currentTarget.dataset.key, s = this.actor.system.skills[key];
    if (!s) return;
    const config = SKILLS.find(([k]) => k === key);
    let cost, update;
    if (!s.known) { cost = skillAdvanceCost(this.actor, config?.[3] ?? [], s); update = { [`system.skills.${key}.known`]: true }; }
    else if (s.advances < 3) { cost = skillAdvanceCost(this.actor, config?.[3] ?? [], s); update = { [`system.skills.${key}.advances`]: s.advances + 1 }; }
    else return;
    if (this.actor.system.xpAvailable < cost) return ui.notifications.warn(`Not enough XP. Cost: ${cost}.`);
    update["system.xp.spent"] = this.actor.system.xp.spent + cost;
    await this.actor.update(update);
  }

  async _onAddItem(event) {
    event.preventDefault();
    const type = event.currentTarget.dataset.type;
    const name = { talent: "New Talent", weapon: "New Weapon", armor: "New Armour", equipment: "New Gear" }[type] ?? "New Item";
    await Item.create({ name, type, system: {} }, { parent: this.actor });
  }

  async _onBuyTalent(event) {
    event.preventDefault();
    const item = this.actor.items.get(event.currentTarget.dataset.itemId);
    if (!item) return;
    if (item.system.purchased) return ui.notifications.info("This talent has already been purchased.");
    const cost = talentCost(this.actor, item);
    if (this.actor.system.xpAvailable < cost) return ui.notifications.warn(`Not enough XP. Cost: ${cost}.`);
    await item.update({ "system.purchased": true });
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
