import { mergeConfigWithDefaults, getServerConfig } from '../configHelpers';
import { defaultConfig } from '../config';
import type { KioskConfig } from '../config';

// Helper type for deep partial (allows partial nested objects)
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Mock fs module
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  existsSync: jest.fn(),
}));

import { readFileSync, existsSync } from 'fs';

describe('configHelpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  describe('mergeConfigWithDefaults', () => {
    it('should return default config when empty partial config is provided', () => {
      const result = mergeConfigWithDefaults({});

      expect(result).toEqual(defaultConfig);
    });

    it('should merge top-level properties', () => {
      const partial = {
        timezone: 'Asia/Seoul',
      };

      const result = mergeConfigWithDefaults(partial);

      expect(result.timezone).toBe('Asia/Seoul');
      expect(result.dateFormat).toBe(defaultConfig.dateFormat);
      expect(result.weatherLocation).toEqual(defaultConfig.weatherLocation);
    });

    it('should deep merge weatherLocation', () => {
      const partial: DeepPartial<KioskConfig> = {
        weatherLocation: {
          lat: 37.5665,
          lon: 126.9780,
        },
      };

      const result = mergeConfigWithDefaults(partial);

      expect(result.weatherLocation.lat).toBe(37.5665);
      expect(result.weatherLocation.lon).toBe(126.9780);
      expect(result.weatherLocation.city).toBe(defaultConfig.weatherLocation.city);
    });

    it('should partially update weatherLocation', () => {
      const partial: DeepPartial<KioskConfig> = {
        weatherLocation: {
          city: 'Seoul',
        },
      };

      const result = mergeConfigWithDefaults(partial);

      expect(result.weatherLocation.city).toBe('Seoul');
      expect(result.weatherLocation.lat).toBe(defaultConfig.weatherLocation.lat);
      expect(result.weatherLocation.lon).toBe(defaultConfig.weatherLocation.lon);
    });

    it('should deep merge refreshIntervals', () => {
      const partial: DeepPartial<KioskConfig> = {
        refreshIntervals: {
          weather: 60,
        },
      };

      const result = mergeConfigWithDefaults(partial);

      expect(result.refreshIntervals.weather).toBe(60);
      expect(result.refreshIntervals.calendar).toBe(defaultConfig.refreshIntervals.calendar);
      expect(result.refreshIntervals.rss).toBe(defaultConfig.refreshIntervals.rss);
    });

    it('should deep merge displayLimits', () => {
      const partial: DeepPartial<KioskConfig> = {
        displayLimits: {
          calendarEvents: 10,
        },
      };

      const result = mergeConfigWithDefaults(partial);

      expect(result.displayLimits.calendarEvents).toBe(10);
      expect(result.displayLimits.rssItems).toBe(defaultConfig.displayLimits.rssItems);
    });

    it('should handle complete custom config', () => {
      const customConfig: KioskConfig = {
        timezone: 'Asia/Tokyo',
        dateFormat: 'yyyy-MM-dd',
        weatherLocation: {
          lat: 35.6762,
          lon: 139.6503,
          city: 'Tokyo',
        },
        calendarUrl: 'https://calendar.example.com',
        rssFeeds: ['https://news.example.com/rss'],
        refreshIntervals: {
          weather: 60,
          calendar: 30,
          rss: 20,
        },
        displayLimits: {
          calendarEvents: 8,
          rssItems: 10,
        },
      };

      const result = mergeConfigWithDefaults(customConfig);

      expect(result).toEqual(customConfig);
    });

    it('should handle partial config with all sections', () => {
      const partial: DeepPartial<KioskConfig> = {
        timezone: 'Europe/London',
        weatherLocation: {
          lat: 51.5074,
        },
        refreshIntervals: {
          weather: 45,
        },
        displayLimits: {
          rssItems: 5,
        },
      };

      const result = mergeConfigWithDefaults(partial);

      expect(result.timezone).toBe('Europe/London');
      expect(result.weatherLocation.lat).toBe(51.5074);
      expect(result.weatherLocation.lon).toBe(defaultConfig.weatherLocation.lon);
      expect(result.refreshIntervals.weather).toBe(45);
      expect(result.refreshIntervals.calendar).toBe(defaultConfig.refreshIntervals.calendar);
      expect(result.displayLimits.rssItems).toBe(5);
      expect(result.displayLimits.calendarEvents).toBe(defaultConfig.displayLimits.calendarEvents);
    });

    it('should handle timeServer optional field', () => {
      const partial = {
        timeServer: 'time.google.com',
      };

      const result = mergeConfigWithDefaults(partial);

      expect(result.timeServer).toBe('time.google.com');
    });

    it('should override rssFeeds array completely', () => {
      const partial = {
        rssFeeds: ['https://feed1.com', 'https://feed2.com'],
      };

      const result = mergeConfigWithDefaults(partial);

      expect(result.rssFeeds).toEqual(['https://feed1.com', 'https://feed2.com']);
    });
  });

  describe('getServerConfig', () => {
    it('should return default config when file does not exist', () => {
      (existsSync as jest.Mock).mockReturnValue(false);

      const result = getServerConfig();

      expect(result).toEqual(defaultConfig);
      expect(existsSync).toHaveBeenCalled();
      expect(readFileSync).not.toHaveBeenCalled();
    });

    it('should read and parse config file when it exists', () => {
      const fileConfig = {
        timezone: 'Asia/Seoul',
        weatherLocation: {
          lat: 37.5665,
          lon: 126.9780,
        },
      };

      (existsSync as jest.Mock).mockReturnValue(true);
      (readFileSync as jest.Mock).mockReturnValue(JSON.stringify(fileConfig));

      const result = getServerConfig();

      expect(existsSync).toHaveBeenCalled();
      expect(readFileSync).toHaveBeenCalledWith(
        expect.stringContaining('config.json'),
        'utf-8'
      );
      expect(result.timezone).toBe('Asia/Seoul');
      expect(result.weatherLocation.lat).toBe(37.5665);
      expect(result.weatherLocation.city).toBe(defaultConfig.weatherLocation.city);
    });

    it('should merge file config with defaults', () => {
      const fileConfig = {
        timezone: 'Europe/Paris',
        refreshIntervals: {
          weather: 90,
        },
      };

      (existsSync as jest.Mock).mockReturnValue(true);
      (readFileSync as jest.Mock).mockReturnValue(JSON.stringify(fileConfig));

      const result = getServerConfig();

      expect(result.timezone).toBe('Europe/Paris');
      expect(result.refreshIntervals.weather).toBe(90);
      expect(result.refreshIntervals.calendar).toBe(defaultConfig.refreshIntervals.calendar);
      expect(result.dateFormat).toBe(defaultConfig.dateFormat);
    });

    it('should handle JSON parse error and return default config', () => {
      (existsSync as jest.Mock).mockReturnValue(true);
      (readFileSync as jest.Mock).mockReturnValue('invalid json{');

      const result = getServerConfig();

      expect(result).toEqual(defaultConfig);
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle file read error and return default config', () => {
      (existsSync as jest.Mock).mockReturnValue(true);
      (readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('File read error');
      });

      const result = getServerConfig();

      expect(result).toEqual(defaultConfig);
      expect(console.error).toHaveBeenCalledWith(
        'Failed to read server config:',
        expect.any(Error)
      );
    });

    it('should handle empty config file', () => {
      (existsSync as jest.Mock).mockReturnValue(true);
      (readFileSync as jest.Mock).mockReturnValue('{}');

      const result = getServerConfig();

      expect(result).toEqual(defaultConfig);
    });

    it('should handle complete custom config from file', () => {
      const customConfig: KioskConfig = {
        timezone: 'America/Los_Angeles',
        dateFormat: 'MM/dd/yyyy',
        weatherLocation: {
          lat: 37.7749,
          lon: -122.4194,
          city: 'San Francisco',
        },
        calendarUrl: 'https://calendar.google.com/cal.ics',
        rssFeeds: ['https://news.com/rss', 'https://tech.com/feed'],
        refreshIntervals: {
          weather: 45,
          calendar: 20,
          rss: 25,
        },
        displayLimits: {
          calendarEvents: 7,
          rssItems: 8,
        },
      };

      (existsSync as jest.Mock).mockReturnValue(true);
      (readFileSync as jest.Mock).mockReturnValue(JSON.stringify(customConfig));

      const result = getServerConfig();

      expect(result).toEqual(customConfig);
    });

    it('should preserve additional fields in config', () => {
      const fileConfig = {
        timezone: 'UTC',
        customField: 'custom value', // Additional field not in type
      };

      (existsSync as jest.Mock).mockReturnValue(true);
      (readFileSync as jest.Mock).mockReturnValue(JSON.stringify(fileConfig));

      const result = getServerConfig();
      const resultWithCustom = result as KioskConfig & { customField?: string };

      expect(result.timezone).toBe('UTC');
      // Custom field should be preserved by spread operator
      expect(resultWithCustom.customField).toBe('custom value');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle first-time setup scenario', () => {
      // No config file exists
      (existsSync as jest.Mock).mockReturnValue(false);

      const config = getServerConfig();

      // Should return defaults
      expect(config).toEqual(defaultConfig);
    });

    it('should handle migration from old config format', () => {
      // Old config with missing new fields
      const oldConfig = {
        timezone: 'Asia/Seoul',
        weatherLocation: {
          lat: 37.5665,
          lon: 126.9780,
          city: 'Seoul',
        },
        // Missing: dateFormat, displayLimits, etc.
      };

      (existsSync as jest.Mock).mockReturnValue(true);
      (readFileSync as jest.Mock).mockReturnValue(JSON.stringify(oldConfig));

      const result = getServerConfig();

      // Should have old values
      expect(result.timezone).toBe('Asia/Seoul');
      expect(result.weatherLocation).toEqual(oldConfig.weatherLocation);

      // Should have new defaults
      expect(result.dateFormat).toBe(defaultConfig.dateFormat);
      expect(result.displayLimits).toEqual(defaultConfig.displayLimits);
    });

    it('should handle user customization scenario', () => {
      const userConfig = {
        timezone: 'America/New_York',
        weatherLocation: {
          city: 'Boston',
          lat: 42.3601,
          lon: -71.0589,
        },
        rssFeeds: ['https://boston.com/rss'],
        refreshIntervals: {
          weather: 30,
          calendar: 15,
          rss: 15,
        },
        displayLimits: {
          calendarEvents: 5,
          rssItems: 10,
        },
      };

      const merged = mergeConfigWithDefaults(userConfig);

      expect(merged.timezone).toBe('America/New_York');
      expect(merged.weatherLocation.city).toBe('Boston');
      expect(merged.rssFeeds).toEqual(['https://boston.com/rss']);
      expect(merged.dateFormat).toBe(defaultConfig.dateFormat);
    });
  });
});
