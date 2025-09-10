'use strict';
// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const { FileStore } = require('metro-cache');
// Use the compiled entry to avoid ESM directory import issues
const { withNativeWind } = require('nativewind/dist/metro');
const path = require('node:path');

const metroConfig = withTurborepoManagedCache(
  withMonorepoPaths(
    withNativeWind(getDefaultConfig(__dirname), {
      input: path.join(__dirname, './global.css'),
      configPath: path.join(__dirname, './tailwind.config.js'),
    })
  )
);

metroConfig.resolver.unstable_enablePackageExports = true;
metroConfig.resolver.disableHierarchicalLookup = true;

module.exports = metroConfig;

/**
 * Add the monorepo paths to the Metro config.
 * This allows Metro to resolve modules from the monorepo.
 *
 * @see https://docs.expo.dev/guides/monorepos/#modify-the-metro-config
 * @param {import('expo/metro-config').MetroConfig} config
 * @returns {import('expo/metro-config').MetroConfig}
 */
function withMonorepoPaths(cfg) {
  const projectRoot = __dirname;
  const workspaceRoot = path.resolve(projectRoot, '../..');

  // #1 - Watch all files in the monorepo
  cfg.watchFolders = [workspaceRoot];

  // #2 - Resolve modules within the project's `node_modules` first, then all monorepo modules
  cfg.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, 'node_modules'),
    path.resolve(workspaceRoot, 'node_modules'),
  ];

  return cfg;
}

/**
 * Move the Metro cache to the `.cache/metro` folder.
 * If you have any environment variables, you can configure Turborepo to invalidate it when needed.
 *
 * @see https://turbo.build/repo/docs/reference/configuration#env
 * @param {import('expo/metro-config').MetroConfig} config
 * @returns {import('expo/metro-config').MetroConfig}
 */
function withTurborepoManagedCache(cfg) {
  cfg.cacheStores = [
    new FileStore({ root: path.join(__dirname, '.cache/metro') }),
  ];
  return cfg;
}
