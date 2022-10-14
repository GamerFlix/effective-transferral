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

export class EffectTransfer {

    static NAME = "EffectTransfer";

    // Get the token document of a given actor
    static tokenDocFromActor(actor) {
        return actor?.token?.document ?? actor?.getActiveTokens(false, true)[0];
        // getActiveTokens(linked=false,document=false)
    }

    //Block transfer via a given method
    static async setBlock(effect, boolean, type) {
        if (effect?.parent?.parent) {
            ui.notifications.error(game.i18n.localize("ET.doubleEmbedded.error"));
            return undefined;
        }
        return effect.setFlag("effective-transferral", `transferBlock.${type}`, boolean)
    }

    //Check whether transfer via a given method is possible
    static getBlock(effect, type) {
        return !!foundry.utils.getProperty(effect, `flags.effective-transferral.transferBlock.${type}`)
    }

    // gets the value of the displayCard flag in transferBlock, returning false if undefined.
    static getDisplayCardBlock(effect) {
        return EffectTransfer.getBlock(effect, "displayCard");
    }

    // updates the flag object to include displayCard:boolean
    static async setDisplayCardBlock(effect, boolean) {
        return EffectTransfer.setBlock(effect, boolean, "displayCard")
    }

    // Gets the value of the chat flag in transferBlock, returning false if undefined
    static getChatBlock(effect) {
        return EffectTransfer.getBlock(effect, "chat");
    }

    // Updates the flag object to include chat:boolean
    static async setChatBlock(effect, boolean) {
        return EffectTransfer.setBlock(effect, boolean, "chat")
    }

    // Gets the value of the button flag in transferBlock, returning false if undefined
    static getButtonBlock(effect) {
        return EffectTransfer.getBlock(effect, "button");
    }

    // Updates the flag object to include button:boolean
    static async setButtonBlock(effect, boolean) {
        return EffectTransfer.setBlock(effect, boolean, "button")
    }



    // Toggleable console.log()
    static async debug() {
        if (MODULE.getSetting("debugMode")) {
            console.log(arguments);
        }
    }

    // Returns a relevant function used to filter the given effect based on the specified type
    static isEligible = (type) => {
        switch (type) {
            case 'button': return (effect) =>
                (effect.transfer === false || MODULE.getSetting("includeEquipTransfer")) &&
                (!EffectTransfer.getBlock(effect, "button") && !MODULE.getSetting("neverButtonTransfer"));
            case 'chat': return (effect) =>
                (effect.transfer === false || MODULE.getSetting("includeEquipTransfer")) &&
                (!EffectTransfer.getBlock(effect, "chat") && !MODULE.getSetting("neverChatTransfer"));
            case 'displayCard': return (effect) =>
                (effect.transfer === false || MODULE.getSetting("includeEquipTransfer")) &&
                (!EffectTransfer.getBlock(effect, "displayCard") && !MODULE.getSetting("neverDisplayCardTransfer"));
            default: return (_) => false;
        }
    }

    // Takes an array of ActiveEffectObjects and bundles it so it can be passed to applyPackagedEffects / warpgate.mutate()
    static packageEffects(validEffectsData) {
        const aeData = validEffectsData.reduce((acc, ae) => {
            acc[ae.label] = ae;
            return acc;
        }, {});

        EffectTransfer.debug("Prepared aeData");

        /* Put effects into update object */
        return { embedded: { ActiveEffect: aeData } };
    }

