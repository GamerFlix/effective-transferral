import { EffectTransfer } from "./effect-transfer.mjs";

export class api {
    
    static register() {
        api.globals();
    }
    
    static globals(){
        globalThis.ET={
            setButtonBlock: EffectTransfer.setButtonBlock,
            getButtonBlock: EffectTransfer.getButtonBlock,
            setChatBlock: EffectTransfer.setChatBlock,
            getChatBlock: EffectTransfer.getChatBlock,
            setDisplayCardBlock: EffectTransfer.setDisplayCardBlock,
            getDisplayCardBlock: EffectTransfer.getDisplayCardBlock,
            packageEffects: EffectTransfer.packageEffects,
            applyPackagedEffects: EffectTransfer.applyPackagedEffects,
            transferEffects: api.transferEffects,
            effectTransferDialogue: EffectTransfer.effectTransferDialogue
        }
    }
    
    // Takes an array of effect data objects, a token doc, and optionally an itemName for the description
    static async transferEffects(tokenDoc, effectDataArray, itemName = game.i18n.format("ET.applyEffect.defaultName")){
        const packagedEffects = EffectTransfer.packageEffects(effectDataArray);
        await EffectTransfer.applyPackagedEffects(tokenDoc, packagedEffects, itemName);
    }
}
