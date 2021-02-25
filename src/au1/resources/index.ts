import { PLATFORM } from 'aurelia-pal';
import { FrameworkConfiguration } from 'aurelia-framework';

export function configure(config: FrameworkConfiguration) {
  config.globalResources([
    PLATFORM.moduleName('./elements/aurelia-logo.html'),
    PLATFORM.moduleName('./elements/debug-group'),
    PLATFORM.moduleName('./elements/controller-view.html'),
    PLATFORM.moduleName('./elements/property-view')
  ]);
}
