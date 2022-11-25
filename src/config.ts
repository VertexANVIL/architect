import { Component } from './component';
import { Target } from './target';
import { constructor, DeepPartial, DeepValue, LazyTree } from './utils';

type Extract<T extends Component> = T extends Component<infer U> ? U : never;

/**
 * Provides context for component configuration execution
 */
export class ConfigurationContext {
  private readonly target: Target;
  constructor(target: Target) {
    this.target = target;
  };

  public component<T extends Component>(token: constructor<T>, name?: string): LazyTree<Extract<T>> {
    return this.target.component(token, name, true).props as LazyTree<Extract<T>>;
  };

  public enable<T extends Component>(token: constructor<T>, name?: string) {
    this.target.enable(token, name);
  };

  public set<T extends Component>(token: constructor<T>, value: DeepValue<DeepPartial<Extract<T>>>) {
    this.component<T>(token, undefined).$set(value);
  };
};
