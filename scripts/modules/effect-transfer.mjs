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
import { EffectTransferApp } from './transfer-app.mjs';

export class EffectTransfer {

    static NAME = "EffectTransfer";

  /**
   * Get a token document from an actor.
   * @param {Actor} actor         An actor.
   * @returns {TokenDocument}     The actor's token document, if any.
   */
  static tokenDocFromActor(actor) {
    return actor?.token ?? actor?.getActiveTokens(false, true)[0];
  }

    //Block transfer via a given method
    static async setBlock(effect, boolean, type) {
        if (effect?.parent?.parent) {
          return ui.notifications.error("ET.doubleEmbedded.error", {localize: true});
        }
        return effect.setFlag(MODULE.id, `transferBlock.${type}`, boolean);
    }

    //Check whether transfer via a given method is possible
    static getBlock(effect, type) {
        return !!foundry.utils.getProperty(effect, `flags.${MODULE.id}.transferBlock.${type}`)
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

        // Check whether we need to match effects by name or by something else
        let matchName=!MODULE.getSetting("applyIdenticalEffects")

        stack.deleteAll((stack) => {
            // bail if the stack is not from ET
            if (!stack.name.includes("Effective Transferral: ")) return false;

            // Bail if stack has no effects in it
            const stackEffectIdentifiers = Object.keys(stack.delta?.embedded?.ActiveEffect);
            if (!stackEffectIdentifiers) return false;

            let presentEffectIdentifiers=[]

            // Get the thing we need to match by
            if (matchName){
                presentEffectIdentifiers=tokenDoc.actor.effects.map(i => i.name);
            }else{
                presentEffectIdentifiers=tokenDoc.actor.effects.map(i => i.flags[MODULE.id]?.mutationKey);
            }
            EffectTransfer.debug(presentEffectIdentifiers);

            // Check each identifier

            for (let stackEffectIdentifier of stackEffectIdentifiers) {
                // Do nothing if we got a mixed identifier situation
                if (stackEffectIdentifier===undefined) continue
                // Check if identifier is inside effects on actor if yes bail
                let value = presentEffectIdentifiers.includes(stackEffectIdentifier);
                if (value) return false;
            }

            // If none of the effects inside the mutationstack are still present delete the stack
            return true;
        });
        return stack.commit();
    }

    // pops up the dialogue and calls warpgate to apply effects
    static async effectTransferDialogue(actor, tokenDoc, validEffectsData, castLevel, itemUuid) {
      // Check whether we actually have effects on the item
      if (!validEffectsData.length) return;

      const castData = {origin: itemUuid, castLevel: castLevel};
      validEffectsData.forEach(i => foundry.utils.setProperty(i.flags, `${MODULE.id}.castData`, castData));
      const item = fromUuidSync(itemUuid);
      const options = {actor, tokenDoc, validEffectsData};
      const allAlways = validEffectsData.every(data => data.flags[MODULE.id].transferrable?.always === true);
      const app = new EffectTransferApp(item, options);
      if(allAlways) return app.immediateTransfer(validEffectsData);
      return app.render(true);
    }

    // gets the actor, item, and token from the item roll, and passes it to EffectTransferDialogue
    static async parseItemRoll(item, context, options) {
      if(options.ignoreET === true) return;
        const actor = item.actor;
        // if the item is not embedded it is not useful for us
        if (!actor) return;

        const tokenDoc = EffectTransfer.tokenDocFromActor(actor);
        EffectTransfer.debug("Function used to filter:", EffectTransfer.isEligible("chat"));
        const validEffects = item.effects.filter(EffectTransfer.isEligible("chat"));
        EffectTransfer.debug("Filtered effects:", validEffects);

        // If we have nothing to transfer just exit
        if (!validEffects.length) return;

        EffectTransfer.debug("Effectarray has a length greater than 0", validEffects);
        const validEffectsData = validEffects.map(e => e.toObject());
        return EffectTransfer.effectTransferDialogue(actor, tokenDoc, validEffectsData, item.system.level, item.uuid);
    }

    static async EffectTransferTrigger(item, type = "button", castLevel = undefined) {
        EffectTransfer.debug(item);
        if (!castLevel) castLevel = item.system.level;
        const tokenDoc = EffectTransfer.tokenDocFromActor(item.actor);
        const validEffects = item.effects.filter(EffectTransfer.isEligible(type));
        if (!validEffects.length) {
            return ui.notifications.warn("ET.Button.warn", {localize: true});
        }
        const validEffectsData = validEffects.map(e => e.toObject());
        return EffectTransfer.effectTransferDialogue(item.actor, tokenDoc, validEffectsData, castLevel, item.uuid);
    }

