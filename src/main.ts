import Aurelia, { customElement, DI, IPlatform, PLATFORM, Registration } from "aurelia";
import { StandardConfiguration } from '@aurelia/runtime-html';

import { App } from "./app";

import * as customElements from './custom-elements';
import * as resources from './resources/index';

const aurelia = new Aurelia(DI.createContainer()
  .register(
    Registration.instance(IPlatform, PLATFORM),
    StandardConfiguration,
    customElements,
    resources
  )).app(App);
aurelia.start();
