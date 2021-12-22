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
  let nextDebugId = 0;
  let debugValueLookup = {}

  const hooks: AureliaHooks = {
    Aurelia: undefined,
    currentElement: undefined,
    currentAttributes: [],
    getAllInfo: (root: Element) => {
      root = root ?? document.body;
      return [hooks.getCustomElementInfo(root, false), ...Array.from(root.children).flatMap(y => hooks.getAllInfo(y))].filter(x => x);
    },
    updateValues: (info: IControllerInfo, property: IControllerInfo['bindables'][0]) => {
      if (!hooks.currentElement && !hooks.currentAttributes.length) return;

      const currentInfo = hooks.currentElement?.definition.key === info.key ? hooks.currentElement : hooks.currentAttributes.find(y => y.definition.key === info.key);

      info.bindables.forEach(x => currentInfo.viewModel[x.name] = x.value);
      info.properties.forEach(x => {
        // HMM: Not sure if we need the .value check
        const isObject = x.value === 'Object' && x.type === 'object';
        if (isObject) {
          let targetProp = currentInfo.viewModel[x.name][property.name]
          if (!targetProp) return

          currentInfo.viewModel[x.name][property.name] = property.value

          return
        };

        currentInfo.viewModel[x.name] = x.value
      });
      return undefined;
    },
    getCustomElementInfo: (element: Element, traverse: boolean = true) => {
      let customElement: IComponentController;
      let customAttributes: IComponentController[];

      try {
        while (!customElement && element !== document.body) {
          const au = element['$au'];
          if (au) {
            customElement = element['$au']['au:resource:custom-element'];
            const customAttributeKeys = Object.getOwnPropertyNames(au).filter(y => y.includes('custom-attribute'));
            customAttributes = customAttributeKeys.map(x => au[x] as IComponentController);
          }
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
    },

    getExpandedDebugValueForId(id) {
      let value = debugValueLookup[id].expandableValue;

      if (Array.isArray(value)) {
        let newValue = {};
        value.forEach((value, index) => {
          newValue[index] = value
        });
        value = newValue;
      }

      return convertObjectToDebugInfo(value);
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
      bindables: bindableKeys.map(y => {
        return setValueOnDebugInfo({
          name: y
        }, customElement.viewModel[y], customElement.viewModel);
        // return {
        //   bindable: customElement.definition.bindables[y],
        //   type: typeof (customElement.viewModel[y]),
        //   name: y, value: customElement.viewModel[y]
        // }
      }),
      properties: Object.keys(customElement.viewModel).filter(x => !bindableKeys.some(y => y === x)).
        filter(x => !x.startsWith('$')).map(y => {
          return setValueOnDebugInfo({
            name: y
          }, customElement.viewModel[y], customElement.viewModel);

          // return {
          //   type: typeof (customElement.viewModel[y]),
          //   name: y,
          //   value: getValueFor(customElement.viewModel[y])
          // }
        }),
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

  function setValueOnDebugInfo(debugInfo, value, instance) {
    try {
      let expandableValue:any;

      if (value instanceof Node) {
        debugInfo.canExpand = true;
        debugInfo.type = 'node';
        debugInfo.value = value.constructor.name;
        expandableValue = value;
      } else if (Array.isArray(value)) {
        debugInfo.canExpand = true;
        debugInfo.type = 'array';
        debugInfo.value = `Array[${value.length}]`;
        expandableValue = value;
      } else {
        debugInfo.type = typeof value;
        debugInfo.value = value;
      }

      if (value === null) {
        debugInfo.type = 'null';
        debugInfo.value = 'null';
      } else if (value === undefined) {
        debugInfo.type = 'undefined';
        debugInfo.value = 'undefined';
      } else if (debugInfo.type === 'object') {
        debugInfo.canExpand = true;
        expandableValue = value;

        if (value.constructor) {
          debugInfo.value = value.constructor.name;
        } else {
          debugInfo.value = 'Object';
        }
      }

      if (debugInfo.type === 'string' || debugInfo.type === 'number' || debugInfo.type === 'boolean') {
        debugInfo.canEdit = true;
      }

      debugInfo.debugId = debugInfo.debugId || getNextDebugId();

      debugValueLookup[debugInfo.debugId] = Object.assign({
        instance: instance,
        expandableValue: expandableValue
      }, debugInfo);

      return debugInfo;
    } catch(e) {
      return createErrorObject(e);
    }
  }

  function createControllerDebugInfo(controller) {
    try {
      let controllerDebugInfo: any = {
        name: controller.behavior.elementName || controller.behavior.attributeName
      };

      let viewModel = controller.viewModel;
      let bindableKeys = {};

      controllerDebugInfo.bindables = controller.behavior.properties.map(x => {
        bindableKeys[x.name] = true;
        return setValueOnDebugInfo({
          name: x.name,
          attribute: x.attribute,
        }, viewModel[x.name], viewModel);
      });

      controllerDebugInfo.properties = getDebugPropertyKeys(viewModel)
        .filter(x => !(x in bindableKeys))
        .map(x => {
          return setValueOnDebugInfo({
            name: x
          }, viewModel[x], viewModel);
        });

      return controllerDebugInfo;
    } catch (e) {
      return createErrorObject(e);
    }
  }

  function convertObjectToDebugInfo(obj, blackList?): Pick<IControllerInfo, 'properties'> {
    blackList = blackList || {};
    return {
      properties: getDebugPropertyKeys(obj)
        .filter(x => !(x in blackList))
        .map(x => {
          return setValueOnDebugInfo({
            name: x
          }, obj[x], obj);
        })
    };
  }

  function getDebugInfoForNode(selectedNode) {
    try {
      var debugInfo: any = {};

      nextDebugId = 0;

      if (selectedNode.au) {
        var au = selectedNode.au;

        if (au.controller) {
          debugInfo.customElement = createControllerDebugInfo(au.controller);
        }

        var tagName = selectedNode.tagName ? selectedNode.tagName.toLowerCase() : null;
        var customAttributeNames = getDebugPropertyKeys(au)
          .filter(function (key) {
            return key !== 'controller' && key !== tagName;
          });

        if (customAttributeNames.length) {
          debugInfo.customAttributes = customAttributeNames.map(x => createControllerDebugInfo(au[x]));
        }
      }

      let owningView = findOwningViewOfNode(selectedNode);

      if (owningView) {
        if (owningView.bindingContext) {
          debugInfo.bindingContext = convertObjectToDebugInfo(owningView.bindingContext);
        }

        if (owningView.overrideContext) {
          debugInfo.overrideContext = convertObjectToDebugInfo(
            owningView.overrideContext,
            { bindingContext: true, parentOverrideContext: true }
          );
        }
      }

      return debugInfo;
    } catch (e) {
      return createErrorObject(e);
    }
  }


  function findOwningViewOfNode(node) {
    function moveUp(n) {
      let current = n.parentNode;

      if (current) {
        return findComposingView(current) || findSiblingRepeaterView(current) || findImmediateControllerOwningView(current) || moveUp(current);
      }

      return null;
    }

    return attachedOwner(node) || findSiblingRepeaterView(node) || findImmediateControllerOwningView(node) || moveUp(node);
  }

  function updateValueForId(id, value) {
    let debugInfo = debugValueLookup[id];
    debugInfo.instance[debugInfo.name] = value;
    setValueOnDebugInfo(debugInfo, value, debugInfo.instance);
  }


  function getNextDebugId() {
    return ++nextDebugId;
  }

  function createErrorObject(e): IControllerInfo['properties'] {
    return [{
      // bindingContext: {
        // properties: [
          // {
            name: 'Debugger Error',
            value: e.message,
            type: 'string',
            canEdit: false
          // }
        // ]
      // }
    }]
  }

  function attachedOwner(node) {
    let ownerView = node.auOwnerView;

    if (ownerView && ownerView.viewFactory) {
      return ownerView;
    }

    return null;
  }

  function nodeIsImmediateChildOfView(view, node) {
    let currentChild = view.firstChild
    let lastChild = view.lastChild;
    let nextChild;

    while (currentChild) {
      nextChild = currentChild.nextSibling;

      if (currentChild === node) {
        return true;
      }

      if (currentChild === lastChild) {
        break;
      }

      currentChild = nextChild;
    }

    return false;
  }

  function findSiblingRepeaterView(node) {
    if (!node) {
      return null;
    }

    let current = node.nextSibling;

    while (current) {
      if (current.nodeType === 8 && current.viewSlot && current.data === 'anchor') {
        let children = current.viewSlot.children;

        for (let i = 0, ii = children.length; i < ii; ++i) {
          let view = children[i];

          if (nodeIsImmediateChildOfView(view, node)) {
            return view;
          }
        }
      }

      current = current.nextSibling;
    }

    return null;
  }

  function findImmediateControllerOwningView(node) {
    let parent = node.parentNode;

    if (parent && parent.au && parent.au.controller
      && parent.au.controller.view && nodeIsImmediateChildOfView(parent.au.controller.view, node)) {
      return parent.au.controller.view;
    }

    return null;
  }

  function findComposingView(node) {
    if (!node) {
      return null;
    }

    if (node.aurelia) {
      return node.aurelia.root.view;
    } else if (attachedOwner(node)) {
      return attachedOwner(node);
    } else if (node.au) {
      var au = node.au;

      if (au.controller) { //custom element
        var controller = au.controller;
        var tagName = node.tagName ? node.tagName.toLowerCase() : null;

        if (tagName === 'router-view') {
          return controller.viewModel.view;
        } else if (tagName === 'compose') {
          return controller.viewModel.currentController.view;
        } else if (controller['with']) {
          return controller['with'].viewModel.view;
        }
      }
    }

    return null;
  }

  function getDebugPropertyKeys(obj) {
    let props = [];

    const keys = [...Object.keys(obj), ...Object.getOwnPropertyNames(obj)];
    const uniqueKeys = keys.filter((value, i, arr) => arr.indexOf(value) === i);

    for (const key of uniqueKeys) {
      if (key && !key.startsWith('_') && typeof obj[key] !== 'function') {
        props.push(key);
      }
    }

    return props;
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
