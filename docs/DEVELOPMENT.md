# Development Guide

## Requirements

- Node.js 22 LTS
- npm

## Development Environment Setup

```bash
git clone https://github.com/nalbam/rpi-hub.git
cd rpi-hub
npm install
npm run dev
```

http://localhost:3000

## Project Structure

```
app/
├── api/                      # API Routes
│   ├── calendar/route.ts     # Google Calendar iCal fetching
│   ├── config/route.ts       # Configuration file (config.json) management
│   ├── geocoding/route.ts    # Open-Meteo geocoding (city → coordinates)
│   ├── reverse-geocoding/route.ts  # Nominatim reverse geocoding (coordinates → city)
│   ├── rss/route.ts          # RSS feed aggregation
│   └── weather/route.ts      # Open-Meteo API integration
├── settings/                 # Settings page
│   ├── page.tsx              # Main settings page
│   └── components/           # Settings sub-components
│       ├── LocationSettings.tsx
│       ├── CalendarSettings.tsx
│       └── RSSSettings.tsx
├── layout.tsx
├── page.tsx
└── globals.css               # Tailwind CSS and custom animations

components/
├── Calendar/Calendar.tsx     # Calendar events display
├── Clock/Clock.tsx           # Time display with timezone support
├── RSS/RSS.tsx               # RSS news feed with automatic carousel
├── Weather/Weather.tsx       # Weather widget with animated icons
└── shared/                   # Shared UI components
    ├── WidgetContainer.tsx   # Unified widget wrapper
    ├── ErrorBoundary.tsx     # Error isolation boundary
    └── Toast.tsx             # Notification system

lib/
├── config.ts                 # Configuration types and defaults
├── constants.ts              # System constants (API limits, validation ranges)
├── storage.ts                # Configuration management and browser detection
├── urlValidation.ts          # SSRF protection utilities
├── validation.ts             # Input validation (coordinates, etc.)
├── apiHelpers.ts             # API response creation helpers
├── configHelpers.ts          # Server-side config loading and merging
└── hooks/                    # Custom React hooks
    ├── useWidgetData.ts      # Generic data fetching with auto-refresh
    ├── useAutoRefresh.ts     # Interval-based refresh logic
    └── useConfigWithRetry.ts # Configuration loading with retry

scripts/
├── config.sh                 # Configuration file (config.json) CLI management
├── install.sh                # Automated installation for Raspberry Pi
├── start-kiosk.sh            # Launch kiosk mode
├── uninstall.sh              # Service removal
└── update.sh                 # Update code and rebuild (no restart)
```

## Scripts

- `npm run dev` - Development server
- `npm run build` - Production build
- `npm start` - Production server
- `npm run lint` - ESLint

## Development Guide

### Code Style

- Use TypeScript
- Functional components + hooks
- Tailwind CSS
- Small, focused components

### Adding New Features

1. Create component in `components/`
2. Add API route in `app/api/` if needed
3. Update configuration types in `lib/config.ts`
4. Add component to `app/page.tsx`
5. Update settings page

### API Route Patterns

#### Pattern 1: External URL Fetching (with SSRF Protection)

```typescript
import { validateCalendarUrl, fetchWithTimeout } from '@/lib/urlValidation';
import { API } from '@/lib/constants';
import {
  createErrorResponse,
  createSuccessResponse,
  handleValidation,
} from '@/lib/apiHelpers';
import { getServerConfig } from '@/lib/configHelpers';

export async function GET() {
  // Read configuration from server
  const config = getServerConfig();
  const url = config.calendarUrl;

  // If no URL configured, return empty result
  if (!url || url.trim() === '') {
    return createSuccessResponse({ events: [] });
  }

  // SSRF validation required
  const validationError = handleValidation(validateCalendarUrl(url));
  if (validationError) {
    return validationError;
  }

  try {
    // Apply timeout and size limits
    const response = await fetchWithTimeout(url, API.TIMEOUT_MS, API.MAX_CALENDAR_SIZE);
    const data = await response.text();
    return createSuccessResponse({ data });
  } catch (error) {
    return createErrorResponse('Failed to fetch data', error);
  }
}
```

#### Pattern 2: Server Config-Based API (No External Fetch)

```typescript
import { API } from '@/lib/constants';
import {
  createErrorResponse,
  createSuccessResponse,
} from '@/lib/apiHelpers';
import { getServerConfig } from '@/lib/configHelpers';

export async function GET() {
  // Read configuration from server
  const config = getServerConfig();
  const { lat, lon } = config.weatherLocation;

  // Validate coordinates from config
  if (typeof lat !== 'number' || typeof lon !== 'number') {
    return createErrorResponse('Invalid coordinates in server configuration', undefined, 500);
  }

  try {
    // Fetch from trusted external API
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch data');
    }

    const data = await response.json();
    return createSuccessResponse({ temperature: data.current.temperature_2m });
  } catch (error) {
    return createErrorResponse('Failed to fetch data', error);
  }
}
```

### Security Checklist

All API routes fetching external URLs must:
- [ ] Validate URL with `validateCalendarUrl()`
- [ ] Use `fetchWithTimeout()`
- [ ] Use constants from `constants.ts`
- [ ] Return 400 on validation failure
- [ ] Set appropriate timeout and size limits

### Component Pattern

#### Modern Pattern (Recommended - Using Custom Hooks)

```typescript
'use client';

import { useWidgetData } from '@/lib/hooks/useWidgetData';
import { WidgetContainer } from '@/components/shared/WidgetContainer';
import ErrorBoundary from '@/components/shared/ErrorBoundary';

interface MyData {
  value: string;
}

export default function MyWidget() {
  const { data, loading, error } = useWidgetData<MyData>(
    '/api/my-endpoint',
    30 // refresh interval in minutes
  );

  if (loading) return <WidgetContainer loading />;
  if (error) return <WidgetContainer error={error} />;
  if (!data) return <WidgetContainer empty />;

  return (
    <ErrorBoundary>
      <WidgetContainer>
        <div>{data.value}</div>
      </WidgetContainer>
    </ErrorBoundary>
  );
}
```

#### Traditional Pattern (Manual Implementation)

```typescript
'use client';

import { useState, useEffect } from 'react';
import { getConfig } from '@/lib/storage';

export default function MyWidget() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/my-endpoint');
      const data = await response.json();
      setData(data);
    } catch (error) {
      console.error('Failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const config = getConfig();
    const interval = setInterval(
      fetchData,
      config.refreshIntervals.myFeature * 60 * 1000
    );
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading...</div>;
  return <div>{/* UI */}</div>;
}
```

## Constants Management

### constants.ts (System Constraints)

```typescript
export const API = {
  TIMEOUT_MS: 10000,
  MAX_RSS_SIZE: 5 * 1024 * 1024,
} as const;

export const PROCESSING_LIMITS = {
  MAX_RSS_ITEMS_PER_FEED: 10,
  MAX_RSS_ITEMS_TOTAL: 20,
} as const;
```

### config.ts (User Settings)

```typescript
export interface KioskConfig {
  timezone: string;
  dateFormat: string;
  refreshIntervals: { weather: number; calendar: number; rss: number };
  displayLimits: { calendarEvents: number; rssItems: number };
  // ...
}
```

## Build and Deploy

```bash
npm run build
npm start
```

For Raspberry Pi deployment, see `./scripts/install.sh`

## Node.js Version

`.nvmrc` file included:

```bash
nvm use
```

## Troubleshooting

**Port already in use**
```bash
PORT=3001 npm run dev
```

**Dependency issues**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Build errors**
```bash
node --version  # Check for v22.x.x
```
