/* 
 * This file is part of the Effective Transferral module (https://github.com/GamerFlix/effective-transferral)
 * Copyright (c) 2021 Felix Pohl.
 * 
 * This program is free software: you can redistribute it and/or modify  
 * it under the terms of the GNU General Public License as published by  
 * the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful, but 
 * WITHOUT ANY WARRANTY; without even the implied warranty of 
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU 
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License 
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */
import { MODULE } from '../module.mjs'

export class EffectTransfer{

    static NAME = "EffectTransfer";
    
    // Gets the value of the chat flag in transferBlock, returning false if undefined
    static getChatBlock(effect){
        const object=effect.getFlag("effective-transferral","transferBlock")
        return (object?.chat ? true:false);
    }

    // Updates the flag object to include chat:boolean
    static async setChatBlock(effect,boolean){

        if (effect?.parent?.parent){
            ui.notifications.error(`${game.i18n.localize("ET.doubleEmbedded.error")}`)
            return
        }

        const old_object=effect.getFlag("effective-transferral","transferBlock");
        if (old_object){
            let object_copy=duplicate(old_object)
            object_copy.chat=boolean
            effect.setFlag("effective-transferral","transferBlock",object_copy)
        }else{
            effect.setFlag("effective-transferral","transferBlock",{chat:boolean})
        }
    }

    // Gets the value of the button flag in transferBlock, returning false if undefined
    static getButtonBlock(effect){
        const object=effect.getFlag("effective-transferral","transferBlock")
        return (object?.button ? true:false);
    }


    //  Updates the flag object to include button:boolean
    static async setButtonBlock(effect,boolean){

        if (effect?.parent?.parent){
            ui.notifications.error(`${game.i18n.localize("ET.doubleEmbedded.error")}`)
            return
        }

        const old_object=effect.getFlag("effective-transferral","transferBlock");
        if (old_object){
            let object_copy=duplicate(old_object)
            object_copy.button=boolean
            effect.setFlag("effective-transferral","transferBlock",object_copy)
        }else{
            effect.setFlag("effective-transferral","transferBlock",{button:boolean})
        }
    }




    // Toggleable console.log()
    static async debug(x){ 
        if (MODULE.getSetting("debugMode")){
            console.log(x)
        }
    }

    // Read this: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/static
    static isEligible = (type) => {
        switch(type) {
          case 'button': return (effect) => 
          (effect.data.transfer===false||MODULE.getSetting("includeEquipTransfer")) &&
           (!EffectTransfer.getButtonBlock(effect)&&!MODULE.getSetting("neverButtonTransfer"));

          case 'chat':return (effect) => 
          (effect.data.transfer===false||MODULE.getSetting("includeEquipTransfer")) &&
           (!EffectTransfer.getChatBlock(effect)&&!MODULE.getSetting("neverChatTransfer"));

        default: return (_) => false;
      }}
    
    // Takes an array of ActiveEffect data and bundles it so it can be passed to applyPackagedEffects/warpgate.mutate()
    static packageEffects(validEffectsData){
        const aeData = validEffectsData.reduce( (acc, ae) => {
            acc[ae.label] = ae
            return acc;
            }, {});

        EffectTransfer.debug("Prepared aeData")

        /*Put effects into update object*/
        const updates={
            embedded: {ActiveEffect: aeData}
        }
        return updates
    }
    
    //Takes a token doc, effects prepackaged by packageEffects and optionally an item name to apply effects
    static async applyPackagedEffects(tokenDoc,packagedEffects,itemName=game.i18n.format("ET.applyEffect.defaultName")){
        await warpgate.mutate(tokenDoc,
            packagedEffects,
            {},
            {name:`Effective Transferral: ${itemName}`,
            description: game.i18n.format("ET.Dialog.Mutate.Description",{userName:game.user.name,itemName:itemName,tokenName:tokenDoc.data.name}),
            comparisonKeys: {ActiveEffect: 'label'}
            })
    }
    

