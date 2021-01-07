import { CustomElement, CustomAttribute } from "aurelia";

window.addEventListener('au-started', (test) => {
  chrome.runtime.sendMessage({ aureliaDetected: true });
});


