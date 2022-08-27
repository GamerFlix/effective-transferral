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
    
    // Get the token document of a given actor
    static tokenDocFromActor(actor){
        // even though I pass document:true it returns a token dunno why
        return actor?.token?.document ?? actor?.getActiveTokens({document:true})[0]?.document 
    }

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
        if (!!old_object){
            let object_copy=duplicate(old_object)
            object_copy.chat=boolean
            effect.setFlag("effective-transferral","transferBlock",object_copy)
        }else{
            effect.setFlag("effective-transferral","transferBlock",{chat:boolean})
        }
    }

    // Gets the value of the button flag in transferBlock, returning false if undefined
    static getButtonBlock(effect){
        let object=effect.getFlag("effective-transferral","transferBlock")
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
    static async debug(){ 
        if (MODULE.getSetting("debugMode")){
            console.log(arguments)
        }
    }
    
    // Returns a relevant function used to filter the given effect based on the specified type
    static isEligible = (type) => {
        switch(type) {
          case 'button': return (effect) => 
          (effect.transfer===false||MODULE.getSetting("includeEquipTransfer")) &&
           (!EffectTransfer.getButtonBlock(effect)&&!MODULE.getSetting("neverButtonTransfer"));

          case 'chat':return (effect) => 
          (effect.transfer===false||MODULE.getSetting("includeEquipTransfer")) &&
           (!EffectTransfer.getChatBlock(effect)&&!MODULE.getSetting("neverChatTransfer"));

        default: return (_) => false;
        }
      }
    
    // Takes an array of ActiveEffectObjects and bundles it so it can be passed to applyPackagedEffects/warpgate.mutate()
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
            description: game.i18n.format("ET.Dialog.Mutate.Description",{userName:game.user.name,itemName:itemName,tokenName:tokenDoc.name}),
            comparisonKeys: {ActiveEffect: 'label'}
            })
    }
    
    // Delete mutations that no longer have the respective effect present
    static async cleanUp(deletedEffect,context,userId){
        if (game.user.id!==userId) return
        EffectTransfer.debug("effect",deletedEffect)
        const tokenActor=deletedEffect?.parent
        // Verify it's actually an actor otherwise return
        if (!(tokenActor instanceof Actor)) return
        EffectTransfer.debug(tokenActor)
        if(!tokenActor) return
        let tokenDoc=EffectTransfer.tokenDocFromActor(tokenActor)

        EffectTransfer.debug("Effect deletion happened on",tokenDoc)
        
        let stack=warpgate.mutationStack(tokenDoc)
        EffectTransfer.debug("Mutationstack",stack)
        
        stack.deleteAll( (stack)=>{
            // bail if the stack isn't from ET
            if(!stack.name.includes("Effective Transferral: ")) return false
            
            // Bail if stack has no effects in it
            let stackEffectNames=Object.keys(stack.delta?.embedded?.ActiveEffect)
            if(!stackEffectNames) return false
            // Get the effect labels that are still on the token
            let presentEffectLabels=tokenDoc.actor.effects.map(i=>i.label)
            
            EffectTransfer.debug(presentEffectLabels)
            for (let stackEffectName of stackEffectNames){
                // Check if label is inside effects on actor if yes bail
                let value=presentEffectLabels.includes(stackEffectName)
                if (value) return false
            }
            
            // If none of the effects inside the mutationstack are still present delete the stack
            return true
            }
            )
        await stack.commit()
        
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
                EffectTransfer.debug(target.document.name)
                EffectTransfer.applyPackagedEffects(target.document,updates,itemName)
            }
            break;
        default:
            ui.Notifications.error(`${game.i18n.localize("ET.Dialog.switch.error")}`)
            return
            break;
        
        }
    }

    // gets the actor, item and token from the item roll, and passes it to EffectTransferDialogue
    static async parseItemRoll(item,context,options){
        let actor=item?.parent
        if (!actor) return // if the item isn't embedded it's not useful for us
        let tokenDoc=EffectTransfer.tokenDocFromActor(actor)
        let itemName=item?.name??"Unknown item"
        EffectTransfer.debug("Function used to filter:",EffectTransfer.isEligible("chat"))
        const validEffects=item.effects.filter(EffectTransfer.isEligible("chat"))
        EffectTransfer.debug("Filtered effects:",validEffects)
        itemName=item.name
        if (validEffects.length===0) return // If we have nothing to transfer just exit
        EffectTransfer.debug("Effectarray has a length greater than 0", validEffects)
        const validEffectsData=validEffects.map(e=>e.toObject())
        await EffectTransfer.effectTransferDialogue(actor,tokenDoc,itemName,validEffectsData)
    }


    static async EffectTransferTrigger(item){
        EffectTransfer.debug(item)
        const actor=item.parent
        const tokenDoc = EffectTransfer.tokenDocFromActor(actor)
        const validEffects=item.effects.filter(EffectTransfer.isEligible("button"))
        if (validEffects.length===0){
            ui.notifications.warn(`${game.i18n.localize("ET.Button.warn")}`)
            return
        }
        const validEffectsData=validEffects.map(e=>e.toObject())
        await EffectTransfer.effectTransferDialogue(actor,tokenDoc,item.name,validEffectsData)
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
        Hooks.on("dnd5e.useItem",EffectTransfer.parseItemRoll)
        Hooks.on("getItemSheetHeaderButtons",EffectTransfer.EffectTransferButton)
        Hooks.on("renderActiveEffectConfig",EffectTransfer.EffectConfiguration)
        Hooks.on("deleteActiveEffect",EffectTransfer.cleanUp)
    }
    
}