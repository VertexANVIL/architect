import 'reflect-metadata';
import _ from 'lodash';

import { Capability } from './capability';
import { ConfigurationContext } from './config';
import { Target } from './target';
import { constructor, Lazy, LazyAuto, Named, setNamed } from './utils';

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
  public props: LazyAuto<TArgs>;

  constructor(target: Target, props: TArgs = {} as TArgs, name?: string, parent?: TParent) {
    this.target = target;
    this.parent = parent;

    if (!Reflect.hasMetadata('uuid', this.constructor) && this.parent === undefined) {
      throw Error(`${this.constructor.name}: the uuid metadata attribute must be set`);
    };

    if (name !== undefined) {
      this.name = name;
    } else if (Reflect.hasMetadata('name', this.constructor)) {
      this.name = Reflect.getMetadata('name', this.constructor);
    } else {
      // if the name is not present and we have a parent, use the parent's name, otherwise throw
      if (this.parent !== undefined) {
        this.name = this.parent.name;
      } else {
        throw Error(`${this.constructor.name}: the name metadata attribute must be set`);
      };
    };

    // hacky way to leave this defaultable
    if (props === undefined) {
      props = {} as TArgs;
    };

    this.props = Lazy.from(props);

    // Component is a Named
    setNamed(this);

    // Configure
    this.configure(new ConfigurationContext(target, this.props));

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
    // if we have a parent, add an automatic requirement on it
    if (this.parent !== undefined) {
      return [new ComponentInstanceMatcher(this.parent)];
    };

    return [];
  };

  /**
   * Adds a child by constructing it and adding it to this component
   */
  protected addChild(child: constructor<Component>, independent = false) {
    const instance = new child(this.target, undefined, undefined, this);
    instance.props.$set({ enable: this.props.enable });

    if (independent) {
      this.target.components.register(child, instance);
    } else {
      this.children.push(instance);
    };
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
  public configure(_context: ConfigurationContext) {
    this.children.forEach(c => c.configure);
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

export class ComponentInstanceMatcher implements IComponentMatcher {
  private readonly instance: Component;
  constructor(instance: Component) {
    this.instance = instance;
  };

  match(input: Component): boolean {
    return input === this.instance;
  };

  toString(): string {
    return `${this.constructor.name}(${this.instance.rid})`;
  }
};
