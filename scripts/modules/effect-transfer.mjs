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

export class EffectTransfer{

    static NAME = "EffectTransfer";
    

    // Gets the value of the chat flag in transferBlock, returning false if undefined
    static getChatBlock(effect){
        const object=effect.getFlag("effective-transferral","transferBlock")
        return (object?.chat ? true:false);
    }

    // Updates the flag object to include chat:boolean
    static async setChatBlock(effect,boolean){

        if (effect.parent.parent){
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

        if (effect.parent.parent){
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
    static async debug(x,active){ 
        if (active){
            console.log(x)
        }
    }


    // pops up the dialogue and calls warpgate to apply effects
    static async effectTransferDialogue(actor,tokenDoc,item,validEffects){
        const bug= false //toggleable option to enable/disable debug()
        
        EffectTransfer.debug(item,bug)
        
        if (validEffects.length===0){//Check whether we actually have effects on the item
            return //If we don't have any there's nothing to do
        }
        EffectTransfer.debug(item.effects,bug)
        EffectTransfer.debug(validEffects,bug)
        
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
        EffectTransfer.debug(effect_target,bug)
        if (effect_target==="none"||!effect_target) return // If we selected to do nothing do nothing!
        
        // Reformat our active effects so we can pass them to warpgate later
        EffectTransfer.debug(validEffects,bug)
        
        /*Bring effects into usable form*/
        const aeData = validEffects.reduce( (acc, ae) => {
        acc[ae.data.label] = ae.toObject()
        return acc;
        }, {});
        EffectTransfer.debug("Prepared aeData",bug)
        /*Put effects into update object*/
        const updates={
        embedded: {ActiveEffect: aeData}
        }
        EffectTransfer.debug("Prepared updates",bug)
        
        EffectTransfer.debug("Going into the switch case",bug)
        switch (effect_target){
        case 'selfToken':
            EffectTransfer.debug("Going into selfToken",bug)
            EffectTransfer.debug(item,bug)
            EffectTransfer.debug(tokenDoc,bug)
            /*If the user selected self and we found a token we can just call warpgate.mutate on the token*/
            warpgate.mutate(tokenDoc,
            updates,
            {},
            {name:`${item.data.name}`,
            description: game.i18n.format("ET.Dialog.Mutate.Description",{userName:game.user.name,itemName:item.data.name,tokenName:tokenDoc.data.name}),
            //`${game.user.name} is applying effects from ${item.data.name} to ${token.data.name}`
            comparisonKeys: {ActiveEffect: 'label'}
            })

            break;
        case 'selfNoToken': 
            EffectTransfer.debug("Going into selfNoToken",bug)
            EffectTransfer.debug(tokenDoc,bug)
            /*If we didn't find any tokens just create the effects as usual and have the user deal with the extra inconvenience of reverting the change*/
            await actor.createEmbeddedDocuments("ActiveEffect",validEffects.map(i => i.data))
            break;
        case 'targets':// If we selected targets option we need to put the effects on targets
            EffectTransfer.debug(game.user.targets,bug) 
            /*Loop over each target and apply the effect via warpgate*/
            for (let target of game.user.targets){
                EffectTransfer.debug(game.user.name,bug)
                EffectTransfer.debug(item.data.name,bug)
                EffectTransfer.debug(target.document.data.name,bug)
                warpgate.mutate(target.document,
                updates,
                {},
                {name:`${item.data.name}`,
                description: game.i18n.format("ET.Dialog.Mutate.Description",{userName:game.user.name,itemName:item.data.name,tokenName:target.document.data.name}),
                comparisonKeys: {ActiveEffect: 'label'}
                })
            }
            // code
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
        const bug=false;
        
        const messageData=messageDocument.data //Get the relevant part from messageDocument
        const speaker = messageData.speaker; // Get the speaker of the message (ergo the actor this rolled from)
        
        /*Is there a speaker, is the speaker on the scene, does the speaker have a token*/
        if(!speaker || !speaker.scene /*|| !speaker.token*/)  return;
        /*Initialize actor and token*/
        let actor
        let tokenDoc
        
        if (speaker.token){ //If the speaker has a token use that (to support unlined actors)
            tokenDoc = await fromUuid(`Scene.${speaker.scene}.Token.${speaker.token}`);// Get the tokenDoc fromUuid
            EffectTransfer.debug(tokenDoc,bug)
            actor=tokenDoc.actor // Define the actor as the token.actor (again support for unlinked actors)
            EffectTransfer.debug("Effect buttons: TokenDoc Found",bug)
            EffectTransfer.debug(actor,bug)
        }else{ //If the speaker doesn't have a token, just get the actor
            actor=await fromUuid(`Actor.${speaker.actor}`)// Just get the actor fromUuid if we don't have a token
            EffectTransfer.debug("TokenDoc not found in Message",bug)
            EffectTransfer.debug(actor,bug)
            tokenDoc=actor.getActiveTokens({document:true})[0]?.document// get the tokenDoc from the actors active tokens. For some reason it returns the token despite being passed document
        }

        
        let item_id = ''; // preinitilize the id
        try{
        item_id = $(messageData.content).attr("data-item-id"); // try to get the item id out of the message
        }catch(e){ 
        // If we couldn't get an item from the message, the message wasn't created via item.roll
        EffectTransfer.debug("Couldn't find the item",bug)
        return;
        }
        EffectTransfer.debug(item_id,bug)
        //console.log(messageDocument.user)
        //console.log(game.user)
        
        if(!item_id ||!actor|| messageDocument.user.id!==game.user.id) return;
        /*
        Is item_id defined, did we find an actor, is the current user the actors first owner?
        We check for the current user because otherwise everyone, not just the one who rolled the thing would get a popup window. Not good
        */
        
        const item = actor.items.get(item_id);// get the item via id

        const validEffects=item.effects.filter(e=>e.data.transfer===false&& !EffectTransfer.getChatBlock(e))
        await EffectTransfer.effectTransferDialogue(actor,tokenDoc,item,validEffects) // Unsure whether I need to await this tbh
    }

    static async EffectTransferTrigger(item){
        const bug=false
        EffectTransfer.debug(item,bug)
        const actor=item.parent
        
        // ?? "use this value unless its null/undefined, then default to this value"
        // In the case of a linked token actor.token is null. For unlinked it's the relevant token -> actor.token for unlinked, first token on the canvas for linked
        const tokenDoc = actor?.token?.document ?? actor?.getActiveTokens({document:true})[0]?.document // even though I pass document:true it returns a token dunno why
        EffectTransfer.debug("TokenDoc gotten from item:",bug)
        EffectTransfer.debug(tokenDoc,bug)

        const validEffects=item.effects.filter(e=>e.data.transfer===false&& !EffectTransfer.getButtonBlock(e))
        await EffectTransfer.effectTransferDialogue(actor,tokenDoc,item,validEffects) // Unsure whether I need to await this tbh
    }

    // Add the effect transfer button to the item sheet if the item has a non-transfer effect
    static async EffectTransferButton(app,array){
        // Only add a button if the item has eligible effects
        if (app.object.effects.filter(e=>e.data.transfer===false&& !EffectTransfer.getButtonBlock(e)).length>0){
            const transferButton={
                class:"EffectTransfer",
                icon:"fas fa-exchange-alt", //https://fontawesome.com/v5.15/icons
                label:`${game.i18n.localize("ET.Button.Label")}`,
                onclick: () => EffectTransfer.EffectTransferTrigger(app.object)
                }
            array.unshift(transferButton)
        }
    }

    static register(){
        Hooks.on("createChatMessage",EffectTransfer.parseChatMessage)
        Hooks.on("getItemSheetHeaderButtons",EffectTransfer.EffectTransferButton)
    }


}