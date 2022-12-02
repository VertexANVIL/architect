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

type Ref<T, K> = (v: LazyObject<T>) => K | LazyTree<K>;

/**
 * Container for an atomic leaf value (i.e. not object)
 */
export class LazyLeaf<T> {
  private value: Value<T>;
  private weight: number = 0;
  //private cache?: T;

  constructor(value: Value<T>) {
    // set our symbol to ours
    Object.defineProperty(this, LAZY_ATOMIC_SYMBOL, { value: true, enumerable: true, configurable: true });

    // set the internal value
    this.value = undefined as any;
    this.$set(value);
  };

  /**
   * Evaluates the value of this object
   * @returns Promise containing the evaluated result
   */
  public $resolve(): T {
    // if (!force && this.cache !== undefined) {
    //   return this.cache;
    // };

    let result: T;
    if (typeof this.value === 'function') {
      const func = this.value as Resolver<T>;
      result = func();
    } else {
      result = this.value;
    };

    return result;
  };

  /**
   * Sets the internal value
   */
  public $set(value: Value<T>, weight: number = 0) {
    if (Lazy.isAtomic(value)) {
      throw Error('Cannot set a the value of a LazyLeaf<T> to another LazyLeaf<T>');
    };

    if (weight < this.weight) {
      // weight is not high enough to trump current value; disregard
      return;
    };

    if (!_.isObject(value) || _.isFunction(value) || Lazy.isObject(value)) {
      this.value = value;
    } else if (this.value === undefined) {
      this.value = Lazy._deepConvert(value) as Value<T>;
    } else {
      this.value = Lazy.merge(this.value as LazyObject<any>, value) as any;
    };

    this.weight = weight;
  };

  public toString(): string {
    return String(this.value);
  };
};

export class Lazy {
  public static from<T>(object: Value<T>): LazyTree<T> {
    if (typeof object === 'function') {
      // functions should also have smart accessors
      return Lazy.makeLazyTree<object>(object as any) as LazyTree<T>;
    } else if (typeof object !== 'object') {
      return new LazyLeaf(object) as LazyTree<T>;
    };

    // convert to LazyTree and create our injected methods
    const clone = Lazy._deepConvert(_.cloneDeep(object)) as LazyObject<object>;
    return Lazy.makeLazyTree<object>(clone) as LazyTree<T>;
  };

  public static _deepConvert<T extends object>(object: any): T {
    if (Array.isArray(object)) {
      object = object.map(i => Lazy.convert(i));
    } else {
      for (const [k, v] of Object.entries(object)) {
        object[k] = Lazy.convert(v as any);
      };
    };

    return object;
  };

  public static isObject<T>(value: any): value is LazyObject<T> {
    return (typeof(value) === 'object' && LAZY_OBJECT_SYMBOL in value && value[LAZY_OBJECT_SYMBOL]);
  };

  public static isArray<T>(value: any): value is LazyObject<T> & any[] {
    return (typeof(value) === 'object' && LAZY_ARRAY_SYMBOL in value && value[LAZY_ARRAY_SYMBOL]);
  };

  public static isAtomic<T>(value: any): value is LazyLeaf<T> {
    return (typeof(value) === 'object' && LAZY_ATOMIC_SYMBOL in value && value[LAZY_ATOMIC_SYMBOL]);
  };

  /**
   * Merges objects preserving lazy object structure
   */
  public static merge<T extends object>(instance: LazyTree<T>, value: Value<T>, weight: number = 0): LazyTree<T> {
    if (_.isArray(instance) && _.isArray(value)) {
      return Lazy.convert(instance.concat(...value) as T) as any;
    };

    function customizer(dest: LazyTree<T> | undefined, src: Value<T>, key: string): LazyTree<T> | LazyLeaf<T> | undefined {
      // ignore special functions
      if (Lazy.isInternalValue(key)) {
        return dest;
      };

      // if the dest is a LazyLeaf, set its value
      if (Lazy.isAtomic(dest)) {
        const leaf = dest as LazyLeaf<T>;
        leaf.$set(src, weight);

        return leaf;
      };

      // handle array merging - if the dest is not compatible, we will overwrite it
      // concat creates a completely new array, so we need to wrap it in a constructor call
      if (_.isArray(src)) {
        let result = [];
        if (Lazy.isArray(dest)) {
          // Note: this will perform a set operation as we are not returning the same object
          result.push(...dest.$eval() as any[]);
        };

        result.push(...src);
        return Lazy.convert(result as T);
      };

      // no merging if the destination is undefined
      if (dest === undefined) {
        return Lazy.convert(src);
      };

      return undefined;
    };

    return _.mergeWith(instance, value, customizer);
  };

