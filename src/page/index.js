const { isList, isMap, isGuide } = require("./site");
const mapInit = require("./map");
const guideInit = require("./guide");
const listInit = require("./list");


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


$(function () {
    if (isList()) {
        listInit();
    } else if (isMap()) {
        mapInit();
    } else if (isGuide()) {
        guideInit();
    }
});