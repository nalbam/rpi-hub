# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

RPI Hub is a Raspberry Pi kiosk mode display application built with Next.js 16 (App Router) and TypeScript. It displays clock, weather, calendar, and RSS news feeds in a clean, modern dashboard.

## Development Commands

### Essential Commands
- `npm run dev` - Start development server on http://localhost:3000
- `npm run build` - Build production bundle
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Deployment Scripts
- `./scripts/install.sh` - Automated installation for Raspberry Pi
- `./scripts/start-kiosk.sh` - Launch kiosk mode
- Systemd service: `scripts/rpi-hub.service`

## Architecture

### Client-Server Pattern
- **Client Components** (`components/*/`): React components that fetch data from API routes and manage UI state
- **API Routes** (`app/api/*/route.ts`): Server-side endpoints that fetch external data (weather, calendar, RSS) and apply security validations
- **Configuration**: Stored in server-side `config.json` file, managed via `/api/config` endpoint, with defaults in `lib/config.ts`

### Data Flow
1. Client components read configuration from server (`getConfig()` → `/api/config` → `config.json`)
2. Components call Next.js API routes with configuration parameters
3. API routes validate URLs (SSRF protection), fetch external data, and return processed results
4. Components refresh data based on configurable intervals (default: weather 30min, calendar/RSS 15min)

### Key Modules

#### Configuration (`lib/config.ts`, `lib/storage.ts`, `lib/configHelpers.ts`)
- `KioskConfig` interface defines all user settings (timezone, weather location, calendar URL, RSS feeds, refresh intervals)
- `DateFormatOption` interface with locale support ('en', 'ko', 'ja', 'zh-CN')
- `DATE_FORMAT_OPTIONS` array with 13 formats (7 English + 6 Asian language formats)
- `getLocaleFromDateFormat(dateFormat)` - Returns locale for given date format
- `getConfig()` - Reads from server via `/api/config`, which loads `config.json` with fallback to `defaultConfig`
- `saveConfig()` - Persists updates to server via POST `/api/config`, which writes to `config.json`
- `detectBrowserSettings()` - Auto-detects timezone, city, and language/country for Google News RSS
- `detectGeolocation()` - Requests browser geolocation for weather coordinates (GPS-based)
- `detectLocationByIP()` - Detects location via IP address using ipapi.co service (fallback method)
- `initializeConfig()` - First-visit setup with multi-layer detection:
  1. Checks `_initialized` flag in config (false = needs initialization)
  2. Parallel execution: GPS geolocation + IP-based detection
  3. Priority: GPS → IP → Geocoding → defaults
  4. Reverse geocoding for GPS coordinates to get city name
  5. Forward geocoding for city names to get timezone
  6. Auto-save to `config.json`
  7. Note: `_initialized` flag is internal, used by `useConfigWithRetry` hook for retry logic
- `LANGUAGE_TO_COUNTRY` - Maps 36 language codes to primary country codes
- `detectLanguageAndCountry()` - Detects browser language and country from navigator.language
- `generateGoogleNewsRSS(language, country)` - Generates localized Google News RSS URL
- `mergeConfigWithDefaults(partialConfig)` - Deep merge partial config with defaults (server-side)
- `getServerConfig()` - Reads config.json from server file system (server-side only)

#### API Helpers (`lib/apiHelpers.ts`)
Standardized response creation for API routes:
- `createErrorResponse(message, error?, status?)` - Error response with logging (default 500)
- `createValidationError(error)` - Validation error (400 status)
- `createSuccessResponse<T>(data)` - Success response wrapper
- `handleValidation(validation)` - Returns error response if invalid, null if valid
- `getRequiredParam(searchParams, paramName)` - Extract and validate required parameter
- `isErrorResponse(value)` - Type guard for NextResponse

#### Security (`lib/urlValidation.ts`)
CRITICAL: All external URLs (calendar, RSS) MUST pass through `validateCalendarUrl()` to prevent SSRF attacks.

