class Filter {
    constructor(object, handlers) {
        this.handlers = handlers;

        for (let funcName in handlers) {
            object[funcName] = this._filter(object[funcName], funcName);
        }
    }

    //Needs to be overwritten by child classes
    _filter(f) {
        return f; 
    }
}

class MGApiFilter extends Filter {
    static Filtered = Symbol("filtered");

    constructor(axios, handlers) {
        //Check if its allready filtered if it is 
        if (axios[MGApiFilter.Filtered]) throw new Error("MGApiFilter already filtered this object!", axios);
        axios[MGApiFilter.Filterered] = true;

        super(axios, handlers);
        this.axios = axios;
    }

    _getHandler(handlerName, key) {
        const name = key.replace("/", "_");
        const subHandlers = this.handlers[handlerName];
        return subHandlers?.[name].bind(subHandlers);
    }

    _handle(handlerName, key, argsArray) {
        const handler = this._getHandler(handlerName, key);
        if (handler) {
            const data = handler(...argsArray);
            return { data };
        }
        return null;
    }

    _filter(f, handlerName) {
        return (...args) => {
            const [str, data] = args;
            const key = str.match(/\/api\/v1\/user\/((\/?[A-Za-z]+)+)\/?/)?.[1];
            if (key) {
                let id = parseInt((str.match(/(\d+)$/) || { 1: -1 })[1]);
                const result = this._handle(handlerName, key, [key, id, data, str]);
                if (result) {
                    return Promise.resolve(result.data || data);
                }
            }
            return f(...args);
        }
    }
}


class MGStorageFilter extends Filter {
    constructor(localStorage, handlers) {
        super(localStorage.__proto__, handlers);
        this.localStorage = localStorage;
    }

    _getHandler(handlerName, key) {
        const subHandlers = this.handlers[handlerName];
        if (subHandlers) {
            for (let name of Object.getOwnPropertyNames(Object.getPrototypeOf(subHandlers))) {
                if (!name.match(/^(_.+|constructor)$/)) {
                    const handler = subHandlers[name];
                    if (key.match(name)) {
                        return handler.bind(subHandlers);
                    }
                }
            }
        }
        return null;
    }

    _filter(f, handlerName) {
        return (key, value) => {
            const handler = this._getHandler(handlerName, key);
            const cancel = handler && handler(key, value) || false;
            if (cancel) {
                return value;
            }
            return f.call(this.localStorage, key, value);
        }
    }
}


module.exports = {
    MGApiFilter,
    MGStorageFilter
}