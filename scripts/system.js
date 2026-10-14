import { CareerlessCharacterData, CareerlessItemData, CHARACTERISTICS, SKILLS } from "./data-models.js";
import { CareerlessCharacterSheet } from "./character-sheet.js";
import { CareerlessItemSheet } from "./item-sheet.js";

Hooks.once("init", () => {
  CONFIG.Actor.dataModels.character = CareerlessCharacterData;
  CONFIG.Item.dataModels.talent = CareerlessItemData;
  CONFIG.Item.dataModels.weapon = CareerlessItemData;
  CONFIG.Item.dataModels.armor = CareerlessItemData;
  CONFIG.Item.dataModels.equipment = CareerlessItemData;
  CONFIG.Item.dataModels.skill = CareerlessItemData;
  CONFIG.Item.dataModels.power = CareerlessItemData;

  CONFIG.CareerlessWFRP = {
    characteristicLabels: Object.fromEntries(CHARACTERISTICS.map(([key, label]) => [key, label])),
    skillLabels: Object.fromEntries(SKILLS.map(([key, label]) => [key, label]))
  };

  Actors.registerSheet("careerless-wfrp", CareerlessCharacterSheet, {
    types: ["character"],
    makeDefault: true,
    label: "CAREERLESS_WFRP.Sheet.Character"
  });

  Items.registerSheet("careerless-wfrp", CareerlessItemSheet, {
    types: ["talent", "weapon", "armor", "equipment", "skill", "power"],
    makeDefault: true,
    label: "CAREERLESS_WFRP.Sheet.Item"
  });

  console.log("Careerless WFRP | Initialized");
});

Hooks.once("ready", () => {
  console.log("Careerless WFRP | Ready");
});
