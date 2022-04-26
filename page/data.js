let presetsAllwaysEnabled = JSON.parse(sessionStorage.getItem("mg:config:presets_allways_enabled") || null);

window.mg_pro_unlocker_loaded = true;
if (window.config) {
    window.config.presetsEnabled =
        window.config.presetsEnabled || presetsAllwaysEnabled;
}