import * as fs from 'node:fs/promises';
import { ValidationError } from './target';
import { recursiveMerge } from './utils';

export interface Writer {
  write(result: Result, dir: string): Promise<void>;
};

/**
 * Represents a response produced from a {Target}.
 */
export class Result {
  /**
   * Validation errors on the configuration tree
   */
  public errors: ValidationError[] = [];

  /**
   * Component-specific resources
   */
  public components: Record<string, any> = {};

  /**
   * Writer that will be used to write the result
   */
  public writer?: Writer;

  /**
   * Returns all merged configuration for this result
   */
  public get all(): any {
    return Object.values(this.components).reduce<any[]>((prev, cur) => {
      return recursiveMerge(prev, cur);
    }, []);
  };

  /**
   * Writes the output of the {Result} to the specified directory.
   */
  public async write(dir: string): Promise<void> {
    if (!this.writer) return;

    await fs.mkdir(dir, { recursive: true });
    await this.writer.write(this, dir);
  };
};
