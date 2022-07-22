const ApiPutHandler = require("../api/put");
const ApiPostHandler = require("../api/post");
const ApiDeleteHandler = require("../api/delete");

class ApiHandler {
    constructor(store, storage) {
        this.put = new ApiPutHandler(store, storage);
        this.post = new ApiPostHandler(store, storage);
        this.delete = new ApiDeleteHandler(store, storage);
    }
}

module.exports = ApiHandler;