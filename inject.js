function injectCode(src) {
  const script = document.createElement("script");
  script.src = src;
  script.onload = function() {
    this.remove();
  };
  document.body.appendChild(script);
}

injectCode(chrome.runtime.getURL("/main.js"));
injectCode(chrome.runtime.getURL("/map.js"));
injectCode(chrome.runtime.getURL("/guide.js"));