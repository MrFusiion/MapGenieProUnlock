# MapGenieProUnlock
Chrome extension that unlocks [Map Genie](https://mapgenie.io/) PRO features for free.<br>
The extension is only tested on the [DL2 villedor Map](https://mapgenie.io/dying-light-2/maps/villedor) and [Elden Ring Map](https://mapgenie.io/elden-ring)
and works fine so far. But I'm pretty sure it will work on other maps too.
The extenions should work on both the maps and the guides(tools).<br>
*NOTE: this is my first chrome extension I made, so don't mind the minor mistakes*

## How does it work
   Its basicly like a parasite takes control of the application and tells it what to do with the given data.
   It blocks a couple of API calls for saving the locations and categories.<br>
   And instead saves it in your local browser storage.<br>
   This enables the ability for tracking more then 100 locations and 2 categories.
   
 <h1>:warning: 
beware this extension blocks saving to their servers and instead saves it locally on the browser this means your data will not be transferred to other browsers or the mobile app</h1>
   
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

## Installation
 * Install the zip file and unpack it.
 * And use this [Install upacked extension guide](https://webkul.com/blog/how-to-install-the-unpacked-extension-in-chrome/) to install it.
 * Its also recommended to clear your map data before using the extension.

## Changelog
   ### Version 1
   * #### 1.0
      * Unlimited markers.
      * Unlimited categories.

   ### Version 2
   * #### 2.0
      * Guide support.
      * Guide show all button on mini map.
      * Support multiple tabs.

   ### Version 3
   * #### 3.0
      * Support guides with multiple maps (tested on AC: odyssey ostraka locations).
      * Better code readablity.
      * Faster loading.
      * Searchbar on main page.
      * Mark/Unmark all visible markers.
      * Changed the url pattern from _\*://mapgenie.io/\*_ to _*\://\*/\*_.<br>To support maps with custom domain names.
   * #### 3.1
      * Added remember visible categories support.
      * Added presets support.
   * #### 3.2
      * Presets are now availible on all maps if enabled in settings.
      * Popup html added with active status and settings.

   ### Version 4
   * #### 4.0
      * Added popup.html for the extension.
      * Data is now saved per userid instead, so multi account usage is possible.
