import { DI, IContainer, IRegistry } from "aurelia";


export type IConfiguration{

}

export const ipr = DI.createInterface<IConfiguration>('IConfiguration');


export class AureliaConfiguration implements IRegistry {
    register(container: IContainer): void {

    }

}

// export function configure(
//     aurelia: FrameworkConfiguration,
//     configCallback?: (config: Configuration) => Promise<any>,
// ) {
//     let instance = aurelia.container.get(Configuration) as Configuration;
//     let promise: Promise<any> | null = null;

//     // Do we have a callback function?
//     if (configCallback !== undefined && typeof configCallback === 'function') {
//         promise = Promise.resolve(configCallback(instance));
//     } else {
//         promise = Promise.resolve();
//     }

//     // Don't load the config until the configCallback has completed.
//     return promise.then(function () {
//         return instance.loadConfig();
//     });
// }

// export { Configuration };
