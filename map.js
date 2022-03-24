const IS_MAP = window.mapData !== undefined && typeof store !== "undefined" && window.user !== undefined && window.axios !== undefined;



if (IS_MAP) {
    function markAsFound(id, found=true) {
        window.mapManager.markLocationAsFound(id, found);
    }


    function markAllMarkers() {
        for (let loc of Object.values(window.mapData.locations)) {        
            markAsFound(loc.id);
        }
    }


    function clearAllMarkers() {
        let state = store.getState();
        for (let loc of Object.keys(state.user.foundLocations)) {
            markAsFound(loc, false);
        }
    }


    function trackCategory(id, track = true) {
        if (track) {
            store.dispatch({ type: "HIVE:USER:ADD_TRACKED_CATEGORY", meta: { categoryId: parseInt(id) } });
        } else {
            store.dispatch({ type: "HIVE:USER:REMOVE_TRACKED_CATEGORY", meta: { categoryId: parseInt(id) } });
        }
    }


    function trackAllCategories() {
        for (let cat of Object.keys(window.mapData.categories)) {
            trackCategory(cat);
        }
    }


    function clearAllCategories() {
        let state = store.getState();
        for (let cat of Object.values(state.map.categories)) {
            trackCategory(cat, false);
        }
    }


    function loadMapGenieData() {
        let data = JSON.parse(window.localStorage.getItem(getKey()) || "{}");

        for (let loc of Object.keys(data.locations || {})) {
            markAsFound(loc);
        }
        for (let cat of Object.keys(data.categories || {})) {
            if (cat !== "0") {
                trackCategory(cat);
            }
        }
    }


    function reloadMapGenieData() {
        let state = store.getState();
        let data = JSON.parse(window.localStorage.getItem(getKey()) || "{}");
        let locations = Object.assign({}, data.locations || {});
        let categories = Object.assign({}, data.categories || {});

        for (let loc of Object.keys(state.user.foundLocations)) {
            if (!locations[loc]) {
                markAsFound(loc, false);
            }
            delete locations[loc];
        }

        for (let cat of Object.values(state.user.trackedCategories)) {
            if (!categories[cat]) {
                trackCategory(cat, false);
            }
            delete categories[cat];
        }

        for (let loc of Object.keys(locations)) {
            if (!state.user.foundLocations[loc]) {
                markAsFound(loc);
            }
        }
        
        for (let cat of Object.keys(categories)) {
            cat = parseInt(cat, 10);
            if (cat !== "0" && !state.user.trackedCategories.includes(cat)) {
                trackCategory(cat);
            }
        }
    }


    {
        function getId(s) {
            return parseInt(s.match("/\\d+")[0].match("\\d+")[0], 10);
        }

        window.user.hasPro = true;
        window.mapData.maxMarkedLocations = Infinity;

        try {
            axios.put = newFilter({ "/api/v1/user/locations": (s) => { storage.save(storage.TYPES.LOCATIONS, getId(s)); } }, axios.put);
        } catch {
            console.error("Chouldn't disable Put requests!");
        }

        try {
            axios.post = newFilter({ "/api/v1/user/categories": (s, data) => { storage.save(storage.TYPES.CATEGORIES, data.category); }}, axios.post);
        } catch {
            console.error("Chouldn't disable Post requests!");
        }

        try {
            axios.delete = newFilter({
                "/api/v1/user/locations": (s) => { storage.remove(storage.TYPES.LOCATIONS, getId(s)); },
                "/api/v1/user/categories": (s) => { storage.remove(storage.TYPES.CATEGORIES, getId(s)); }
            }, axios.delete);
        } catch {
           console.error("Chouldn't disable Delete requests!");
        }
        


        //Hide PRO Upgrade elements
        let selectors = ["#blobby-left", ".upgrade", ".progress-buttons ~ .inset"];
        for (let selector of Object.values(selectors)) {
            let element = document.querySelector(selector);
            if (element) {
                element.style.display = "none";
            }
        }

        window.addEventListener("focus", reloadMapGenieData);
        loadMapGenieData();
        console.log("Map script loaded");
    }
}