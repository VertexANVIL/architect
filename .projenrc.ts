import { typescript } from 'projen';
import { NpmAccess } from 'projen/lib/javascript';

const project = new typescript.TypeScriptProject({
  authorName: 'Arctarus Limited',
  authorOrganization: true,
  authorEmail: 'info@arctarus.co.uk',
  authorUrl: 'https://www.arctarus.co.uk',

  defaultReleaseBranch: 'main',
  name: '@arctarus/architect',
  license: 'MIT',
  repository: 'https://github.com/ArctarusLimited/architect.git',

  projenrcTs: true,
  releaseToNpm: true,
  npmAccess: NpmAccess.PUBLIC,

  // dependencies
  deps: [
    'appdirsjs',
    'commander@10.0.1',
    'lodash',
    'memfs',
    'object-hash',
    'projen',
    'semver',
    'uuid',
    'reflect-metadata',
    'tst-reflect',
    'tst-reflect-transformer',
    'fast-safe-stringify',
    'js-yaml',
  ],

  devDeps: [
    'ts-jest',
    'jest-mock',
    '@types/jest',
    '@types/node',
    '@types/object-hash',
    '@types/lodash',
    '@types/uuid',
    '@types/semver',
  ],
});

project.synth();
