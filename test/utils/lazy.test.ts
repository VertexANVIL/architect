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
  const resolved = lazy.$resolve();

  expect(resolved).toStrictEqual(value);
});

// test('forced resolution does not mutate objects', async () => {
//   const lazy = Lazy.from({
//     foo1: 'bar1',
//     foo2: 'bar2',
//     foo3: {
//       foo4: {
//         bar1: 'ewjjwiwd',
//         bar2: 'dwdawdw',
//         bar3: ['fuckoff'],
//       },
//     },
//   });

//   lazy.$set({
//     foo3: {
//       foo5: {
//         test1: lazy.$ref(r => r.foo3.foo4.bar1),
//       },
//     },
//   } as any);

//   const before = objectHash(lazy);
//   lazy.$resolve();
//   expect(before).toStrictEqual(objectHash(lazy));
// });

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

test('conditional values of leaf', async () => {
  const lazy = Lazy.from({
    stuff: ['foo'],
    options: {
      enable: true,
    },
  });

  lazy.stuff.$set(['bar'] as any, undefined, false, () => lazy.options.enable);

  expect(lazy.$resolve()).toStrictEqual({
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
        enable: lazy.$ref(r => (r as any).app2.options.enable),
      },
    },
    app2: {
      stuff: [],
      options: {
        enable: false,
      },
    },
  } as any);

  lazy.app.stuff.$set(['bar'] as any, undefined, false, () => lazy.app.options.enable);

  expect(lazy.$resolve()).toStrictEqual({
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
  } as any);

  expect(lazy.$resolve()).toStrictEqual({
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

test('merging to undefined properties', async () => {
  const lazy = Lazy.from({
    foo: undefined as any,
  });

  lazy.$set({
    foo: 'bar',
  });

  expect(lazy.$resolve()).toStrictEqual({
    foo: 'bar',
  });
});

test('fallback resolution', async () => {
  const tree = Lazy.from({ fuck: 'off' });
  const resolved1 = tree.$resolve({
    the: 'fuck',
  } as any);

  expect(resolved1).toStrictEqual({ fuck: 'off', the: 'fuck' });
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
        foo2: lazy.$ref(r => r.foobar.foo),
        foo3: {
          barA: '12321',
          barB: lazy.$ref(r => r.foobar.foo2.barA),
        },
        foo4: {
          barA: '1291292912',
          barB: lazy.$ref(r => r.foobar.foo3.barA),
        },
        foo5: {
          barB: lazy.$ref(r => r.foobar.foo2.barA),
        },
        foo6: {
          off: [
            lazy.$ref(r => r.foobar.foo),
          ],
        },
        foo7: lazy.$ref(r => r.foobar.foo2),
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
    });

    lazy.$set({
      blasj: ['fuck'],
      test3: lazy.$ref(r => r.barfoo),
    });

    lazy.$set({
      blasj: ['why', 'the'],
      test3: { fuck: { eeee: 'the' }, blahaj: ['13'] },
    });

    const resolved = lazy.$resolve();
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

// test('stringify lazy leaf object', async () => {
//   const atom = 'foobar';
//   expect(Lazy.from(atom).toString()).toStrictEqual('foobar');
// });
