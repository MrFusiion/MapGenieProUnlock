function deepCopy(obj) {
    if (typeof obj === "object") {
        let newObj = obj instanceof Array ? [] : {};
        for (let key in obj) {
            if (typeof obj[key] === "object") {
                newObj[key] = deepCopy(obj[key]);
            } else {
                newObj[key] = obj[key];
            }
        }
        return newObj;
    }
    return obj;
}


function objectSet(obj, newObj) {
    for (let key in obj) {
        if (!newObj.hasOwnProperty(key)) {
            delete obj[key];
        }
    }
    for (let key in newObj) {
        obj[key] = deepCopy(newObj[key]);
    }
    return obj;
}


function deepAsign(value, newValue) {
    if (typeof value === "object" && typeof newValue === "object") {
        let o = newValue instanceof Array ? [] : {};
        for (let key in value) {
            o[key] = value[key];
        }
        for (let key in newValue) {
            o[key] = deepAsign(value && value[key], newValue && newValue[key]);
        }
        return o;
    }
    return deepCopy(typeof newValue === "undefined" ? value : newValue);
}


function objMinimize(data, defaultData) {
    if (typeof data === "object") {
        let o = data instanceof Array ? [] : {}, c = 0;
        for (let key in data) {
            let val = objMinimize(data && data[key], defaultData && defaultData[key]);
            if (val !== undefined) {
                o[key] = val;
                c++;
            }
        }
        return c > 0 > 0 ? o : undefined;
    }
    if (typeof data !== "undefined" && data !== defaultData) {
        return data;
    }
}


function objDiff(obj1, obj2) {
    if (typeof obj1 === "object" && typeof obj2 === "object"
        && (obj1 instanceof Array == obj2 instanceof Array))
    {
        let o = obj1 instanceof Array ? [] : {};
        let len1 = Object.keys(obj1).length;
        let len2 = Object.keys(obj2).length;
        for (var i = 0; i < Math.min(len1, len2); i++) {
            
        }
    } else if (obj1 !== obj2) {
        return { 1: obj1, 2: obj2 };
    }
}


window.addEventListener("message", (e) => {
    let data = e.data;
    if (data.type === "mg:error") {
        if (toastr) {
            toastr.error(data.message);
        } else {
            console.error(data.message);
        }
    }
});


module.exports = {
    deepCopy,
    objectSet,
    deepAsign,
    objMinimize,
    objDiff
};