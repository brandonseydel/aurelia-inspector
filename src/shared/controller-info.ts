import { CustomElementDefinition, CustomAttributeDefinition } from '@aurelia/runtime-html';
export interface IControllerInfo {
  name: CustomElementDefinition['name'] | CustomAttributeDefinition['name'];
  aliases: CustomElementDefinition['aliases'] | CustomAttributeDefinition['aliases'];
  key: CustomElementDefinition['key'] | CustomAttributeDefinition['key'];
  bindables: {
    bindable: CustomElementDefinition['bindables'][0] | CustomAttributeDefinition['bindables'][0],
    type: string,
    isEditing?: boolean,
    name: string, value: unknown
  }[];
  properties: {
    type: string,
    isEditing?: boolean,
    name: string,
    value: unknown
  }[];
}
