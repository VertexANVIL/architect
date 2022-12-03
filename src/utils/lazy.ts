/**
 * @file Implementation of lazy value resolution system.
 * Postulated over a 4-day furry convention and implemented
 * during a 5-hour night afterwards with 2 cans of Monster.
 * @author Alex Zero
 */

import _ from 'lodash';
import { recursiveMerge } from './objects';
import { DeepPartial, DeepValue, Resolver, Value } from './value';

const LAZY_OBJECT_SYMBOL = Symbol.for('akim.architect.LazyObject');
const LAZY_ARRAY_SYMBOL = Symbol.for('akim.architect.LazyArray');
const LAZY_ATOMIC_SYMBOL = Symbol.for('akim.architect.LazyAtomic');
const LAZY_RESOLVER_FUNCTION = Symbol.for('akim.architect.LazyResolverFunction');

type Ref<T, K> = (v: LazyObject<T>) => K | LazyTree<K>;
type Condition = () => boolean | Lazy<boolean>;

interface LazyValue<T> {
  value: Value<T>;
  weight: number;
  force?: boolean;
  condition?: Condition;
};

export class Lazy<T> {
  public static from<T>(object: Value<T>): LazyTree<T> {
    // top-level functions are stored in Lazy to be accessible
    if (typeof object === 'function') {
      return new Lazy(object) as LazyTree<T>;
    };

    return this.convert(object);
  };

  /**
   * Converts a source object to a lazy object.
   */
  public static _deepConvert<T>(value: T | LazyObject<T>): LazyTree<T> {
    let converted = _.cloneWith(value, (deepValue, _key, _object, _stack) => {
      // Do not convert existing objects
      // TODO: UNUSED CODEPATH
      // if (Lazy.isAtomic(deepValue) || Lazy.isObject(deepValue)) {
      //   return deepValue;
      // };

      const result = _.clone(deepValue) as T;
      if (_.isArray(result)) {
        return result.map((i: any) => Lazy.convert(i));
      } else if (_.isObject(result)) {
        for (const [k, v] of Object.entries(result)) {
          (result as any)[k] = Lazy.convert(v as any);
        };
        return result;
      };

      /* istanbul ignore next */
      throw new Error('this should never be hit');
      //return Lazy.convert(deepValue);
    }) as any;

    return converted;
  };

  public static isObject<T>(value: any): value is LazyObject<T> {
    return (typeof(value) === 'object' && LAZY_OBJECT_SYMBOL in value && value[LAZY_OBJECT_SYMBOL]);
  };

  // public static isArray<T>(value: any): value is LazyObject<T> & any[] {
  //   return (typeof(value) === 'object' && LAZY_ARRAY_SYMBOL in value && value[LAZY_ARRAY_SYMBOL]);
  // };

  public static isAtomic<T>(value: any): value is Lazy<T> {
    return (typeof(value) === 'object' && LAZY_ATOMIC_SYMBOL in value && value[LAZY_ATOMIC_SYMBOL]);
  };

  public static isResolver<T>(value: any): value is Resolver<T> {
    return (typeof(value) === 'function' && LAZY_RESOLVER_FUNCTION in value && value[LAZY_RESOLVER_FUNCTION]);
  };

  /**
   * Merges objects preserving lazy object structure
   */
  private static merge<T>(dest: LazyTree<T>, src: Value<T>, weight: number = 0, force?: boolean, condition?: Condition): LazyTree<T> {
    // merge down leaf values as shallow-ly as possible
    // both of these just push another value onto the LazyLeaf<T> stack
    if (Lazy.isAtomic(dest)) {
      dest.$set(src, weight, force, condition);
      return dest;
    } else if (Lazy.isObject(dest)) {
      dest.$set(src as DeepValue<DeepPartial<T>>, weight, force, condition);
      return dest;
    };

    // if the src/dest is already converted, don't merge it
    if (Lazy.isAtomic(src) || Lazy.isObject(src)) {
      return src as LazyTree<T>;
    };

    // if dest is undefined then ignore it and don't try to merge
    // TODO: UNUSED CODEPATH
    // if (_.isUndefined(dest)) {
    //   return Lazy.convert(src);
    // };

    if (_.isArray(src) && _.isArray(dest)) {
      let result = [];
      if (_.isArray(dest)) {
        // Note: this will perform a set operation as we are not returning the same object
        //result.push(...dest.$eval() as any[]);
        result.push(...dest);
      };

      result.push(...src);
      return Lazy.convert(result as T);
    } else if (_.isObject(src) && _.isObject(dest)) {
      for (const [k, v] of Object.entries(src)) {
        if (Lazy.isInternalValue(k)) continue;
        const obj = dest as any;

        if (!(k in obj)) {
          obj[k] = Lazy.convert(v);
        } else {
          obj[k] = Lazy.merge(obj[k], v, weight, force, condition);
        };
      };
    } else {
      dest = Lazy.convert(src);
    };

    return dest;
  };

