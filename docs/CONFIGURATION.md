# Configuration

## Auto-Detection

On first visit, the application automatically detects and applies location using multiple methods in parallel:

**Multi-Layer Detection Strategy**:
1. **Parallel Execution**: GPS geolocation + IP-based detection run simultaneously
2. **Priority System**: GPS → IP → Geocoding → Defaults
3. **Reverse Geocoding**: GPS coordinates are converted to city name via Nominatim API
4. **Forward Geocoding**: City names are converted to timezone via Open-Meteo API
5. **Auto-Save**: Detected settings are automatically saved to `config.json`

**Detection Sources**:
- **Timezone**:
  - Browser's timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`
  - Or from geocoding API based on coordinates
- **City**:
  - Reverse geocoding from GPS coordinates (e.g., "New York, USA")
  - Or IP-based detection via ipapi.co service
  - Or extracted from timezone string (e.g., "America/New_York" → "New York")
- **Coordinates**:
  - Browser geolocation API (GPS - requires user permission)
  - Or IP-based detection via ipapi.co service
  - Or forward geocoding from city name

This happens only on the first visit before any manual configuration is saved.

## Configuration Methods

### 1. Web UI (Recommended)

Click the Settings button in the browser.

**Features**:
- **Timezone**: Dropdown with all IANA timezones, grouped by region (Africa, America, Asia, etc.)
  - "Use Browser Default" button to apply detected timezone
- **Date Format**: Dropdown with 13 predefined formats (English, Korean, Japanese, Chinese)
- **City**: Text input with "Use Browser Default" button
- **Coordinates**: Numeric inputs with two helper buttons:
  - "Detect Location" - Triggers browser geolocation
  - "View on Google Maps" - Opens current coordinates in Google Maps
- **Calendar URL**: Text input for Google Calendar iCal URL
- **RSS Feeds**: Add/remove feed URLs
- **Refresh Intervals**: Configure update frequency for each data source
- **Display Limits**: Number of items to show

### 2. Shell Script (config.json)

```bash
# Install jq (required)
sudo apt-get install jq

# Initialize configuration file
./scripts/config.sh init

# Set values
./scripts/config.sh set timezone "America/New_York"
./scripts/config.sh set weatherLocation.lat 40.7128
./scripts/config.sh set weatherLocation.city "New York"

# Get value
./scripts/config.sh get timezone

# View all settings
./scripts/config.sh list
```

**Priority**: config.json > browser-detected > defaults

**Smart Merge**: On first visit, browser settings are auto-detected and saved to `config.json`. When `config.json` exists, the app compares each value to defaults:
- If `config.json` value **differs** from default → Use `config.json` value
- If `config.json` value **matches** default → Use browser-detected value

Example:
```
config.json: timezone = "America/New_York" (same as default)
Browser detected: timezone = "Asia/Seoul"
→ Result: "Asia/Seoul" (browser wins because config matches default)

config.json: timezone = "Europe/London" (different from default)
Browser detected: timezone = "Asia/Seoul"
→ Result: "Europe/London" (config wins because it's explicitly set)
```

## Default Configuration

```json
{
  "timezone": "America/New_York",
  "dateFormat": "EEEE, MMMM dd, yyyy",
  "weatherLocation": {
    "lat": 40.7128,
    "lon": -74.0060,
    "city": "New York"
  },
  "calendarUrl": "",
  "rssFeeds": [
    "https://news.google.com/rss?hl=en&gl=US&ceid=US:en"
  ],
  "refreshIntervals": {
    "weather": 30,
    "calendar": 15,
    "rss": 15
  },
  "displayLimits": {
    "calendarEvents": 5,
    "rssItems": 7
  }
}
```

## Timezones

The settings page provides a dropdown with **all IANA timezones** (600+), grouped by region:
- Africa
- America
- Antarctica
- Arctic
- Asia
- Atlantic
- Australia
- Europe
- Indian
- Pacific
- UTC and others

**Examples**:
- `America/Los_Angeles` - US Pacific
- `America/New_York` - US Eastern
- `Asia/Seoul` - Korea
- `Asia/Tokyo` - Japan
- `Europe/London` - UK

The dropdown automatically loads all available timezones using `Intl.supportedValuesOf('timeZone')`.

Full list: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones

## Date Formats

Choose from 13 formats in settings:

**English formats (7)**:
- `EEEE, MMMM dd, yyyy` - Wednesday, January 01, 2026
- `MMMM dd, yyyy` - January 01, 2026
- `yyyy-MM-dd` - 2026-01-01
- `MM/dd/yyyy` - 01/01/2026
- `dd/MM/yyyy` - 01/01/2026
- `dd MMMM yyyy` - 01 January 2026
- `EEE, MMM dd, yyyy` - Wed, Jan 01, 2026

**Korean formats (2)**:
- `yyyy년 M월 d일 EEEE` - 2026년 1월 8일 수요일
- `yyyy년 M월 d일 (EEE)` - 2026년 1월 8일 (수)

**Japanese formats (2)**:
- `yyyy年M月d日 EEEE` - 2026年1月8日 水曜日
- `yyyy年M月d日(EEE)` - 2026年1月8日(水)

**Chinese formats (2)**:
- `yyyy年M月d日 (EEEE)` - 2026年1月8日 (星期三)
- `yyyy年M月d日` - 2026年1月8日

## Weather Coordinates

**Auto-Detection**: The settings page includes a "Detect Location" button that uses the browser's Geolocation API to automatically fill in your coordinates.

**Manual Entry**:
- Latitude: -90 to 90
- Longitude: -180 to 180

**Verification**: Click "View on Google Maps" to verify the coordinates are correct. This opens Google Maps at the specified location.

**Find Coordinates Manually**: https://www.latlong.net/

## Google Calendar

1. Google Calendar → Settings and sharing
2. Integrate calendar → Secret address
3. Copy iCal format URL

## RSS Feeds

**International**
- BBC: `https://feeds.bbci.co.uk/news/rss.xml`
- CNN: `http://rss.cnn.com/rss/edition.rss`
- Reuters: `https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best`

**Regional**
- Google News (US): `https://news.google.com/rss?hl=en&gl=US&ceid=US:en`
- Google News (Korea): `https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko`

## Refresh Intervals (minutes)

- Weather: 30-60 recommended
- Calendar: 15-30 recommended
- RSS: 15-30 recommended

## Display Limits

- Calendar: 1-10 (default 5)
- RSS: 1-10 (default 7)

## Storage Location

- Server-side `config.json` file in project root directory
- Managed via `/api/config` endpoint (GET/POST)
- Editable via:
  - Web UI: Settings page (saves to server)
  - CLI: `./scripts/config.sh` command
  - Direct edit: Modify `config.json` file
- Reset: Settings page → Reset to Defaults button
