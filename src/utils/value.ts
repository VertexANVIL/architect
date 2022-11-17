export type Resolver<T> = () => Promise<T>;
export type Value<T> = T | Resolver<T>;

type DeepValueArray<T> = DeepValue<T>[];
type DeepValueObject<T> = {
  [P in keyof T]: DeepValue<T[P]>
};
export type DeepValue<T> = T extends undefined ? T :
  T extends (infer U)[] ? DeepValueArray<U> | Value<T> :
    T extends object ? DeepValueObject<T> | Value<T> : Value<T>;
