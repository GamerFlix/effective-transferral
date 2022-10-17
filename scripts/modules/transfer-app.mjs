import { MODULE } from "../module.mjs";

export class EffectTransferApp extends FormApplication {
  constructor(item, options = {}) {
    super(item, options);
    this.item = item ?? null;
    this.itemName = item?.name ?? game.i18n.format("ET.applyEffect.defaultName");
    this.actor = options.actor;
    this.token = options.tokenDoc;
    this.effects = options.validEffectsData;
    // whether to show the 'Self' related stuff
    this.self = options.tokenDoc ?? options.actor ?? false;
  }

  get id() {
    return `effective-transferral-effect-transfer-app-${this.item?.id}`;
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      closeOnSubmit: true,
      classes: ["effective-transferral"],
      width: 400,
      template: "modules/effective-transferral/templates/TransferApp.hbs",
      height: "auto",
      title: game.i18n.localize("ET.Dialog.Title")
    });
  }

  async getData() {
    const data = await super.getData();
    data.self = this.self;
    data.effects = this.effects.map(effect => {
      const label = effect.label;
      const id = effect._id;
      // whether to disable self/target for the effect (can be 'undefined'):
      const self = foundry.utils.getProperty(effect, "flags.effective-transferral.transferrable.self") === true;
      const target = foundry.utils.getProperty(effect, "flags.effective-transferral.transferrable.target") === true;
      // if not disabled, default to being checked:
      const checkSelf = !self;
      const checkTarget = !target;
      return { id, label, self, target, checkSelf, checkTarget };
    });
    return data;
  }

  async _updateObject(event, formData) {
    const button = event.submitter;
    if (button?.type !== "submit") return;
    const type = button.dataset.type;

    const form = event.target.closest("form");
    const self = [...form.querySelectorAll("[data-type='self']")].filter(s => {
      return s.checked && !s.disabled;
    }).map(s => s.dataset.id);
    const target = [...form.querySelectorAll("[data-type='target']")].filter(s => {
      return s.checked && !s.disabled;
    }).map(s => s.dataset.id);

    if (["ALL", "SELF"].includes(type)) this.applyToSelf(this.packageEffects(self));
    if (["ALL", "TARGET"].includes(type)) this.applyToTargets(this.packageEffects(target));
  }

  // create the Warp Gate mutation from this.effects, filtered by the given ids.
  packageEffects(ids) {
    const aeData = this.effects.filter(e => {
      return ids.includes(e._id);
    }).reduce((acc, ae) => {
      acc[ae.label] = ae;
      return acc;
    }, {});

    /* Put effects into update object */
    return { embedded: { ActiveEffect: aeData } };
  }

  // either warpgate.mutate(this.token) or this.actor.createEmbeddedDocuments().
  async applyToSelf(updates) {
    if (this.hasToken) {
      return this.applyPackagedEffects(this.token, updates);
    } else {
      return this.actor.createEmbeddedDocuments("ActiveEffect", Object.values(updates.embedded.ActiveEffect));
    }
  }

  // warpgate.mutate() the user's targets.
  async applyToTargets(updates) {
    const targets = game.user.targets;
    for (const target of targets) {
      await this.applyPackagedEffects(target.document, updates);
    }
  }

  // Mutate the tokenDocument with the updates object.
  async applyPackagedEffects(target, updates) {
    const comparisonKey = MODULE.getSetting("applyIdenticalEffects") ? "id" : "label";
    await warpgate.mutate(target, updates, {}, {
      name: `Effective Transferral: ${this.itemName}`,
      description: game.i18n.format("ET.Dialog.Mutate.Description", {
        userName: game.user.name,
        itemName: this.itemName,
        tokenName: this.token?.name
      }),
      comparisonKeys: { ActiveEffect: comparisonKey },
      permanent: MODULE.getSetting("permanentTransfer")
    });
  }
}