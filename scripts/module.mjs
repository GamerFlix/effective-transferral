
/**
 * Main Module Organizational Tools
 */
import { EffectTransfer } from "./modules/effect-transfer.mjs";

/**
 * Sub Modules
 */
//import { MyClass } from './modules/my-class.js'

/**
 * Sub Apps
 */
//import { MyDialog } from './apps/my-dialog.js';

const SUB_MODULES = {
  //MyLogger,
  //MyClass
  EffectTransfer
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

