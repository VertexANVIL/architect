import _ from 'lodash';
import * as types from './../../src/utils/types';

test('setNamed', async () => {
  const obj = {
    foo: 'bar',
  };

  types.setNamed(obj);
  expect(types.NAMED_SYMBOL in obj).toBe(true);
});

test('isNamed', async () => {
  const obj1 = {
    foo: 'bar',
  };
  expect(types.isNamed(obj1)).toBe(false);

  const obj2 = {
    foo: 'bar',
  };
  Object.defineProperty(obj2, types.NAMED_SYMBOL, { value: true, enumerable: true });
  expect(types.isNamed(obj2)).toBe(true);
});
