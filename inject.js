function injectCode(src) {
  const script = document.createElement("script");
  script.src = src;
  script.onload = function() {
    this.remove();
  };
  document.body.appendChild(script);
}

// Injects the following scripts into the browser.
injectCode(chrome.runtime.getURL("/main.js")); // Global functions for both files.
injectCode(chrome.runtime.getURL("/map.js"));  // Only works on Maps.
injectCode(chrome.runtime.getURL("/guide.js"));// Only works on Tools/Guides.