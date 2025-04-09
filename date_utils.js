const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

dayjs.prototype.formatISOWithTimezone = function () {
  if (!this.isValid()) {
    return this.toString();
  }

  // 獲取 UTC 小時、分鐘、秒和毫秒
  const utcHours = this.utc().hour();
  const utcMinutes = this.utc().minute();
  const utcSeconds = this.utc().second();
  const utcMilliseconds = this.utc().millisecond();
  // utcOffset() 返回以分鐘為單位的時區偏移量
  const offsetMin = this.utcOffset();
  const offsetHours = String(Math.abs(Math.floor(offsetMin / 60))).padStart(2, '0');
  const offsetMinutes = String(Math.abs(offsetMin % 60)).padStart(2, '0');
  const offsetSign = offsetMin > 0 ? '+' : '-';

  let localDateStr = this.format('YYYY-MM-DD');

  // 如果 UTC 時間是 00:00:00.000，則只格式化日期為本地時區
  if (utcHours === 0 && utcMinutes === 0 && utcSeconds === 0 && utcMilliseconds === 0) {
    return localDateStr; // 使用本地時區格式化日期
  } else {
    return `${localDateStr}T${utcHours.toString().padStart(2, '0')}:${utcMinutes.toString().padStart(2, '0')}:${utcSeconds.toString().padStart(2, '0')}.${utcMilliseconds.toString().padStart(3, '0')}${offsetSign}${offsetHours}:${offsetMinutes}`;
  }
};

module.exports = dayjs;
