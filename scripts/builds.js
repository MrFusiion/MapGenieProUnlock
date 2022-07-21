const fs = require('fs');
const archiver = require('archiver');
const path = require('path');
const temp = require('temp');
const browserify = require('browserify');
const webExt = require('web-ext');
const pjson = require('../package.json');

temp.track();

function streamToString(stream) {
    const chunks = [];
    return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        stream.on('error', (err) => reject(err));
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    })
}

async function bundleScript(file) {
    const b = browserify();
    b.add(file);

    return streamToString(b.bundle()).catch((e) => {
        throw new Error(`Failed to bundle ${file}: ${e}`);
    });
}

function mergeManifest(...manifests) {
    const merged = {};
    for (let manifest of manifests) {
        const contents = fs.readFileSync(manifest, 'utf8');
        Object.assign(merged, JSON.parse(contents));
    }
    return JSON.stringify(merged, null, 2);
}

function zip(folder, dest) {
    var output = fs.createWriteStream(dest);
    var archive = archiver("zip");

    archive.on("error", function (err) {
        throw err;
    });

    archive.pipe(output);
    archive.directory(folder, false);
    archive.finalize();
}

function signFirefox(folder, options) {
    console.log(folder)
    if (options.debug) {
        zip(folder, path.resolve(path.dirname(folder), "firefox.zip"));
        return
    }

    let { KEY: key, SECRET: secret } = require('dotenv').config().parsed;
    key = key || options['api-key'];
    secret = secret || options['api-secret'];

    if (!key || !secret) {
        console.error("Missing key or secret!\nAdd a .env file with key and secret or pass them via command line arguments!");
        return;
    }

    webExt.cmd.sign({
        apiKey: key,
        apiSecret: secret,
        sourceDir: folder,
        channel: 'unlisted',
        artifactsDir: './build',
        overwriteDest: true,
        filename: 'firefox.xpi'
    });
}


const manifestInfo = temp.path({ suffix: '.pdf' });
fs.writeFileSync(manifestInfo, JSON.stringify({
    name: pjson.title,
    version: pjson.version,
    version_name: pjson.version,
    description: pjson.description,
    author: pjson.author,
}), { flag: 'w' });

const files = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'files.json'), 'utf8'));
module.exports = {
    actions: {
        'bundle': bundleScript,
        'merge-manifest': mergeManifest,
        'rename': (file) => {
            return fs.readFileSync(file);
        }
    },

    browsers: {
        chrome: {
            dest: './chrome',
            source: './src',
            files,
            manifest: {
                file: './manifest.json',
                action: 'merge-manifest',
                args: [
                    manifestInfo,
                    './src/manifest.json'
                ]
            },
        },
        firefox: {
            dest: './firefox',
            source: './src',
            files,
            manifest: {
                file: './manifest.json',
                action: 'merge-manifest',
                args: [
                    manifestInfo,
                    './src/manifest.json',
                    './src/manifest_firefox.json'
                ]
            },
            post_build: signFirefox
        }
    }
}

process.on('exit', () => {
    fs.rm(manifestInfo);
});