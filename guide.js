const IS_GUIDE = window.isPro !== undefined && typeof state !== "undefined" && window.axios !== undefined && foundLocations !== undefined;

if (IS_GUIDE) {

    // checks the checkbox that links with this id
    function markInTable(id, found = true) {
        id = (typeof id === "number") ? Number.parseInt(id) : id;
        let checkbox = document.querySelector(`.check[data-location-id="${id}"]`);
        if (checkbox) {
            checkbox.checked = found;
        }
    }


    // Marks a specific location markers
    function markAsFound(id, found = true) {
        id = (typeof id !== "string") ? toString(id) : id;
        foundLocations[id] = id;
        const mapEvent = new CustomEvent('setLocationFound', {
            detail: {
                locationId: id,
                found: found,
            }
        });
        if (mapElement && mapElement.contentDocument) {
            mapElement.contentDocument.dispatchEvent(mapEvent);
        }
        window.document.dispatchEvent(mapEvent);
        markInTable(id, found);
    }


    // Marks all location markers
    function markAllMarkers() {
        for (let loc of Object.values(window.mapData.locations)) {
            markAsFound(loc.id);
        }
    }


    // Clears all location markers
    function clearAllMarkers() {
        for (let loc of Object.keys(foundLocations)) {
            markAsFound(loc, false);
        }
    }


    // Load function
    function loadMapGenieData() {
        let data = storage.load(); JSON.parse(window.localStorage.getItem(getKey()) || "{}");

        for (let loc of Object.keys(data.locations || {})) {
            markAsFound(loc);
        }
    }


    // Reload function
    function reloadMapGenieData() {
        let data = JSON.parse(window.localStorage.getItem(getKey()) || "{}");
        let locations = Object.assign({}, data.locations || {});

        for (let loc of Object.keys(foundLocations)) {
            if (!locations[loc]) {
                markAsFound(loc, false);
            }
            delete locations[loc];
        }

        for (let loc of Object.keys(locations)) {
            if (!foundLocations[loc]) {
                markAsFound(loc);
            }
        }
    }


    (async function () {
        function getId(s) {
            return parseInt(s.match("/\\d+")[0].match("\\d+")[0], 10);
        }

        // Search for the mapData
        // The map data is need for loading and saving the data out and in of the local browser storage.
        let mapFrame = document.querySelector("iframe[src*='https://mapgenie.io']");
        let mapFrameWindow = mapFrame.contentWindow;

        window.mapData = await waitFor(mapFrameWindow, (object) => {
            return object.mapData;
        });

        mapFrameWindow.axios = await waitFor(mapFrameWindow, (object) => {
            return object.axios;
        });
        
        window.isPro = true;

        try {
            let putCallback = (s) => { let id = getId(s); storage.save(storage.TYPES.LOCATIONS, id); markInTable(id, true) }
            window.axios.put = newFilter({ "/api/v1/user/locations": putCallback }, window.axios.put);
            mapFrameWindow.axios.put = newFilter({ "/api/v1/user/locations": putCallback }, mapFrameWindow.axios.put);
        } catch(e) {
            console.error("Chouldn't disable Put requests!,\n", e);
        }

        try {
            let deleteCallback = (s) => { let id = getId(s); storage.remove(storage.TYPES.LOCATIONS, id); markInTable(id, false) }
            window.axios.delete = newFilter({ "/api/v1/user/locations": deleteCallback }, window.axios.delete);
            mapFrameWindow.axios.delete = newFilter({ "/api/v1/user/locations": deleteCallback }, mapFrameWindow.axios.delete);
        } catch(e) {
            console.error("Chouldn't disable Delete requests!,\n", e);
        }

        //Hide PRO Upgrade elements
        let selectors = ["#button-upgrade"];
        for (let selector of Object.values(selectors)) {
            let element = document.querySelector(selector);
            if (element) {
                element.style.display = "none";
            }
        }

        let categoryId; //Search for the category, did not found a better solution yet.
        let checkboxes = document.querySelectorAll(".check");
        if (checkboxes.length > 0) {
            let locId = parseInt(checkboxes[0].getAttribute("data-location-id"), 10);
            for (let loc of Object.values(window.mapData.locations)) {
                if (loc.id === locId) {
                    categoryId = loc.category_id;
                    break;
                }
            }
        }

        //Only show the locations that match the category
        if (categoryId) {
            let locationIds = []
            Object.values(window.mapData.locations).forEach((value) => {
                if (value.category_id == categoryId) {
                    locationIds.push(value.id);
                }
            });

            function showAll() {
                if (locationIds.length > 0) {
                    const event = new CustomEvent('showLocationIds', {detail: {locationIds: locationIds}});
                    mapElement.contentDocument.dispatchEvent(event);
                }
            }

            //Adds a button in the nav bar so you can show all locations again.
            let button = document.createElement("button");
            button.classList.add("btn", "btn-outline-secondary");
            button.addEventListener("click", showAll);
            document.querySelector("div#app > nav").appendChild(button);
            button.textContent = "SHOW ALL";

            showAll()
        }

        window.addEventListener("focus", reloadMapGenieData); //Reloads on window focus this should enable multiple maps to be open at the same time.
        loadMapGenieData(); //Load data out of the local browser storage
        console.log("Guide script loaded");
    })()
}