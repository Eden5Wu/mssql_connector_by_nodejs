# Node.js MSSQL 資料庫連接器 / Node.js MSSQL Database Connector

這個模組簡化了 Node.js 應用程式與 Microsoft SQL Server 資料庫的連接和查詢。它處理連線池、參數化查詢和結果格式化，使資料庫操作變得高效且直接。

This module simplifies connecting to and querying Microsoft SQL Server databases in Node.js applications. It handles connection pooling, parameterized queries, and result formatting, making database operations efficient and straightforward.

**主要特性 / Key Features:**

* **連線池 / Connection Pooling:** 管理資料庫連線，以達到最佳效能。
* **參數化查詢 / Parameterized Queries:** 防止 SQL 注入，確保資料完整性。
* **結果格式化 / Result Formatting:** 自動格式化日期、緩衝區和字串資料。
* **分頁支援 / Pagination Support:** 使用 `LIMIT` 和 `OFFSET` 實現查詢分頁。
* **容易使用 / Easy to Use:** 清晰直觀的 API，便於無縫整合。

**核心功能：**

* 提供資料庫連線池功能，優化連線效率。
* 支援參數化查詢，防止 SQL 注入並確保資料完整性。
* 自動格式化日期、Buffer 和字串資料。
* 支援使用 LIMIT 和 OFFSET 進行查詢分頁。
* 簡單而直觀的 API，便於無縫整合。

**技術棧 / Tech Stack:**

* Node.js
* mssql npm 套件 / mssql npm package

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
