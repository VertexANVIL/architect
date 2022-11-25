import 'reflect-metadata';
import _ from 'lodash';

import { Capability } from './capability';
import { ConfigurationContext } from './config';
import { Target } from './target';
import { constructor, Lazy, LazyTree, Named, setNamed } from './utils';

export class ComponentArgs {
  /**
   * Whether the component is enabled.
   */
  enable: boolean = false;
};

/**
 * Base unit of resource management that produces objects
 * to be merged into the resultant configuration tree
 */
export abstract class Component<TArgs extends ComponentArgs = ComponentArgs> implements Named {
  protected readonly target: Target;
  public readonly name: string;
  public props: LazyTree<TArgs>;

  constructor(target: Target, name?: string, props: TArgs = new ComponentArgs() as TArgs) {
    if (!Reflect.hasMetadata('name', this.constructor) || !Reflect.hasMetadata('uuid', this.constructor)) {
      throw Error(`${this.constructor.name}: the name and uuid metadata attributes must be set`);
    };

    this.target = target;

    // default the name to our metadata attribute
    if (name !== undefined) {
      this.name = name;
    } else {
      this.name = Reflect.getMetadata('name', this.constructor);
    };

    // hacky way to leave this defaultable
    if (props === undefined) {
      props = {} as TArgs;
    };

    this.props = Lazy.from(props);

    // Component is a Named
    setNamed(this);
  };

  /**
   * Returns the capabilities that this component declares
   */
  public get capabilities(): Capability<any>[] {
    return [];
  };

  /**
   * Returns the component types required by this component
   */
  public get requirements(): IComponentMatcher[] {
    return [];
  };

  /**
   * Invoked by the target during the build phase. Sets lazy properties on other components.
   */
  public async configure(_context: ConfigurationContext) {};

  /**
   * Constructs this component, returning the object that should be merged into the global tree.
   */
  public async build(): Promise<any> { return undefined; };

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
   * Returns this component's short result ID (RID)
   */
  public get rid(): string {
    return `${this.name}-${this.uuid.slice(0, 7)}`;
  };

  /**
   * Returns a prettified identifier of this component
   */
  public toString(): string {
    return this.rid;
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
  private readonly token: constructor<Component>;
  constructor(token: constructor<Component>) {
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
