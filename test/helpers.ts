import * as fs from 'node:fs/promises';
import * as os from 'os';
import * as path from 'path';

/**
 * Run a function in a temporary directory
 */
export async function runInTempDir(fn: (dir: string) => Promise<void>) {
  // create a temporary directory and clean it up after use
  const tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), 'cache-test-'));

  try {
    await fn(tmpdir);
  } finally {
    await fs.rm(tmpdir, { recursive: true });
  }
}
