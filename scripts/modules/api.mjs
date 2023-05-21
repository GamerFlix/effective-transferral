import { EffectTransfer } from "./effect-transfer.mjs";
import { MODULE } from "../module.mjs";
export class api {

    static register() {
        api.globals();
    }

    static globals(){
        globalThis.ET={
            // Considering removal of these
            setButtonBlock: EffectTransfer.setButtonBlock,
            getButtonBlock: EffectTransfer.getButtonBlock,
            setChatBlock: EffectTransfer.setChatBlock,
            getChatBlock: EffectTransfer.getChatBlock,
            setDisplayCardBlock: EffectTransfer.setDisplayCardBlock,
            getDisplayCardBlock: EffectTransfer.getDisplayCardBlock,
            // These will be kept for the forseeable future.
            setBlock:EffectTransfer.setBlock,
            getBlock:EffectTransfer.getBlock,
            packageEffects: api.packageEffects,
            applyPackagedEffects: api.applyPackagedEffects,
            transferEffects: api.transferEffects,
            effectTransferDialogue: EffectTransfer.effectTransferDialogue,
            effectTransferTrigger: EffectTransfer.EffectTransferTrigger
        }
    }

    // Takes an array of ActiveEffectObjects and bundles it so it can be passed to applyPackagedEffects / warpgate.mutate()
    static packageEffects(validEffectsData) {
        let aeData={}
        if (MODULE.getSetting("applyIdenticalEffects")){
            aeData = validEffectsData.reduce((acc, ae) => {
                let mutationKey=foundry.utils.randomID()
                foundry.utils.setProperty(ae, "flags.effective-transferral.mutationKey", mutationKey);
                acc[mutationKey] = ae;
                for(const [key, val] of Object.entries(ae.duration ?? {})){
                    if(val === null) delete ae.duration[key];
                  }
                return acc;
              }, {});
        }else{
            aeData = validEffectsData.reduce((acc, ae) => {
                acc[ae.label] = ae;
                for(const [key, val] of Object.entries(myEffectDataObject.duration ?? {})){
                    if(val === null) delete myEffectDataObject.duration[key];
                  }
                return acc;
              }, {});
        }

      EffectTransfer.debug("Prepared aeData");
      /* Put effects into update object */
      return { embedded: { ActiveEffect: aeData } };
    }

    //Takes a token doc, effects prepackaged by packageEffects and optionally an item name to apply effects
    static async applyPackagedEffects(tokenDoc, packagedEffects, itemName = game.i18n.format("ET.applyEffect.defaultName")) {
        const comparisonKey = MODULE.getSetting("applyIdenticalEffects") ? "id" : "label";
        await warpgate.mutate(tokenDoc, packagedEffects, {}, {
          name: `Effective Transferral: ${itemName}`,
          description: game.i18n.format("ET.Dialog.Mutate.Description", {
            userName: game.user.name,
            itemName,
            tokenName: tokenDoc.name
          }),
          comparisonKeys: { ActiveEffect: comparisonKey },
          permanent: MODULE.getSetting("permanentTransfer")
        });
      }

    // Takes an array of effect data objects, a token doc, and optionally an itemName for the description
    static async transferEffects(tokenDoc, effectDataArray, itemName = game.i18n.format("ET.applyEffect.defaultName")){
        const packagedEffects = EffectTransfer.packageEffects(effectDataArray);
        await EffectTransfer.applyPackagedEffects(tokenDoc, packagedEffects, itemName);
    }
}
