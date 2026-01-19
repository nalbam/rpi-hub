import ICAL from 'ical.js';
import { validateCalendarUrl, fetchWithTimeout } from '@/lib/urlValidation';
import { API, PROCESSING_LIMITS } from '@/lib/constants';
import {
  createErrorResponse,
  createSuccessResponse,
  handleValidation,
} from '@/lib/apiHelpers';
import { getServerConfig } from '@/lib/configHelpers';

interface CalendarEvent {
  title: string;
  start: Date | string;
  end: Date | string;
  description: string;
  location: string;
  isAllDay: boolean;
}

// Extended type for ical.js Time object with additional properties
// The official ical.js types don't include these, but they exist at runtime
interface ICALTime {
  isDate?: boolean;
  year: number;
  month: number;
  day: number;
  toJSDate(): Date;
}

export async function GET() {
  // Read configuration from server
  const config = getServerConfig();
  const calendarUrl = config.calendarUrl;

  // If no calendar URL configured, return empty events
  if (!calendarUrl || calendarUrl.trim() === '') {
    return createSuccessResponse({ events: [] });
  }

  // Validate URL to prevent SSRF attacks
  const validationError = handleValidation(validateCalendarUrl(calendarUrl));
  if (validationError) {
    return validationError;
  }

  try {
    // Fetch with timeout and size limits
    const response = await fetchWithTimeout(calendarUrl, API.TIMEOUT_MS, API.MAX_CALENDAR_SIZE);

    if (!response.ok) {
      throw new Error('Failed to fetch calendar data');
    }

    const icalData = await response.text();
    const jcalData = ICAL.parse(icalData);
    const comp = new ICAL.Component(jcalData);
    const vevents = comp.getAllSubcomponents('vevent');

    const now = new Date();
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setDate(now.getDate() + PROCESSING_LIMITS.CALENDAR_DAYS_AHEAD);

    const events: CalendarEvent[] = vevents
      .map((vevent: ICAL.Component): CalendarEvent => {
        const event = new ICAL.Event(vevent);

        // Check if this is an all-day event
        // In iCal, all-day events have isDate=true on the Time object
        // TypeScript definition may not include this property, so we use type assertion
        const isAllDay = (event.startDate as ICALTime).isDate === true;

        let start: Date | string;
        let end: Date | string;

        if (isAllDay) {
          // For all-day events, return date strings (YYYY-MM-DD) to avoid timezone issues
          // Access the year, month, day properties directly from ical.js Time object
          const startTime = event.startDate as ICALTime;
          const endTime = event.endDate as ICALTime;

          start = `${startTime.year}-${String(startTime.month).padStart(2, '0')}-${String(startTime.day).padStart(2, '0')}`;
          end = `${endTime.year}-${String(endTime.month).padStart(2, '0')}-${String(endTime.day).padStart(2, '0')}`;
        } else {
          // For timed events, return Date objects (will be serialized to ISO 8601)
          start = event.startDate.toJSDate();
          end = event.endDate.toJSDate();
        }

        return {
          title: event.summary,
          start,
          end,
          description: event.description || '',
          location: event.location || '',
          isAllDay,
        };
      })
      .filter((event: CalendarEvent) => {
        // Show events that haven't ended yet and start within the next month
        const eventEnd = typeof event.end === 'string' ? new Date(event.end) : event.end;
        const eventStart = typeof event.start === 'string' ? new Date(event.start) : event.start;
        return eventEnd >= now && eventStart <= oneMonthFromNow;
      })
      .sort((a: CalendarEvent, b: CalendarEvent) => {
        const aStart = typeof a.start === 'string' ? new Date(a.start) : a.start;
        const bStart = typeof b.start === 'string' ? new Date(b.start) : b.start;
        return aStart.getTime() - bStart.getTime();
      });

    return createSuccessResponse({ events });
  } catch (error) {
    return createErrorResponse('Failed to fetch calendar data', error);
  }
}
