const fs = require("fs");
const pfs = fs.promises;
const path = require("path");
const browserify = require("browserify");

const pjson = require("../package.json");
const buildInfo = require("../build.config");

//Write data into a file, Creates the file and directory tree if it doesn't exist
function writeFile(file, data) {
    return makeDir(path.dirname(file)).then(() => {
        return pfs.writeFile(file, data, { flag: "w" });
    }).then(() => {
        return file;
    });
}

//Clone a file
function cloneFile(target, file) {
    return pfs.readFile(target).then((data) => {
        return writeFile(file, data);
    });
}

//Clone dir recursive
function cloneDir(target, dir) {
    return makeDir(dir).then(() => {
        return pfs.readdir(target)
    }).then((files) => {
        return Promise.all(files.map((file) => {
            const srcFile = path.resolve(target, file);
            const destFile = path.resolve(dir, file);

            return pfs.stat(srcFile).then((stats) => {
                if (stats.isDirectory()) {
                    return cloneDir(srcFile, destFile);
                }
                return cloneFile(srcFile, destFile);
            })
        })).then(() => dir);
    });
}

//Bundles .js scripts with require into one script
function bundleScript(target, file) {
    return makeDir(path.dirname(file)).then(() => {
        return new Promise((resolve) => {
            browserify()
                .add(target)
                .bundle()
                .pipe(fs.createWriteStream(file, { flag: "w" }))
                .on("close", () => {
                    resolve(file);
                });
        });
    });
}

function makeDir(dir) {
    return Promise.resolve().then(() => {
        return pfs.mkdir(dir, { recursive: true });
    }).then(() => dir);
}

//Remove dir if it exists
function removeDirSync(dir) {
    if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true }, (err) => {
            if (err) throw err;
        });
    }
}

async function build(argv) {
    //Remove old build folder
    removeDirSync(argv["build-dir"]);

    const manifestData = Object.assign({}, {
        name: pjson.title,
        version: pjson.version,
        version_name: pjson.version,
        description: pjson.description,
        author: pjson.author,
    }, require(path.resolve(argv["source-dir"], "manifest.json")));

    return Promise.all([
        ...buildInfo.map(({ src, dest, bundle = false }) => {
            const srcFile = path.resolve(argv["source-dir"], src);
            const destFile = path.resolve(argv["build-dir"], dest);

            return pfs.stat(srcFile).then((stats) => {
                if (stats.isDirectory()) {
                    return cloneDir(srcFile, destFile);
                } else if (stats.isFile()) {
                    if (bundle) {
                        return bundleScript(srcFile, destFile);
                    }
                    return cloneFile(srcFile, destFile);
                } else {
                    throw new Error("Huh, how did we get here?");
                }
            });
        }),
        writeFile(path.resolve(argv["build-dir"], "manifest.json"), JSON.stringify(manifestData, null, 2))
    ]).then((result) => {
        // console.log("Done", result);
        return argv["build-dir"];
    });
}

if (require.main == module) {
    build({ "source-dir": "src", "build-dir": "build" });
}

module.exports = build;