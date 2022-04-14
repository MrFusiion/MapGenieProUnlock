const IS_GUIDE = window.isPro !== undefined && typeof state !== "undefined" && window.axios !== undefined && foundLocations !== undefined;


class MGGuide {
    constructor(window) {
        this.map;
        this.locationIds = [];
        this.document = window.document;
        this.axios = window.axios;

        this.mapFrame = document.querySelector("iframe[src*='https://mapgenie.io']");
        this.mapFrame.addEventListener("load", () => {
            this._setupMap().then(this.load.bind(this));
        });

        defineFilter(() => {
            return Promise.resolve();
        }, {
            put: {
                "/api/v1/user/locations": (s) => ["put", s]
            },
            delete: {
                "/api/v1/user/locations": (s) => ["delete", s],
            }
        }, window.axios);

        window.isPro = true;

        //Hide PRO Upgrade elements
        hideAll(["#button-upgrade"]);

        // Listen for page focus
        this.document.addEventListener('visibilitychange', () => {
            if (this.document.visibilityState == "visible") {
                this.reload();
            }
        });
    }

    async _setupMap() {
        let mapWindow = this.mapFrame.contentWindow;
        
        mapWindow.map = mapWindow.map || {}
        await new Promise((resolve) => {
            let handle = setInterval(() => {
                if (mapWindow.map._loaded) {
                    clearInterval(handle);

                    if (mapWindow.Loaded) return;
                    mapWindow.Loaded = true;
                    this.map = new MGMap(mapWindow, true);

                    this.map.onlocationmark = (id, found) => {
                        this._markInTable(id, found||false);   
                    }
                    resolve();
                }
            }, 100);
        });
    }

    _markInTable(id, found = true) {
        let checkbox = this.document.querySelector(`.check[data-location-id="${id}"]`);
        if (checkbox) {
            checkbox.checked = found;
        }
    }

    load() {
        if (this.map) {
            return this.map.load().then(() => {
                // Search for locations associated with the guide
                let tables = this.document.querySelectorAll("table");
                for (let table of tables) {
                    let row = table && table.querySelector("tbody > tr");
                    let checkboxes = row && row.querySelectorAll(".check") || [];
                    let categories = [];
                    for (let checkbox of checkboxes) {
                        let id = checkbox.getAttribute("data-location-id");
                        let catId = this.map.getCategoryId(id);
                        if (catId) categories.push(catId);
                    }
                    if (categories.length > 0) {
                        this.map.categories = categories;
                        break;
                    }
                }
                this.map.showAll();

                // Mark all found locations in table
                for (let loc of Object.keys(this.map.foundLocations)) {
                    this._markInTable(loc, true);
                }
            });
        }
        return Promise.resolve();
    }

    reload() {
        // Reset found locations in table
        for (let checkbox of this.document.querySelectorAll(".check"))
            checkbox.checked = false;
        this.map.reload();

        // Mark all found locations in table
        for (let loc of Object.keys(this.map.foundLocations)) {
            this._markInTable(loc, true);
        }
    }
}


let guide;
if (IS_GUIDE) {
    window.axios = axios;
    
    guide = new MGGuide(window);
    guide._setupMap().then(() => {
        guide.load().then(() => {
            console.log("Guide hijacker loaded");
        });
    });
} 