import _ from 'lodash';

import { Component } from './component';
import { ConfigurationContext } from './config';
import { Registry } from './registry';
import { ResolvedComponent, Result } from './result';
import { asyncFilter, constructor } from './utils';

export interface TargetParams {};

export interface TargetResolveParams {
  /**
   * Enable or disable validating requirements
   */
  requirements?: boolean;

  /**
   * Enable or disable validating configuration
   */
  validate?: boolean;
};

export abstract class BaseFact<T = unknown> {
  public readonly instance: T;

  constructor(instance: T) {
    this.instance = instance;
  };
};

/**
 * Context for constructing objects.
 */
export class Target {
  public readonly params: TargetParams;

  protected readonly components = new Registry([this]);
  protected readonly facts = new Registry();

  constructor(params: TargetParams = {}) {
    this.params = params;
  };

  /**
    * Invokes a build operation on all components, passing our facts
    */
  public async resolve(params: TargetResolveParams = {}): Promise<Result> {
    // Execute per-component configuration async
    // This allows us to figure out our enabled components
    {
      const context = new ConfigurationContext(this);
      await Promise.all(Object.values(this.components.data).map(
        async (v) => v.configure(context),
      ));
    };

    // Aggregate all enabled components
    const values: Component[] = await asyncFilter(
      Object.values(this.components.data),
      // TODO: somehow make the null check & .$resolve() a single operation
      async (c: Component) => ((c.props.enable !== undefined && c.props.enable.$resolve() === true)),
    );

    const results: Record<string, Partial<ResolvedComponent>> = Object.fromEntries(values.map((v): [string, Partial<ResolvedComponent>] => {
      return [v.rid, { component: v }];
    }));

    // Ensure component inter-requirements are met
    values.forEach((v) => {
      results[v.rid].dependencies = v.requirements.reduce<Component[]>((prev, cur) => {
        const matches = values.filter(v2 => cur.match(v2));
        if ((matches.length <= 0) && params.requirements !== false) {
          throw Error(`Component ${v.toString()}\nMatcher ${cur.toString()} failed`);
        };

        return prev.concat(matches);
      }, []);
    });

    // Execute component build async
    await Promise.all(values.map(async (v): Promise<void> => {
      let result = await v.build();
      if (result === undefined) return;

      results[v.rid].result = await v.postBuild(result);
    }));

    // build returning result object
    const result = new Result();
    result.components = results as Record<string, ResolvedComponent>;

    return result;
  };

  /**
   * Registers and enables the specified component
   */
  public enable<T extends Component>(token: constructor<T>, name?: string) {
    const result = this.component(token, name, true);
    result.props.$set({ enable: true });
  };

  /**
   * Requests the component identified by the specified token
   */
  public component<T extends Component>(token: constructor<T>, name?: string, auto: boolean = false): T {
    let result = this.components.request(token, name);
    if (result === undefined && auto) {
      result = new token(this, name, undefined);
      this.components.register(token, result);
    };

    return result!;
  };

  /**
   * Requests the fact identified by the specified token
   */
  public fact<T extends BaseFact>(token: constructor<T>): T {
    return this.facts.request(token)!;
  };
};

export class ValidationError extends Error {};