    // pops up the dialogue and calls warpgate to apply effects
    static async effectTransferDialogue(actor,tokenDoc,itemName,validEffectsData){
        if (validEffectsData.length===0){//Check whether we actually have effects on the item
            return //If we don't have any there's nothing to do
        }
        // If we don't have any non-transfer effects there is nothing to do so exit
        let effect_target // initiliaze the variable again because scoping
        /* If we have a token we are on a scene that uses tokens so we have stuff to target.
        Reflect that in the dialogue by giving the option to apply to targets*/
        if (tokenDoc&&actor){
        effect_target=await warpgate.menu({
            inputs: [{
                label: `<center>
                    <p style="font-size:15px;"> 
                    ${game.i18n.localize("ET.Dialog.Instructions.Token")}
                    </p>  
                    </center>`,
                type: 'info'
            }],
            buttons: [{
                label: `${game.i18n.localize("ET.Dialog.Button.Self")}`,
                value: "selfToken"
            }, {
                label: `${game.i18n.localize("ET.Dialog.Button.Targets")}`,
                value: "targets"
            }, {
                label: `${game.i18n.localize("ET.Dialog.Button.None")}`,
                value: "none"
            }]
            
            },
            {
            title: `${game.i18n.localize("ET.Dialog.Title")}`,
            })
        }else if(actor){
            /* if we don't have a token we are either non on a scene or not on a scene that uses tokens (Theatre of Mind) so there wouldn't be anything to target anyhow*/
            effect_target=await warpgate.menu({
            inputs: [{
                label: `<center>
                    <p style="font-size:15px;">  
                    ${game.i18n.localize("ET.Dialog.Instructions.Notoken")}
                    </p>  
                    </center>`,
                type: 'info'
            }],
            buttons: [{
                label: `${game.i18n.localize("ET.Dialog.Button.Self")}`,
                value: "selfNoToken"
            },{
                label: `${game.i18n.localize("ET.Dialog.Button.None")}`,
                value: "none"
            }]
            
            },
            {
            title: `${game.i18n.localize("ET.Dialog.Title")}`,
            }) 
        }else{// If we have neither token nor actor we are on an unowned item
            effect_target=await warpgate.menu({
                inputs: [{
                    label: `<center>
                        <p style="font-size:15px;"> 
                        ${game.i18n.localize("ET.Dialog.Instructions.Token")}
                        </p>  
                        </center>`,
                    type: 'info'
                }],
                buttons: [{
                    label: `${game.i18n.localize("ET.Dialog.Button.Targets")}`,
                    value: "targets"
                }, {
                    label: `${game.i18n.localize("ET.Dialog.Button.None")}`,
                    value: "none"
                }]
                
                },
                {
                title: `${game.i18n.localize("ET.Dialog.Title")}`,
                })


        }
        effect_target=effect_target["buttons"]// Get the relevant part from the dialogue return value
        EffectTransfer.debug(effect_target)
        if (effect_target==="none"||!effect_target) return // If we selected to do nothing do nothing!
        
        // Reformat our active effects so we can pass them to warpgate later

        
        /*Bring effects into usable form*/
        const updates=EffectTransfer.packageEffects(validEffectsData)
        EffectTransfer.debug("Prepared updates")
        
        EffectTransfer.debug("Going into the switch case")
        switch (effect_target){
        case 'selfToken':
            EffectTransfer.debug("Going into selfToken")
            EffectTransfer.debug(tokenDoc)
            /*If the user selected self and we found a token we can just call warpgate.mutate on the token*/
            EffectTransfer.applyPackagedEffects(tokenDoc,updates,itemName)
            break;
        case 'selfNoToken': 
            EffectTransfer.debug("Going into selfNoToken")
            EffectTransfer.debug(tokenDoc)
            /*If we didn't find any tokens just create the effects as usual and have the user deal with the extra inconvenience of reverting the change*/
            await actor.createEmbeddedDocuments("ActiveEffect",validEffectsData)
            break;
        case 'targets':// If we selected targets option we need to put the effects on targets
            EffectTransfer.debug(game.user.targets) 
            /*Loop over each target and apply the effect via warpgate*/
            for (let target of game.user.targets){
                EffectTransfer.debug(game.user.name)
                EffectTransfer.debug(target.document.data.name)
                EffectTransfer.applyPackagedEffects(target.document,updates,itemName)
            }
            break;
        default:
            ui.Notifications.error(`${game.i18n.localize("ET.Dialog.switch.error")}`)
            return
            break;
        
        }
    }

