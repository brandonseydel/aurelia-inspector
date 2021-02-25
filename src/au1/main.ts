import { PLATFORM } from 'aurelia-pal';
import { Aurelia } from 'aurelia-framework';
import { bootstrap } from 'aurelia-bootstrapper';

bootstrap(async (aurelia: Aurelia) => {
  aurelia.use
    .standardConfiguration()
    .developmentLogging();

  await aurelia.start();
  aurelia.setRoot(PLATFORM.moduleName('app'), document.body);
});


