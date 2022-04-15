class Template {
    constructor(name, html, selectors, cb) {
        this.name = name;
        this.html = html;
        this.cb = cb;
        this.selectors = selectors;
    }

    clone(data) {
        let html = this.html;
        for (let match of html.matchAll(/{{([A-z-_0-9]+?)}}/g)) {
            let key = match[1];
            let value = data[key];
            if (value) html = html.replace(match[0], value);
        }

        let div = document.createElement("div");
        div.innerHTML = html;

        let element = new DocumentFragment();
        element.append(...div.children);
        
        let obj = { element: element };
        for (let [name, selector] of Object.entries(this.selectors)) {
            if (name !== "element") {
                obj[name] = element.querySelector(selector);
            }
        }

        if (this.cb) this.cb.bind(obj)();
        return obj;
    }
}


class Style {
    static _styles = [];
    static _styleElement = document.head.appendChild(document.createElement("style"));

    static append(style) {
        this._styles.push(style);
        this._styleElement.innerHTML = this._styles.join("\n");
    }
}


let Templates = {};


Templates.mark_controls = new Template("mark-controls",
    `<div class="mapboxgl-ctrl mapboxgl-ctrl-group">
        <button class="mg-mark-all-control" type="button" title="Mark all" aria-label="Mark all" aria-disabled="false">
            <span class="mapboxgl-ctrl-icon ion-md-add-circle" aria-hidden="true"></span>
        </button>
        <button class="mg-unmark-all-control" type="button" title="UnMark all" aria-label="Unmark all" aria-disabled="false">
            <span class="mapboxgl-ctrl-icon ion-md-close-circle" aria-hidden="true"></span>
        </button>
    </div>
`, {
    markAll: ".mg-mark-all-control",
    unmarkAll: ".mg-unmark-all-control",
});


Templates.total_progress = new Template("total-progress",
    `<div class="progress-item-wrapper">
        <div class="progress-item" id="total-progress" style="margin-right: 5%;">
            <span class="icon">100%</span>
            <span class="title"></span>
            <span class="counter">99999 / 99999</span>
            <div class="progress-bar-container">
                <div class="progress-bar" role="progressbar" style="width: 7%;"></div>
            </div>
        </div>
    </div>
    <hr>
`, {
    item: ".progress-item",
    icon: ".icon",
    counter: ".counter",
    bar: ".progress-bar"
});


Templates.checkbox = new Template("checkbox",
    `<div class="checkbox-wrapper">
        <div class="custom-checkbox {{category}}-checkbox">
            <input type="checkbox" class="custom-control-input" id="{{id}}">
            <label class="custom-control-label" for="{{id}}">{{label}}</label>
        </div>
    </div>
`, {
    input: ".custom-control-input",
});


Templates.section = new Template("section",
    `<div id="{{category}}-section" class="panel-section">
        <h5 class="panel-section-header">{{name}}</h5>
    </div>
`, {
    body: ".panel-section",
});


Style.append(`
    button.mg-mark-all-control,
    button.mg-unmark-all-control {
        width: 40px;
        height: 40px;
        box-shadow: none!important;
        background-color: #fff!important;
    }

    .mg-mark-all-control .mapboxgl-ctrl-icon,
    .mg-unmark-all-control .mapboxgl-ctrl-icon {
        background: none!important;
        font-size: 24px;
        padding: 7px 6px;
    }
`);


document.addEventListener("click", function (e) {
    switch (e.target.className) {
        case "custom-control-label":
            let input = e.target.parentElement.querySelector(".custom-control-input");
            if (input.hasAttribute("checked"))
                input.removeAttribute("checked");
            else
                input.setAttribute("checked", "");
            break
    }
});