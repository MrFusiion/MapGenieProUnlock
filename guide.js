const IS_GUIDE = window.isPro !== undefined && typeof state !== "undefined" && window.axios !== undefined && foundLocations !== undefined;

if (IS_GUIDE) {
    function markInTable(id, found = true) {
        id = (typeof id === "number") ? Number.parseInt(id) : id;
        let checkbox = document.querySelector(`.check[data-location-id="${id}"]`);
        if (checkbox) {
            checkbox.checked = found;
        }
    }

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


    function markAllMarkers() {
        for (let loc of Object.values(window.mapData.locations)) {
            markAsFound(loc.id);
        }
    }


    function clearAllMarkers() {
        for (let loc of Object.keys(foundLocations)) {
            markAsFound(loc, false);
        }
    }


    function loadMapGenieData() {
        let data = JSON.parse(window.localStorage.getItem(getKey()) || "{}");

        for (let loc of Object.keys(data.locations || {})) {
            markAsFound(loc);
        }
    }


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

        function sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        let mapFrame = document.querySelector("iframe[src*='https://mapgenie.io']");
        let mapFrameWindow = mapFrame.contentWindow;

        let c = 0;
        while (true) {
            await sleep(100);
            if (mapFrameWindow.mapData !== undefined && mapFrameWindow.axios !== undefined) {
                break;
            } else if (c > 100) {
                console.error("Failed to find mapData!");
                break;
            }
            c += 1;
        }
        window.mapData = mapFrameWindow.mapData

        window.isPro = true;

        try {
            let putCallback = (s) => { let id = getId(s); storage.save(storage.TYPES.LOCATIONS, id); markInTable(id, true) }
            window.axios.put = newFilter({ "/api/v1/user/locations": putCallback }, window.axios.put);
            mapFrameWindow.axios.put = newFilter({ "/api/v1/user/locations": putCallback }, mapFrameWindow.axios.put);
        } catch {
            console.error("Chouldn't disable Put requests!");
        }

        try {
            let deleteCallback = (s) => { let id = getId(s); storage.remove(storage.TYPES.LOCATIONS, id); markInTable(id, false) }
            window.axios.delete = newFilter({ "/api/v1/user/locations": deleteCallback }, window.axios.delete);
            mapFrameWindow.axios.delete = newFilter({ "/api/v1/user/locations": deleteCallback }, mapFrameWindow.axios.delete);
        } catch {
            console.error("Chouldn't disable Delete requests!");
        }

        //Hide PRO Upgrade elements
        let selectors = ["#button-upgrade"];
        for (let selector of Object.values(selectors)) {
            let element = document.querySelector(selector);
            if (element) {
                element.style.display = "none";
            }
        }

        let categoryId;
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
            showAll()

            let button = document.createElement("button");
            button.classList.add("btn", "btn-outline-secondary");
            button.addEventListener("click", showAll);
            document.querySelector("div#app > nav").appendChild(button);
            button.textContent = "SHOW ALL";
        }

        window.addEventListener("focus", reloadMapGenieData);
        loadMapGenieData()
        console.log("Guide script loaded");
    })()
}