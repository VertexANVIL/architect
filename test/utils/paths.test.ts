import { PathResultBuilder, prettifyPath, ValuePath } from '../../src/utils/paths';

test('prettifyPath works for all cases', async () => {
  const path: ValuePath = ['foo', 'bar', 123, 'baz'];
  expect(prettifyPath(path)).toStrictEqual('foo.bar[123].baz');
});

test('no values results in undefined', async () => {
  const builder = new PathResultBuilder();
  expect(builder.resolve()).toBeUndefined();
});

