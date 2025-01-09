import { AureliaInfo } from "./../shared/aurelia-hooks";
import { App } from "./../app";
import { inject, CustomElement, ICustomElementViewModel } from "aurelia";
import { IControllerInfo, Property } from "../shared/controller-info";
import { IMessages } from "../shared/types";

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
        port.onMessage.addListener((message: IMessages) => {
          switch (message.type) {
            case "cs_getExpandedDebugValueForId_dh": {
              /*prettier-ignore*/ console.log("Y. [debug-host.ts,39] message: ", message);
              // @ts-ignore
              this.currentDebugInfo.expandedValue = {
                properties: message.payload.properties,
              };
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
              this.consumer.allAureliaObjects = (
                message as unknown as IMessages<AureliaInfo[]>
              ).payload;
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
    let value = debugInfo.value;

    if (debugInfo.type === "string") {
      value = "'" + value + "'";
    }

    let code = `aureliaDebugger.updateValueForId(${debugInfo.debugId}, ${value})`;
    chrome.devtools.inspectedWindow.eval(code);
  }

  toggleDebugValueExpansion(debugInfo: Property) {
    if (debugInfo.canExpand) {
      this.currentDebugInfo = debugInfo;
      debugInfo.isExpanded = !debugInfo.isExpanded;

      if (debugInfo.isExpanded && !debugInfo.expandedValue) {
        this.port.postMessage({
          type: "dh_getExpandedDebugValueForId_cs",
          debugId: debugInfo.debugId,
        });
      }
    }
  }
}
