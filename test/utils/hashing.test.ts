import { compositeHash } from '../../src/utils/hashing';

test('composite hash equality', () => {
  const first = [
    'foo', 'bar', { foo: 'bar' },
  ];

  const second = [
    'foo', 'bar', { foo: 'bar' },
  ];

  const hash = compositeHash(first);
  expect(hash).toStrictEqual(compositeHash(second));
});

test('composite hash inequality', () => {
  const first = [
    'foo', 'bar', { foo: 'bar' },
  ];

  const second = [
    'foo', 'bar', { foo: 'baz' },
  ];

  const hash = compositeHash(first);
  expect(hash).not.toStrictEqual(compositeHash(second));
});
