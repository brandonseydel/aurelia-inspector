import { DebugHost, SelectionChanged } from "./backend/debug-host";
import { ValueConverterInstance, INode, ICustomElementViewModel, IPlatform, bindable } from "aurelia";
import { IControllerInfo } from "./shared/controller-info";
import { AureliaInfo } from "./shared/aurelia-hooks";
import { resolve } from "@aurelia/kernel";

export class App implements ICustomElementViewModel {
  debugInfo: any;
  isDarkTheme: boolean = false;
  JSON = JSON;

  selectedElement: IControllerInfo = undefined;
  selectedElementAttributes: IControllerInfo[] = undefined;
  allAureliaObjects: AureliaInfo[] = undefined;

  private debugHost: DebugHost = resolve(DebugHost);
  private plat: IPlatform = resolve(IPlatform);

  constructor() {
  }

  attaching() {
    this.debugHost.attach(this);
    this.isDarkTheme = (chrome?.devtools?.panels as any)?.themeName === "dark";
    [].join()

    if (this.isDarkTheme) {
      document.querySelector('html').style.background = '#202124'
    }
  }

  get currentController() {
    return this.selectedElement;
  }

  valueChanged(element: IControllerInfo) {
    this.plat.queueMicrotask(() => this.debugHost.updateValues(element));
  }
}

export class StringifyValueConverter implements ValueConverterInstance {
  toView(value: unknown) {
    return JSON.stringify(value);
  }
}
