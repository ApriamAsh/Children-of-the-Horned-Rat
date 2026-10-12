const { SchemaField, NumberField, StringField, BooleanField } = foundry.data.fields;

export const CHARACTERISTICS = [
  ["weaponSkill", "Weapon Skill", "WS", ["weaponSkill", "offence"]],
  ["ballisticSkill", "Ballistic Skill", "BS", ["ballisticSkill", "finesse"]],
  ["strength", "Strength", "S", ["strength", "offence"]],
  ["toughness", "Toughness", "T", ["toughness", "defence"]],
  ["agility", "Agility", "Ag", ["agility", "finesse"]],
  ["intelligence", "Intelligence", "Int", ["intelligence", "knowledge"]],
  ["perception", "Perception", "Per", ["perception", "fieldcraft"]],
  ["willpower", "Willpower", "WP", ["willpower", "general"]],
  ["fellowship", "Fellowship", "Fel", ["fellowship", "social"]]
];

export const SKILLS = [
  ["athletics", "Athletics", "strength", ["General", "Fieldcraft"]],
  ["awareness", "Awareness", "perception", ["Perception", "Fieldcraft"]],
  ["charm", "Charm", "fellowship", ["Fellowship", "Social"]],
  ["command", "Command", "fellowship", ["Fellowship", "Leadership"]],
  ["concealment", "Concealment", "agility", ["Agility", "Fieldcraft"]],
  ["disguise", "Disguise", "fellowship", ["Social", "Finesse"]],
  ["dodge", "Dodge", "agility", ["Agility", "Defence"]],
  ["drive", "Drive", "agility", ["Agility", "Fieldcraft"]],
  ["evaluate", "Evaluate", "intelligence", ["Intelligence", "Knowledge"]],
  ["gamble", "Gamble", "intelligence", ["Intelligence", "Social"]],
  ["intimidate", "Intimidate", "strength", ["Strength", "Social"]],
  ["melee", "Melee", "weaponSkill", ["Weapon Skill", "Offence"]],
  ["operate", "Operate", "intelligence", ["Intelligence", "General"]],
  ["parry", "Parry", "weaponSkill", ["Weapon Skill", "Defence"]],
  ["persuasion", "Persuasion", "fellowship", ["Fellowship", "Social"]],
  ["research", "Research", "intelligence", ["Intelligence", "Knowledge"]],
  ["ride", "Ride", "agility", ["Agility", "Fieldcraft"]],
  ["search", "Search", "perception", ["Perception", "Fieldcraft"]],
  ["silentMove", "Silent Move", "agility", ["Agility", "Finesse"]],
  ["sleightOfHand", "Sleight of Hand", "agility", ["Agility", "Finesse"]],
  ["stealth", "Stealth", "agility", ["Agility", "Finesse"]],
  ["survival", "Survival", "intelligence", ["Intelligence", "Fieldcraft"]],
  ["trade", "Trade", "intelligence", ["Intelligence", "General"]],
  ["lore", "Lore", "intelligence", ["Intelligence", "Knowledge"]],
  ["will", "Will", "willpower", ["Willpower", "General"]]
];

const characteristicSchema = () => new SchemaField({
  base: new NumberField({ required: true, integer: true, min: 0, max: 100, initial: 30 }),
  advances: new NumberField({ required: true, integer: true, min: 0, max: 5, initial: 0 }),
  modifier: new NumberField({ required: true, integer: true, min: -100, max: 100, initial: 0 })
});

const skillSchema = () => new SchemaField({
  known: new BooleanField({ required: true, initial: false }),
  advances: new NumberField({ required: true, integer: true, min: 0, max: 3, initial: 0 }),
  modifier: new NumberField({ required: true, integer: true, min: -100, max: 100, initial: 0 }),
  specialisation: new StringField({ required: true, blank: true, initial: "" })
});