    // gets the actor, item and token from the chat message, and passes it to EffectTransferDialogue
    static async parseChatMessage(messageDocument){
        // Code is heavily inspired by https://github.com/trioderegion/dnd5e-helpers/blob/c778f0186b3263f87fd3714acb92ce25953af05e/scripts/modules/ActionManagement.js#L206
        const messageData=messageDocument.data //Get the relevant part from messageDocument
        const speaker = messageData.speaker; // Get the speaker of the message (ergo the actor this rolled from)
        
        /*Is there a speaker, is the speaker on the scene, does the speaker have a token*/
        if(!speaker || !speaker.scene|| messageDocument.user.id!==game.user.id /*|| !speaker.token*/)  return;
        /*Initialize actor and token*/
        let actor
        let tokenDoc
        
        if (speaker.token){ //If the speaker has a token use that (to support unlined actors)
            tokenDoc = await fromUuid(`Scene.${speaker.scene}.Token.${speaker.token}`);// Get the tokenDoc fromUuid
            EffectTransfer.debug(tokenDoc)

            actor=tokenDoc.actor // Define the actor as the token.actor (again support for unlinked actors)
            EffectTransfer.debug("Effect buttons: TokenDoc Found")
            EffectTransfer.debug(actor)
        }else{ //If the speaker doesn't have a token, just get the actor
            actor=await fromUuid(`Actor.${speaker.actor}`)// Just get the actor fromUuid if we don't have a token
            if(!actor) return
            EffectTransfer.debug("TokenDoc not found in Message")
            EffectTransfer.debug(actor)
            tokenDoc=actor.getActiveTokens({document:true})[0]?.document// get the tokenDoc from the actors active tokens. For some reason it returns the token despite being passed document
        }

        
        let item_id = ''; // preinitilize the id
        try{
        item_id = $(messageData.content).attr("data-item-id"); // try to get the item id out of the message
        }catch(e){ 
        // If we couldn't get an item from the message, the message wasn't created via item.roll
        EffectTransfer.debug("Couldn't find the item")
        return;
        }
        EffectTransfer.debug(item_id)
        
        if(!item_id ||!actor) return;
        /*
        Is item_id defined, did we find an actor?
        We check for the current user because otherwise everyone, not just the one who rolled the thing would get a popup window. Not good
        */
        
        const item = actor.items.get(item_id);// get the item via id

        let validEffectsData
        let itemName
        EffectTransfer.debug(item,true)

        if (item){
            EffectTransfer.debug("Item defined getting stuff from item")
            const validEffects=item.effects.filter(EffectTransfer.isEligible("chat"))
            itemName=item.data.name
            if(validEffects.length>0){ // No neeed to continue if we have no useful effects
                validEffectsData=validEffects.map(e=>e.toObject())
            }else{
                return
            }
        }else{
            EffectTransfer.debug("Item undefined getting stuff from flags")
            const itemData=messageDocument.getFlag("dnd5e","itemData")
            itemName=itemData.name
            validEffectsData=itemData.effects.filter(this.isEligible("chat"))
        }

        await EffectTransfer.effectTransferDialogue(actor,tokenDoc,itemName,validEffectsData)
    }

    static async EffectTransferTrigger(item){
        EffectTransfer.debug(item)
        const actor=item.parent
        
        // ?? "use this value unless its null/undefined, then default to this value"
        // In the case of a linked token actor.token is null. For unlinked it's the relevant token -> actor.token for unlinked, first token on the canvas for linked
        const tokenDoc = actor?.token?.document ?? actor?.getActiveTokens({document:true})[0]?.document // even though I pass document:true it returns a token dunno why
        EffectTransfer.debug("TokenDoc gotten from item:")
        EffectTransfer.debug(tokenDoc)

        const validEffects=item.effects.filter(EffectTransfer.isEligible("button"))
        if (validEffects.length<1){
            ui.notifications.warn(`${game.i18n.localize("ET.Button.warn")}`)
            return
        }
        const validEffectsData=validEffects.map(e=>e.toObject())
        await EffectTransfer.effectTransferDialogue(actor,tokenDoc,item.data.name,validEffectsData) // Unsure whether I need to await this tbh
    }

    // Add the effect transfer button to the item sheet if the item has a non-transfer effect
    static async EffectTransferButton(app,array){
        // Only add a button if the item has eligible effects
        if (app.object.effects.filter(EffectTransfer.isEligible("button")).length>0){
            const transferButton={
                class:"EffectTransfer",
                icon:"fas fa-exchange-alt", //https://fontawesome.com/v5.15/icons
                label:MODULE.getSetting("hideButtonText")?"":`${game.i18n.localize("ET.Button.Label")}`,
                onclick: () => EffectTransfer.EffectTransferTrigger(app.object)
                }
            array.unshift(transferButton)
        }
    }

    static async EffectConfiguration(app,html,hookData){
        let tickBox=html.find('[name="transfer"]')
        const boxLine=tickBox.parents('div.form-group')[0]
        if (!boxLine) return
        const block={button:getProperty(hookData,"effect.flags.effective-transferral.transferBlock.button") ?? false,
            	    chat:getProperty(hookData,"effect.flags.effective-transferral.transferBlock.chat") ?? false,
                    chatBlockText:`${game.i18n.localize("ET.AE.config.buttonBlock")}`,
                    buttonBlockText:`${game.i18n.localize("ET.AE.config.chatBlock")}`
                }

        const div = document.createElement("div");
        div.innerHTML = await renderTemplate(`modules/effective-transferral/templates/EffectConfig.html`,block);
        boxLine.after(...div.children);
        html.css("height", "auto");
    }

    static register(){
        Hooks.on("createChatMessage",EffectTransfer.parseChatMessage)
        Hooks.on("getItemSheetHeaderButtons",EffectTransfer.EffectTransferButton)
        Hooks.on("renderActiveEffectConfig",EffectTransfer.EffectConfiguration)
    }
    
}