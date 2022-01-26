# Effective Transferral
Effective Transferral is a simple module for the [DnD5e Game system](https://gitlab.com/foundrynet/dnd5e) of Foundry VTT that allows you to apply effects on an item to your own token or to targeted tokens. Unlike [similar modules](https://github.com/ElfFriend-DnD/foundryvtt-item-effects-to-chat-5e) Effective Transferral supports players both targeting and applying the effects to tokens, even if they do not own them.
This module requires you to have the [Warp Gate](https://github.com/trioderegion/warpgate) installed as the effect application is handled by [Warp Gate](https://github.com/trioderegion/warpgate).

Last known working version of Warp Gate is [1.13.5](https://github.com/trioderegion/warpgate/releases/tag/1.13.5)

https://user-images.githubusercontent.com/62909799/151082783-45ea888f-05c6-4ca8-9e9c-664755281e74.mp4

## Instructions
After installing the module and its dependency [Warp Gate](https://github.com/trioderegion/warpgate) you will receive a dialogue whenever you roll an item that has an active effect on it that has been set to "not transfer on item equip" (see the picture below).

PICTURE OF EFFECT SETUP WILL BE ADDED HERE

The dialogue will let you choose whether you want to apply the effects to yourself, targeted tokens, or none of them. If you want to choose the targeted tokens option be aware that you will need to have targeted the relevant tokens before you click the "targets" button in the dialogue.

DIALOGUE PICTURE WILL BE ADDED HERE

Depending on their [Warp Gate](https://github.com/trioderegion/warpgate) settings the GM may get a popup asking them to confirm the application. GMs that trust their players can set this prompt to automatically confirm in their [Warp Gate](https://github.com/trioderegion/warpgate) module settings. Effective Transferral does not come with any settings itself, though addition of an option for this independent of Warp Gate’s settings might be explored in the future.
POPUP AND SETTING PICTURE HERE
Since (in most cases see below for exceptions) the effect is applied using Warp Gate's mutate system the application can be easily reverted by clicking the revert button on the top of the sheet. Shift clicking will allow you to select which “mutation” to revert. Refer to [Warp Gate’s documentation](https://github.com/trioderegion/warpgate#mutation-commands) for further information on this feature.

PICTURE OF THE REVERT BUTTON WILL BE ADDED HERE HERE

In the case that an effect is being applied to an actor while that actor does not have any tokens on the current scene, the effect will be applied using Foundry’s core API. Effects applied in this way will have to be manually removed from the effects tab should one wish to remove them. The revert feature does not work for effects applied in this way as they are not handled by [Warp Gate’s documentation](https://github.com/trioderegion/warpgate#mutation-commands).
