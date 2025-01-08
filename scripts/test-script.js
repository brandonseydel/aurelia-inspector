//console.log("[test-script.js,1] Hello from test-script.js");
//function aaaaaaaaaaaaa(el) {
//  /*prettier-ignore*/ console.log("[test-script.js,4] el: ", el);
//  console.log("!!!!!!!!-------------------!!!!!!!!!!!!!!!!!");
//  return el;
//}
//
//window.bruh = "testi";
//
//Object.defineProperty(window, "testi", {
//  hi: "bye",
//});
//
//window.postMessage(
//  {
//    greeting: "hello there!",
//    source: "my-devtools-extension",
//  },
//  "*",
//);
//
//window.addEventListener("message", function (event) {
//  // Only accept messages from the same frame
//  if (event.source !== window) {
//    return;
//  }
//
//  var message = event.data;
//  /*prettier-ignore*/ console.log("[contentscript.ts,552] message: ", message);
//
//  switch (message.type) {
//    case "getAllInfo": {
//      /*prettier-ignore*/ console.log("-------------------------------------------------------------------");
//      /*prettier-ignore*/ console.log("[test-script.js,32] message: ", message);
//      var el = document.querySelector('['+ message.marker +']')
//      /*prettier-ignore*/ console.log("[test-script.js,34] el: ", el);
//      if (!el) return;
//      const au = el['$au']
//      /*prettier-ignore*/ console.log("[test-script.js,35] au: ", au);
//      el.removeAttribute(message.marker)
//      /*prettier-ignore*/ console.log("[test-script.js,40] window: ", window);
//      /*prettier-ignore*/ console.log("[test-script.js,40] window.aaaaaaaaaaaaa: ", window.hi);
//      break;
//    }
//    default: {}
//  }
//
//  // Only accept messages that we know are ours. Note that this is not foolproof
//  // and the page can easily spoof messages if it wants to.
//  if (
//    typeof message !== "object" ||
//    message === null ||
//    message.source !== "my-devtools-extension"
//  ) {
//    return;
//  }
//
//  chrome.runtime.sendMessage(message);
//});
//
