{
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

    if (Object.clone === undefined) {
        Object.deepClone = function (o) {
            let newO = Object.assign(newO, o);
            for (let [key, value] of Object.entries(o)) {
                if (typeof value === "object") {
                    newO[key] = Object.deepClone(value);
                }
            }
            return newO;
        }
    }
}


function getIdFromApiCall(s) {
    return parseInt(s.match("/\\d+")[0].match("\\d+")[0], 10);
}


// Creates wrapper function that filters specific string out
let newFilter = (function() {
    let _filters = new Proxy({}, {
        get: (target, objId) => {
            return target[objId] || (target[objId] = new Proxy({}, {
                get: (objV, k) => {
                    return objV[k] || (objV[k] = []);
                }
            }));
        }
    });

    return function (obj, key, match, cb) {
        this._filters = _filters;
        let f = obj[key];
        if (!f.__isFilter) {
            let filter;
            obj[key] = filter = function(s) {
                for (let filter of _filters[Object.id(obj)][key]) {
                    if (s.match(filter.match)) {
                        if (filter.cb) { cb(...arguments) };
                        return new Promise((r) => { r(); });
                    }
                    return _f(...arguments);
                }
            }

            Object.defineProperty(filter, "__isFilter", {
                value: true,
                enumerable: false,
                writable: false
            });
        }

        _filters[Object.id(obj)][key].push({
            match: match,
            cb: cb
        });
    }
})();


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


class Template {
    static STYLES = [];
    static STYLE = document.head.appendChild(document.createElement("style"));

    constructor(name, content, style, selectors) {
        this.template = document.createElement("template");
        this.template.setAttribute("id", name);
        this.template.innerHTML = content;
        document.head.appendChild(this.template);

        if (style && style.length > 0) {
            Template.STYLES.push(style);
            Template.STYLE.innerHTML = Template.STYLES.join("\n");
        }

        this.selectors = selectors;
    }

    clone() {
        let element = this.template.content.cloneNode(true);
        let obj = { element: element };

        for (let [name, selector] of Object.entries(this.selectors)) {
            if (name !== "element") {
                obj[name] = element.querySelector(selector);
            }
        }

        return obj;
    }
}