export class CareerlessCharacterData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    const skills = {};
    for (const [key] of SKILLS) skills[key] = skillSchema();

    const characteristics = {};
    for (const [key] of CHARACTERISTICS) characteristics[key] = characteristicSchema();

    return {
      identity: new SchemaField({
        ancestry: new StringField({ required: true, blank: true, initial: "Human" }),
        background: new StringField({ required: true, blank: true, initial: "" }),
        biography: new StringField({ required: true, blank: true, initial: "" })
      }),
      xp: new SchemaField({
        earned: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        spent: new NumberField({ required: true, integer: true, min: 0, initial: 0 })
      }),
      characteristics: new SchemaField(characteristics),
      skills: new SchemaField(skills),
      aptitudes: new SchemaField({
        weaponSkill: new BooleanField({ required: true, initial: false }),
        ballisticSkill: new BooleanField({ required: true, initial: false }),
        strength: new BooleanField({ required: true, initial: false }),
        toughness: new BooleanField({ required: true, initial: false }),
        agility: new BooleanField({ required: true, initial: false }),
        intelligence: new BooleanField({ required: true, initial: false }),
        perception: new BooleanField({ required: true, initial: false }),
        willpower: new BooleanField({ required: true, initial: false }),
        fellowship: new BooleanField({ required: true, initial: false }),
        general: new BooleanField({ required: true, initial: true }),
        offence: new BooleanField({ required: true, initial: false }),
        finesse: new BooleanField({ required: true, initial: false }),
        defence: new BooleanField({ required: true, initial: false }),
        knowledge: new BooleanField({ required: true, initial: false }),
        fieldcraft: new BooleanField({ required: true, initial: false }),
        leadership: new BooleanField({ required: true, initial: false }),
        social: new BooleanField({ required: true, initial: false }),
        magic: new BooleanField({ required: true, initial: false })
      }),
      combat: new SchemaField({
        movement: new NumberField({ required: true, integer: true, min: 0, initial: 4 }),
        wounds: new NumberField({ required: true, integer: true, min: 0, initial: 12 }),
        woundsCurrent: new NumberField({ required: true, integer: true, min: 0, initial: 12 }),
        fate: new NumberField({ required: true, integer: true, min: 0, initial: 1 }),
        insanity: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        magic: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        armourHead: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        armourBody: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        armourArms: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        armourLegs: new NumberField({ required: true, integer: true, min: 0, initial: 0 })
      }),
      advancementNotes: new StringField({ required: true, blank: true, initial: "" })
    };
  }

  get xpAvailable() {
    return Math.max(0, this.xp.earned - this.xp.spent);
  }

  prepareDerivedData() {
    super.prepareDerivedData();
    for (const [key] of CHARACTERISTICS) {
      const c = this.characteristics[key];
      c.total = Math.max(0, Math.min(100, c.base + c.advances * 5 + c.modifier));
      c.bonus = Math.floor(c.total / 10);
    }
    for (const [key, label, characteristic] of SKILLS) {
      const skill = this.skills[key];
      skill.total = this.characteristics[characteristic].total + skill.advances * 10 + skill.modifier;
      skill.total = Math.max(0, Math.min(100, skill.total));
      skill.rank = skill.known ? skill.advances + 1 : 0;
    }
    this.strengthBonus = this.characteristics.strength.bonus;
    this.toughnessBonus = this.characteristics.toughness.bonus;
    this.agilityBonus = this.characteristics.agility.bonus;
    this.intelligenceBonus = this.characteristics.intelligence.bonus;
    this.willpowerBonus = this.characteristics.willpower.bonus;
    this.fellowshipBonus = this.characteristics.fellowship.bonus;
    this.perceptionBonus = this.characteristics.perception.bonus;
    this.initiative = this.agilityBonus;
    this.combat.woundsCurrent = Math.min(this.combat.woundsCurrent, this.combat.wounds);
  }
}

export class CareerlessItemData extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {
      quantity: new NumberField({ required: true, integer: true, min: 0, initial: 1 }),
      description: new StringField({ required: true, blank: true, initial: "" }),
      xpCost: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
      tier: new NumberField({ required: true, integer: true, min: 1, max: 5, initial: 1 }),
      aptitude1: new StringField({ required: true, blank: true, initial: "General" }),
      aptitude2: new StringField({ required: true, blank: true, initial: "" })
    };
  }
}
