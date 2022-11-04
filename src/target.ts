import 'reflect-metadata';
import _ from 'lodash';

import { constructor } from './utils';

export abstract class BaseFact<T> {
    public readonly instance: T;

    constructor(instance: T) {
        this.instance = instance;
    };
};

class Registry {
    public readonly data: Record<string, any> = {};

    /**
     * Arguments to be passed to the constructor of registered classes
     */
    private readonly args: any[];

    constructor(args?: any[]) {
        if (args != null) {
            this.args = args;
        } else {
            this.args = [];
        };
    };

    /**
     * Registers an instance of T with the options provided.
     * If no object is passed, a new instance of T will be instantiated and used.
     */
    public register<T>(token: constructor<T>, instance?: T) {
        if (instance == null) {
            instance = new token(...this.args);
        };

        const id = Reflect.getMetadata("uuid", token);
        this.data[id] = instance;
    };

    public request<T>(token: constructor<T>): T {
        const id = Reflect.getMetadata("uuid", token);
        return this.data[id];
    };
};

/**
 * Context for constructing objects.
 */
export class Target {
    public readonly components = new Registry([this]);
    public readonly facts = new Registry();

    /**
     * Invokes a build operation on all components, passing our facts
     */
    public async resolve(): Promise<any> {
        // Execute component build async
        const results = await Promise.all(Object.values(this.components.data).map(
            async (cur): Promise<any> => {
                let result = await cur.build();
                return cur.postBuild(result);
            }
        ));

        return results.reduce<any[]>((prev, cur) => {
            return _.merge(prev, cur);
        }, [])
    };
};
