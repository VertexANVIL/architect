import * as crypto from 'crypto';
import objectHash from 'object-hash';

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
