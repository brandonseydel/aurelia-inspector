import { ICustomElementViewModel } from 'aurelia';
import { inject, bindable, IPlatform } from 'aurelia';

import { DebugHost } from '../../backend/debug-host';
import { IControllerInfo } from '../../shared/controller-info';
import { types } from 'util';

const editableTypes = ['string', 'number', 'boolean', 'bigint'];

@inject()
export class PropertyView implements ICustomElementViewModel {
  @bindable property: IControllerInfo['bindables'][0];
  @bindable controller: IControllerInfo;
  editor: HTMLInputElement;

  constructor(public debugHost: DebugHost, @IPlatform private platform: IPlatform) { }

  beginEditing() {
    if (editableTypes.some(x => x === this.property?.type || this.property.value == null)) {
      this.property.isEditing = true;
      this.platform.queueMicrotask(() => {
        this.editor.focus();
        this.editor.select();
      });
    }
  }

  keyup(e: KeyboardEvent) {
    if (e.code === 'Enter') {
      this.endEditing();
    }

    if (this.property.type === 'undefined') {
      this.property.type = 'string';
    }
    this.platform.queueMicrotask(() => this.debugHost.updateValues(this.controller));

    return true;
  }

  endEditing() {
    this.property.isEditing = false;
  }
}
