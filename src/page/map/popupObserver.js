class Popup {
    constructor(node, locId) {
        this.node = node;

        const label = node.querySelector("label[for='found-checkbox']");
        const button = label?.parentNode;
        
        if (!button) {
            return;
        }

        this.button = button.cloneNode(true);
        $(this.button).insertAfter(button);

        button.style.display = "none";

        this.input = this.button.querySelector("input[type='checkbox']");
        this.locId = locId;
        this.found = this.input.checked;
    }

    click(f) {
        return this.button?.addEventListener("click", f);
    }

    update(marked) { 
        if (this.input) {
            this.input.checked = marked;
        }
    }
}


class PopupObserver extends MutationObserver {
    constructor(store) {
        super((mutations_list) => {
            mutations_list.forEach(mutation => {
                mutation.removedNodes.forEach((node) => {
                    if (node.classList.contains("mapboxgl-popup")) {
                        this.currentPopup = null;
                    }
                });

                mutation.addedNodes.forEach((node) => {
                    if (node.classList.contains("mapboxgl-popup")) {
                        this.currentPopup = new Popup(node, store.state.map.selectedLocation?.id);
                        this.currentPopup.click(() => {
                            const e = new Event("click");
                            e.locId = this.currentPopup.locId;
                            this.et.dispatchEvent(e);
                        });
                    }
                });
            });      
        });

        this.et = new EventTarget();
        this.currentPopup = null;
    }

    click(f) {
        this.et.addEventListener("click", f);
    }

    observe(window) {
        super.observe.apply(this, [window.document.querySelector(".mapboxgl-map"), { childList: true }]);
    }
}

module.exports = PopupObserver;