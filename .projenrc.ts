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

  // dependencies
  deps: [
    'lodash',
    'semver',
    'uuid',
    'reflect-metadata',
    'fast-safe-stringify',
    'js-yaml',
  ],

  devDeps: [
    '@types/node',
    '@types/lodash',
    '@types/uuid',
    '@types/semver',
    '@types/js-yaml'
  ],

  // disable tests for now
  jest: false,
});

project.synth();
