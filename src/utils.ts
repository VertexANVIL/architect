import * as crypto from 'crypto';

import appDirs from 'appdirsjs';
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
