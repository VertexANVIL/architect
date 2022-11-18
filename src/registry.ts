import { constructor, isNamed } from './utils';

/**
 * Type registry based on a "uuid" annotation
 */
export class Registry {
  public readonly data: Record<string, any> = {};

  /**
    * Arguments to be passed to the constructor of registered classes
    */
  private readonly args: any[];

  constructor(args?: any[]) {
    if (args != null) {
      this.args = args;
    } else {
      this.args = [];
    };
  };

  /**
   * Registers an instance of T with the options provided.
   * If no object is passed, a new instance of T will be instantiated and used.
   */
  public register<T>(token: constructor<T>, instance?: T) {
    if (instance == null) {
      instance = new token(...this.args);
    };

    let id = Reflect.getMetadata('uuid', token);
    if (isNamed(instance) && instance.name) {
      id += `@${instance.name}`;
    };

    if (id in this.data) {
      throw Error(`${id} already exists in this Registry`);
    };

    this.data[id] = instance;
  };

  public request<T>(token: constructor<T>, name?: string): T {
    let id = Reflect.getMetadata('uuid', token);
    if (!name && Reflect.hasMetadata('name', token)) {
      name = Reflect.getMetadata('name', token);
    };

    if (name) id += `@${name}`; // ...f38be@foobar-component
    if (!(id in this.data)) {
      throw Error(`${id} does not exist within this Registry`);
    };

    return this.data[id];
  };
};
