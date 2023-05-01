import * as crypto from 'crypto';
import * as fs from 'node:fs/promises';
import * as path from 'path';

import _ from 'lodash';
import { TargetCache } from './../src/cache';
import { runInTempDir } from './helpers';
import { StateProvider } from '../src/utils';

test('putting stuff in cache', async () => {
  // create a temporary directory and clean it up after use
  await runInTempDir(async (dir) => {
    const state = StateProvider.fromTempDir(dir);
    const obj = new TargetCache(state);

    // randomly generate a 512-byte buffer
    const buf = Uint8Array.from(crypto.randomBytes(512));
    await obj.set('foobar', 'foo', buf);

    // check to see if the file now exists
    const file = path.join(dir, 'cache', 'foobar', 'foo');
    const result = await fs.stat(file);
    expect(result.isFile()).toBe(true);

    // check file contents matches
    const buf2 = Uint8Array.from(await fs.readFile(file));
    expect(buf2).toStrictEqual(buf);
  });
});

test('getting stuff from cache', async () => {
  // create a temporary directory and clean it up after use
  await runInTempDir(async (dir) => {
    // write the file
    const buf = Uint8Array.from(crypto.randomBytes(512));
    const namespace = path.join(dir, 'cache', 'foobar');
    await fs.mkdir(namespace, { recursive: true });
    const file = path.join(namespace, 'foo');
    await fs.writeFile(file, buf);

    const state = StateProvider.fromTempDir(dir);
    const obj = new TargetCache(state);

    const result = await obj.get('foobar', 'foo');
    expect(result).toStrictEqual(buf);
  });
});

test('non-existent file returns null', async () => {
  // create a temporary directory and clean it up after use
  await runInTempDir(async (dir) => {
    const state = StateProvider.fromTempDir(dir);
    const obj = new TargetCache(state);

    const result = await obj.get('foobar', 'foo');
    expect(result).toBe(null);
  });
});
