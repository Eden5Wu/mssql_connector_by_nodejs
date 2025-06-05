import dayjs from 'npm:dayjs';
import utc from 'npm:dayjs/plugin/utc.js';
import timezone from 'npm:dayjs/plugin/timezone.js';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * 共用格式化函式，根據時間來源決定是用本地時間還是 UTC
 * @param {boolean} useUTC - 是否使用 UTC 時間
 * @returns {string} 格式化結果
 */
function formatDayjsWithTimezoneBase(context, useUTC = false) {
  if (!context.isValid()) {
    return context.toString();
  }

  const time = useUTC ? context.utc() : context;

  const hours = time.hour();
  const minutes = time.minute();
  const seconds = time.second();
  const milliseconds = time.millisecond();

  const offsetMin = context.utcOffset();
  const offsetSign = offsetMin >= 0 ? '+' : '-';
  const offsetHours = String(Math.floor(Math.abs(offsetMin) / 60)).padStart(2, '0');
  const offsetMins = String(Math.abs(offsetMin % 60)).padStart(2, '0');

  const dateStr = context.format('YYYY-MM-DD');

  if (hours === 0 && minutes === 0 && seconds === 0 && milliseconds === 0) {
    return dateStr;
  }

  const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
  return `${dateStr}T${timeStr}${offsetSign}${offsetHours}:${offsetMins}`;
}

// 原本的方法：使用本地時間
dayjs.prototype.formatISOWithTimezone = function () {
  return formatDayjsWithTimezoneBase(this, false);
};

// 使用 UTC 時間來源
dayjs.prototype.formatISOWithTimezoneFromUTC = function () {
  return formatDayjsWithTimezoneBase(this, true);
};

export default dayjs;
