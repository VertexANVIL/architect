import _ from 'lodash';

import { Component } from './component';
import { Registry } from './registry';
import { constructor, recursiveMerge } from './utils';

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
  public readonly extensions = new Registry([this]);
  private readonly resources: any[] = [];

  /**
    * Invokes a build operation on all components, passing our facts
    */
  public async resolve(): Promise<any> {
    const values: Component[] = Object.values(this.components.data);

    // Ensure component inter-requirements are met
    values.forEach(c => {
      c.requirements.forEach(r => {
        const matches = values.filter(d => r.match(d));
        if (matches.length <= 0) {
          throw Error(`Component ${c.toString()}\nMatcher ${r.toString()} failed`);
        };
      });
    });

    // Execute per-component configuration async
    await Promise.all(values.map(
      async (cur) => cur.configure(),
    ));

    // Execute component build async
    const results = await Promise.all(values.map(
      async (cur): Promise<any> => {
        let result = await cur.build();
        return cur.postBuild(result);
      },
    ));

    results.push(...this.resources);
    return results.reduce<any[]>((prev, cur) => {
      return recursiveMerge(prev, cur);
    }, []);
  };

  /**
   * Appends an additional set of resources to the build tree
   */
  public append(...resources: any[]): void {
    this.resources.push(...resources);
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

  /**
   * Requests the extension identified by the specified token
   */
  public extension<T>(token: constructor<T>): T {
    return this.extensions.request(token);
  };
};
