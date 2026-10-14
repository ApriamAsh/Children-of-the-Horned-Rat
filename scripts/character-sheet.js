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
    data.customSkills = data.items.filter(i => i.type === "skill");
    data.powers = data.items.filter(i => i.type === "power");
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
    html.find(".roll-weapon-attack").click(ev => this._onWeaponAttack(ev));
    html.find(".roll-custom-skill").click(ev => this._onRollCustomSkillItem(ev));
    html.find(".cast-power").click(ev => this._onCastPower(ev));
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
    const name = { talent: "New Talent", weapon: "New Weapon", armor: "New Armour", equipment: "New Gear", skill: "New Custom Skill", power: "New Magical Power" }[type] ?? "New Item";
    await Item.create({ name, type, system: {} }, { parent: this.actor });
  }


  async _onRollCustomSkillItem(event) {
    event.preventDefault();
    const item = this.actor.items.get(event.currentTarget.dataset.itemId);
    if (!item) return;
    const d = item.system, c = this.actor.system.characteristics[d.skillCharacteristic];
    const target = Math.max(0, Math.min(100, Number(c?.total ?? 0) + Number(d.skillAdvances ?? 0) * 10 + Number(d.skillModifier ?? 0)));
    await this._rollPercentileTest(item.name, target, "Custom Skill");
  }

  async _onCastPower(event) {
    event.preventDefault();
    const item = this.actor.items.get(event.currentTarget.dataset.itemId);
    if (!item) return;
    const d = item.system, c = this.actor.system.characteristics[d.powerCharacteristic] ?? this.actor.system.characteristics.willpower;
    const target = Math.max(0, Math.min(100, Number(c.total ?? 0) + Number(d.powerModifier ?? 0)));
    await this._rollPercentileTest(item.name + " (" + (d.powerType || "Power") + ")", target, "Magical Power");
  }

  async _rollPercentileTest(label, target, category) {
    const roll = await new Roll("1d100").evaluate(), success = roll.total <= target;
    const degrees = success ? Math.floor((target - roll.total) / 10) + 1 : Math.floor((roll.total - target - 1) / 10) + 1;
    await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), flavor: "<strong>" + category + ": " + label + "</strong> — target " + target + ": " + (success ? "SUCCESS" : "FAILURE") + " (" + (success ? "+" : "-") + degrees + " SL)" });
  }

  async _onWeaponAttack(event) {
    event.preventDefault();
    const weapon = this.actor.items.get(event.currentTarget.dataset.itemId);
    if (!weapon) return;
    const targetToken = Array.from(game.user.targets ?? [])[0];
    if (!targetToken?.actor) { ui.notifications.warn("Target a token in the scene before making an attack."); return; }
    const targetActor = targetToken.actor, w = weapon.system;
    const isMelee = /melee|close combat|hand-to-hand/i.test(String(w.weaponType || ""));
    const characteristicKey = isMelee ? "weaponSkill" : "ballisticSkill";
    const attackTarget = Number(this.actor.system.characteristics[characteristicKey]?.total ?? 0);
    const attackRoll = await new Roll("1d100").evaluate(), hit = attackRoll.total <= attackTarget;
    const raw = attackRoll.total === 100 ? "00" : String(attackRoll.total).padStart(2, "0");
    const reversedText = raw.split("").reverse().join("");
    const reversed = reversedText === "00" ? 100 : Number(reversedText);
    const loc = reversed <= 10 ? "head" : reversed <= 20 ? "rightArm" : reversed <= 30 ? "leftArm" : reversed <= 70 ? "body" : reversed <= 85 ? "rightLeg" : "leftLeg";
    const labels = {head:"Head",rightArm:"Right Arm",leftArm:"Left Arm",body:"Body",rightLeg:"Right Leg",leftLeg:"Left Leg"};
    let damageRoll = null, rawDamage = 0, armour = 0, toughness = 0, finalDamage = 0, woundsAfter = null;
    if (hit) {
      let formula = String(w.damage || "1d10").trim().replace(/\s+[A-Za-z]{1,4}\s*$/, "");
      const hadSB = /\bSB\b/i.test(formula);
      formula = formula.replace(/\bSB\b/gi, String(this.actor.system.strengthBonus ?? 0));
      if (!/^[\d dD+*/().\-]+$/.test(formula)) { ui.notifications.warn("Invalid damage formula. Use e.g. 1d10+3 or 1d10+SB."); return; }
      if (isMelee && !hadSB) formula += "+" + Number(this.actor.system.strengthBonus ?? 0);
      try { damageRoll = await new Roll(formula).evaluate(); rawDamage = Math.max(0, Number(damageRoll.total) || 0); }
      catch (err) { ui.notifications.warn("Could not roll this weapon's damage formula."); return; }
      const combat = targetActor.system?.combat ?? {};
      const legacy = loc.endsWith("Arm") ? Number(combat.armourArms ?? 0) : loc.endsWith("Leg") ? Number(combat.armourLegs ?? 0) : 0;
      const manualKey = ({head:"armourHead",body:"armourBody",rightArm:"armourRightArm",leftArm:"armourLeftArm",rightLeg:"armourRightLeg",leftLeg:"armourLeftLeg"})[loc];
      armour = Number(combat[manualKey] ?? 0) + legacy;
      armour += targetActor.items.contents.filter(i => i.type === "armor" && i.system.equipped && (i.system.location === loc || i.system.location === "all")).reduce((sum, i) => sum + (Number(i.system.armourPoints) || 0), 0);
      toughness = Number(targetActor.system?.toughnessBonus ?? Math.floor(Number(targetActor.system?.characteristics?.toughness?.total ?? 0) / 10));
      finalDamage = Math.max(0, rawDamage - armour - toughness);
      woundsAfter = Math.max(0, Number(combat.woundsCurrent ?? 0) - finalDamage);
      await targetActor.update({"system.combat.woundsCurrent": woundsAfter});
    }
    const outcome = hit ? "<strong>HIT</strong> — " + labels[loc] + " (reversed " + String(reversed).padStart(2,"0") + "). Damage " + rawDamage + "; AP " + armour + "; TB " + toughness + "; <strong>" + finalDamage + " wounds</strong> dealt. Target wounds: " + woundsAfter + "." : "<strong>MISS</strong> — attack target " + attackTarget + ".";
    const chatContent = "<p><strong>" + this.actor.name + "</strong> attacks <strong>" + targetActor.name + "</strong> with <strong>" + weapon.name + "</strong>.</p><p>Attack roll: " + attackRoll.total + " vs " + attackTarget + " (" + (isMelee ? "Weapon Skill" : "Ballistic Skill") + ").</p><p>" + outcome + "</p>" + (damageRoll ? "<p>Damage roll: " + damageRoll.total + " (" + damageRoll.formula + ").</p>" : "");
    await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor: this.actor }), content: chatContent });
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
