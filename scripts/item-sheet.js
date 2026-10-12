export class CareerlessItemSheet extends foundry.appv1.sheets.ItemSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["careerless-wfrp", "sheet", "item"],
      width: 500,
      height: 520,
      resizable: true
    });
  }

  get template() {
    return "systems/careerless-wfrp/templates/item-sheet.hbs";
  }

  getData(options = {}) {
    const data = super.getData(options);
    data.system = this.item.system;
    return data;
  }
}
