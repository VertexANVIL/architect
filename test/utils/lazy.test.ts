import { Lazy } from './../../src/utils/lazy';

interface TestOptionsB {
  barA: string;
  barB: string;
  off?: any;
};

interface TestOptionsA {
  foobar?: Record<string, TestOptionsB>;
  barfoo?: any;
  test3?: any;
  blasj?: any;
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

test('creating lazy leaf from atomic', async () => {
  const atom = 'foobar';
  expect(await Lazy.from(atom).$resolve()).toStrictEqual(atom);
});

test('creating lazy leaf from function', async () => {
  const atom = () => 'foobar';
  expect(await Lazy.from(atom).$resolve()).toStrictEqual('foobar');
});

test('conditional values of leaf', async () => {
  const lazy = Lazy.from({
    stuff: ['foo'],
    options: {
      enable: true,
    },
  });

  const stuff = lazy.stuff;
  stuff.$set(['bar'] as any, undefined, false, lazy.options.enable);
  stuff.$set(['barfoo'] as any, undefined, false, async () => !lazy.options.enable.$resolve());

  expect(await lazy.$resolve()).toStrictEqual({
    stuff: ['foo', 'bar'],
    options: {
      enable: true,
    },
  });
});

test('advanced conditional stuff', async () => {
  const lazy = Lazy.from({
    app: {
      stuff: [],
      options: {
        enable: false,
      },
    },
  });

  lazy.$set({
    app: {
      options: {
        enable: (lazy as any).app2.options.enable,
      },
    },
    app2: {
      stuff: [],
      options: {
        enable: false,
      },
    },
  } as any, 10);

  lazy.app.stuff.$set(['bar'] as any, undefined, false, lazy.app.options.enable);

  expect(await lazy.$resolve()).toStrictEqual({
    app: {
      stuff: [],
      options: { enable: false },
    },
    app2: {
      stuff: [],
      options: { enable: false },
    },
  });

  lazy.$set({
    app2: {
      options: { enable: true },
    },
  } as any, 20);

  expect(await lazy.$resolve()).toStrictEqual({
    app: {
      stuff: ['bar'],
      options: { enable: true },
    },
    app2: {
      stuff: [],
      options: { enable: true },
    },
  });
});

test('conditional returns lazy value', async () => {
  const lazy = Lazy.from({
    stuff: ['foo'],
    options: {
      enable: true,
    },
  });

  const stuff = lazy.stuff;
  stuff.$set(['bar'] as any, undefined, false, async () => lazy.options.enable);

  expect(await lazy.$resolve()).toStrictEqual({
    stuff: ['foo', 'bar'],
    options: {
      enable: true,
    },
  });
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

  // expected behaviour is merging in a dict with attributes forced to omit
  expect(() => {
    delete lazy.foobar.foo.barA;
  }).toThrow();

  expect(() => {
    lazy.foobar.foo.off = 'dwjdjwws';
  }).toThrow();
});

test('weight conflict on atomic property throws error', async () => {
  const lazy = Lazy.from({ foo: 'bar', bar2: 'bar2' });
  lazy.$set({ foo: 'bar3' });

  await expect(async () => {
    await lazy.$resolve();
  }).rejects.toThrowError('conflict: two atomic values with weight 0 at path foo');
});

test('internal properties cannot be mutated', async () => {
  const lazy = Lazy.from({ foo: 'bar', bar2: 'bar2' });

  expect(() => {
    (lazy as any).$resolve = 'bad';
  }).toThrow();

  expect(() => {
    delete (lazy as any).$resolve;
  }).toThrow();

  expect(await lazy.$resolve()).toStrictEqual({ foo: 'bar', bar2: 'bar2' });
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
  }, 10);

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

  const resolved = await lazy.$resolve();
  expect(resolved).toStrictEqual({
    foobar: {
      foo: {
        barA: '12212',
        barB: '2121121',
      },
    },
  });
});

test('merging objects with force', async () => {
  const value = {
    foobar: {
      foo: {
        barA: '12212',
        barB: '1221212112',
      },
      barfoo: 'bar',
    },
  };

  const lazy = Lazy.from(value);
  lazy.foobar.foo.$set({
    fuck: 'off',
  } as any, undefined, true);

  expect(await lazy.$resolve()).toStrictEqual({
    foobar: {
      foo: { fuck: 'off' } as any,
      barfoo: 'bar',
    },
  });

  lazy.foobar.$set({ fuck: 'you' } as any, undefined, true);
  expect(await lazy.$resolve()).toStrictEqual({
    foobar: { fuck: 'you' },
  });
});

