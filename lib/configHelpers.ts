import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { defaultConfig } from './config';
import type { KioskConfig } from './config';

// Helper type for deep partial (allows partial nested objects)
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Merges partial config with default config to ensure all required fields exist.
 *
 * Used by config API route to ensure consistency when reading or writing config.
 * Performs deep merging for nested objects (weatherLocation, refreshIntervals, displayLimits).
 *
 * @param partialConfig - Partial configuration object (from config.json or request body)
 * @returns Complete configuration with all required fields
 *
 * @example
 * ```typescript
 * // In config API route
 * const fileConfig = JSON.parse(fileContent);
 * const config = mergeConfigWithDefaults(fileConfig);
 * ```
 */
export function mergeConfigWithDefaults(
  partialConfig: DeepPartial<KioskConfig>
): KioskConfig {
  return {
    ...defaultConfig,
    ...(partialConfig as Partial<KioskConfig>),
    weatherLocation: {
      ...defaultConfig.weatherLocation,
      ...partialConfig.weatherLocation,
    },
    refreshIntervals: {
      ...defaultConfig.refreshIntervals,
      ...partialConfig.refreshIntervals,
    },
    displayLimits: {
      ...defaultConfig.displayLimits,
      ...partialConfig.displayLimits,
    },
  };
}

/**
 * Reads server-side configuration from config.json file.
 *
 * Used by API routes to access configuration without requiring client parameters.
 * Returns default config if file doesn't exist or cannot be read.
 *
 * @returns Complete configuration with all required fields
 *
 * @example
 * ```typescript
 * // In API route
 * const config = getServerConfig();
 * const lat = config.weatherLocation.lat;
 * ```
 */
export function getServerConfig(): KioskConfig {
  try {
    const configPath = join(process.cwd(), 'config.json');

    // If config.json exists, read and return it
    if (existsSync(configPath)) {
      const fileContent = readFileSync(configPath, 'utf-8');
      const fileConfig = JSON.parse(fileContent) as DeepPartial<KioskConfig>;

      // Merge with default config to ensure all required fields exist
      return mergeConfigWithDefaults(fileConfig);
    }

    // If no config.json, return default config
    return defaultConfig;
  } catch (error) {
    console.error('Failed to read server config:', error);
    // On error, return default config
    return defaultConfig;
  }
}
