// date_utils.js

/**
 * 根據 useUTC 旗標，將 Date 物件格式化為您需要的字串格式。
 * @param {Date} date - 從 mssql 函式庫收到的 JavaScript Date 物件。
 * @param {boolean} useUTC - 指示如何解讀日期時間的值。
 * @returns {string} 格式化後的日期字串。
 */
function formatDate(date, useUTC = false) {
  // 確保傳入的是有效的 Date 物件，否則直接回傳原始值
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return date;
  }

  // 內部輔助函式，根據 useUTC 決定要呼叫哪個 Date 方法 (本地 vs UTC)
  const get = (fnUTC, fnLocal) => (useUTC ? fnUTC.call(date) : fnLocal.call(date));

  // 取得所有日期和時間的組成部分
  const year = get(date.getUTCFullYear, date.getFullYear);
  const month = String(get(date.getUTCMonth, date.getMonth) + 1).padStart(2, '0');
  const day = String(get(date.getUTCDate, date.getDate)).padStart(2, '0');
  const hours = get(date.getUTCHours, date.getHours);
  const minutes = get(date.getUTCMinutes, date.getMinutes);
  const seconds = get(date.getUTCSeconds, date.getSeconds);
  const milliseconds = get(date.getUTCMilliseconds, date.getMilliseconds);

  // 您的需求 1: 如果是整點時間 (00:00:00.000)，則只回傳日期
  if (hours === 0 && minutes === 0 && seconds === 0 && milliseconds === 0) {
    return `${year}-${month}-${day}`;
  }

  // 您的需求 2: 格式化其他時間
  const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;

  // 計算時區偏移字串
  // getTimezoneOffset() 的符號與常見表示法相反 (UTC+8 會回傳 -480)
  const offsetTotalMinutes = -date.getTimezoneOffset();
  const offsetSign = offsetTotalMinutes >= 0 ? '+' : '-';
  const offsetHours = String(Math.floor(Math.abs(offsetTotalMinutes) / 60)).padStart(2, '0');
  const offsetMins = String(Math.abs(offsetTotalMinutes % 60)).padStart(2, '0');
  
  // 如果 useUTC 為 true，時區固定為 +00:00；否則使用本地時區
  const offsetStr = useUTC ? '+00:00' : `${offsetSign}${offsetHours}:${offsetMins}`;

  return `${year}-${month}-${day}T${timeStr}${offsetStr}`;
}

// 匯出唯一的函式
module.exports = { formatDate };