    // Add the effect transfer button to the item sheet if the item has a non-transfer effect
    static async EffectTransferButton(app, array) {
        // Only add a button if the item has eligible effects
        if (app.document.effects.some(EffectTransfer.isEligible("button"))) {
            const transferButton = {
                class: "EffectTransfer",
                icon: "fas fa-exchange-alt", //https://fontawesome.com/v5.15/icons
                label: MODULE.getSetting("hideButtonText") ? "" : game.i18n.localize("ET.Button.Label"),
                onclick: () => EffectTransfer.EffectTransferTrigger(app.document)
            }
            array.unshift(transferButton);
        }
    }

    static async EffectConfiguration(app, html, hookData) {
        let tickBox = html[0].querySelector('[name="transfer"]');
        const boxLine = tickBox?.closest('div.form-group');
        if (!boxLine) return;

        const data = hookData.document.flags[MODULE.id] ?? {};
        const blockers = data.transferBlock ?? {};
        const trans = data.transferrable ?? {self: true, target: true};

        const div = document.createElement("div");
        div.innerHTML = await renderTemplate(`modules/${MODULE.id}/templates/EffectConfig.hbs`, {
          ...blockers,
          ...trans,
          module: MODULE.id
        });
        boxLine.after(div.firstElementChild);
        app.setPosition({ height: "auto" });
    }

    static createChatLogButtons = (item, messageData, options) => {
        // if disabled, don't create button.
        if (!!MODULE.getSetting("neverDisplayCardTransfer")) return;

        // if no valid effects, don't create button.
        const validEffects = item.effects.some(EffectTransfer.isEligible("displayCard"));
        if (!validEffects) return;

        // create button.
        const template = document.createElement("DIV");
        template.innerHTML = messageData.content;
        const buttonDiv = template.querySelector("div.card-buttons");
        const transferButton = document.createElement("BUTTON");
        transferButton.setAttribute("data-uuid", item.uuid);
        transferButton.setAttribute("data-actor-uuid", item.parent.uuid);
        transferButton.setAttribute("data-action", "transfer-effects");
        transferButton.setAttribute("data-cast-level", item.system?.level);

        transferButton.innerText = game.i18n.localize("ET.Button.Label");
        buttonDiv.appendChild(transferButton);
        messageData.content = template.innerHTML;
    }

    static setupChatListeners = (message, html) => {
        html[0].querySelectorAll("[data-action='transfer-effects']").forEach(n => {
            n.addEventListener("click", EffectTransfer.triggerTransferFromChatLog);
        });
    }

    /**
     * Handle clicking a transfer button on a chat message.
     * @param {PointerEvent} event      The initiating click event.
     */
    static async triggerTransferFromChatLog(event) {
        const button = event.currentTarget;
        const data = button.dataset;
        EffectTransfer.debug("This is the button dataset:", data);
        button.disabled = false;
        const castLevel = Number.isNumeric(data.castLevel) ? Number(data.castLevel) : data.castLevel;
        EffectTransfer.debug("itemUuid:", data.uuid, "castLevel:", castLevel);
        const item = fromUuidSync(data.uuid);
        if (!item) {
            const messageId = button.closest("[data-message-id]").dataset.messageId;
            const itemData = game.messages.get(messageId).flags.dnd5e.itemData;

            // filter effects and bail if there's nothing to do
            const validEffectsData = itemData.effects.filter(EffectTransfer.isEligible("displayCard"));
            EffectTransfer.debug("Data of valid effects from chat button", validEffectsData);
            if (!validEffectsData.length) return ui.notifications.warn("ET.Button.warn", {localize: true});

            const itemHolder = fromUuidSync(data.actorUuid);

            // Initiliaze variables
            let actor;
            let tokenDoc;
            if (itemHolder instanceof Actor) {
                actor = itemHolder;
                tokenDoc = EffectTransfer.tokenDocFromActor(itemHolder);
            } else if (itemHolder instanceof TokenDocument) {
                tokenDoc = itemHolder;
                actor = itemHolder.actor;
            }

            return EffectTransfer.effectTransferDialogue(actor, tokenDoc, validEffectsData, castLevel, data.uuid);
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
        Hooks.on("renderChatMessage", EffectTransfer.setupChatListeners);
    }
}