test('merging arrays', async () => {
  const lazy = Lazy.from(['foo', 'bar']);
  lazy.$set(['bar2']);

  const resolved = await lazy.$resolve();
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

  const resolved = await lazy.$resolve();
  expect(resolved).toStrictEqual({
    what: {
      the: {
        fuck: ['foobar', 'bar2'],
      },
    },
  });
}),

test('merging to undefined properties', async () => {
  const lazy = Lazy.from({
    foo: undefined as any,
  });

  lazy.$set({
    foo: 'bar',
  }, 10);

  expect(await lazy.$resolve()).toStrictEqual({
    foo: 'bar',
  });
});

test('fallback resolution', async () => {
  const tree = Lazy.from({ fuck: 'off' });
  const resolved1 = await tree.$resolve({
    the: 'fuck',
  } as any);

  expect(resolved1).toStrictEqual({ fuck: 'off', the: 'fuck' });

  // what if result is undefined?
  const tree2 = Lazy.from(undefined);
  expect(await tree2.$resolve({ fuck: 'off' } as any)).toStrictEqual({ fuck: 'off' });
});

test('fallback refs', async () => {
  const lazy = Lazy.from({
    get: 'fucked',
    fuck: 'off',
    screwoff: 'ff',
  });

  lazy.$set({
    screwoff: async () => (lazy as any).bruh.mm.$resolve('nah'),
  }, 10);

  const resolved = await lazy.$resolve();
  expect(resolved).toStrictEqual({
    get: 'fucked',
    fuck: 'off',
    screwoff: 'nah',
  });

  // unspecified fallback should throw
  lazy.$set({
    screwoff: async () => (lazy as any).bruh.mm,
  });
  await expect(async () => {
    await lazy.$resolve();
  }).rejects.toThrow(TypeError);
});

test('recursive resolution stress test', async () => {
  for (let i = 0; i < 100; i++) {
    const value: TestOptionsA = {};
    const lazy = Lazy.from(value);

    lazy.$set({
      foobar: {
        foo: {
          barA: '12212',
          barB: '1221212112',
        },
        foo2: lazy.foobar.foo,
        foo3: {
          barA: '12321',
          barB: lazy.foobar.foo2.barA,
        },
        foo4: {
          barA: '1291292912',
          barB: lazy.foobar.foo3.barA,
        },
        foo5: {
          barB: lazy.foobar.foo2.barA,
        },
        foo6: {
          off: [
            lazy.foobar.foo,
          ],
        },
        foo7: lazy.foobar.foo2,
      },
      barfoo: {
        fuck: 'yeah',
      },
    });

    lazy.$set({
      barfoo: {
        fuck: 'no',
        blahaj: ['12212'],
      },
      foobar: {
        foo7: {
          barB: 'bndbdsnd',
        },
      },
    }, 10);

    lazy.$set({
      blasj: ['fuck'],
      test3: lazy.barfoo,
    });

    lazy.$set({
      blasj: ['why', 'the'],
      test3: { fuck: { eeee: 'the' }, blahaj: ['13'] },
    });

    const resolved = await lazy.$resolve();
    expect(resolved).toStrictEqual({
      barfoo: { fuck: 'no', blahaj: ['12212'] },
      test3: { fuck: { eeee: 'the' }, blahaj: ['12212', '13'] },
      blasj: ['fuck', 'why', 'the'],
      foobar: {
        foo: { barA: '12212', barB: '1221212112' },
        foo2: { barA: '12212', barB: '1221212112' },
        foo3: { barA: '12321', barB: '12212' },
        foo4: { barA: '1291292912', barB: '12321' },
        foo5: { barB: '12212' },
        foo6: { off: [{ barA: '12212', barB: '1221212112' }] },
        foo7: { barA: '12212', barB: 'bndbdsnd' },
      },
    });
  };
});

test('reading value of undefined throws', async () => {
  const lazy = Lazy.from({ foo: undefined });
  await expect(async () => {
    await ((lazy.foo) as any).barfoo.$resolve();
  }).rejects.toThrow('attempted to read value of undefined at foo.barfoo');
});
