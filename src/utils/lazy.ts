import _ from 'lodash';
import { arrayStartsWith, isEmptyObject, recursiveMerge } from './objects';
import { isObjectDeepKeys, PathResultBuilder, ValuePath, ValuePathKey } from './paths';
import { DeepPartial, Resolver, Value } from './value';

const LAZY_PROXY_SYMBOL = Symbol.for('akim.architect.LazyProxy');

interface _LazyProxy<T> {
  /**
   * The root of the Lazy tree
   */
  $__root__: Lazy<T>;

  /**
   * The path to the current value in the tree
   */
  $__path__: ValuePath;

  /**
    * Resolves the entire configuration tree and returns the result
    * @param fallback Default value to be merged if the value does not exist
    * @returns The result of the evaluation
    */
  $resolve(fallback?: Partial<T>, force?: boolean): Promise<T>;

  // /**
  //   * Creates a reference within the context of this object
  //   * @param fallback Fallback value if the result is undefined
  //   * @returns A Resolver function containing the result
  //   */
  // $ref<K>(func: Ref<T, K>, fallback?: K): Resolver<K>;

  /**
    * Sets the value of this object recursively, from a value or another Lazy<U>
    * @param value The value to set the object to, or a Lazy container with a value
    * @param weight The weight to assign to child objects
    * @param force Override the entire value instead of merging it in the case of objects or arrays.
    * @param condition Sets the value based on a condition. If the condition evaluates to false, the value will be skipped.
    * Note that conditions that reference the value of this object will cause infinite recursion.
    */
  $set(value: DeepLazySpec<DeepPartial<T>>, weight?: number, force?: boolean, condition?: Condition): void;
};

class LazyProxy {
  public static from<T>(root: Lazy<any>, path: ValuePath = []): LazyAuto<T> {
    const internal = {
      $__root__: root,
      $__path__: path,

      $resolve: async (fallback?: Partial<T>) => {
        let result: any;
        try {
          result = await root.get(path);
          if (fallback !== undefined) {
            if (result !== undefined && isObjectDeepKeys(result)) {
              // we can only do this safely if we have an object
              result = recursiveMerge(fallback, result);
            } else {
              result = fallback;
            };
          };
        } catch (error) {
          if (error instanceof TypeError && fallback !== undefined) {
            result = fallback;
          } else {
            throw error;
          };
        };

        return result;
      },

      $set(value, weight?, force?, condition?) {
        root.set(path, value, weight, force, condition);
      },
    } as _LazyProxy<T>;

    Object.defineProperty(internal, LAZY_PROXY_SYMBOL, { value: true, enumerable: true });

    function accessor(key: ValuePathKey) {
      const _path = internal.$__path__.concat(key.toString());
      return LazyProxy.from(internal.$__root__, _path);
    };

    return new Proxy(internal, {
      defineProperty(_target, _property, _attributes) {
        throw new Error('cannot mutate properties of lazy object with dot notation, use the .$set() function instead');
      },

      deleteProperty(_target, _p) {
        throw new Error('cannot mutate properties of lazy object with dot notation, use the .$set() function instead');
      },

      get(target, p, receiver) {
        if (Reflect.has(target, p)) {
          return Reflect.get(target, p, receiver);
        };

        return accessor(p);
      },
    }) as LazyAuto<T>;
  };

  public static is<T>(value: any): value is _LazyProxy<T> {
    return (typeof(value) === 'object' && LAZY_PROXY_SYMBOL in value && value[LAZY_PROXY_SYMBOL]);
  };
};

interface LazyValue<T> {
  cache?: T;
  condition?: Condition;
  force: boolean;
  path: ValuePath;
  value: Value<T>;
  weight: number;
};

export class Lazy<T> {
  public static from<T>(value: Value<T>): LazyAuto<T> {
    const instance = new Lazy(value);
    return LazyProxy.from(instance);
  };

