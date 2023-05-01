import * as fs from 'node:fs/promises';
import * as path from 'path';

import { StateProvider, defaultState } from './utils';

/**
 * Target cache that caches the result of build inputs
 */
export class TargetCache {
  readonly dir: string;

  constructor(state: StateProvider) {
    this.dir = state.dirs.cache;
  };

  public async get(ns: string, key: string): Promise<Uint8Array | null> {
    const file = path.join(this.dir, ns, key);

    try {
      await fs.stat(file);
    } catch {
      return null;
    };

    const buf = await fs.readFile(file);
    return Uint8Array.from(buf);
  };

  // TODO: monitor size of cache folder. Prune the oldest entries if we exceed the maximum size.
  public async set(ns: string, key: string, value: Uint8Array) {
    const dir = path.join(this.dir, ns);
    await fs.mkdir(dir, { recursive: true });

    const file = path.join(dir, key);
    await fs.writeFile(file, value);
  };
};

export const cache = new TargetCache(defaultState);
