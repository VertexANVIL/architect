import _ from 'lodash';
import * as objects from './../../src/utils/objects';

test('isRecord', async () => {
  expect(objects.isRecord({ foo: 'bar' })).toBe(true);
  expect(objects.isRecord(['bar'])).toBe(false);
  expect(objects.isRecord('blah')).toBe(false);
  expect(objects.isRecord(null)).toBe(false);
  expect(objects.isRecord(undefined)).toBe(false);
});

test('toArray', async () => {
  expect(objects.toArray('foo')).toStrictEqual(['foo']);
  expect(objects.toArray(['foo'])).toStrictEqual(['foo']);
});

test('arrayStartsWith', async () => {
  expect(objects.arrayStartsWith(['foo', 'bar'], ['foo'])).toBe(true);
  expect(objects.arrayStartsWith(['foo', 'bar'], ['bar'])).toBe(false);
});

test('recursiveMerge and recursiveMergeThese', async () => {
  const test1 = {
    foo: 'bar',
    foobar: ['foo'],
    barfoo: {
      test: 'blah',
      bar: ['foo', 'bar'],
    },
  };

  const test2 = {
    foo: 'baz',
    foobar: ['bar'],
    barfoo: {
      test: 'blaz',
      bar: ['foo'],
    },
    bar: {},
  };

  const result = {
    foo: 'baz',
    foobar: ['foo', 'bar'],
    barfoo: {
      test: 'blaz',
      bar: ['foo', 'bar', 'foo'],
    },
    bar: {},
  };

  expect(objects.recursiveMerge(_.cloneDeep(test1), _.cloneDeep(test2))).toStrictEqual(result);
  expect(objects.recursiveMergeThese([_.cloneDeep(test1), _.cloneDeep(test2)])).toStrictEqual(result);

  // test recursively merging arrays too
  expect(objects.recursiveMerge(['foo'], ['baz'])).toStrictEqual(['foo', 'baz']);
});

test('notEmpty', async () => {
  expect(objects.notEmpty({ foo: 'bar' })).toBe(true);
  expect(objects.notEmpty({})).toBe(true);
  expect(objects.notEmpty(null)).toBe(false);
  expect(objects.notEmpty(undefined)).toBe(false);
});

test('isEmptyObject', async () => {
  expect(objects.isEmptyObject({ foo: 'bar' })).toBe(false);
  expect(objects.isEmptyObject({})).toBe(true);
  expect(objects.isEmptyObject(null)).toBe(true);
  expect(objects.isEmptyObject(undefined)).toBe(true);
});

test('asyncFilter', async () => {
  const predicate = async (value: number) => value % 2 === 0;
  const array = [1, 2, 3, 4, 5, 6];
  expect(await objects.asyncFilter(array, predicate)).toStrictEqual([2, 4, 6]);
});
