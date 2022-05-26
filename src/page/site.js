module.exports = {
    isList() {
        return window.location.href === "https://mapgenie.io/";
    },

    isMap() {
        return !!document.querySelector(".map > #app > #map");
    },

    isGuide() {
        return !!document.querySelector(".guide > #app #sticky-map");
    }
}