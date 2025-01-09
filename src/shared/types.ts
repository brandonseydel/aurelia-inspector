import { IControllerInfo } from "./controller-info";

type DefaultPayload = {
  properties: IControllerInfo["properties"];
  customElementInfo: IControllerInfo;
  customAttributesInfo: IControllerInfo[];
};

export interface IMessages<T = DefaultPayload> {
  type: string;
  payload: T;
}
