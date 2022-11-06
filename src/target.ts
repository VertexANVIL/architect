import 'reflect-metadata';
import _ from 'lodash';

import { Registry } from './registry';
import { constructor } from './utils';

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

  /**
     * Invokes a build operation on all components, passing our facts
     */
  public async resolve(): Promise<any> {
    // Execute component build async
    const results = await Promise.all(Object.values(this.components.data).map(
      async (cur): Promise<any> => {
        let result = await cur.build();
        return cur.postBuild(result);
      },
    ));

    return results.reduce<any[]>((prev, cur) => {
      return _.merge(prev, cur);
    }, []);
  };

  public extension<T>(token: constructor<T>): T {
    return this.extensions.request(token);
  };

  public fact<T>(token: constructor<T>): T {
    return this.facts.request(token);
  };
};
