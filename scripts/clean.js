const fs = require("fs");
const path = require("path");
const pjson = require("../package.json");

function clean(argv) {
    if (argv.mode.match("build") && fs.existsSync(argv["build-dir"])) {
        fs.rmSync(argv["build-dir"], { recursive: true });
    }

    if (argv.mode.match("dist") && fs.existsSync(argv["dist-dir"])) {
        var deleteFolder = true;
        for (let file of fs.readdirSync(argv["dist-dir"])) {
            if (!file.match(pjson.version)) {
                fs.rmSync(path.resolve(argv["dist-dir"], file));
            } else {
                deleteFolder = false;
            }
        }

        if (deleteFolder) {
            fs.rmSync(argv["dist-dir"], { recursive: true });
        }
    }
}


if(require.main == module) {
    clean({ "dist-dir": "dist", "build-dir": "build" });
}


module.exports = clean;