export const logger = {
  info: (moduleName: string, msg: string) => console.log(`\x1b[34m[INFO]\x1b[0m [${new Date().toISOString()}] [${moduleName}] ${msg}`),
  warn: (moduleName: string, msg: string) => console.warn(`\x1b[33m[WARN]\x1b[0m [${new Date().toISOString()}] [${moduleName}] ${msg}`),
  error: (moduleName: string, msg: string, err?: any) => console.error(`\x1b[31m[ERROR]\x1b[0m [${new Date().toISOString()}] [${moduleName}] ${msg}`, err || '')
};