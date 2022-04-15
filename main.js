if (Object.id === undefined) {
    var id = 0;
    Object.id = function(o) {
        if (typeof o !== "object") return o;

        if (typeof o.__uniqueid == "undefined") {
            let objId = (++id).toString(16);
            while (objId.length < 8) objId = "0" + objId;

            Object.defineProperty(o, "__uniqueid", {
                value: `Object(${objId})`,
                enumerable: false,
                writable: false
            });
        }
        return o.__uniqueid;
    }
}


// Creates wrapper function that filters specific string out
function defineFilter(filter, filters, obj) {
    for (let [fName, fFilters] of Object.entries(filters)) {
        let _f = obj[fName];
        obj[fName] = function (s) {
            for (let [match, getargs] of Object.entries(fFilters)) {
                if (s.match(match)) {
                    return filter(...getargs(...arguments));
                }
            }
            return _f(...arguments);
        }
    }
}


// Hide all elements found by their selector
function hideAll(selectors) {
    for (let selector of Object.values(selectors)) {
        for (let element of document.querySelectorAll(selector))
            element.style.display = "none";
    }
}