import { customElement, ICustomElementViewModel } from 'aurelia';
import template from './custom-element.html';

@customElement({ name: 'custom-element', template })
export class CustomElement implements ICustomElementViewModel {
  constructor() {
    // you can inject the element or any DI in the constructor
  }
}
