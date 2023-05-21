import { MODULE } from "../module.mjs";

export class EffectTransferApp extends FormApplication {
  constructor(item, options = {}) {
    super(item, options);
    this.item = item ?? null;
    this.itemName = item?.name ?? game.i18n.format("ET.applyEffect.defaultName");
    this.actor = options.actor;
    this.tokenDoc = options.tokenDoc;
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
      classes: [MODULE.id, "transfer-app"],
      width: 400,
      template: "modules/effective-transferral/templates/TransferApp.hbs",
      height: "auto"
    });
  }

  get title(){
    return game.i18n.format("ET.Dialog.Title", {name: this.item.name});
  }

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

  // appends a number to mutation names to make it unique.
  static _getValidMutationName(tokenDoc, itemName){
    let name = `Effective Transferral: ${itemName}`;
    let hasName = !!warpgate.mutationStack(tokenDoc).getName(name);
    let i = 1;
    while(!!hasName){
      i++;
      name = `Effective Transferral: ${itemName} (${i})`;
      hasName = !!warpgate.mutationStack(tokenDoc).getName(name);
    }
    return name;
  }

  async _updateObject(event, formData) {
    const button = event.submitter;
    const type = button.dataset.type;

    const acc = {self: [], target: []};
    this.form.querySelectorAll("[data-type]:checked").forEach(box => acc[box.dataset.type].push(box.dataset.id));

    if (["ALL", "SELF"].includes(type)) await this.applyToSelf(this.packageEffects(acc.self));
    if (["ALL", "TARGET"].includes(type)) await this.applyToTargets(this.packageEffects(acc.target));
  }

  // Immediately transfer any effects on an item that are set to 'always', without rendering the app.
  async immediateTransfer(effectData) {
    const { self, target } = effectData.reduce((acc, data) => {
      const trans = data.flags["effective-transferral"].transferrable; // always defined.
      if (trans.self) acc.self.push(data._id);
      if (trans.target) acc.target.push(data._id);
      return acc;
    }, { self: [], target: [] });
    if(self.length) await this.applyToSelf(this.packageEffects(self));
    if(target.length) await this.applyToTargets(this.packageEffects(target));
  }

  // create the Warp Gate mutation from this.effects, filtered by the given ids.
  packageEffects(ids) {

    let aeData={}
        if (MODULE.getSetting("applyIdenticalEffects")){
            MODULE.debug(this.effects)
            aeData = foundry.utils.duplicate(this.effects).reduce((acc, ae) => {
                if (ids.includes(ae._id)){
                  let mutationKey=foundry.utils.randomID()
                  foundry.utils.setProperty(ae, "flags.effective-transferral.mutationKey", mutationKey);
                  acc[mutationKey] = ae;
                  for(const [key, val] of Object.entries(ae.duration ?? {})){
                    if(val === null) delete ae.duration[key];
                  }
                }
                return acc;
              }, {});
        }else{
            aeData = foundry.utils.duplicate(this.effects).reduce((acc, ae) => {
              if (ids.includes(ae._id)) acc[ae.name] = ae;
              for(const [key, val] of Object.entries(ae.duration ?? {})){
                if(val === null) delete ae.duration[key];
              }
              return acc;
              }, {});

        }

    /* Put effects into update object */
    MODULE.debug(aeData)
    return { embedded: { ActiveEffect: aeData } };
  }

  // either warpgate.mutate(this.token) or this.actor.createEmbeddedDocuments().
  async applyToSelf(updates) {
    if (this.tokenDoc) {
      return this.applyPackagedEffects(this.tokenDoc, updates);
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
    if (!target) return // Don't do anything if we don't have a token
    MODULE.debug("updates",updates)
    if(foundry.utils.isEmpty(updates.embedded.ActiveEffect)) return MODULE.debug("Empty mutation cancelling application",updates.embedded.ActiveEffect)
    //const comparisonKey = MODULE.getSetting("applyIdenticalEffects") ? "flags.effective-transferral.mutationKey" : "name";
    const comparisonKey = MODULE.getSetting("applyIdenticalEffects") ? "id" : "name";
    const warpgateObject={
      name: EffectTransferApp._getValidMutationName(target,this.itemName),
      description: game.i18n.format("ET.Dialog.Mutate.Description", {
        userName: game.user.name,
        itemName: this.itemName,
        tokenName: this.tokenDoc?.name
      }),
      comparisonKeys: { ActiveEffect: comparisonKey },
      permanent: MODULE.getSetting("permanentTransfer")
    }

    MODULE.debug({target,updates,warpgateObject})
    await warpgate.mutate(target, foundry.utils.duplicate(updates), {}, warpgateObject);
  }
}
