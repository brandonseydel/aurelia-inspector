import { IComponentController } from '@aurelia/runtime-html';
import Aurelia, { IContainer } from 'aurelia';
import { IControllerInfo } from './controller-info';

export type AureliaInfo = {
  customElementInfo: IControllerInfo;
  customAttributesInfo: IControllerInfo[];
};

export interface AureliaHooks {
  currentAttributes: IComponentController[];
  currentElement: IComponentController;
  Aurelia?: Aurelia;
  getCustomElementInfo?: (e: Element, traverse: boolean) => AureliaInfo;
  getAllInfo: (e: Element) => AureliaInfo[];
  updateValues: (obj: IControllerInfo) => IControllerInfo;
}
