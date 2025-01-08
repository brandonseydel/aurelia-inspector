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
    this.consumer = consumer;
    if (chrome && chrome.devtools) {
      this.initPort();
    }
  }

  private initPort = () => {
    chrome.runtime.onConnect.addListener((port) => {
      this.port = port;

      if (port.name === "content-connection") {
        this.port.postMessage({ type: "getAllInfo" });
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
