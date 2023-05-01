import appDirs from 'appdirsjs';

export type StateDirectories = {
  cache: string;
  config: string;
  data: string;
  runtime?: string;
};

export class StateProvider {
  public static fromAppDirs(appName = 'architect'): StateProvider {
    const dirs = appDirs({ appName });
    const provider = new StateProvider({
      cache: dirs.cache,
      config: dirs.config,
      data: dirs.data,
      runtime: dirs.runtime,
    });

    return provider;
  };

  public static fromTempDir(dir: string): StateProvider {
    const provider = new StateProvider({
      cache: `${dir}/cache`,
      config: `${dir}/config`,
      data: `${dir}/data`,
      runtime: `${dir}/runtime`,
    });

    return provider;
  };

  public readonly dirs: StateDirectories;

  private constructor(dirs: StateDirectories) {
    this.dirs = dirs;
  };
};

export const defaultState = StateProvider.fromAppDirs();
