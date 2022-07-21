let presetsAllwaysEnabled = false;

try {
    presetsAllwaysEnabled = JSON.parse(sessionStorage.getItem("mg:config:presets_allways_enabled") || null);
} catch (e) {
    console.error("Couldn't load mg:config:presets_allways_enabled");
}

window.mg_pro_unlocker_loaded = true;
window.config = window.config || {};
window.config.presetsEnabled = window.config.presetsEnabled || presetsAllwaysEnabled;