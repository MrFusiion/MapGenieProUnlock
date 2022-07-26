function connectToWebSocket() {
    try {
        const ws = new WebSocket("ws://localhost:5500/ws");

        ws.onopen = function() {
            console.log("Connected to websocket ws://localhost:5500/ws");
        }

        ws.onmessage = function(webSocketMessage) {
            const messageObject = JSON.parse(webSocketMessage.data);
            const message = messageObject.message;
            // const data = messageObject.data;

            switch(message) {
                case "reload":
                    console.log("Reload extension");
                    chrome.tabs.reload();
                    chrome.runtime.reload();
                    break;
            }
        }

        ws.onclose = function() {
            connectToWebSocket();
        }

        return ws
    } catch (e) {
        return setTimeout(connectToWebSocket(), 1000);
    }
}

if (chrome.runtime.getManifest().version_name.match("-debug$")) {
    console.log("MapGenieProUnlock running in dev mode.");
    connectToWebSocket();
}