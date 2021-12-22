import { CustomElementDefinition, CustomAttributeDefinition } from '@aurelia/runtime-html';

export interface Property {
  type: string,
  canExpand?: boolean,
  canEdit?: boolean,
  isEditing?: boolean,
  isExpanding?: boolean,
  name: string,
  value: unknown
}

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
  properties: Property[];
}
