export const NAMED_SYMBOL = Symbol.for('akim.architect.Named');

/**
 * Constructor type, ported from tsyringe
 */
export type constructor<T> = {
  new (...args: any[]): T;
};

export type Named = {
  readonly name?: string;
};

export function setNamed(value: any) {
  Object.defineProperty(value, NAMED_SYMBOL, { value: true, enumerable: true });
};

export function isNamed(value: any): value is Named {
  return (typeof(value) === 'object' && NAMED_SYMBOL in value);
};
