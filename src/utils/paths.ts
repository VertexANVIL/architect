import _ from 'lodash';

export type ValuePathKey = string | symbol | number;
export type ValuePath = ValuePathKey[];

export class ValuePathUtils {
  public static at(value: any, path: ValuePath): any {
    // Recurse through the object until we retrieve the path value
    let current = value;
    for (const key of path) {
      current = current[key];
    };

    return current;
  };

  /**
   * Place the value at the specified path in the object
   */
  public static merge(target: any, value: any, path: ValuePath): any {
    if (path.length <= 0) {
      if (target !== undefined && _.isObject(target) && !_.isFunction(target)) {
        return _.merge(target, value);
      } else {
        return value;
      };
    };

    // Recurse through the object until we reach the path
    const curr = path[0];
    const array = typeof(curr) === 'number';

    if (target === undefined) {
      target = array ? [] : {};
    } else if (!array && !_.isObject(target)) {
      target = {};
    } else if (array && !_.isArray(target)) {
      target = [];
    };

    // do we have an array or an object?
    const next = path.slice(1);
    if (array) {
      (target as any[]).push(ValuePathUtils.merge(undefined, value, next));
    } else {
      if (!(curr in target)) target[curr] = next.length > 0 ? (typeof(next[0]) === 'number' ? [] : {}) : undefined;
      target[curr] = ValuePathUtils.merge(target[curr], value, next);
    };

    return target;
  };
};
