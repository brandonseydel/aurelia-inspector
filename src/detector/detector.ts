
// detects V1
window.addEventListener('aurelia-composed', () => {
  chrome.runtime.sendMessage({ aureliaDetected: true, version: 1 });
}, { once: true });


// detects V2
window.addEventListener('au-started', () => {
  chrome.runtime.sendMessage({ aureliaDetected: true, version: 2 });
}, { once: true });
