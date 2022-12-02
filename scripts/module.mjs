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

/**
 * Main Module Organizational Tools
 */
import { EffectTransfer } from "./modules/effect-transfer.mjs";
import { api } from "./modules/api.mjs";
import { Settings } from "./modules/settings.mjs";
/**
 * Sub Modules
 */
//import { MyClass } from './modules/my-class.js'

/**
 * Sub Apps
 */
//import { MyDialog } from './apps/my-dialog.js';

const SUB_MODULES = {
  EffectTransfer,
  api,
  Settings
};

const SUB_APPS = {
  //MyDialog  
}

/*
  Initialize Module
*/

export class MODULE {

  static build() {
    //all startup tasks needed before sub module initialization

  }
  
  static getSetting(key){
    return game.settings.get("effective-transferral", key)
  }
  static depreceationWarning(text){
    console.warn("Effective Transferral:"+text)
  }

  static debug() {
    if (MODULE.getSetting("debugMode")) {
        console.log(arguments);
    }
}
}

MODULE.build();

/*
  Initialize all Sub Modules
*/
Hooks.on(`setup`, () => {

  Object.values(SUB_MODULES).forEach(cl => cl.register());

  //GlobalTesting (adds all imports to global scope)
  //Object.entries(SUB_MODULES).forEach(([key, cl])=> window[key] = cl);
  //Object.entries(SUB_APPS).forEach(([key, cl])=> window[key] = cl);
});



/*****Example Sub-Module Class******

export class MyClass {

  static register() {
    //all initialization tasks
  }
}

*/

