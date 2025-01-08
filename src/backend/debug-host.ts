import { AureliaInfo } from "./../shared/aurelia-hooks";
import { App } from "./../app";
import { inject, CustomElement, ICustomElementViewModel } from "aurelia";
import { IControllerInfo } from "../shared/controller-info";

declare let aureliaDebugger;

export class SelectionChanged {
  constructor(public debugInfo: IControllerInfo) {}
}

export class DebugHost implements ICustomElementViewModel {
  consumer: App;
  port: chrome.runtime.Port;

  attach(consumer: App) {
    /*prettier-ignore*/ console.log("[debug-host.ts,21] attach: ", );
    this.consumer = consumer;
    if (chrome && chrome.devtools) {
      // TODO
      this.initPort();

      //chrome.devtools.panels.elements.onSelectionChanged.addListener(() => {
      //  /*prettier-ignore*/ console.log("[debug-host.ts,30] onSelectionChanged: ", );
      //  if (!this.port) return;
      //  this.port.postMessage("B1. After onSelectionChanged, get info from content")
      //  //chrome.devtools.inspectedWindow.eval(`window.__AURELIA_DEVTOOLS_GLOBAL_HOOK__.getCustomElementInfo($0)`, {useContentScriptContext: true},(debugObject: AureliaInfo) => {
      //  //  this.consumer.selectedElement = debugObject?.customElementInfo;
      //  //  this.consumer.selectedElementAttributes = debugObject?.customAttributesInfo;
      //  //});
      //
      //  // chrome.devtools.inspectedWindow.eval(`window.document.activeElement.tagName`, {useContentScriptContext: true},(element) => {
      //  // chrome.devtools.inspectedWindow.eval(`inspect($0)`, {useContentScriptContext: true},(element) => {
      //  // chrome.devtools.inspectedWindow.eval(`inspect($0)`,(element) => {
      //  //chrome.devtools.inspectedWindow.eval(`$0.$au`,(element) => {
      //  //  // /*prettier-ignore*/ console.log("[debug-host.ts,46] element: ", element);
      //  //  this.port.postMessage(element)
      //  //});
      //
      //  chrome.devtools.inspectedWindow.eval("setSelectedElement($0)", {useContentScriptContext: true},(result) => {
      //    /*prettier-ignore*/ console.log("[debug-host.ts,50] result: ", result);
      //  });
      //
      //  // @ts-ignore
      //  chrome.devtools.inspectedWindow.eval("(" + function(){ console.log($0) }.toString() + ")()")
      //
      //  //chrome.devtools.inspectedWindow.eval('$0 === document.body', function(result) {
      //  //    // alert('$0 is ' + (result ? '' : 'not ') + '<body>');
      //  //});
      //
      //
      //  //chrome.devtools.inspectedWindow.eval(
      //  //  "$0",
      //  //  (result, isException) => {
      //  //    if (isException) {
      //  //      console.error("Error accessing $0:", isException);
      //  //    } else {
      //  //      // document.getElementById("output").textContent = JSON.stringify(result, null, 2);
      //  //      console.log("Selected element:", result);
      //  //    }
      //  //  }
      //  //);
      //});

      //chrome.devtools.panels.elements.onSelectionChanged.addListener(() => {
      //  //chrome.devtools.inspectedWindow.eval(`window.__AURELIA_DEVTOOLS_GLOBAL_HOOK__.getCustomElementInfo($0)`, {useContentScriptContext: true},(debugObject: AureliaInfo) => {
      //  //  this.consumer.selectedElement = debugObject?.customElementInfo;
      //  //  this.consumer.selectedElementAttributes = debugObject?.customAttributesInfo;
      //  //});
      //
      //  // chrome.devtools.inspectedWindow.eval(`aaaaaaaaaaaaa($0)`,{useContentScriptContext: true},(element) => {
      //  // chrome.devtools.inspectedWindow.eval(`aaaaaaaaaaaaa`,{useContentScriptContext: true},(element) => {
      //  chrome.devtools.inspectedWindow.eval(`Object.keys(window).sort()`,{useContentScriptContext: true},(element) => {
      //    /*prettier-ignore*/ console.log("[debug-host.ts,46] element: ", element);
      //    // this.port.postMessage(element)
      //  });
      //
      //  // expression to run in the context of the inspected page
      //  function mark(){
      //    // mark the currently selected element
      //    // @ts-ignore
      //    if ($0.tagName !== 'BODY') {
      //      // @ts-ignore
      //      $0.setAttribute('data-selected', true)
      //      // @ts-ignore
      //      window.aaaaaaaaaaaaa = "baaaaaaaaaaaaa"
      //    }
      //    // send the marker to the callback
      //    return { marker: 'data-selected', type: 'getCustomElementInfo' }
      //  }
      //  var expression = "(" + mark.toString() + ")()"
      //
      //  // evaluate the expression and handle the result
      //  chrome.devtools.inspectedWindow.eval(expression, (data) => {
      //    if (!this.port) return;
      //    this.port.postMessage(data)
      //  })
      //});

      //chrome.devtools.inspectedWindow.eval(`window.__AURELIA_DEVTOOLS_GLOBAL_HOOK__.getAllInfo()`, {useContentScriptContext: true}, (debugObject: AureliaInfo[]) => {
      //  if (!this.port) return;
      //  this.port.postMessage("B2. After eval, get info from content")
      //  this.consumer.allAureliaObjects = debugObject;
      //});
    }
  }
  private initPort = () => {
    chrome.runtime.onConnect.addListener((port) => {
      this.port = port;

      if (port.name === "content-connection") {
        this.port.postMessage({ type: "getAllInfo" });
        // Listen for responses
        port.onMessage.addListener((message) => {
          switch (message.type) {
            case "cs_getCustomElementInfo_dh": {
              const payload = message.payload;
              this.consumer.selectedElement = payload?.customElementInfo;
              this.consumer.selectedElementAttributes =
                payload?.customAttributesInfo;
              break;
            }
            case "cs_getAllInfo_dh": {
              console.log("[cs_getAllInfo_dh] FIANL !!!!!!!!!!!!!!!!!!");
              /*prettier-ignore*/ console.log("[debug-host.ts,136] message: ", message);
              /*prettier-ignore*/ console.log("[debug-host.ts,126] this.consumer.allAureliaObjects: ", this.consumer.allAureliaObjects);
              this.consumer.allAureliaObjects = message.payload;
              /*prettier-ignore*/ console.log("[debug-host.ts,126] this.consumer.allAureliaObjects: ", this.consumer.allAureliaObjects);
              break;
            }
            default: {
              return;
            }
          }
        });
      }
    });
  };

