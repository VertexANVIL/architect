import * as fs from 'node:fs/promises';
import path from 'node:path';
import { Target, TargetResolveParams } from './target';

/**
 * Manages the build process for multiple targets, and handles writing outputs to the filesystem.
 */
export class Sequencer {
  private readonly targets: Record<string, Target> = {};

  /**
   * Loads a folder of target classes into the sequencer.
   */
  public async loadFolder(input: string) {
    const result = await fs.readdir(input);

    // attempt to import every result as a Target instance
    const results = await Promise.all(result.map(async (k): Promise<[string, Target | null]> => {
      if (k.endsWith('.d.ts')) return [k, null]; // ignore type definitions

      const stripped = k.replace(/\.[^/.]+$/, ''); // strip extension
      const file = path.join(input, stripped);

      const imported = await import(file);
      return [stripped, imported.default];
    }));

    results.filter(([_k, v]) => v !== null)
      .forEach(([k, v]) => this.targets[k] = v as Target);
  };

  /**
   * Runs the build and outputs the compiled results to the specified folder
   */
  public async run(dir: string, params: TargetResolveParams = {}): Promise<void> {
    await fs.rm(dir, { recursive: true, force: true });
    await fs.mkdir(dir, { recursive: true });

    await Promise.all(Object.entries(this.targets).map(async ([k, v]): Promise<void> => {
      const resolved = await v.resolve(params);
      await resolved.write(path.join(dir, k));
    }));
  };
};
