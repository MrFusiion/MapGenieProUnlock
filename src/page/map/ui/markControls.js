class MarkControls {
    constructor(window) {
        this.$element = $(`<div class="mapboxgl-ctrl mapboxgl-ctrl-group">
            <button class="mg-mark-all-control" type="button" title="Mark all" aria-label="Mark all" aria-disabled="false">
                <span class="mapboxgl-ctrl-icon ion-md-add-circle" aria-hidden="true"></span>
            </button>
            <button class="mg-unmark-all-control" type="button" title="UnMark all" aria-label="Unmark all" aria-disabled="false">
                <span class="mapboxgl-ctrl-icon ion-md-close-circle" aria-hidden="true"></span>
            </button>
        </div>`);

        this.$markAll = this.$element.find(".mg-mark-all-control");
        this.$unmarkAll = this.$element.find(".mg-unmark-all-control");

        this.$element.insertAfter($(window.document).find("#add-note-control"));
    }

    click(f) {
        this.$markAll.click(f.bind(f, true));
        this.$unmarkAll.click(f.bind(f, false));
    }
}

module.exports = MarkControls;