    //Takes a token doc, effects prepackaged by packageEffects and optionally an item name to apply effects
    static async applyPackagedEffects(tokenDoc, packagedEffects, itemName = game.i18n.format("ET.applyEffect.defaultName")) {
        const comparisonKey = MODULE.getSetting("applyIdenticalEffects") ? "id" : 'label'
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

    // Delete mutations that no longer have the respective effect present
    static async cleanUp(deletedEffect, context, userId) {
        if (game.user.id !== userId) return;

        EffectTransfer.debug("effect", deletedEffect);
        const tokenActor = deletedEffect?.parent;

        // Verify it's actually an actor otherwise return
        if (!(tokenActor instanceof Actor)) return;

        EffectTransfer.debug(tokenActor);
        if (!tokenActor) return;

        let tokenDoc = EffectTransfer.tokenDocFromActor(tokenActor);
        if (!tokenDoc) return
        EffectTransfer.debug("Effect deletion happened on", tokenDoc);

        let stack = warpgate.mutationStack(tokenDoc);
        EffectTransfer.debug("Mutationstack", stack);

        stack.deleteAll((stack) => {
            // bail if the stack is not from ET
            if (!stack.name.includes("Effective Transferral: ")) return false;

            // Bail if stack has no effects in it
            let stackEffectNames = Object.keys(stack.delta?.embedded?.ActiveEffect);
            if (!stackEffectNames) return false;

            // Get the effect labels that are still on the token
            let presentEffectLabels = tokenDoc.actor.effects.map(i => i.label);

            EffectTransfer.debug(presentEffectLabels);

            for (let stackEffectName of stackEffectNames) {
                // Check if label is inside effects on actor if yes bail
                let value = presentEffectLabels.includes(stackEffectName);
                if (value) return false;
            }

            // If none of the effects inside the mutationstack are still present delete the stack
            return true;
        });
        await stack.commit();
    }

    // pops up the dialogue and calls warpgate to apply effects
    static async effectTransferDialogue(actor, tokenDoc, itemName, validEffectsData, castLevel, itemUuid) {
        //Check whether we actually have effects on the item
        if (validEffectsData.length === 0) {
            return; //If we do not have any, there is nothing to do
        }
        let castData = {
            origin: itemUuid,
            castLevel: castLevel
        }
        validEffectsData = validEffectsData.map(i => {
            foundry.utils.setProperty(i.flags, "effective-transferral.castData", castData)
            return i
        })

        EffectTransfer.debug("Effectdata prior to packaging", validEffectsData)
        // If we do not have any non-transfer effects there is nothing to do so exit
        let effect_target // initialiaze the variable again because scoping

        /* If we have a token we are on a scene that uses tokens so we have stuff to target.
        Reflect that in the dialogue by giving the option to apply to targets */
        if (tokenDoc && actor) {
            effect_target = await warpgate.menu({
                inputs: [{
                    label: `<center>
                    <p style="font-size:15px;"> 
                        ${game.i18n.localize("ET.Dialog.Instructions.Token")}
                    </p>  
                    </center>`,
                    type: 'info'
                }],
                buttons: [{
                    label: game.i18n.localize("ET.Dialog.Button.Self"),
                    value: "selfToken"
                }, {
                    label: game.i18n.localize("ET.Dialog.Button.Targets"),
                    value: "targets"
                }, {
                    label: game.i18n.localize("ET.Dialog.Button.None"),
                    value: "none"
                }]
            }, {
                title: game.i18n.localize("ET.Dialog.Title"),
            });
        }
        /* if we do not have a token, we are either not on a scene or not on a scene
        that uses tokens (Theatre of the Mind) so there would not be anything to target anyhow */
        else if (actor) {
            effect_target = await warpgate.menu({
                inputs: [{
                    label: `<center>
                    <p style="font-size:15px;">  
                        ${game.i18n.localize("ET.Dialog.Instructions.Notoken")}
                    </p>
                    </center>`,
                    type: 'info'
                }],
                buttons: [{
                    label: game.i18n.localize("ET.Dialog.Button.Self"),
                    value: "selfNoToken"
                }, {
                    label: game.i18n.localize("ET.Dialog.Button.None"),
                    value: "none"
                }]
            }, {
                title: game.i18n.localize("ET.Dialog.Title"),
            });
        }
        // If we have neither token nor actor we are on an unowned item
        else {
            effect_target = await warpgate.menu({
                inputs: [{
                    label: `<center>
                    <p style="font-size:15px;">
                        ${game.i18n.localize("ET.Dialog.Instructions.Token")}
                    </p>
                    </center>`,
                    type: 'info'
                }],
                buttons: [{
                    label: game.i18n.localize("ET.Dialog.Button.Targets"),
                    value: "targets"
                }, {
                    label: game.i18n.localize("ET.Dialog.Button.None"),
                    value: "none"
                }]
            }, {
                title: game.i18n.localize("ET.Dialog.Title"),
            });
        }

        // Get the relevant part from the dialogue return value
        effect_target = effect_target["buttons"];
        EffectTransfer.debug(effect_target);

        // If we selected to do nothing do nothing!
        if (effect_target === "none" || !effect_target) return;

        // Reformat our active effects so we can pass them to warpgate later:

        /* Bring effects into usable form */
        const updates = EffectTransfer.packageEffects(validEffectsData);
        EffectTransfer.debug("Prepared updates");
        EffectTransfer.debug("Going into the switch case");

        switch (effect_target) {
            case 'selfToken':
                EffectTransfer.debug("Going into selfToken");
                EffectTransfer.debug(tokenDoc);
                /* If the user selected self and we found a token,
                we can just call warpgate.mutate on the token */
                EffectTransfer.applyPackagedEffects(tokenDoc, updates, itemName);
                break;
            case 'selfNoToken':
                EffectTransfer.debug("Going into selfNoToken");
                EffectTransfer.debug(tokenDoc);
                /* If we did not find any tokens just create the effects as usual
                and have the user deal with the extra inconvenience of reverting the change */
                await actor.createEmbeddedDocuments("ActiveEffect", validEffectsData);
                break;
            case 'targets':
                // If we selected targets option we need to put the effects on targets
                EffectTransfer.debug(game.user.targets);
                /* Loop over each target and apply the effect via warpgate */
                for (let target of game.user.targets) {
                    EffectTransfer.debug(game.user.name);
                    EffectTransfer.debug(target.document.name);
                    EffectTransfer.applyPackagedEffects(target.document, updates, itemName);
                }
                break;
            default:
                ui.Notifications.error(`${game.i18n.localize("ET.Dialog.switch.error")}`);
                return;
        }
    }

    // gets the actor, item, and token from the item roll, and passes it to EffectTransferDialogue
    static async parseItemRoll(item, context, options) {
        let actor = item?.parent;
        // if the item is not embedded it is not useful for us
        if (!actor) return;

        let tokenDoc = EffectTransfer.tokenDocFromActor(actor);
        let itemName = item?.name ?? "Unknown item";
        EffectTransfer.debug("Function used to filter:", EffectTransfer.isEligible("chat"));
        const validEffects = item.effects.filter(EffectTransfer.isEligible("chat"));
        EffectTransfer.debug("Filtered effects:", validEffects);

        // If we have nothing to transfer just exit
        if (validEffects.length === 0) return;

        EffectTransfer.debug("Effectarray has a length greater than 0", validEffects);
        const validEffectsData = validEffects.map(e => e.toObject());
        return EffectTransfer.effectTransferDialogue(actor, tokenDoc, itemName, validEffectsData, item?.system?.level, item?.uuid);
    }

    static async EffectTransferTrigger(item, type = "button", castLevel = undefined) {
        EffectTransfer.debug(item);
        if (!castLevel) castLevel = item.system.level
        const actor = item.parent;
        const tokenDoc = EffectTransfer.tokenDocFromActor(actor);
        const validEffects = item.effects.filter(EffectTransfer.isEligible(type));
        if (validEffects.length === 0) {
            ui.notifications.warn(game.i18n.localize("ET.Button.warn"));
            return;
        }
        const validEffectsData = validEffects.map(e => e.toObject());
        return EffectTransfer.effectTransferDialogue(actor, tokenDoc, item.name, validEffectsData, castLevel, item.uuid);
    }

    // Add the effect transfer button to the item sheet if the item has a non-transfer effect
    static async EffectTransferButton(app, array) {
        // Only add a button if the item has eligible effects
        if (app.object.effects.filter(EffectTransfer.isEligible("button")).length > 0) {
            const transferButton = {
                class: "EffectTransfer",
                icon: "fas fa-exchange-alt", //https://fontawesome.com/v5.15/icons
                label: MODULE.getSetting("hideButtonText") ? "" : game.i18n.localize("ET.Button.Label"),
                onclick: () => EffectTransfer.EffectTransferTrigger(app.object)
            }
            array.unshift(transferButton);
        }
    }

    static async EffectConfiguration(app, html, hookData) {
        let tickBox = html[0].querySelector('[name="transfer"]');
        const boxLine = tickBox?.closest('div.form-group');
        if (!boxLine) return;

        const block = {
            button: foundry.utils.getProperty(hookData, "effect.flags.effective-transferral.transferBlock.button") ?? false,
            chat: foundry.utils.getProperty(hookData, "effect.flags.effective-transferral.transferBlock.chat") ?? false,
            displayCard: foundry.utils.getProperty(hookData, "effect.flags.effective-transferral.transferBlock.displayCard") ?? false,
            chatBlockText: game.i18n.localize("ET.AE.config.buttonBlock"),
            buttonBlockText: game.i18n.localize("ET.AE.config.chatBlock"),
            displayCardBlockText: game.i18n.localize("ET.AE.config.displayCardBlock")
        }

        const div = document.createElement("div");
        div.innerHTML = await renderTemplate(`modules/effective-transferral/templates/EffectConfig.html`, block);
        boxLine.after(...div.children);
        app.setPosition({ height: "auto" });
    }

    static createChatLogButtons = (item, messageData, options) => {
        // if disabled, don't create button.
        if (!!MODULE.getSetting("neverDisplayCardTransfer")) return;

        // if no valid effects, don't create button.
        const validEffects = item.effects.filter(EffectTransfer.isEligible("displayCard"));
        if (!validEffects.length) return;

        // create button.
        const template = document.createElement("DIV");
        template.innerHTML = messageData.content;
        const buttonDiv = template.querySelector("div.card-buttons");
        const transferButton = document.createElement("BUTTON");
        transferButton.setAttribute("data-uuid", item.uuid);
        transferButton.setAttribute("data-actor-uuid", item.parent.uuid);
        transferButton.setAttribute("data-action", "transfer-effects");
        transferButton.setAttribute("data-cast-level", item.system?.level)

        transferButton.name = "ET-TRANSFER-BUTTON";
        transferButton.innerText = "Transfer Effects";
        buttonDiv.appendChild(transferButton);
        messageData.content = template.innerHTML;
    }

    static setupChatListeners = (_, html) => {
        html[0].addEventListener("click", (event) => {
            return EffectTransfer.triggerTransferFromChatLog(event);
        });
    }

    static triggerTransferFromChatLog = async (event) => {
        let button = event.target?.closest("button[name='ET-TRANSFER-BUTTON']");
        if (!button) return;
        EffectTransfer.debug("This is the button dataset:", button.dataset)
        button.disabled = false;
        let itemUuid = button.dataset.uuid
        let castLevel = button.dataset.castLevel
        if (typeof castLevel === "string") castLevel = Number(castLevel)
        EffectTransfer.debug("itemUuid:", itemUuid, "castLevel:", castLevel)
        let item = fromUuidSync(itemUuid);
        if (!item) {
            const messageId = button.closest("li.chat-message")?.dataset.messageId;
            const message = game.messages.get(messageId);
            const itemData = message.getFlag("dnd5e", "itemData");

            // filter effects and bail if there's nothing to do
            let validEffectsData = itemData.effects.filter(EffectTransfer.isEligible("displayCard"))
            EffectTransfer.debug("Data of valid effects from chat button", validEffectsData)
            if (validEffectsData.length === 0) return ui.notifications.warn(game.i18n.localize("ET.Button.warn"))

            let itemHolder = fromUuidSync(button.dataset.actorUuid)

            // Initiliaze variables
            let actor
            let tokenDoc
            if (itemHolder instanceof Actor) {
                actor = itemHolder
                tokenDoc = EffectTransfer.tokenDocFromActor(itemHolder)
            } else if (itemHolder instanceof TokenDocument) {
                tokenDoc = itemHolder;
                actor = itemHolder.actor
            }

            return EffectTransfer.effectTransferDialogue(actor, tokenDoc, itemData.name, validEffectsData, castLevel, itemUuid)
        } else {
            return EffectTransfer.EffectTransferTrigger(item, "displayCard", castLevel);
        }
    }

    static register() {
        Hooks.on("dnd5e.useItem", EffectTransfer.parseItemRoll);
        Hooks.on("getItemSheetHeaderButtons", EffectTransfer.EffectTransferButton);
        Hooks.on("renderActiveEffectConfig", EffectTransfer.EffectConfiguration);
        Hooks.on("deleteActiveEffect", EffectTransfer.cleanUp);
        Hooks.on("dnd5e.preDisplayCard", EffectTransfer.createChatLogButtons);
        Hooks.on("renderChatLog", EffectTransfer.setupChatListeners);
        Hooks.on("renderChatPopout", EffectTransfer.setupChatListeners);
    }
}
