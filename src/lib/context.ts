import { getLogger } from "./logger";

type Logger = ReturnType<typeof getLogger>;

export type Context = {
  env: CloudflareEnv;
  logger: Logger;
};

export const createContext = (env: CloudflareEnv): Context => {
  return {
    env,
    logger: getLogger(env),
  };
};
