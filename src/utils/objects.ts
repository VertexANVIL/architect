import _ from 'lodash';

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

export function arrayEndsWith<T>(array: T[], suffix: T[]): boolean {
  return _.isEqual(array.slice(-suffix.length), suffix);
};

export function arrayStartsWith<T>(array: T[], prefix: T[]): boolean {
  return _.isEqual(array.slice(0, prefix.length), prefix);
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

export async function asyncFilter<T>(arr: T[], predicate: (value: T) => Promise<boolean>): Promise<T[]> {
  const results = await Promise.all(arr.map(predicate));
  return arr.filter((_v, index) => results[index]);
};
