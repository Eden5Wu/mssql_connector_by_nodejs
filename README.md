# Node.js MSSQL 資料庫連接器 / Node.js MSSQL Database Connector

這個模組簡化了 Node.js 應用程式與 Microsoft SQL Server 資料庫的連接和查詢。它處理連線池、參數化查詢和結果格式化，使資料庫操作變得容易且直接。

This module simplifies connecting to and querying Microsoft SQL Server databases in Node.js applications. It handles connection pooling, parameterized queries, and result formatting, making database operations efficient and straightforward.


**主要特性 / Key Features:**

* **支援交易(事務) / Transcation:** 整合交易功能，避免 SQL 指令分散。
* **連線池 / Connection Pooling:** 管理資料庫連線，以達到最佳效能。
* **參數化查詢 / Parameterized Queries:** 防止 SQL 注入，確保資料完整性。
* **結果格式化 / Result Formatting:** 自動格式化日期、緩衝區和字串資料。
* **分頁支援 / Pagination Support:** 使用 `LIMIT` 和 `OFFSET` 實現查詢分頁。
* **容易使用 / Easy to Use:** 清晰直觀的 API，便於無縫整合。


**核心功能：**

* 支援交易(事務)，專注在程式而非 SQL 指令。
* 提供資料庫連線池功能，優化連線效率。
* 支援參數化查詢，防止 SQL 注入並確保資料完整性。
* 自動格式化日期、Buffer 和字串資料 (Default: **yyyy-MM-ddThh:mm:ss.nnn(+-)hh:mm for location**)。
* 支援使用 LIMIT 和 OFFSET 進行查詢分頁。
* 簡單而直觀的 API，便於無縫整合。


**技術棧 / Tech Stack:**

* Node.js
* [mssql npm package](https://www.npmjs.com/package/mssql)
* [dayjs npm package](https://www.npmjs.com/package/dayjs)


**關於時間**

MSSQL 的 **datetime/datetime2** 欄位預設是存放已經偏移時區的資料，所以回傳資料時在日期時間上會有兩種格式，且不再偏移時區

* 日期時間時分秒都為 0 時：回傳 **YYYY-MM-DD** 格式
* 日期時間時分秒都不為 0 時：回傳 **YYYY-MM-DDTHH:mm:dd.zzzZ**


***例如：東八區的 MSSQL：***

* 2025-01-01 >> "2025-01-01"
* 2025-01-01 18:35:46 >> "2025-01-01T18:35:46+08:00"

**關於預設值的修改**

**baseConfig** 內的空字串，如 *server*、*database*、*user*、*password*、*pool* 等，可以視你的環境給予預設值，如果你喜歡每次建立連線都需要配置，本套件也提供建立實例時調整的選項。


===

**操作範例 / Usage Examples:**

**1. try...catch...finally 錯誤處理:**

```javascript
const { MSSQLConnection } = require('db.js');
const db = new MSSQLConnection('yourDatabase', {
  server: 'yourServer',
  user: 'yourUser',
  password: 'yourPassword',
});

async function fetchData() {
  try {
    await db.open();
    const result = await db.executeQuery('SELECT * FROM yourTable');
    console.log(result.recordset);
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await db.close();
  }
}

fetchData();
```


**2. 簡單使用:**

```javascript
const { MSSQLConnection } = require('db.js');

async function fetchData(dbName) {
  const db = new MSSQLConnection('yourDatabase');
  try {
    await db.open();
    const result = await db.executeQuery('SELECT * FROM yourTable');
    console.log(result.recordset);
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await db.close();
  }
}

fetchData();
```


**3.使用交易(事務):**

```javascript
const { MSSQLConnection } = require('db.js');

async function fetchData(dbName) {
  const db = new MSSQLConnection('yourDatabase');
  const theTrans = await db.startTransaction()
  try {
    await db.open();
    const result = await db.executeQuery('SELECT * FROM yourTable');
    console.log(result.recordset);
    await db.commitTransaction(theTrans)
  } catch (error) {
    await sqlConn.rollbackTransaction(trans);
    console.error('Database error:', error);
  } finally {
    await db.close();
  }
}

fetchData();
```


**4.分頁查詢:**

```javascript
const { MSSQLConnection } = require('your-module-name'); // 替換為您的模組名稱

async function getPaginatedData() {
  const db = new MSSQLConnection('yourDatabase');
  try {
    await db.open();
    const page1 = await db.executeSQLCmd('SELECT * FROM yourTable ORDER BY id', [], { limit: 10, skip: 0 });
    console.log('Page 1:', page1.results);

    const page2 = await db.executeSQLCmd('SELECT * FROM yourTable ORDER BY id', [], { limit: 10, skip: 10 });
    console.log('Page 2:', page2.results);
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    try {
      await db.close();
    } catch (closeError) {
      console.error('Error closing connection:', closeError);
    }
  }
}

getPaginatedData();
```
