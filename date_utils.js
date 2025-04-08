function isValidDateString(dateString) {
  const timestamp = Date.parse(dateString);
  return !isNaN(timestamp);
}

// 自定義格式化函式
function formatISOWithTimezone(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
  const offset = date.getTimezoneOffset();
  const offsetHours = String(Math.abs(Math.floor(offset / 60))).padStart(2, '0');
  const offsetMinutes = String(Math.abs(offset % 60)).padStart(2, '0');
  const offsetSign = offset > 0 ? '-' : '+';

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}${offsetSign}${offsetHours}:${offsetMinutes}`;
}


function formatDateTime(format, date) {
  let dateObject;
  if (typeof date === 'string') {
    // Handle the 'yyyy-MM-ddThh:mm:ss.zzzZ' format
    const parts = date.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})Z/);
    if (parts) {
      dateObject = new Date(Date.UTC(
        parseInt(parts[1]),
        parseInt(parts[2]) - 1, // Month is 0-indexed
        parseInt(parts[3]),
        parseInt(parts[4]),
        parseInt(parts[5]),
        parseInt(parts[6]),
        parseInt(parts[7])
      ));
    } else {
      // Try to parse as a standard Date string if the specific format doesn't match
      dateObject = new Date(date);
    }
  } else if (date instanceof Date) {
    dateObject = date;
  } else {
    // Handle invalid date input (you might want to throw an error or return a specific value)
    throw new Error("Invalid date");
  }

  const year = dateObject.getFullYear();
  const month = String(dateObject.getMonth() + 1).padStart(2, '0');
  const day = String(dateObject.getDate()).padStart(2, '0');
  const hours = String(dateObject.getHours()).padStart(2, '0');
  const minutes = String(dateObject.getMinutes()).padStart(2, '0');
  const seconds = String(dateObject.getSeconds()).padStart(2, '0');

  return format
    .replace('yyyy', year)
    .replace('mm', month)
    .replace('dd', day)
    .replace('hh', hours)
    .replace('nn', minutes)
    .replace('ss', seconds);
}

module.exports = {
  isValidDateString: isValidDateString,
  formatISOWithTimezone: formatISOWithTimezone,
  formatDateTime: formatDateTime
};