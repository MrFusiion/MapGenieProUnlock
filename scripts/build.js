const fs = require('fs');
const path = require('path');

// CLI make error messages red
console.error = function (...args) {
    console.log('\033[31m', ...args, '\033[0m');
};

//Parse argv
let argv;
try {
    argv = require('./argv_parser')()
        .addOption({
            name: 'browser',
            aliases: ['b'],
            default: 'chrome'
        }).addOption({
            name: 'output',
            aliases: ['o'],
            default: './build'
        }).addOption({
            name: 'verbose',
            aliases: ['v'],
            flag: true
        }).addOption({
            name: 'api-key',
        }).addOption({
            name: 'api-secret',
        }).addOption({
            name: 'debug',
            aliases: ['d'],
            flag: true
        })
        .help()
        .parse();
} catch (e) {
    console.error(e);
    process.exit(1);
}

//Write data into a file, Creates the file and directory tree if it doesn't exist
function writeFile(file, data, options = {}) {
    const dirname = path.dirname(file);
    if (!fs.existsSync(dirname)) {
        if (options.verbose) console.log(`Creating directory: ${dirname}`);
        fs.mkdirSync(dirname, { recursive: true });
    }

    if (options.verbose) console.log(`Writing file: ${file}`);
    fs.writeFileSync(file, data, { flag: "w" });
}

//Clone a file
function cloneFile(target, file, options={}) {
    const data = fs.readFileSync(target);
    writeFile(file, data, options);
}

//Clone dir recursive
function cloneDir(target, dir, options = {}) {
    if (!fs.existsSync(dir)) {
        if (options.verbose) console.log(`Creating directory: ${dir}`);
        fs.mkdirSync(dir, { recursive: true });
    }
    for (let file of fs.readdirSync(target)) {
        if (fs.statSync(path.join(target, file)).isDirectory()) {
            cloneDir(path.join(target, file), path.join(dir, file), options);
        } else {
            cloneFile(path.join(target, file), path.join(dir, file), options);
        }
    }
}

//Builds the extension with given options { -b: <<browser_name>>, -o: <<output_path>> }
async function build(options) {
    const builds = require('./builds');
    const actions = builds.actions;
    const buildInfo = builds.browsers[options.browser];
    if (!buildInfo) throw new Error(`Unknown browser: ${options.browser}`);

    const manifest = buildInfo.manifest
    const files = [...buildInfo.files, manifest];
    const src = buildInfo.source;
    const dest = path.join(options.output, buildInfo.dest);
    const post_build = buildInfo.post_build;

    //Remove old build if it exist
    if (fs.existsSync(dest)) {
        if (options.verbose) console.log(`Removing directory: ${dest}`);
        fs.rmSync(dest, { recursive: true });
    }

    for (let file of files) {
        switch (typeof file) {

            //If it's a string, then it's a path
            case 'string':
                const exists = fs.existsSync(path.resolve(src, file));
                if (!exists) console.error(`File not found: ${path.resolve(src, file) }`);
                if (!exists) continue;

                if (fs.statSync(path.resolve(src, file)).isDirectory()) {
                    cloneDir(path.resolve(src, file), path.resolve(dest, file), options);
                } else {
                    cloneFile(path.resolve(src, file), path.resolve(dest, file), options);
                }
                continue;
            
            //If it's a object, then it's an action
            case 'object':
                const action = actions[file.action || new Symbol()];
                if (!action) console.error(`Action not found: ${file.action || 'none'}`);
                if (!file.file) console.error(`No file given! ${JSON.stringify(file)}`);
                if (!action || !file.file) continue;

                const args = (file.args || []);

                //Execute action with given arguments and store the result
                let data;
                try {
                    data = await Promise.resolve().then(() => action(...args));
                } catch (e) {
                    console.error('Action failed:', e);
                    continue;
                }

                //If we got data then write it to a file
                if (data) {
                    try {
                        writeFile(path.resolve(dest, file.file), data, options);
                    } catch (e) {
                        console.error(`Writing file ${path.resolve(dest, file.file)} failed:`, e);
                    }
                } else {
                    console.error(`Action ${file.action}(${args.join(', ')}) did not return data!`);
                }

                continue;
        }    
    }

    //If we got a post_build action call it with the output path and command options arguments
    if (post_build) {
        try {
            // console.log("post build");
            post_build(dest, options);
        } catch (e) {
            console.error("Post-build failed:", e);
        }
    }

    return dest;
}

if (require.main === module) {
    const options = argv.getOptions()
    const browser = options.browser;
    console.log(`Building ${browser} extension...`)
    build(options).then(() => {
        console.log(`${browser.replace(/^./, (l) => String.prototype.toUpperCase.call(l))} extension built`);
    });
}

module.exports = build;