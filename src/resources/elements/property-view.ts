import { ICustomElementViewModel } from 'aurelia';
import { resolve, bindable, IPlatform } from 'aurelia';

import { DebugHost } from '../../backend/debug-host';
import { IControllerInfo } from '../../shared/controller-info';
import { types } from 'util';

const editableTypes = ['string', 'number', 'boolean', 'bigint'];

export class PropertyView implements ICustomElementViewModel {
  @bindable property: IControllerInfo['bindables'][0];
  @bindable controller: IControllerInfo;
  editor: HTMLInputElement;

  private platform: IPlatform = resolve(IPlatform);
  private debugHost: DebugHost = resolve(DebugHost);

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
    this.platform.queueMicrotask(() => this.debugHost.updateValues(this.controller, this.property));

    return true;
  }

  endEditing() {
    this.property.isEditing = false;
  }
}
