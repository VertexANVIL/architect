import path from 'path';
import * as commander from 'commander';
import { Sequencer } from '../sequencer';

export class App {
  private readonly dir: string;

  public constructor(dir: string) {
    this.dir = dir;
  };

  public run() {
    const command = this.build();
    command.parse();
  };

  private async compile(options: any) {
    const sequencer = new Sequencer();
    await sequencer.loadFolder(path.join(this.dir, 'targets'));
    await sequencer.run(options.output, {
      requirements: options.requirements,
      validate: options.validate,
    });
  };

  protected build(): commander.Command {
    const program = new commander.Command();

    program
      .name('architect')
      .description('CLI for generating resources');

    program.command('compile')
      .description('Runs the build process')
      .option('-o, --output <dir>', 'output directory', path.join(this.dir, '../build'))
      .option('--no-validate', 'skips resource validation')
      .option('--no-requirements', 'skips requirement validation')
      .action(this.compile.bind(this));

    return program;
  };
};