  private readonly values: LazyValue<T>[] = [];
  private constructor(value: Value<T>) {
    this.set([], value);
  };

  private matchValues(path: ValuePath): LazyValue<T>[] {
    let values: LazyValue<T>[] = [];
    {
      let curr = _.clone(path);
      while (true) {
        values.push(...this.values.filter(
          v => _.isEqual(v.path, curr)),
        );

        if (curr.length <= 0) break;
        curr.pop();
      };
    };

    // match children and push them to the list
    values.push(...this.values.filter(
      v => v.path.length > 0 && arrayStartsWith(v.path, path) && !_.isEqual(v.path, path)),
    );

    // sort the values by weight
    values = _.sortBy(values, v => v.weight);
    return values;
  };

  /**
   * Gets the value at the specified ValuePath.
   */
  public async get(path: ValuePath): Promise<any> {
    const values = this.matchValues(path);
    if (values.length <= 0) {
      throw new TypeError(`no value found at path ${path.join('.')}`);
    };

    const builder = new PathResultBuilder();

    for (const value of values) {
      if (value.condition) {
        if (LazyProxy.is(value.condition)) {
          if (!(await value.condition.$resolve())) continue;
        } else {
          let test = await value.condition();
          if ((LazyProxy.is(test) && !(await test.$resolve())) || !test) {
            continue;
          };
        };
      };

      let temp: T;
      if (typeof value.value === 'function') {
        temp = await (value.value as Resolver<T>)();
      } else {
        temp = value.value;
      };

      const resolved = _.cloneDeep(LazyProxy.is(temp) ? await temp.$resolve() : temp);
      builder.set(value.path, resolved, value.force, value.weight);
    };

    // traverse into the result to get the final value
    const result = builder.resolve();
    if (result === undefined) return result;

    let curr = result;
    for (const key of path) {
      if (curr === undefined) {
        throw new TypeError(`attempted to read value of undefined at ${path.join('.')}`);
      };

      curr = curr[key];
    };

    return curr;
  };

  /**
   * Sets the value at the specified ValuePath.
   */
  public set(path: ValuePath, value_: Value<any>, weight: number = 0, force: boolean = false, condition?: Condition) {
    // if the value is a proxy, we need to create a resolver for it
    const value = LazyProxy.is(value_) ? async () => value_ : value_;

    // do not collapse object values if we're forcing the value, treat it as atomic
    if (!isObjectDeepKeys(value) || isEmptyObject(value) || force) {
      this.values.push({
        condition: condition,
        force: force,
        path: path,
        value: value,
        weight: weight,
      });
    } else if (_.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        this.set(path.concat(-1), value[i], weight, force, condition);
      };
    } else {
      for (const [k, v] of Object.entries(value)) {
        this.set(path.concat(k), v, weight, force, condition);
      };
    };
  };
};

//type Ref<T, K> = (v: LazyObject<T>) => Promise<K | _LazyProxy<K>>;
export type Condition = _LazyProxy<boolean> | (() => Promise<boolean | LazyAuto<boolean>>);


type LazyRecord<T> = {
  [P in keyof T]: LazyAuto<T[P]>
};

export type LazyObject<T> = (T extends (infer U)[] ? LazyAuto<Required<U>>[] : LazyRecord<Required<T>>)
export type LazyAuto<T> = T extends object ? (LazyObject<T> & _LazyProxy<T>) : _LazyProxy<T>;

export type LazySpec<T> = T | Resolver<T> | _LazyProxy<T>;
type DeepLazySpecArray<T> = DeepLazySpec<T>[];
type DeepLazySpecObject<T> = {
  [P in keyof T]: DeepLazySpec<T[P]>
};
export type DeepLazySpec<T> = T extends undefined ? T :
  T extends (infer U)[] ? DeepLazySpecArray<U> | LazySpec<T> :
    T extends object ? DeepLazySpecObject<T> | LazySpec<T> : LazySpec<T>;
