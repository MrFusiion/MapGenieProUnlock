# MapGenieProUnlock
Chrome extension that unlocks [Map Genie](https://mapgenie.io/) PRO features for free.<br>
The extension is only tested on the [DL2 villedor Map](https://mapgenie.io/dying-light-2/maps/villedor) and [Elden Ring Map](https://mapgenie.io/elden-ring)
and works fine so far. But I'm pretty sure it will work on other maps too.<br>
The extenions should work on both the maps and the guides(tools).<br>
<br>
*NOTE: this is my first chrome extension I made, so don't mind some minor mistakes*

## Maybe Future
Instead of an extension, use the node.js electron package to open mapgenie maps.<br>
And change scripts before loading into weppage, this makes it possible to save data to disk.
Saving data to disk is better than the browser's local storage because it can be accidentally deleted.

I also want to experiment with cloud storage to store data so that it can be accessed on different devices.

## How does it work
   Its basicly like a parasite takes control of the application and tells it what to do with the given data.
   It blocks a couple of API calls for saving the locations and categories.<br>
   And instead saves it in your local browser storage.<br>
   This enables the ability for tracking more then 100 locations and 2 categories.
   
 <h3>:warning:
 <span>beware this extension blocks saving to their servers and instead saves it locally on the browser this means your data will not be transferred to other browsers or the mobile app</span><br>
 <span>this also means it can be accidentally deleted by clearing your browser cache.
 :warning:</h3>
   
 ## Preview
   ### Mainpage
   * Added a search bar
   ![mainpage preview](../assets/previews/mg_mainpage.png?raw=true)
   
   ### Map
   * Unlimited marker tracking
   * Unlimited category tracking
   * Added a total progress bar
   ![mainpage preview](../assets//previews/mg_map.png?raw=true)
   
   ### Guide
   * Same as map
   * Added a show all button (shows all markers from guide's category)
   ![mainpage preview](../assets//previews/mg_guide.png?raw=true)

## Build and Installation
 * Install [node.js + npm](https://nodejs.org/en/download/) if you don't already have it.
 * Open the project in a terminal and type ```npm install``` this will install some dependencies.
 * Chrome
    * Build the extension with ```npm run build -- -b "chrome"```
    * after this the extension will be built under the folder build/chrome
    * Use this [Install unpacked extension guide](https://webkul.com/blog/how-to-install-the-unpacked-extension-in-chrome/) to install it.
 * Firefox
    * To build a firefox extension, you first need to get some api keys from [addons.mozilla.org credentials](https://addons.mozilla.org/en-US/developers/addon/api/key/).
      * Press "Generate new credentials"
        ![firefox generate keys](../assets//firefox/firefox_generate_keys.png?raw=true)
      * Your JWT issuer is your KEY and looks something like `user:12345:67`<br>
        And your JWT secret is your SECRET and looks something like `634f34bee43611d2f3c0fd8c06220ac780cff681a578092001183ab62c04e009`.
        ![firefox keys](../assets//firefox/firefox_keys.png?raw=true)
      * After getting your keys, create a `.env` file.
        And fill in your credentials like the picture below.
        ![firefox keys](../assets//firefox/firefox_env.png?raw=true)
    * Now we can build the extension with ```npm run build -- -b "firefox"```
    * After this the extension will be built under the folder build/firefox.xpi.
    * Use this [Install add-on from file guide](https://extensionworkshop.com/documentation/publish/distribute-sideloading/) to install it.

## Changelog
 [changelog](CHANGELOG.md)
