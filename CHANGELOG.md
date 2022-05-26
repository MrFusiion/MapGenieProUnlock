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
      * Popup html added with active status and settings.
      * Presets are now availible on all maps if enabled in settings.

### Version 4
   * #### 4.0
      * Data is now saved per userid instead, so multi account usage is possible.
      * Data can now be exported and imported as a json via the popup action.
      * Data can now be cleared via the popup action.
   * #### 4.1
      * Firefox support.
      * use npm + node scripts to build the extension this allows me to use the same source code for different browsers + bundle multple .js files in a single one for better performence
      * Changed from manifest v3 to v2 to make it easier for script injection.<br>
        This will hopefully fix the ```presets allways enabled``` option that sometimes failed to load correctly.
        A side note is that the support for manifest v2 will not be supported after 2023 in chrome, but we'll see what happens and roll back to manifest v3 if necessary.
      * The extension will now be able to load old save data from v3 and convert it into v4 data scheme.
      * G button added on popup.html that brings you to https://mapgenie.io mainpage.
      * Fixed the found checkbox on the map selected location popup.
      * Fixed an issue with the ```presets allways enabled``` setting crashing the `New World` map.