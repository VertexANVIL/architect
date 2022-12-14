import { typescript } from 'projen';

const project = new typescript.TypeScriptProject({
  authorName: 'Arctarus Limited',
  authorOrganization: true,
  authorEmail: 'info@arctarus.co.uk',
  authorUrl: 'https://www.arctarus.co.uk',

  defaultReleaseBranch: 'main',
  name: '@akim/architect',
  license: 'MIT',
  repository: 'https://github.com/ArctarusLimited/architect.git',

  projenrcTs: true,
  releaseToNpm: true,

  // dependencies
  deps: [
    'appdirsjs',
    'lodash',
    'object-hash',
    'semver',
    'uuid',
    'reflect-metadata',
    'tst-reflect',
    'tst-reflect-transformer',
    'fast-safe-stringify',
    'js-yaml',
  ],

  devDeps: [
    '@types/node',
    '@types/object-hash',
    '@types/lodash',
    '@types/uuid',
    '@types/semver',
    '@types/js-yaml',
  ],
});

project.synth();
