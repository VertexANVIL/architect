import _ from 'lodash';
import { constructor } from './types';

/**
 * Returns true when type of `value` is `object` and is not `null`, `undefined` or
 * an array.
 *
 * @public
 */
export function isRecord(
  value: unknown,
): value is Record<string | symbol, unknown> {
  return value != null && typeof value === 'object' && !Array.isArray(value);
};

/**
 * Transforms `input` into an array, or leave it as-is if `input` is already an array.
 *
 * @public
 */
export function toArray<T>(input: T | T[]): T[] {
  return Array.isArray(input) ? input : [input];
};

/**
 * Returns `code` of an error-like object.
 *
 * @public
 */
export function getErrorCode(err: unknown): string | undefined {
  if (isRecord(err) && typeof err.code === 'string') {
    return err.code;
  };

  return;
};

/**
 * Recursively merges the following objects, properly handling array values
 */
export function recursiveMerge(object: any, source: any): any {
  if (_.isArray(object)) {
    return object.concat(source);
  };

  function customizer(objValue: any, srcValue: any) {
    if (_.isArray(objValue)) {
      return objValue.concat(srcValue);
    };

    return undefined;
  };

  return _.mergeWith(object, source, customizer);
};

/**
 * Recursively merges an array of values
 */
export function recursiveMergeThese<T>(source: T[]): T {
  return source.reduce<T>((prev, cur) => {
    if (prev === undefined) return cur;
    return recursiveMerge(prev, cur);
  }, undefined as any);
};

export function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  if (value === null || value === undefined) return false;
  return true;
};

/**
 * Variant of {Record<string, T>} that automatically constructs an instance of its child if it does not exist
 */
export class AutoRecord {
  public static new<T>(value: constructor<T>): Record<string, T> {
    const handler = {
      get(target: any, prop: string, _receiver: any): any {
        if (prop in target) {
          return target.prop;
        };

        const instance = new value();
        target[prop] = instance;

        return instance;
      },
    };

    return new Proxy({}, handler);
  };
};
