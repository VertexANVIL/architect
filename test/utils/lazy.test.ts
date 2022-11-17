import { Lazy } from './../../src/utils/lazy';

interface TestOptionsB {
  barA: string;
  barB: string;
};

interface TestOptionsA {
  foobar: Record<string, TestOptionsB>;
};

test('assignment and resolution', async () => {
  const value: TestOptionsA = {
    foobar: {
      foo: {
        barA: '12212',
        barB: '1221212112',
      },
    },
  };

  const lazy = Lazy.from(value);
  const resolved = await lazy.$resolve();

  expect(resolved).toStrictEqual(value);
});
