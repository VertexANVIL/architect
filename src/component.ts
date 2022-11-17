import 'reflect-metadata';
import _ from 'lodash';

import { Capability } from './capability';
import { Target } from './target';
import { constructor, Lazy, LazyTree } from './utils';

/**
 * Base unit of resource management that produces objects
 * to be merged into the resultant configuration tree
 */
export abstract class Component<TArgs extends object = any> {
  protected readonly target: Target;
  protected readonly name?: string;
  public props: LazyTree<TArgs>;

  constructor(target: Target, name?: string, props?: TArgs) {
    this.target = target;
    this.name = name;

    // hacky way to leave this defaultable
    if (props === undefined) {
      props = {} as TArgs;
    };

    this.props = Lazy.from(props);
  };

  public get capabilities(): Capability<any>[] {
    return [];
  };

  /**
   * Returns the component types required by nbbthis component
   */
  public get requirements(): IComponentMatcher[] {
    return [];
  };

  /**
   * Invoked by the target during the build phase. Sets lazy properties on other components.
   */
  public async configure() {};

  /**
   * Constructs this component, returning the object that should be merged into the global tree.
   */
  public abstract build(): Promise<any>;

  /**
   * Passthrough function that performs postprocessing on this component's build outputs
   */
  public postBuild(data: any): any {
    return data;
  };

  /**
   * Returns this component's UUID
   */
  public get uuid(): string {
    return Reflect.getMetadata('uuid', this.constructor);
  };

  /**
   * Returns a prettified identifier of this component
   */
  public toString(): string {
    return `${this.constructor.name}-${this.uuid.slice(0, 7)}`;
  };
};

/**
 * Defines an object that matches one or more components according to a defined ruleset
 */
export interface IComponentMatcher {
  match(input: Component): boolean;
  toString(): string;
};

export class ComponentMatcher implements IComponentMatcher {
  private readonly token: constructor<any>;
  constructor(token: constructor<any>) {
    this.token = token;
  };

  match(input: Component): boolean {
    const uuid = Reflect.getMetadata('uuid', this.token);
    return input.uuid === uuid;
  };

  toString(): string {
    return `${this.constructor.name}(${this.token.name})`;
  }
};
