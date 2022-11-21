import _ from 'lodash';

import { Component } from './component';
import { Registry } from './registry';
import { Result } from './result';
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
    const values: [string, Component][] = Object.entries(this.components.data);

    // Ensure component inter-requirements are met
    if (params.requirements !== false) {
      values.forEach(([_k, v]) => {
        v.requirements.forEach(r => {
          const matches = values.filter(([_k2, v2]) => r.match(v2));
          if (matches.length <= 0) {
            throw Error(`Component ${v.toString()}\nMatcher ${r.toString()} failed`);
          };
        });
      });
    };

    // Execute per-component configuration async
    await Promise.all(values.map(
      async ([_k, v]) => v.configure(),
    ));

    // Execute component build async
    const results = await Promise.all(values.map(
      async ([_k, v]): Promise<[string, Component]> => {
        let result = await v.build();
        return [v.toString(), v.postBuild(result)];
      },
    ));

    // build returning result object
    const result = new Result();
    results.forEach(([k, v]) => {
      result.components[k] = v;
    });

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