  updateValues(
    value: IControllerInfo,
    property?: IControllerInfo["bindables"][0],
  ) {
    chrome.devtools.inspectedWindow.eval(
      `window.__AURELIA_DEVTOOLS_GLOBAL_HOOK__.updateValues(${JSON.stringify(value)}, ${JSON.stringify(property)})`,
      (debugObject: AureliaInfo) => {
        // this.consumer.selectedElement = debugObject;
      },
    );
  }

  updateDebugValue(debugInfo) {
    let value = debugInfo.value;

    if (debugInfo.type === "string") {
      value = "'" + value + "'";
    }

    let code = `aureliaDebugger.updateValueForId(${debugInfo.debugId}, ${value})`;
    chrome.devtools.inspectedWindow.eval(code);
  }

  toggleDebugValueExpansion(debugInfo) {
    if (debugInfo.canExpand) {
      debugInfo.isExpanded = !debugInfo.isExpanded;

      if (debugInfo.isExpanded && !debugInfo.expandedValue) {
        let code = `window.__AURELIA_DEVTOOLS_GLOBAL_HOOK__.getExpandedDebugValueForId(${debugInfo.debugId});`;

        chrome.devtools.inspectedWindow.eval(code, (expandedValue) => {
          debugInfo.expandedValue = expandedValue;
          debugInfo.isExpanded = true;
        });
      }
    }
  }
}
