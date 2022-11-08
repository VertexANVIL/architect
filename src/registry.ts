import { constructor } from './utils';

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

    const id = Reflect.getMetadata('uuid', token);
    this.data[id] = instance;
  };

  public request<T>(token: constructor<T>): T {
    const id = Reflect.getMetadata('uuid', token);
    return this.data[id];
  };
};
