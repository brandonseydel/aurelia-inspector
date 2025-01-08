import { AureliaInfo } from './../shared/aurelia-hooks';
import { App } from './../app';
import {
  inject,
  CustomElement,
  ICustomElementViewModel
} from "aurelia";
import { IControllerInfo } from '../shared/controller-info';

declare let aureliaDebugger;

export class SelectionChanged {
  constructor(public debugInfo: IControllerInfo) { }
}


export class DebugHost implements ICustomElementViewModel {
  consumer: App;

  attach(consumer: App) {
    this.consumer = consumer;
    if (chrome && chrome.devtools) {
      chrome.devtools.network.onNavigated.addListener(() => {
        chrome.devtools.inspectedWindow.eval(`window.__AURELIA_DEVTOOLS_GLOBAL_HOOK__.getAllInfo()`, (debugObject: AureliaInfo[]) => {
          this.consumer.allAureliaObjects = debugObject
        });
      });

      chrome.devtools.panels.elements.onSelectionChanged.addListener(() => {
        chrome.devtools.inspectedWindow.eval(`window.__AURELIA_DEVTOOLS_GLOBAL_HOOK__.getCustomElementInfo($0)`, (debugObject: AureliaInfo) => {
          this.consumer.selectedElement = debugObject?.customElementInfo;
          this.consumer.selectedElementAttributes = debugObject?.customAttributesInfo;
        });
      });

      chrome.devtools.inspectedWindow.eval(`window.__AURELIA_DEVTOOLS_GLOBAL_HOOK__.getAllInfo()`, (debugObject: AureliaInfo[]) => {
        this.consumer.allAureliaObjects = debugObject;
      });

    }
  }

  updateValues(value: IControllerInfo, property?: IControllerInfo['bindables'][0]) {
    chrome.devtools.inspectedWindow.eval(`window.__AURELIA_DEVTOOLS_GLOBAL_HOOK__.updateValues(${JSON.stringify(value)}, ${JSON.stringify(property)})`, (debugObject: AureliaInfo) => {
      // this.consumer.selectedElement = debugObject;
    });
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
