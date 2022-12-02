import { Lazy } from './../../src/utils/lazy';

interface TestOptionsB {
  barA: string;
  barB: string;
  off?: any;
};

interface TestOptionsA {
  foobar?: Record<string, TestOptionsB>;
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
  const resolved = lazy.$resolve();

  expect(resolved).toStrictEqual(value);
});

test('creating lazy leaf from atomic', async () => {
  const atom = 'foobar';
  expect(Lazy.from(atom).$resolve()).toStrictEqual(atom);
});

test('creating lazy leaf from function', async () => {
  const atom = () => 'foobar';
  expect(Lazy.from(atom).$resolve()).toStrictEqual('foobar');
});

test('cannot set leaf to another leaf', async () => {
  const lazy = Lazy.from({
    foo1: 'foo1',
    foo2: 'foo2',
  });

  expect(() => {
    lazy.foo1.$set(lazy.foo2 as any);
  }).toThrow();
});

test('directly mutating properties throws error', async () => {
  const value: TestOptionsA = {
    foobar: {
      foo: {
        barA: '12212',
        barB: '1221212112',
      },
    },
  };

  const lazy = Lazy.from(value) as any;

  expect(() => {
    Reflect.defineProperty(lazy.foobar.foo, 'offf', {});
  }).toThrow();

  // we might want this?
  // expect(() => {
  //   delete lazy.foobar.foo.barA;
  // }).toThrow();

  // expect(() => {
  //   lazy.foobar.foo.off = 'dwjdjwws';
  // }).toThrow();
});

test('properties can be deleted', async () => {
  const lazy = Lazy.from({ foo: 'bar', bar2: 'bar2' });
  delete (lazy as any).bar2;

  expect(lazy.$resolve()).toStrictEqual({ foo: 'bar' });
});

test('internal properties cannot be mutated', async () => {
  const lazy = Lazy.from({ foo: 'bar', bar2: 'bar2' });

  expect(() => {
    (lazy as any).$resolve = 'bad';
  }).toThrow();

  expect(() => {
    delete (lazy as any).$resolve;
  }).toThrow();

  expect(lazy.$resolve()).toStrictEqual({ foo: 'bar', bar2: 'bar2' });
});

test('merging existing objects', async () => {
  const value: TestOptionsA = {
    foobar: {
      foo: {
        barA: '12212',
        barB: '1221212112',
      },
    },
  };

  const lazy = Lazy.from(value);

  // weight precedence
  lazy.$set({
    foobar: {
      foo: {
        barB: '12828128138',
      },
    },
  });

  lazy.$set({
    foobar: {
      foo: {
        barB: '23818383712372273',
      },
    },
  }, -10);

  lazy.$set({
    foobar: {
      foo: {
        barB: '2121121',
      },
    },
  }, 30);

  const resolved = lazy.$resolve();
  expect(resolved).toStrictEqual({
    foobar: {
      foo: {
        barA: '12212',
        barB: '2121121',
      },
    },
  });
});

test('merging arrays', async () => {
  const lazy = Lazy.from(['foo', 'bar']);
  lazy.$set(['bar2']);

  const resolved = lazy.$resolve();
  expect(resolved).toStrictEqual(['foo', 'bar', 'bar2']);
}),

test('merging arrays deep in objects', async () => {
  const lazy = Lazy.from({
    what: {
      the: {
        fuck: ['foobar'],
      },
    },
  });
  lazy.$set({
    what: {
      the: {
        fuck: ['bar2'],
      },
    },
  });

  const resolved = lazy.$resolve();
  expect(resolved).toStrictEqual({
    what: {
      the: {
        fuck: ['foobar', 'bar2'],
      },
    },
  });
}),

test('fallback resolution', async () => {
  const lazy = Lazy.from({ fuck: 'off' });
  const resolved = lazy.$resolve({
    the: 'fuck',
  } as any);

  expect(resolved).toStrictEqual({ fuck: 'off', the: 'fuck' });
});

test('fallback refs', async () => {
  const lazy = Lazy.from({
    get: 'fucked',
    fuck: 'off',
    screwoff: 'ff',
  });

  lazy.$set({
    screwoff: lazy.$ref(v => (v as any).bruh.mm, 'nah'),
  });

  const resolved = lazy.$resolve();
  expect(resolved).toStrictEqual({
    get: 'fucked',
    fuck: 'off',
    screwoff: 'nah',
  });

  // unspecified fallback should throw
  lazy.$set({
    screwoff: lazy.$ref(v => (v as any).bruh.mm),
  });
  expect(() => {
    lazy.$resolve();
  }).toThrow(TypeError);
});

test('recursive resolution and deep cross referencing', async () => {
  const value: TestOptionsA = {};
  const lazy = Lazy.from(value);

  lazy.$set({
    foobar: {
      foo: {
        barA: '12212',
        barB: '1221212112',
      },
      foo2: lazy.$ref(r => r.foobar.foo),
      foo3: {
        barA: '12321',
        barB: lazy.$ref(r => r.foobar.foo4.barA),
      },
      foo4: {
        barA: '1291292912',
        barB: lazy.$ref(r => r.foobar.foo3.barA),
      },
      foo5: {
        barA: lazy.$ref(r => r.foobar.foo2.barA),
      },
      foo6: {
        off: [
          lazy.$ref(r => r.foobar.foo),
        ],
      },
    },
  });

  const resolved = lazy.$resolve();
  expect(resolved).toStrictEqual({
    foobar: {
      foo: { barA: '12212', barB: '1221212112' },
      foo2: { barA: '12212', barB: '1221212112' },
      foo3: { barA: '12321', barB: '1291292912' },
      foo4: { barA: '1291292912', barB: '12321' },
      foo5: { barA: '12212' },
      foo6: { off: [{ barA: '12212', barB: '1221212112' }] },
    },
  });
});

test('special fields will not be merged', async () => {
  const value: any = {};
  const lazy = Lazy.from(value);

  lazy.$set({
    $__leaf__: {},
    $resolve: 'fuckoff',
    $ref: () => {},
    $set: () => {},
  });

  const resolved = lazy.$resolve();
  expect(resolved).toStrictEqual({});
});

test('stringify lazy leaf object', async () => {
  const atom = 'foobar';
  expect(Lazy.from(atom).toString()).toStrictEqual('foobar');
});
