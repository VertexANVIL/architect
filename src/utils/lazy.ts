/**
 * @file Implementation of lazy value resolution system.
 * Postulated over a 4-day furry convention and implemented
 * during a 5-hour night afterwards with 2 cans of Monster.
 * @author Alex Zero
 */

import _ from 'lodash';
import { DeepPartial, DeepValue, Resolver, Value } from './value';

const LAZY_SYMBOL = Symbol.for('akim.architect.Lazy');
const LAZY_LEAF_SYMBOL = Symbol.for('akim.architect.LazyLeaf');

type Ref<T, K> = (v: LazyTree<T>) => LazyTree<K>

/**
 * Container for an atomic leaf value (i.e. not object)
 */
export class LazyLeaf<T> {
  private value: Value<T>;
  private weight: number = 0;
  private cache?: T;

  constructor(value: Value<T>) {
    this.value = value;

    // set our symbol to ours
    Object.defineProperty(this, LAZY_LEAF_SYMBOL, { value: true, enumerable: true });
  };

  /**
   * Resolves the value of this object
   * @param force Ignore the cache and resolve the result from scratch
   * @returns Promise containing the resolved result
   */
  public async $resolve(force: boolean = false): Promise<T> {
    if (!force && this.cache !== undefined) {
      return this.cache;
    };

    let result: T;
    if (typeof this.value === 'function') {
      const func = this.value as Resolver<T>;
      result = await func();
    } else {
      result = this.value;
    };

    return result;
  };

  /**
   * Sets the internal value
   */
  public $set(value: Value<T>, weight: number = 0) {
    if (Lazy.isLeaf(value)) {
      throw Error('Cannot set a the value of a LazyLeaf<T> to another LazyLeaf<T>');
    };

    if (weight < this.weight) {
      // weight is not high enough to trump current value; disregard
      return;
    };

    this.value = value;
    this.weight = weight;
  };

  public toString(): string {
    return String(this.value);
  };
};

export class Lazy {
  public static from<T>(object: T): LazyTree<T> {
    if (typeof object === 'function') {
      const tree = Lazy.makeLazyTree<T>();
      tree.__resolver__ = object as Resolver<T>;
      return tree;
    };

    var clone = _.cloneDeep(object) as any;
    if (Array.isArray(clone)) {
      clone = clone.map(i => Lazy.convert(i));
    } else {
      for (const [k, v] of Object.entries(clone)) {
        clone[k] = Lazy.convert(v as any);
      };
    };

    // convert to LazyTree and create our injected methods
    return Lazy.makeLazyTree(clone);
  };

  public static isTree<T>(value: any): value is LazyTree<T> {
    return (typeof(value) === 'object' && LAZY_SYMBOL in value);
  };

  public static isLeaf<T>(value: any): value is LazyLeaf<T> {
    return (typeof(value) === 'object' && LAZY_LEAF_SYMBOL in value);
  };

  private static makeLazyTree<T>(object: any = {}): LazyTree<T> {
    // create injected methods
    object.$resolve = async function(): Promise<T> {
      return Lazy.resolve(this);
    };

    object.$ref = function<K>(func: Ref<T, K>, fallback?: K): Resolver<K> {
      return async (): Promise<K> => {
        let tree: LazyTree<K>;
        try {
          tree = func(object);
        } catch (error) {
          if (error instanceof TypeError && fallback !== undefined) {
            return fallback;
          };

          throw error;
        };

        return tree.$resolve();
      };
    };

    object.$set = function<U extends object>(value: U, weight?: number) {
      Lazy.set(this, value, weight);
    };

    // set the symbol on the new object
    Object.defineProperty(object, LAZY_SYMBOL, { value: true, enumerable: true });

    return object;
  };

  private static convert<T>(src: T): LazyTree<T> | LazyLeaf<T> {
    // skip conversion for any existing objects
    if (Lazy.isTree<T>(src) || Lazy.isLeaf<T>(src)) return src;

    // objects & functions -> lazy, others to leaf objects
    if (typeof src === 'object' || typeof src == 'function') return Lazy.from(src);
    return new LazyLeaf(src);
  };

  private static isSpecialFunction(name: string, value: any): boolean {
    if (typeof(value) !== 'function') return false;
    if (name.startsWith('$')) return true;
    return false;
  };

  private static async resolve<T>(instance: LazyTree<T>): Promise<T> {
    async function convert(src: any): Promise<any> {
      if (Lazy.isTree(src)) {
        return (src as LazyTree<any>).$resolve();
      } else if (Lazy.isLeaf(src)) {
        return (src as LazyLeaf<any>).$resolve();
      } else {
        throw Error('value should be Lazy or LazyLeaf');
      };
    };

    // does a resolver exist? use it!
    if (instance.__resolver__ !== undefined) {
      return instance.__resolver__();
    };

    let result: any;
    if (Array.isArray(instance)) {
      result = await Promise.all(instance.map(async i => convert(i)));
    } else {
      // create blank object
      result = {};

      // TODO: refactor this into a Promise.all
      for (const [k, v] of Object.entries(instance)) {
        // do not copy over our special functions
        if (Lazy.isSpecialFunction(k, v)) continue;
        result[k] = await convert(v);
      };
    };

    return result;
  };

  private static set<T>(instance: LazyTree<T>, value: T, weight: number = 0) {
    function customizer(dest: LazyTree<T> | undefined, src: T, key: string): LazyTree<T> | LazyLeaf<T> | undefined {
      // ignore special functions
      if (Lazy.isSpecialFunction(key, src)) {
        return dest;
      };

      // if the dest is a LazyLeaf, set its value
      if (Lazy.isLeaf(dest)) {
        const leaf = dest as LazyLeaf<T>;
        leaf.$set(src, weight);

        return leaf;
      };

      // handle array merging
      if (_.isArray(src) && _.isArray(dest)) {
        // concat creates a completely new array, so we need to wrap it in a constructor call
        return Lazy.convert(dest.concat(src) as T);
      };

      // no merging if the destination is undefined
      if (dest === undefined) {
        return Lazy.convert(src);
      };

      return undefined;
    };

    _.mergeWith(instance, value, customizer);
  };
};

export type LazyBase<T> = {
  /**
   * Resolver for this object. Overrides all fields, and always calculated first.
   */
  __resolver__?: Resolver<T>;

  /**
   * Resolves the value of this object
   * @param force Ignore the cache and resolve the result from scratch
   * @returns Promise containing the resolved result
   */
  $resolve(force?: boolean): Promise<T>;

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

export type LazyArray<T> = LazyTreeRoot<T>[];
export type LazyObject<T> = {
  [P in keyof T]-?: LazyTreeRoot<T[P]>
};

// array, type, or leaf value?
export type LazyTreeRoot<T> =
  T extends object ? LazyTree<T> : LazyLeaf<T>;

export type LazyTree<T> = LazyBase<T> &
(T extends (infer U)[] ? LazyArray<Required<U>> : LazyObject<Required<T>>);