  private static makeLazyTree<T extends object>(object: Value<LazyObject<T>>): LazyTree<T> {
    // create injected methods
    const internal = {
      $__leaf__: new LazyLeaf(object),

      $eval: function(): LazyObject<T> {
        return this.$__leaf__.$resolve();
      },

      $resolve: function(fallback?: Partial<T>): T {
        let result = Lazy.resolve<T>(this.$__leaf__.$resolve());
        if (fallback !== undefined) {
          result = recursiveMerge(fallback, result);
        };

        return result;
      },

      $ref: function<K extends object>(func: Ref<T, K>, fallback?: K): Resolver<K | LazyTree<K>> {
        return (): K | LazyTree<K> => {
          let result: K | LazyTree<K>;
          try {
            result = func(this.$__leaf__.$resolve());
          } catch (error) {
            if (error instanceof TypeError && fallback !== undefined) {
              result = fallback;
            } else {
              throw error;
            };
          };

          return result;
        };
      },

      $set: function(value: Value<LazyObject<T>>, weight?: number) {
        this.$__leaf__.$set(value, weight);
      },
    } as LazyObjectClass<T>;

    Object.defineProperty(internal, LAZY_OBJECT_SYMBOL, { value: true, enumerable: true, configurable: true });
    Object.defineProperty(internal, LAZY_ARRAY_SYMBOL, { value: _.isArray(object), enumerable: true, configurable: true });
    Object.defineProperty(internal, LAZY_ATOMIC_SYMBOL, { value: false, enumerable: true, configurable: true });

    const proxy = new Proxy(internal, {
      defineProperty(_target, _property, _attributes) {
        throw new Error('cannot mutate properties of lazy object with dot notation, use the .$set() function instead');
      },

      deleteProperty(target, p) {
        if (Reflect.has(target, p)) {
          throw Error(`cannot modify internal property ${p.toString()}`);
        };

        return Reflect.deleteProperty(target.$eval(), p);
      },

      get(target, p, receiver) {
        if (Reflect.has(target, p)) {
          return Reflect.get(target, p, receiver);
        };

        const result = target.$eval();
        return Reflect.get(result as any, p, receiver);
      },

      getOwnPropertyDescriptor(target, p) {
        if (Reflect.has(target, p)) {
          return Reflect.getOwnPropertyDescriptor(target, p);
        };

        return Reflect.getOwnPropertyDescriptor(target.$eval(), p);
      },

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

      ownKeys(target) {
        const keys = Reflect.ownKeys(target);
        keys.push(...Reflect.ownKeys(target.$eval()));
        return keys;
      },

      // preventExtensions(target) {
      //   return Reflect.preventExtensions(target.$eval());
      // },

      set(target, p, newValue, _receiver) {
        if (Reflect.has(target, p)) {
          throw Error(`cannot modify internal property ${p.toString()}`);
        };

        return Reflect.set(target.$eval(), p, newValue);
      },
    });

    return proxy as any;
  };

  private static convert<T>(src: Value<T>): LazyTree<T> {
    // skip conversion for any existing objects
    if (Lazy.isObject<T>(src) || Lazy.isAtomic<T>(src)) return src as LazyTree<T>;

    // functions should also have smart accessors
    if (typeof src === 'function') {
      return Lazy.makeLazyTree<object>(src as any) as LazyTree<T>;
    } else if (typeof src !== 'object') {
      return new LazyLeaf(src) as LazyTree<T>;
    };

    // convert to LazyTree and create our injected methods
    return Lazy.makeLazyTree<object>(Lazy._deepConvert(src)) as LazyTree<T>;
  };

  private static isInternalValue(name: string): boolean {
    if (name.startsWith('$')) return true;
    return false;
  };

  private static resolve<T>(instance: any): any {
    if (Lazy.isObject(instance)) {
      instance = (instance as LazyObject<T>).$eval();
    };

    if (Lazy.isAtomic(instance)) {
      const leaf = instance as LazyLeaf<any>;
      return leaf.$resolve();
    };

    if (!_.isObject(instance)) return instance;

    let result: any;
    if (_.isArray(instance)) {
      result = instance.map(i => Lazy.resolve(i));
    } else {
      // create blank object
      result = {};

      for (const [k, v] of Object.entries(instance)) {
        // do not copy over our special functions
        if (Lazy.isInternalValue(k)) continue;
        result[k] = Lazy.resolve(v);
      };
    };

    return result;
  };
};

export type LazyObjectClass<T> = {
  /**
   * Internal leaf value holder object
   */
  $__leaf__: LazyLeaf<LazyObject<T>>;

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
  $resolve(fallback?: Partial<T>): T;

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
   */
  $set(value: DeepValue<DeepPartial<T>>, weight?: number): void;
};

type lazyObjectHelper<T> = {
  [P in keyof T]: LazyTree<T[P]>
};

// array, type, or leaf value?
export type LazyObjectBase<T> = (T extends (infer U)[] ? LazyLeaf<Required<U>>[] : lazyObjectHelper<Required<T>>);
export type LazyObject<T> = LazyObjectBase<T> & LazyObjectClass<T>;
export type LazyTree<T> = T extends object ? LazyObject<T> : LazyLeaf<T>;
