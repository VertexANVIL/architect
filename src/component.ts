import 'reflect-metadata';
import _ from 'lodash';

import { Capability } from './capability';
import { ConfigurationContext } from './config';
import { Target } from './target';
import { constructor, Lazy, LazyTree, Named, setNamed } from './utils';

export interface ComponentArgs {
  /**
   * Whether the component is enabled.
   */
  enable?: boolean;
};

/**
 * Base unit of resource management that produces objects
 * to be merged into the resultant configuration tree
 */
export abstract class Component<
  TResult extends object = any,
  TArgs extends ComponentArgs = ComponentArgs,
  TParent extends Component = any
> implements Named {
  protected readonly target: Target;

  protected readonly children: Component[] = [];
  protected readonly parent?: TParent;

  public readonly name: string;
  public props: LazyTree<TArgs>;

  constructor(target: Target, props: TArgs = {} as TArgs, name?: string, parent?: TParent) {
    this.target = target;
    this.parent = parent;

    if (this.parent !== undefined) {
      if (name !== undefined) {
        throw Error('the name parameter must be left undefined when a parent is specified');
      };

      this.name = this.parent.name;
    } else {
      if (!Reflect.hasMetadata('name', this.constructor) || !Reflect.hasMetadata('uuid', this.constructor)) {
        throw Error(`${this.constructor.name}: the name and uuid metadata attributes must be set`);
      };

      // default the name to our metadata attribute
      if (name !== undefined) {
        this.name = name;
      } else {
        this.name = Reflect.getMetadata('name', this.constructor);
      };
    };

    // hacky way to leave this defaultable
    if (props === undefined) {
      props = {} as TArgs;
    };

    this.props = Lazy.from(props);

    // Component is a Named
    setNamed(this);

    // Run initialiser
    this.init();
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
   * Adds a child by constructing it and adding it to this component
   */
  protected addChild(child: constructor<Component>) {
    const instance = new child(this.target, undefined, undefined, this);
    this.children.push(instance);
  };

  /**
   * Constructs this component, setting properties on the Result object.
   */
  public async build(result: TResult = {} as any): Promise<TResult> {
    for (const c of this.children) {
      result = await c.build(result);
    };

    return result;
  };

  /**
   * Invoked by the target during the build phase. Sets lazy properties on other components.
   */
  public async configure(_context: ConfigurationContext) {
    await Promise.all(this.children.map(c => c.configure));
  };

  /**
   * Implementation of custom initialisation behaviour.
   * Override this instead of overriding the constructor to avoid boilerplate code.
   */
  public init() {};

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
    if (this.parent !== undefined) {
      return this.parent.uuid;
    };

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
