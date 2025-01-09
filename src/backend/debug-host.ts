import { AureliaInfo } from "./../shared/aurelia-hooks";
import { App } from "./../app";
import { inject, CustomElement, ICustomElementViewModel } from "aurelia";
import { IControllerInfo, Property } from "../shared/controller-info";

declare let aureliaDebugger;

export class SelectionChanged {
  constructor(public debugInfo: IControllerInfo) {}
}

export class DebugHost implements ICustomElementViewModel {
  consumer: App;
  port: chrome.runtime.Port;
  private currentDebugInfo: Property;

  attach(consumer: App) {
    this.consumer = consumer;
    if (chrome && chrome.devtools) {
      this.initPort();
    }
  }

  private initPort = () => {
    chrome.runtime.onConnect.addListener((port) => {
      this.port = port;

      if (port.name === "content-connection") {
        port.onMessage.addListener((message) => {
          switch (message.type) {
            case "dt_getExpandedDebugValueForId_dh": {
              /*prettier-ignore*/ console.log("[debug-host.ts,33] message: ", message);
              this.currentDebugInfo.expandedValue = message;
              this.currentDebugInfo.isExpanded = true;
              break;
            }
            case "cs_getCustomElementInfo_dh": {
              /*prettier-ignore*/ console.log("[debug-host.ts,38] cs_getCustomElementInfo_dh: ", );
              const payload = message.payload;
              this.consumer.selectedElement = payload?.customElementInfo;
              this.consumer.selectedElementAttributes =
                payload?.customAttributesInfo;
              break;
            }
            case "cs_getAllInfo_dh": {
              this.consumer.allAureliaObjects = message.payload;
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

  updateDebugValue(debugInfo: Property) {
    /*prettier-ignore*/ console.log("[debug-host.ts,64] debugInfo: ", debugInfo);
    let value = debugInfo.value;

    if (debugInfo.type === "string") {
      value = "'" + value + "'";
    }

    let code = `aureliaDebugger.updateValueForId(${debugInfo.debugId}, ${value})`;
    chrome.devtools.inspectedWindow.eval(code);
  }

  toggleDebugValueExpansion(debugInfo: Property) {
    console.clear();
    if (debugInfo.canExpand) {
      this.currentDebugInfo = debugInfo;
      debugInfo.isExpanded = !debugInfo.isExpanded;

      const logMe = {...debugInfo}
      /*prettier-ignore*/ console.log("[debug-host.ts,89] logMe: ", logMe);
      if (debugInfo.isExpanded && !debugInfo.expandedValue) {
        console.log("[DH] 1. sending message to get expanded value");
        // this.port.postMessage({ type: "dh_getExpandedDebugValueForId_dt", debugId: debugInfo.debugId });
        this.port.postMessage({ type: "dh_getExpandedDebugValueForId_cs", debugId: debugInfo.debugId });
        // this.port.postMessage({ type: "dh_getExpandedDebugValueForId_dt", debugId: debugInfo.debugId });

        //let code = `window.__AURELIA_DEVTOOLS_GLOBAL_HOOK__.getExpandedDebugValueForId(${debugInfo.debugId});`;
        //
        //chrome.devtools.inspectedWindow.eval(code, (expandedValue) => {
        //  debugInfo.expandedValue = expandedValue;
        //  debugInfo.isExpanded = true;
        //});
      }
    }
  }
}
