import _ from 'lodash';
import { Target } from './target';

/**
 * Base unit of resource management that produces objects
 * to be merged into the resultant configuration tree
 */
export abstract class Component {
  protected target: Target;

  constructor(target: Target) {
    this.target = target;
  };

  /**
     * Returns the default name of this component.
     */
  public abstract get name(): string;

  // public get urn(): string {
  //     const suffix = Reflect.getMetadata("uuid", this).slice(0, 7);
  //     return `${this.name}-${suffix}`
  // };

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
};