Blocked patterns:
- Non-HTTP(S) protocols
- Localhost, loopback addresses (127.0.0.0/8, ::1)
- Private IP ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, fc00::/7, fe80::/10)
- Cloud metadata services (169.254.169.254, fd00:ec2::254)
- Privileged ports except 80/443
- Dangerous service ports (SSH, databases, etc.)

`fetchWithTimeout()` enforces:
- Configurable timeout (default 10s)
- Maximum response size (default 10MB)
- IPv4 enforcement (resolves WSL IPv6 timeout issues)
- User-Agent header for proper identification
- Automatic redirect handling (max 5 redirects)
- Chunk-by-chunk size validation
- Abort signal for cancellation

#### API Routes Pattern
All API routes (`app/api/*/route.ts`) follow this structure:
1. Extract query parameters from `searchParams`
2. Validate required parameters (return 400 if missing)
3. **For external URLs**: Validate with `validateCalendarUrl()` (return 400 if invalid)
4. Fetch data with `fetchWithTimeout()` for timeout/size protection
5. Process and transform data
6. Return JSON response with proper error handling (500 on failure)

#### Component Pattern
All widget components (`components/*/`) follow this pattern:
- Client components (`'use client'`)
- Use `useWidgetData<T>` hook for centralized data fetching and auto-refresh
- Wrapped in `ErrorBoundary` for isolated error handling
- Read config via `getConfig()` on mount and for refresh intervals
- Fetch from `/api/*` routes
- Auto-refresh via `useAutoRefresh` hook with cleanup on unmount
- Render loading state, error state, and data state

#### Shared Components (`components/shared/`)
- `WidgetContainer` - Unified widget styling (bg-gray-900, border-gray-800, rounded-lg)
- `ErrorBoundary` - React Error Boundary for widget-level error isolation with retry functionality
- `Toast` - Notification system for success/error messages with auto-hide timer

#### Custom Hooks (`lib/hooks/`)
- `useWidgetData<T>` - Generic data fetching with auto-refresh and error handling
- `useAutoRefresh` - Configurable interval-based refresh logic
- `useConfigWithRetry` - Configuration loading with automatic retry on failure

### File Organization
```
app/
├── api/                      # Server-side API routes
│   ├── calendar/route.ts     # Google Calendar iCal fetching
│   ├── config/route.ts       # Configuration file (config.json) management
│   ├── geocoding/route.ts    # Open-Meteo geocoding (city → coordinates)
│   ├── reverse-geocoding/route.ts  # Nominatim reverse geocoding (coordinates → city)
│   ├── rss/route.ts          # RSS feed aggregation
│   └── weather/route.ts      # Open-Meteo API integration
├── settings/                 # Settings page
│   ├── page.tsx              # Main settings page
│   └── components/           # Settings sub-components
│       ├── LocationSettings.tsx   # Timezone, city, coordinates configuration
│       ├── CalendarSettings.tsx   # Google Calendar URL configuration
│       └── RSSSettings.tsx        # RSS feed management
├── layout.tsx                # Root layout with metadata
├── page.tsx                  # Main dashboard (client component)
└── globals.css               # Tailwind CSS and custom animations

components/                   # Reusable widgets
├── Calendar/Calendar.tsx     # Calendar events display with all-day event support
├── Clock/Clock.tsx           # Time display with timezone support
├── RSS/RSS.tsx               # RSS news feed with automatic carousel
├── Weather/Weather.tsx       # Weather widget with animated icons
└── shared/                   # Shared UI components
    ├── WidgetContainer.tsx   # Unified widget wrapper
    ├── ErrorBoundary.tsx     # Error isolation boundary
    └── Toast.tsx             # Notification system

lib/                          # Shared utilities
├── config.ts                 # Configuration types, defaults, and date format options
├── constants.ts              # System constants (API limits, validation ranges)
├── storage.ts                # Configuration management, browser detection, and i18n helpers
├── urlValidation.ts          # SSRF protection utilities
├── validation.ts             # Input validation (coordinates, etc.)
├── apiHelpers.ts             # API response creation helpers (errors, success, validation)
├── configHelpers.ts          # Server-side config loading and merging
└── hooks/                    # Custom React hooks
    ├── useWidgetData.ts      # Generic data fetching with auto-refresh
    ├── useAutoRefresh.ts     # Interval-based refresh logic
    └── useConfigWithRetry.ts # Configuration loading with retry

scripts/                      # Deployment and management scripts
├── config.sh                 # Configuration file (config.json) CLI management
├── install.sh                # Automated installation for Raspberry Pi
├── start-kiosk.sh            # Launch kiosk mode
├── uninstall.sh              # Service removal
└── update.sh                 # Update code and rebuild (no restart)
```

