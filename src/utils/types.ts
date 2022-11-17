/**
 * Constructor type, ported from tsyringe
 */
export type constructor<T> = {
  new (...args: any[]): T;
};
