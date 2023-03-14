# Effective Transferral
Effective Transferral is a simple module for the [DnD5e Game system](https://gitlab.com/foundrynet/dnd5e) of Foundry VTT that allows you to apply effects on an item to your own token or to targeted tokens. Unlike [similar modules](https://github.com/ElfFriend-DnD/foundryvtt-item-effects-to-chat-5e) Effective Transferral supports players both targeting and applying the effects to tokens, even if they do not own them.
This module requires you to have the [Warp Gate](https://github.com/trioderegion/warpgate) module installed as the effect application is handled by [Warp Gate](https://github.com/trioderegion/warpgate).

For v9 the last known compatible version of warpgate is [1.13.6](https://github.com/trioderegion/warpgate/releases/tag/1.13.6).

For v10 the last known compatible version of warpgate is [1.16.2](https://github.com/trioderegion/warpgate/releases/tag/1.16.2).


https://user-images.githubusercontent.com/62909799/205397402-62fc17ca-98e7-4fe0-9151-8cf505bd6917.mp4



## Instructions
After installing the module and its dependency [Warp Gate](https://github.com/trioderegion/warpgate) you will receive a dialogue whenever you roll an item that has an active effect on it, provided that the effect has been set to not "Transfer Effect to Actor" (see the picture below). Should you want Effective Transferral to transfer effects for which this box is ticked, you can configure it to do so in the module settings, more on that later.

![New_Effect_settings](https://user-images.githubusercontent.com/62909799/225072405-35437d6a-49c6-49b8-bb27-9c851c646b0d.png)

You can also prevent an effect from being transferred by ticking the relevant boxes on the effect configuration page or ticking the relevant setting in the module settings. Refer to the [API documentation](https://github.com/GamerFlix/effective-transferral/wiki) for information on how to configure specific effects via macro.

The dialogue you receive upon rolling an item will let you choose whether you want to apply the effects to yourself, targeted tokens, both, or none of them. Should an item have multiple effects on it you can configure this on a per effect basis and simply hit "Apply" to apply the effects to the chosen targets. If you want to choose the targeted tokens option be aware that you will need to have targeted the relevant tokens before you click the "targets" button in the dialogue.

In version 1.3.9 of Effective Transferral the "Always Transfer" option shown at the bottom of the above configuration screen was added. When this option is ticked the associated effect will always be transferred to valid effect targets. If all effects on a used item are configured to always be transferred the dialogue will be skipped in its entirety. Note that in absence of a dialogue you will have to have targetted tokens you wish to transfer effects to before you use the item.

![grafik](https://user-images.githubusercontent.com/62909799/205398225-87600215-b9c8-4e53-9ce7-8b02c5a18ac3.png)

The dialogue can also be opened from the item sheet, provided the item has valid effects. In case of unowned items only the "Apply Targets" and "Cancel" buttons will be available. See above for how to configure your effects so they are eligible for transfer. Note that both the button and dialogue prompted by rolling will not appear should there be no eligible effects for the chosen method.

![Effect_Transfer_ItemSheet_Button](https://user-images.githubusercontent.com/62909799/151265785-8e8f1d6b-ba14-4590-8aa5-9928b2649862.jpg)

Another way to prompt the dialogue is a button added to the chat card of the item.

![Effect_Transfer_Button](https://user-images.githubusercontent.com/62909799/188307962-a07a7c56-31ff-4262-832e-832c3fe0bd25.png)

All of these transfer methods can be disabled in the settings shown below. 

![grafik](https://user-images.githubusercontent.com/62909799/205398410-bf58b362-a271-49bd-a34a-475e45b938f2.png)

Depending on their [Warp Gate](https://github.com/trioderegion/warpgate) settings the GM may get a popup asking them to confirm the effect application. GMs that trust their players can set this prompt to automatically confirm in their [Warp Gate](https://github.com/trioderegion/warpgate) module settings. As of [Warpgate version 1.5.0](https://github.com/trioderegion/warpgate/releases/tag/1.16.0) this setting can also be configured client side. Effective Transferral does not come with any setting for this itself, though addition of an option independent of Warp Gate’s settings [is planned to be implemented in the future](https://github.com/GamerFlix/effective-transferral/issues/44).

Since in most cases (see below for exceptions) the effect is applied using Warp Gate's mutate system the application can be easily reverted by clicking the revert button on the top of the sheet. Shift clicking will allow you to select which “mutation” to revert. Refer to [Warp Gate’s documentation](https://github.com/trioderegion/warpgate#mutation-commands) for further information on this feature.

![Effective_Transferral_Revert](https://user-images.githubusercontent.com/62909799/151084420-76fdfb47-385f-4755-9e2f-23ac9599d926.jpg)

In the case that an effect is being applied to an actor while that actor does not have any tokens on the current scene, the effect will be applied using Foundry’s core API. Effects applied in this way will have to be manually removed from the effects tab should one wish to remove them. The revert feature does not work for effects applied in this way as they are not handled by [Warp Gate](https://github.com/trioderegion/warpgate).

## Credits
A big thank you to honeybadger aka [trioderegion](https://github.com/trioderegion) for creating [Warp Gate](https://github.com/trioderegion/warpgate), talking me through the process of setting this repository and module up aswell as providing an easy to use [template](https://github.com/trioderegion/fvtt-dual-track-module). This would likely have never been published without his help

Furthermore a big thank you to Zhell aka [krbz999](https://github.com/krbz999) for making significant contributions to the code, which include the current form of the Effect Transfer dialog.
