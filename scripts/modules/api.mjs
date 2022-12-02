import { EffectTransfer } from "./effect-transfer.mjs";

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
            packageEffects: EffectTransfer.packageEffects,
            applyPackagedEffects: EffectTransfer.applyPackagedEffects,
            transferEffects: api.transferEffects,
            effectTransferDialogue: EffectTransfer.effectTransferDialogue,
            effectTransferTrigger: EffectTransfer.EffectTransferTrigger
        }
    }
    
    // Takes an array of effect data objects, a token doc, and optionally an itemName for the description
    static async transferEffects(tokenDoc, effectDataArray, itemName = game.i18n.format("ET.applyEffect.defaultName")){
        const packagedEffects = EffectTransfer.packageEffects(effectDataArray);
        await EffectTransfer.applyPackagedEffects(tokenDoc, packagedEffects, itemName);
    }
}
