import { Aurelia } from "aurelia";

chrome.runtime.connect({ name: "content-connection" });

export function getAureliaInstance(win): Aurelia | undefined {
  const all = document.querySelectorAll('*')
  for (let i = 0; i < all.length; i++) {
    const aurelia = (all[i] as any).$aurelia as Aurelia;
    if (aurelia) {
      return aurelia;
    }
  }
}

