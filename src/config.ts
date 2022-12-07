import { Component, ComponentArgs } from './component';
import { Target } from './target';
import { constructor, DeepPartial, DeepValue, LazyAuto } from './utils';

type Extract<T extends Component> = T extends Component<infer _R, infer U> ? U : never;

/**
 * Provides context for component configuration execution
 */
export class ConfigurationContext {
  private readonly target: Target;
  private readonly self: LazyAuto<ComponentArgs>;

  constructor(target: Target, self: LazyAuto<ComponentArgs>) {
    this.target = target;
    this.self = self;
  };

  public component<T extends Component>(token: constructor<T>, name?: string): LazyAuto<Extract<T>> {
    return this.target.component(token, name, true).props as LazyAuto<Extract<T>>;
  };

  public enable<T extends Component>(token: constructor<T>, name?: string, weight?: number, force?: boolean) {
    this.target.enable(token, name, weight, force, async () => this.self.enable);
  };

  public async set<T extends Component>(token: constructor<T>, value: DeepValue<DeepPartial<Extract<T>>>, weight?: number, force?: boolean) {
    this.component<T>(token, undefined).$set(value, weight, force, async () => this.self.enable);
  };
};
