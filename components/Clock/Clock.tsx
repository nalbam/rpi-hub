'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ko, ja, zhCN } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';
import { useConfigWithRetry } from '@/lib/hooks/useConfigWithRetry';
import { getLocaleFromDateFormat } from '@/lib/config';

// Map locale string to date-fns locale object
const LOCALE_MAP = {
  en: undefined, // English is default
  ko: ko,        // Korean
  ja: ja,        // Japanese
  'zh-CN': zhCN, // Chinese (Simplified)
} as const;

export default function Clock() {
  const [time, setTime] = useState<Date | null>(null);
  const [timezone, setTimezone] = useState('UTC');
  const [dateFormat, setDateFormat] = useState('EEEE, MMMM dd, yyyy');

  const { config: _config } = useConfigWithRetry({
    componentName: 'Clock',
    onConfigReady: (config) => {
      setTimezone(config.timezone);
      setDateFormat(config.dateFormat || 'EEEE, MMMM dd, yyyy');
    },
  });

  useEffect(() => {
    const updateTime = () => {
      setTime(new Date());
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!time) {
    return (
      <div className="text-center">
        <div className="text-vw-8xl font-bold mb-vw-xs text-gray-600">
          --:--
          <span className="text-vw-3xl">:--</span>
        </div>
        <div className="text-vw-2xl text-gray-500">
          Loading...
        </div>
      </div>
    );
  }

  const zonedTime = toZonedTime(time, timezone);

  // Get locale from date format using helper function
  const localeKey = getLocaleFromDateFormat(dateFormat);
  const locale = LOCALE_MAP[localeKey];

  return (
    <div className="text-center">
      <div className="text-vw-8xl font-bold mb-vw-xs">
        {format(zonedTime, 'HH:mm')}
        <span className="text-vw-3xl">{format(zonedTime, ':ss')}</span>
      </div>
      <div className="text-vw-2xl text-gray-400">
        {format(zonedTime, dateFormat, { locale })}
      </div>
      <div className="text-vw-base text-gray-500 mt-vw-xs">
        {timezone}
      </div>
    </div>
  );
}
