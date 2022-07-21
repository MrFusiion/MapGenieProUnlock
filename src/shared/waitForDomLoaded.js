module.exports = async function() {
    return new Promise((res, rej) => {
        if (document.readyState === "complete") {
            res();
        } else {
            let handle = setInterval(() => {
                if (document.readyState === "complete") {
                    clearInterval(handle);
                    res();
                }
            }, 100);
        }
    });
}