## Technology Stack
- **Runtime**: Node.js 22 LTS
- **Framework**: Next.js 16.1.1 (App Router)
- **Language**: TypeScript 5
- **UI Library**: React 19.2.3
- **Styling**: Tailwind CSS 3.4.19
- **Icons**: lucide-react 0.562.0
- **Date Handling**: date-fns 4.1.0, date-fns-tz 3.2.0
- **Calendar Parsing**: ical.js 1.5.0
- **RSS Parsing**: rss-parser 3.13.0
- **Weather API**: Open-Meteo (free, no API key)
- **Geocoding APIs**:
  - Open-Meteo Geocoding (city → coordinates)
  - Nominatim/OpenStreetMap (coordinates → city)

## Important Patterns

### Adding New External Data Sources
When adding API routes that fetch external URLs:
1. Import `validateCalendarUrl` and `fetchWithTimeout` from `@/lib/urlValidation`
2. Validate ALL user-provided URLs before fetching
3. Use `fetchWithTimeout()` with appropriate timeout and size limits
4. Handle validation errors with 400 status and descriptive messages
5. Follow existing error handling patterns in `app/api/calendar/route.ts` and `app/api/rss/route.ts`

### Adding New Configuration Options
1. Update `KioskConfig` interface in `lib/config.ts`
2. Add defaults to `defaultConfig`
3. Update settings page (`app/settings/`) to allow user configuration
4. Components automatically merge new fields via spread operator in `getConfig()`

### Widget Development
New widgets should:
- Be placed in `components/{WidgetName}/{WidgetName}.tsx`
- Use the client component pattern with loading/error states
- Use `useWidgetData<T>` hook for consistent data fetching
- Read configuration from `getConfig()` or `useConfigWithRetry()`
- Implement auto-refresh with cleanup using `useAutoRefresh`
- Wrap with `ErrorBoundary` for isolated error handling
- Use `WidgetContainer` for consistent styling
- Match the design system (bg-gray-900, border-gray-800, rounded-lg)
- Be added to the grid in `app/page.tsx`

#### Widget-Specific Features

**Clock Widget**:
- Second-by-second updates using `setInterval`
- Timezone conversion via `date-fns-tz`
- Configurable date format (7 preset options)

**Weather Widget**:
- 23 distinct weather code mappings from Open-Meteo API:
  - Clear/Cloudy: 0-3 (Clear, Mostly Clear, Partly Cloudy, Cloudy)
  - Fog: 45, 48
  - Drizzle: 51, 53, 55
  - Rain: 61, 63, 65 (Rain, Heavy Rain), 80, 81, 82 (Showers, Heavy Rain)
  - Snow: 71, 73, 75 (Snow, Heavy Snow), 85, 86 (Snow, Heavy Snow)
  - Sleet: 77
  - Thunderstorm: 95, 96, 99