  private static resolve(instance: any): any {
    if (Lazy.isObject(instance)) {
      return Lazy.resolve(instance.$eval());
    } else if (Lazy.isAtomic(instance)) {
      return Lazy.resolve(instance.$eval());
    };

    if (!_.isObject(instance)) return instance;

    let result: any;
    if (_.isArray(instance)) {
      result = instance.map(i => Lazy.resolve(i));
    } else {
      result = {};
      for (const [k, v] of Object.entries(instance)) {
        result[k] = Lazy.resolve(v);
      };
    };

    return result;
  };

  private static makeLazyTree<T extends object>(object: Value<LazyObject<T>>): LazyTree<T> {
    // create injected methods
    const internal = {
      $__leaf__: new Lazy(object),

      $eval: function(): LazyObject<T> {
        return this.$__leaf__.$eval();
      },

      $resolve: function(fallback?: Partial<T>): T {
        let result = Lazy.resolve(this.$__leaf__.$eval());
        if (fallback !== undefined) {
          result = recursiveMerge(fallback, result);
        };

        return result;
      },

      $ref: function<K extends object>(func: Ref<T, K>, fallback?: K): Resolver<K> {
        const resolver = (): K => {
          let result: K;
          try {
            const tree = func(this.$__leaf__.$eval());
            if (Lazy.isAtomic(tree)) {
              result = tree.$eval() as K;
            } else if (Lazy.isObject(tree)) {
              result = tree.$eval() as K;
            } else {
              result = tree;
            };
          } catch (error) {
            if (error instanceof TypeError && fallback !== undefined) {
              result = fallback;
            } else {
              throw error;
            };
          };

          // references are static; we need to clone it here
          result = _.cloneDeep(result);
          Object.freeze(result);

          return result;
        };

        Object.defineProperty(resolver, LAZY_RESOLVER_FUNCTION, { value: true, enumerable: true });
        return resolver;
      },

      $set: function(value: Value<LazyObject<T>>, weight?: number, force?: boolean, condition?: Condition) {
        this.$__leaf__.$set(value, weight, force, condition);
      },
    } as LazyObjectClass<T>;

    Object.defineProperty(internal, LAZY_OBJECT_SYMBOL, { value: true, enumerable: true, configurable: true });
    Object.defineProperty(internal, LAZY_ARRAY_SYMBOL, { value: _.isArray(object), enumerable: true, configurable: true });
    Object.defineProperty(internal, LAZY_ATOMIC_SYMBOL, { value: false, enumerable: true, configurable: true });

    const proxy = new Proxy(internal, {
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

        const result = target.$eval();
        const value = Reflect.get(result as any, p, receiver);

        // it's important we evaluate function values here
        if (Lazy.isAtomic(value) && value.hasResolver()) {
          return value.$eval();
        };

        return value;
      },

      // getOwnPropertyDescriptor(target, p) {
      //   if (Reflect.has(target, p)) {
      //     return Reflect.getOwnPropertyDescriptor(target, p);
      //   };

      //   return Reflect.getOwnPropertyDescriptor(target.$eval(), p);
      //   //return Reflect.getOwnPropertyDescriptor(target, p);
      // },

      // getPrototypeOf(target) {
      //   return Reflect.getPrototypeOf(target.$eval());
      // },

      has(target, p) {
        if (Reflect.has(target, p)) return true;
        return Reflect.has(target.$eval(), p);
      },

      // isExtensible(target) {
      //   return Reflect.isExtensible(target.$eval());
      // },

      // ownKeys(target) {
      //   const keys = Reflect.ownKeys(target);
      //   keys.push(...Reflect.ownKeys(target.$eval()));
      //   return keys;
      // },

      // preventExtensions(target) {
      //   return Reflect.preventExtensions(target.$eval());
      // },

      set(_target, _p, _newValue, _receiver) {
        throw new Error('cannot mutate properties of lazy object with dot notation, use the .$set() function instead');
      },
    });

