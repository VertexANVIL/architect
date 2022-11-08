# Architect

Architect is a framework for constructing very complex structured configuration trees in TypeScript. It's fast, making heavy use of async programming, and extensible. In Arctarus, it's used to define our Kubernetes clusters and the configuration for our routers.

## Philosophy
- Fast development loop. Architect uses `ts-node` - no manual `tsc` step is required.
- Plainly visible behaviour. No hidden magic. What you declare in TypeScript is what runs.

## Concepts

- **Component**: Think of a component like a singular application. It's a self-contained group of configuration or resources. Consists of a class with a function called `build()` that returns either an object or a list of objects to be merged into the global tree.
- **Capability**: A service provided by one or more components, that can be declared on a component and made mandatory on other components.
- **Fact**: Represents a unique source of data that can be requested by any individual component. Think of Facts as the input configuration for your Components.
- **Target**: Holds state for a singular build. Components, facts, and extensions are registered against a target, and a `resolve` function is called to return the final merged configuration tree.
- **Extension**: Developer resource for providing additional target-scoped functionality to Architect, used in extension frameworks like `architect-k8s`.
