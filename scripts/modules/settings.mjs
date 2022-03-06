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

export class Settings {
    static register(){
        this.settingsDefinition();


    }


    /*
    Settings to implement:

    
    Toggle debug mode on/off inside the settings
    always Buttonblock
    always chatblock
    */
    static settingsDefinition(){
        const config = true;
        
        const settingsData={
            includeEquipTransfer:{scope:"world", config, default: false, type: Boolean
            },neverButtonTransfer:{scope:"world", config, default: false, type: Boolean
            },neverChatTransfer:{scope:"world", config, default: false, type: Boolean
            },debugMode:{scope:"world", config, default: false, type: Boolean
            }
        }


        Settings.applySettings(settingsData)
    }


    static applySettings(settingsData) {
        Object.entries(settingsData).forEach(([key, data]) => {
          game.settings.register(
            "effective-transferral", key, {
              name: game.i18n.localize(`setting.${key}.name`),
              hint: game.i18n.localize(`setting.${key}.hint`),
              ...data
            }
          );
        });
      }

    

}