    return proxy as any;
  };

  private static convert<T>(src: Value<T>): LazyTree<T> {
    // skip conversion for any existing objects
    if (Lazy.isObject<T>(src) || Lazy.isAtomic<T>(src)) return src as LazyTree<T>;

    // with functions we must return a wrapper function that constructs Lazy based on its result
    if (typeof src === 'function' || typeof src !== 'object') {
      return new Lazy<any>(src) as LazyTree<T>;
    };

    // convert to LazyTree and create our injected methods
    return Lazy.makeLazyTree<object>(Lazy._deepConvert(src) as any) as LazyTree<T>;
  };

  private static isInternalValue(name: string): boolean {
    if (name.startsWith('$')) return true;
    return false;
  };

  private values: LazyValue<T>[] = [];
  //private cache?: T;

  private constructor(value: Value<T>) {
    this.values.push({ value: value, weight: 0 });

    // set our symbol to ours
    Object.defineProperty(this, LAZY_ATOMIC_SYMBOL, { value: true, enumerable: true, configurable: true });
  };

  public $eval(): T {
    // if (this.cache !== undefined) {
    //   return this.cache;
    // };

    // filter the values by condition and sort them by weight
    const sorted = this.values.filter(v => {
      if (v.condition === undefined) return true;

      // resolve it if we passed a Lazy<boolean>
      let result = v.condition();
      if (Lazy.isAtomic(result)) result = result.$eval();
      return result;
    }).sort((a, b) => a.weight - b.weight);

    let result: T | undefined = undefined;
    function mergeResult(value: T, overwrite?: boolean) {
      if (_.isObject(value)) {
        if (overwrite || result === undefined) {
          result = Lazy._deepConvert(value) as T;
        } else {
          result = Lazy.merge(result as any, value) as T;
        };
      } else {
        result = value;
      };
    };

    for (const item of sorted) {
      if (typeof item.value === 'function') {
        const func = item.value as Resolver<T>;
        mergeResult(func(), item.force);
      } else {
        mergeResult(item.value, item.force);
      };
    };

    //this.cache = result;
    return result!; // TODO: fix this being potentially undefined
  };

  public $resolve(): T {
    return Lazy.resolve(this.$eval());
  };

  /**
   * Sets the value of the Lazy object.
   * @param weight The weight used to order values. Higher values will have higher priority.
   * @param force Override the entire value instead of merging it in the case of objects or arrays.
   * @param condition Sets the value based on a condition. If the condition evaluates to false, the value will be skipped.
   */
  public $set(value: Value<T> | Value<LazyObject<T>>, weight: number = 0, force?: boolean, condition?: Condition) {
    if (Lazy.isAtomic(value)) {
      throw Error('Cannot set a the value of a LazyLeaf<T> to another LazyLeaf<T>');
    };

    this.values.push({
      value: value as Value<T>, // TODO: Bullshit type hack
      weight: weight,
      force: force,
      condition: condition,
    });

    // invalidate the cache
    //this.cache = undefined;
  };

  /**
   * Returns whether this Lazy has a function Value, which means it needs to be evaluated first
   */
  private hasResolver(): boolean {
    return this.values.some(v => Lazy.isResolver(v.value));
  };
};

export type LazyObjectClass<T> = {
  /**
   * Internal leaf value holder object
   */
  $__leaf__: Lazy<any>;

  /**
   * Evaluates the value of this object
   * @returns The evaluated result
   */
  $eval(): LazyObjectBase<T>;

  /**
   * Resolves the entire configuration tree and returns the result
   * @param fallback Default value to be merged if the value does not exist
   * @returns The result of the evaluation
   */
  $resolve(fallback?: Partial<T>, force?: boolean): T;

  /**
   * Creates a reference within the context of this object
   * @param fallback Fallback value if the result is undefined
   * @returns A Resolver function containing the result
   */
  $ref<K>(func: Ref<T, K>, fallback?: K): Resolver<K>;

  /**
   * Sets the value of this object recursively, from a value or another Lazy<U>
   * @param value The value to set the object to, or a Lazy container with a value
   * @param weight The weight to assign to child objects
   * @param force Override the entire value instead of merging it in the case of objects or arrays.
   * @param condition Sets the value based on a condition. If the condition evaluates to false, the value will be skipped.
   * Note that conditions that reference the value of this object will cause infinite recursion.
   */
  $set(value: DeepValue<DeepPartial<T>>, weight?: number, force?: boolean, condition?: Condition): void;
};

type lazyObjectHelper<T> = {
  [P in keyof T]: LazyTree<T[P]>
};

// array, type, or leaf value?
export type LazyObjectBase<T> = (T extends (infer U)[] ? Lazy<Required<U>>[] : lazyObjectHelper<Required<T>>);
export type LazyObject<T> = LazyObjectBase<T> & LazyObjectClass<T>;
export type LazyTree<T> = T extends object ? LazyObject<T> : Lazy<T>;
