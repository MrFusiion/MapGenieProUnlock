const fs = require("fs");
const path = require("path");
const archiver = require("archiver");
const pjson = require("../package.json");
const webExt = require("web-ext");

const FILENAME = "mg-pro-{browser}-{version}.zip";
const DEBUG_FILENAME = "mg-pro-debug-{browser}-{version}.zip";

const build = require("./build");

function filename(template, browser) {
    return format(template, { browser, version: `v${pjson.version}` })
}

function format(str, ...args) {
    if (args.length) {
        var t = typeof args[0];
        var key;
        var args = ("string" === t || "number" === t) ?
            Array.prototype.slice.call(args) : args[0];

        for (key in args) {
            str = str.replace(new RegExp("\\{" + key + "\\}", "gi"), args[key]);
        }
    }
    return str;
};

function zip(path, dest) {
    const out = fs.createWriteStream(dest);
    const zip = archiver("zip");

    zip.on("error", function (err) {
        throw err;
    });

    zip.pipe(out);
    
    if (fs.statSync(path).isDirectory()) {
        zip.directory(path, false);
    } else {
        zip.append(fs.createReadStream(path), { name: path.basename(path) });
    }

    return zip.finalize();
}


//Signs and zips the firefox build
async function buildDistForFirefox(argv) {
    const { KEY: key, SECRET: secret} = require("dotenv").config().parsed;
    if (!key || !secret) {
        console.error("Missing key or secret!\nAdd a .env file with key and secret or pass them via command line arguments!");
        return;
    }

    const dest = argv.debug ? path.resolve(argv["dist-dir"], filename(DEBUG_FILENAME, "firefox"))
        : path.resolve(argv["dist-dir"], filename(FILENAME, "firefox"))
    if (fs.existsSync(dest)) {
        fs.rmSync(dest, { force: true });
    }

    return (argv.debug ? webExt.cmd.build : webExt.cmd.sign)({
        apiKey: key,
        apiSecret: secret,
        sourceDir: argv["build-dir"],
        channel: "unlisted",
        artifactsDir: argv["dist-dir"],
        overwriteDest: true,
        filename: filename(DEBUG_FILENAME, "firefox"),
    }).then((result) => {
        const file = result.downloadedFiles?.[1];
        if (file) {
            zip(file, dest).then(() => {
                fs.rmSync(file);
            })
        }
    });
}

//Zips the chrome build
async function buildDistForChrome(argv) {
    const dest = path.resolve(argv["dist-dir"], filename(FILENAME, "chrome"));
    if (fs.existsSync(dest)) {
        fs.rmSync(dest, { force: true });
    }
    return zip(argv["build-dir"], dest);
}


function build_dist(argv) {
    return build(argv).then(() => {
        const p = [];
        if (argv.browser.match("chrome")) {
            p.push(buildDistForChrome(argv));
        }
        if (argv.browser.match("firefox")) {
            p.push(buildDistForFirefox(argv));
        }
        return Promise.all(p);
    });
}

if (require.main == module) {
    build_dist({
        "browser": "firefox|chrome", "debug": true, "source-dir": "src", "build-dir": "build", "dist-dir": "dist"
    });
}


module.exports = build_dist;