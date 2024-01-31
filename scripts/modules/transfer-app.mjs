import {MODULE} from "../module.mjs";

export class EffectTransferApp extends Application {
  /**
   * @constructor
   * @param {Item} item           The item transferring effects.
   * @param {object} options      Standard FormApplication options.
   */
  constructor(item, options = {}) {
    super(options);
    this.item = item ?? null;
    this.itemName = item?.name ?? game.i18n.format("ET.applyEffect.defaultName");
    this.actor = options.actor;
    this.tokenDoc = options.tokenDoc;
    this.effects = foundry.utils.deepClone(options.validEffectsData);
    // whether to show the 'Self' related stuff
    this.self = options.tokenDoc ?? options.actor ?? false;

    // Whether to forcefully override the 'origin' field with the uuid of this.item.
    this.overrideOrigin = game.settings.get(MODULE.id, "overrideOrigin");
    if(this.overrideOrigin){
      this.effects.forEach(e => e.origin = this.item.uuid);
    }
  }

  /** @override */
  get id() {
    return `${MODULE.id}-transfer-app-${this.item?.id}`;
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: [MODULE.id, "transfer-app"],
      width: 400,
      template: `modules/${MODULE.id}/templates/TransferApp.hbs`,
      height: "auto"
    });
  }

  /** @override */
  get title() {
    return game.i18n.format("ET.Dialog.Title", {name: this.itemName});
  }

  /** @override */
  async getData() {
    const data = await super.getData();
    data.effects = this.effects.map(effect => {
      const trans = effect.flags[MODULE.id]?.transferrable ?? {};
      return {
        id: effect._id,
        name: effect.name,
        description: effect.description,
        disableSelf: (trans.self === false) || trans.always,
        disableTar: (trans.target === false) || trans.always,
        alwaysTransfer: trans.always
      };
    });
    data.self = this.self && data.effects.some(e => !e.disableSelf);
    data.module = MODULE.id;
    return data;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html[0].querySelectorAll(".buttons button[data-type]").forEach(button => {
      button.addEventListener("click", this.finalize.bind(this));
    });
  }

  /**
   * If the name of the mutation is not unique, append a number to it.
   * @param {TokenDocument} tokenDoc      The token document that is the target of the mutation.
   * @param {string} itemName             The current attempted name for the mutation.
   * @returns {string}                    A unique name for the mutation to apply to the token.
   */
  static _getValidMutationName(tokenDoc, itemName) {
    let name = `Effective Transferral: ${itemName}`;
    let hasName = !!warpgate.mutationStack(tokenDoc).getName(name);
    let i = 1;
    while (!!hasName) {
      i++;
      name = `Effective Transferral: ${itemName} (${i})`;
      hasName = !!warpgate.mutationStack(tokenDoc).getName(name);
    }
    return name;
  }

  /**
   * Finalize transfer of effects using chosen parameters.
   * @param {Event} event     Initiating click event.
   */
  async finalize(event) {
    const type = event.currentTarget.dataset.type; // ALL, SELF, or TARGET

    const acc = {self: [], target: []};
    event.currentTarget.closest("FORM").querySelectorAll(".effect input[data-type]:checked").forEach(box => {
      acc[box.dataset.type].push(box.dataset.id);
    });

    this.close();

    if (["ALL", "SELF"].includes(type)) await this.applyToSelf(this.packageEffects(acc.self));
    if (["ALL", "TARGET"].includes(type)) await this.applyToTargets(this.packageEffects(acc.target));
  }

  /**
   * Immediately transfer any effects on an item that are set to 'always', without rendering the app.
   * @param {object[]} effectData     An array of effect data to transfer.
   */
  async immediateTransfer(effectData) {
    const {self, target} = effectData.reduce((acc, data) => {
      const trans = data.flags[MODULE.id].transferrable; // always defined.
      if (trans.self) acc.self.push(data._id);
      if (trans.target) acc.target.push(data._id);
      return acc;
    }, {self: [], target: []});
    if (self.length) await this.applyToSelf(this.packageEffects(self));
    if (target.length) await this.applyToTargets(this.packageEffects(target));
  }

  /**
   * Construct the warpgate mutation from `this.effects`, filtered by the given ids.
   * @param {string[]} ids      An array of ids for the effects.
   * @returns {object}          The end warpgate mutation.
   */
  packageEffects(ids) {
    const aeData = {};
    const identical = MODULE.getSetting("applyIdenticalEffects");
    MODULE.debug("THIS.EFFECTS:", this.effects);

    if (identical) {
      foundry.utils.deepClone(this.effects).reduce((acc, ae) => {
        if (ids.includes(ae._id)) {
          let mutationKey = foundry.utils.randomID();
          foundry.utils.setProperty(ae, `flags.${MODULE.id}.mutationKey`, mutationKey);
          acc[mutationKey] = ae;
          this._deleteNullDurations(ae.duration);
        }
        return acc;
      }, aeData);
    } else {
      foundry.utils.deepClone(this.effects).reduce((acc, ae) => {
        if (ids.includes(ae._id)) acc[ae.name] = ae;
        this._deleteNullDurations(ae.duration);
        return acc;
      }, aeData);
    }

    /* Put effects into update object */
    MODULE.debug("AEDATA", aeData);
    return {embedded: {ActiveEffect: aeData}};
  }

  /**
   * Mutate the duration object of an active effect's data, deleting any null values.
   * @param {object} duration     The duration object.
   */
  _deleteNullDurations(duration) {
    for (const [key, val] of Object.entries(duration ?? {})) {
      if (val === null) delete duration[key];
    }
  }

  /**
   * Apply the effects to the owner of the item. If a token exists, perform a
   * warpgate mutation, otherwise create embedded documents normally.
   * @param {object} updates                    The warpgate `updates` object.
   * @returns {MutationData|ActiveEffect[]}     Either see warpgate#mutate, otherwise an array of created effects.
   */
  async applyToSelf(updates) {
    if (this.tokenDoc) {
      return this.applyPackagedEffects(this.tokenDoc, updates);
    } else {
      return this.actor.createEmbeddedDocuments("ActiveEffect", Object.values(updates.embedded.ActiveEffect));
    }
  }

  /**
   * Apply the effects to each of the user's targets through warpgate.
   * @param {object} updates      The warpgate `updates` object.
   */
  async applyToTargets(updates) {
    const targets = game.user.targets;
    for (const target of targets) {
      await this.applyPackagedEffects(target.document, updates);
    }
  }

  /**
   * Mutate the token document with the updates object.
   * @param {TokenDocument} target      The target of the mutation.
   * @param {object} updates            The warpgate `updates` object.
   * @returns {MutationData}            See warpgate#mutate.
   */
  async applyPackagedEffects(target, updates) {
    if (!target) return // Don't do anything if we don't have a token
    MODULE.debug("updates", updates);
    if (foundry.utils.isEmpty(updates.embedded.ActiveEffect)) {
      return MODULE.debug("Empty mutation cancelling application", updates.embedded.ActiveEffect);
    }
    const comparisonKey = MODULE.getSetting("applyIdenticalEffects") ? "id" : "name";
    const warpgateObject = {
      name: EffectTransferApp._getValidMutationName(target, this.itemName),
      description: game.i18n.format("ET.Dialog.Mutate.Description", {
        userName: game.user.name,
        itemName: this.itemName,
        tokenName: this.tokenDoc?.name
      }),
      comparisonKeys: {ActiveEffect: comparisonKey},
      permanent: MODULE.getSetting("permanentTransfer")
    };

    MODULE.debug({target, updates, warpgateObject});
    return warpgate.mutate(target, foundry.utils.deepClone(updates), {}, warpgateObject);
  }
}