- Animated icons using CSS keyframes (`rotate`, `sway`, `fade`, `bounce`, `float`, `flash`, `pulse`)
- Temperature, humidity, wind speed display
- Weather descriptions from code mapping in app/api/weather/route.ts:34-59

**Calendar Widget**:
- All-day event detection and special formatting
- Multi-day event duration display
- Location display with MapPin icon
- Events sorted by start time
- Filters events within 30 days
- CalendarEvent interface:
  - `title`, `description`, `location` (strings)
  - `start`, `end` (Date objects for timed events, YYYY-MM-DD strings for all-day events)
  - `isAllDay` (boolean) - detected from ical.js Time object's isDate property
- Timezone-safe handling: all-day events use date strings to avoid timezone conversion issues

**RSS Widget**:
- Automatic carousel (10-second rotation)
- Visual indicators (dots) for current item
- Configurable display limit (default: 7 items)
- Date-sorted feed aggregation
- Server-side feed item limit (10 items per feed, 20 total)

## Security Considerations
- **SSRF Protection**: Never fetch external URLs without validation via `validateCalendarUrl()`
- **Input Validation**: All API routes validate parameters before processing
  - Coordinate ranges: latitude (-90 to 90), longitude (-180 to 180)
  - Query string length limits (max 100 characters for geocoding)
  - Timezone validation using `Intl.supportedValuesOf('timeZone')`
  - Date format whitelist (13 predefined formats: 7 English + 6 Asian language formats)
- **Response Size Limits**: Prevent memory exhaustion from large responses
  - Default: 10MB maximum response size
  - Chunk-by-chunk validation during fetch
  - Per-API limits defined in `constants.ts`
- **Timeout Protection**: Prevent hanging requests (10-second default timeout)
- **IPv4 Enforcement**: Prevents IPv6 timeout issues in WSL environments
- **Redirect Limits**: Maximum 5 redirects to prevent redirect loops
- **No Sensitive Data**: Application uses server-side config.json file only (no secrets, no database)
- **Port Restrictions**: Blocks access to privileged ports (1-1023) and dangerous service ports
- **Private Network Protection**: Blocks access to localhost, private IP ranges, and cloud metadata services

## API Endpoints

### Configuration Management
- `GET /api/config` - Retrieve current configuration (merged from `config.json` and defaults)
- `POST /api/config` - Save configuration to `config.json` (validates and merges with defaults)

### Weather & Location
- `GET /api/weather?lat={lat}&lon={lon}` - Fetch weather data from Open-Meteo
- `GET /api/geocoding?city={city}` - Forward geocoding: city name → coordinates and timezone
- `GET /api/reverse-geocoding?lat={lat}&lon={lon}` - Reverse geocoding: coordinates → city name

### Calendar & RSS
- `GET /api/calendar?url={calendarUrl}` - Fetch and parse Google Calendar iCal feed
- `GET /api/rss?urls[]={url1}&urls[]={url2}` - Aggregate multiple RSS feeds (max 10 items per feed, 20 total)

All external URL parameters MUST be validated with `validateCalendarUrl()` before fetching.

## Best Practices

### File Size Management
- Target: Keep all source files under 400 lines
- Hard limit: 700 lines maximum per file
- Current status: `LocationSettings.tsx` is at 556 lines (approaching limit)
- When approaching limits: Extract sub-components or utility functions

### Error Handling
- Use `ErrorBoundary` for React component errors
- Show user-friendly error messages via `Toast` component
- Log errors to console for debugging
- Provide retry mechanisms where appropriate

### Performance Optimization
- Use auto-refresh intervals wisely (weather: 30min, calendar/RSS: 15min)
- Limit API response sizes to prevent memory issues
- Implement client-side caching where appropriate
- Use loading states to improve perceived performance

### Code Organization
- Group related functionality in directories (`app/settings/components/`)
- Use custom hooks for reusable logic (`lib/hooks/`)
- Centralize constants in `lib/constants.ts`
- Keep API logic in route handlers, UI logic in components
