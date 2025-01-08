
// detects V1
window.addEventListener('aurelia-composed', () => {
  console.log("V1");
  chrome.runtime.sendMessage({ aureliaDetected: true, version: 1 });
}, { once: true });


// detects V2
window.addEventListener('au-started', (customEvent: CustomEvent<any>) => {
  console.log("V2");
  chrome.runtime.sendMessage({ aureliaDetected: true, version: 2 });
}, { once: true });
