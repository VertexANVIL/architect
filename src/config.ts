import { Component, ComponentArgs } from './component';
import { Target } from './target';
import { Condition, constructor, DeepPartial, DeepValue, Lazy, LazyAuto, _LazyProxy } from './utils';

type Extract<T extends Component> = T extends Component<infer _R, infer U> ? U : never;

/**
 * Provides context for component configuration execution
 */
export class ConfigurationContext {
  private readonly target: Target;
  private readonly self: LazyAuto<ComponentArgs>;
  private readonly enabler: Condition;

  constructor(target: Target, self: LazyAuto<ComponentArgs>, enabler: Condition = self.enable) {
    this.target = target;
    this.self = self;
    this.enabler = enabler;
  };

  public component<T extends Component>(token: constructor<T>, name?: string): LazyAuto<Extract<T>> {
    return this.target.component(token, name, true).props as LazyAuto<Extract<T>>;
  };

  public enable<T extends Component>(
    token: constructor<T>,
    config?: DeepValue<DeepPartial<Extract<T>>>,
    name?: string,
    weight?: number,
    force?: boolean,
    condition = this.enabler,
  ) {
    this.target.enable(token, config, name, weight, force, condition);
  };

  public set<T extends Component>(
    token: constructor<T>,
    value: DeepValue<DeepPartial<Extract<T>>>,
    weight?: number,
    force?: boolean,
    condition = this.enabler,
  ) {
    this.component<T>(token, undefined).$set(value, weight, force, condition);
  };

  public mkIf(condition: _LazyProxy<boolean>, configurator: (context: ConfigurationContext) => void) {
    const enabler = Lazy.combineConditions(this.enabler, condition);
    configurator(new ConfigurationContext(this.target, this.self, enabler));
  };
};
