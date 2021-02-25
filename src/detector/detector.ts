

document.addEventListener("DOMContentLoaded", function (event) {
  if (window.document.querySelectorAll('[aurelia-app]').length > 0) {
    chrome.runtime.sendMessage({ aureliaDetected: true, version: 1 });
    return;
  }

  const all = document.querySelectorAll('*')
  for (let i = 0; i < all.length; i++) {
    const aurelia = (all[i] as any).$aurelia;
    if (aurelia) {
      chrome.runtime.sendMessage({ aureliaDetected: true, version: 2 });
      return;
    }
  }
});
