class ToggleFound {
    constructor(window) {
        $(window.document).find("#toggle-found").hide();
        this.$element = $(`<span id="toggle-found" class="button-toggle"><i class="icon ui-icon-show-hide"></i>Found Locations (0)</span>`)
            .insertAfter($(window.document).find("#toggle-found"))
            .click(() => {
                this.$element.toggleClass("disabled");
                window.mapManager.setFoundLocationsShown(!this.$element.hasClass("disabled"));
            });
    }

    update(count) {
        this.$element.html(`
            <i class="icon ui-icon-show-hide"></i>
            Found Locations(${count})
        `);
    }
}

module.exports = ToggleFound;