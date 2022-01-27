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
            getChatBlock: EffectTransfer.getChatBlock

        }
    }
}