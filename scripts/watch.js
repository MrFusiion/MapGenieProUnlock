const fs = require("fs");
const path = require("path");
const build = require("./build");

const ws = require("ws");

function uuidv4() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == "x" ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function createWss(port) {
    const wss = new ws.Server({ port });

    const clients = new Map();
    wss.on("connection", (ws) => {
        const id = uuidv4();
        const metadata = { id };
    
        clients.set(ws, metadata);

        ws.on("close", () => {
            clients.delete(ws);
        });
    });

    return {
        send(message, data) {
            const outbound = JSON.stringify({message, data});
            [...clients.keys()].forEach((client) => {
                client.send(outbound);
            });
        }
    }
}

function watch(argv) {
    var handle;
    const src = argv["source-dir"];
    const timeout = argv["build-timeout"] || 1000;

    const wss = createWss(5500);

    const w = fs.watch(src, {
        recursive: true
    });

    process.HI = "Whats up";

    w.on("error", (e) => {
        console.error("[ERROR]: e");
    });

    w.on("change", () => {
        clearTimeout(handle);
        handle = setTimeout(() => {
            build(argv, true).then(() => { 
                wss.send("reload");
            }).catch(e => {
                console.log("[BUILD ERORO]: ", e);
            });
        }, timeout);
    });

    build(argv, true);
}


module.exports = watch;