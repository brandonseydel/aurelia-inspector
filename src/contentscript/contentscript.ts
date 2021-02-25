import { CustomElement, Aurelia, Router, IContainer } from "aurelia";
import { isFirefox } from "../shared/env"
import { IComponentController } from '@aurelia/runtime-html';
import { IControllerInfo } from "../shared/controller-info";
import { AureliaHooks } from "../shared/aurelia-hooks";
import { type } from "os";

export function installScript(fn) {
  const source = ';(' + fn.toString() + ')(window, )'

  if (isFirefox) {
    // eslint-disable-next-line no-eval
    window.eval(source) // in Firefox, this evaluates on the content window
  } else {
    const script = document.createElement('script')
    script.textContent = source
    document.documentElement.appendChild(script)
    script.parentNode.removeChild(script)
  }
}

export function getAureliaInstance(win): Aurelia | undefined {
  const all = document.querySelectorAll('*')
  for (let i = 0; i < all.length; i++) {
    const aurelia = (all[i] as any).$aurelia as Aurelia;
    if (aurelia) {
      return aurelia;
    }
  }
}

export function getCustomElementInfo(element: Element) {
  return CustomElement.for(element);
}

export function install(win) {
  const hooks: AureliaHooks = {
    Aurelia: undefined,
    currentElement: undefined,
    currentAttributes: [],
    getAllInfo: (root: Element) => {
      root = root ?? document.body;
      return [hooks.getCustomElementInfo(root, false), ...Array.from(root.children).flatMap(y => hooks.getAllInfo(y))].filter(x => x);
    },
    updateValues: (info: IControllerInfo) => {
      if (!hooks.currentElement && !hooks.currentAttributes.length) return;

      const currentInfo = hooks.currentElement?.definition.key === info.key ? hooks.currentElement : hooks.currentAttributes.find(y => y.definition.key === info.key);

      info.bindables.forEach(x => currentInfo.viewModel[x.name] = x.value);
      info.properties.forEach(x => currentInfo.viewModel[x.name] = x.value);
      return undefined;
    },
    getCustomElementInfo: (element: Element, traverse: boolean = true) => {
      let customElement: IComponentController;
      let customAttributes: IComponentController[];

      try {
        while (!customElement && element !== document.body) {
          customElement = (Reflect as any).getOwnMetadata('au:resource:custom-element', element) as IComponentController;
          const customAttributeKeys = ((Reflect as any).getOwnMetadataKeys(element) as string[]).filter(y => y.includes('custom-attribute'));
          customAttributes = customAttributeKeys.map(x => (Reflect as any).getOwnMetadata(x, element) as IComponentController);
          element = element.parentElement;
          if (!traverse) break;
        }
      } catch (e) {
      }

      if (!customElement && !customAttributes) return;

      hooks.currentElement = customElement;
      hooks.currentAttributes = customAttributes;

      const customElementInfo: IControllerInfo = extractControllerInfo(customElement);
      const customAttributesInfo: IControllerInfo[] = customAttributes && customAttributes.map(extractControllerInfo).filter(x => x);
      return {
        customElementInfo,
        customAttributesInfo
      };
    }
  }

  window.addEventListener('au-started', (customEvent: CustomEvent<Aurelia>) => {
    hooks.Aurelia = customEvent.detail;
  }, { once: true });

  Object.defineProperty(win, '__AURELIA_DEVTOOLS_GLOBAL_HOOK__', {
    get() {
      return hooks;
    }
  });

  function extractControllerInfo(customElement) {
    if (!customElement) return;
    const bindableKeys = Object.keys(customElement.definition.bindables);
    const returnVal: IControllerInfo = {
      bindables: bindableKeys.map(y => ({
        bindable: customElement.definition.bindables[y],
        type: typeof (customElement.viewModel[y]),
        name: y, value: customElement.viewModel[y]
      })),
      properties: Object.keys(customElement.viewModel).filter(x => !bindableKeys.some(y => y === x)).
        filter(x => !x.startsWith('$') && typeof (customElement.viewModel[x]) !== 'object').map(y => ({
          type: typeof (customElement.viewModel[y]),
          name: y,
          value: getValueFor(customElement.viewModel[y])
        })),
      name: customElement.definition.name,
      aliases: customElement.definition.aliases,
      key: customElement.definition.key
    };
    return returnVal;
  }
  function getValueFor(value: unknown) {
    if (value instanceof Node) {
      return value.constructor.name;
    } else if (Array.isArray(value)) {
      return `Array[${value.length}]`;
    } else if (typeof (value) === 'object') {
      if (value.constructor) {
        return value.constructor.name;
      } else {
        return 'Object';
      }
    } else {
      return value;
    }
  }
}



Object.defineProperty(window, '__AURELIA_DEVTOOLS_HOOK__', {
  get() {
    return {
      getCustomElementInfo: (element: Element) => {
      }
    };
  }
});

// inject the hook
if (document instanceof HTMLDocument) {
  installScript(install)
}
