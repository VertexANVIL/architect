import * as crypto from 'crypto';

import appDirs from 'appdirsjs';
import _ from 'lodash';
import objectHash from 'object-hash';

/**
 * Constructor type, ported from tsyringe
 */
export type constructor<T> = {
  new (...args: any[]): T;
};

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

export function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  if (value === null || value === undefined) return false;
  /* tslint:disable:no-unused-variable */
  const testDummy: TValue = value;
  return true;
};

/**
 * Returns the composite hash of all objects specified by the parameter.
 *
 * @public
 */
export function compositeHash(objects: any[]): string {
  const hash = crypto.createHash('md5');
  objects.forEach(object => hash.update(objectHash(object)));

  return hash.digest('hex');
};

export const appdir = appDirs({
  appName: 'architect',
});
