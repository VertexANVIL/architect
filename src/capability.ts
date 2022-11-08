import 'reflect-metadata';

import { Component, IComponentMatcher } from './component';
import { constructor } from './utils';

type CapabilityCondition<T extends Capability<any>> = (capability: T) => boolean;

export abstract class Capability<T> {
  public readonly data: T;

  constructor(data: T) {
    this.data = data;
  };

  public get uuid(): string {
    return Reflect.getMetadata('uuid', this.constructor);
  };
};

export class CapabilityMatcher<T extends Capability<any>> implements IComponentMatcher {
  private readonly token: constructor<any>;
  private readonly condition?: CapabilityCondition<T>;

  constructor(token: constructor<T>, condition?: CapabilityCondition<T>) {
    this.token = token;
    this.condition = condition;
  };

  match(input: Component): boolean {
    const uuid = Reflect.getMetadata('uuid', this.token);
    const capability = input.capabilities.find(object => {
      return object.uuid === uuid;
    });

    if (!capability) return false;
    if (this.condition && !this.condition(capability as any)) return false;

    return true;
  };

  toString(): string {
    return `${this.constructor.name}(${this.token.name})`;
  };
};
