import _ from 'lodash';

import { Component } from './component';
import { Registry } from './registry';
import { ResolvedComponent, Result } from './result';
import { constructor } from './utils';

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

export abstract class BaseFact<T> {
  public readonly instance: T;

  constructor(instance: T) {
    this.instance = instance;
  };
};

/**
 * Context for constructing objects.
 */
export class Target {
  public readonly components = new Registry([this]);
  public readonly facts = new Registry();

  /**
    * Invokes a build operation on all components, passing our facts
    */
  public async resolve(params: TargetResolveParams = {}): Promise<Result> {
    const values: Component[] = Object.values(this.components.data);
    const results: Record<string, Partial<ResolvedComponent>> = Object.fromEntries(values.map((v): [string, Partial<ResolvedComponent>] => {
      return [v.rid, { component: v }];
    }));

    // Ensure component inter-requirements are met
    values.forEach((v) => {
      results[v.rid].dependencies = v.requirements.reduce<Component[]>((prev, cur) => {
        const matches = Object.values(this.components.data).filter(v2 => cur.match(v2));
        if ((matches.length <= 0) && params.requirements !== false) {
          throw Error(`Component ${v.toString()}\nMatcher ${cur.toString()} failed`);
        };

        return prev.concat(matches);
      }, []);
    });

    // Execute per-component configuration async
    await Promise.all(values.map(
      async (v) => v.configure(),
    ));

    // Execute component build async
    await Promise.all(values.map(async (v): Promise<void> => {
      let result = await v.build();
      results[v.rid].result = await v.postBuild(result);
    }));

    // build returning result object
    const result = new Result();
    result.components = results as Record<string, ResolvedComponent>;

    return result;
  };

  /**
   * Requests the component identified by the specified token
   */
  public component<T>(token: constructor<T>): T {
    return this.components.request(token);
  };

  /**
   * Requests the fact identified by the specified token
   */
  public fact<T>(token: constructor<T>): T {
    return this.facts.request(token);
  };
};

export class ValidationError extends Error {};
