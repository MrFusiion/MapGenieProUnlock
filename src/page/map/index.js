const { MGMap } = require("./main");


module.exports = function () {
    if (!window.mg_pro_unlocker_loaded && !window.config.presetsEnabled) {
        this.window.toastr.error("MapGeniePro Unlock:\nExtension was to slow to enable presets, please try again.");
    }

    let mgMap = new MGMap(window);
    mgMap.init().then(() => {
        console.log("Map hijacker loaded");

        // Listen for page focus
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState == "visible") {
                mgMap.load();
            }
        });

        window.addEventListener("mg:mapdata_changed", mgMap.load.bind(mgMap));
    });

    window.mgMap = mgMap;
}