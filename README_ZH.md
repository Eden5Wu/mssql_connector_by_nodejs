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

`baseConfig` 內部包含了如 `server`, `database`, `user`, `password` 等連接參數的預設空字串。您可以根據您的環境需求，在初始化 `MSSQLConnection` 實例時提供這些配置，或者在程式碼中修改 `baseConfig` 的預設值，以適應您的開發或生產環境。本套件設計彈性，允許您在每次建立實例時進行個性化配置。


### 常見問題與處理 / Common Issues & Solutions:

* **"Connection not yet open" 錯誤：**
此錯誤通常發生於嘗試執行查詢時，底層的 MSSQL 連接尚未成功建立或已經關閉。
當未使用連接池設定時，`MSSQLConnection` 實例的生命週期與其底層的連接緊密相關。若是單一 function 內，有多個實例時，每個實例做完操作後，必須做 close。

```
// isValid 未關閉會觸發 "Connection not yet open" 錯誤
async function isValid() {
  const db = new MSSQLConnection('yourDatabase', {
    server: 'yourServer',
    user: 'yourUser',
    password: 'yourPassword',
  });

  try {
    await db.open(); // 確保連線已開啟

    // 執行多個查詢操作，這些操作都將使用 'db' 這個單一連線實例
    const result1 = await db.executeSQLCmd('SELECT * FROM Users WHERE id = ?', [1]);
    console.log('Query 1 Result:', result1.results);

  } catch (error) {
    console.error('isValid 發生錯誤:', error);
  } finally {
    // 無論成功或失敗，都應確保關閉連線
    // db.close(); // BUG: 如果在這裡關閉，後續的 multiInstance db1 操作會報錯
    console.log('isValid 函數中的資料庫連線已關閉。');
  }
}

function multiInstance() {
  const db1 = new MSSQLConnection('yourDatabase', { server: 'yourServer', user: 'yourUser', password: 'yourPassword' });

  try {
    await db1.open();
    const res1 = await db1.executeSQLCmd('SELECT GETDATE() AS CurrentDate');
    console.log('db1 Current Date:', res1.results[0].CurrentDate);
  } catch (error) {
    console.error('multiInstanceBadExample 發生錯誤:', error);
  } finally {
    // 在這裡處理多個實例的關閉，確保每個實例都被關閉
    if (db1.active) {
        await db1.close().catch(err => console.error('關閉 db1 失敗:', err));
    }
  }
}
```

* **"Connection is closed" 錯誤：** 此錯誤通常發生於，單一 function 中多次執行查詢時。使用交易即可排除此問題。細節請參閱範例 `3.使用交易(事務)`

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

    const result2 = await db.executeQuery('SELECT * FROM yourTable2');
    console.log(result2.recordset);
    await db.commitTransaction(theTrans)
  } catch (error) {
    await db.rollbackTransaction(trans);
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

**5.參數化查詢**

```javascript
// 範例 1: 使用 executeQuery 執行簡單查詢 (不帶參數)
console.log('--- 執行簡單查詢 ---');
const simpleQueryResult = await db.executeQuery('SELECT GETDATE() AS CurrentDateTime;');
console.log('查詢結果:', simpleQueryResult.recordset);

// 範例 2: 使用 executeQuery 執行帶參數的查詢
console.log('\n--- 執行帶參數的查詢 (executeQuery) ---');
const productCode = 'ABC-123';
const minPrice = 50;
const parameterizedQueryResult = await db.executeQuery(
  'SELECT * FROM Products WHERE ProductCode = @code AND Price > @price;',
  [
    ['code', db.TYPES.VarChar, productCode],
    ['price', db.TYPES.Int, minPrice],
  ]
);
console.log('查詢結果 (帶參數):', parameterizedQueryResult.recordset);

// 範例 3: 使用 executeSQLCmd 執行帶有佔位符的查詢 (使用陣列參數)
console.log('\n--- 執行帶有佔位符的查詢 (executeSQLCmd - 陣列參數) ---');
const orderId = 101;
const customerName = 'John Doe';
const placeholderQueryResult1 = await db.executeSQLCmd(
  'SELECT * FROM Orders WHERE OrderID = ? AND CustomerName = ?;',
  [orderId, customerName]
);
console.log('查詢結果 (佔位符 - 陣列參數):', placeholderQueryResult1.results);

// 範例 4: 使用 executeSQLCmd 執行帶有佔位符的查詢 (明確指定參數類型)
console.log('\n--- 執行帶有佔位符的查詢 (executeSQLCmd - 指定參數類型) ---');
const quantity = 5;
const lastOrderDate = new Date('2024-12-31T00:00:00Z');
const placeholderQueryResult2 = await db.executeSQLCmd(
  'SELECT * FROM OrderDetails WHERE Quantity > ? AND OrderDate <= ?;',
  [
    [quantity, db.TYPES.Int],
    [lastOrderDate, db.TYPES.DateTime],
  ]
);
console.log('查詢結果 (佔位符 - 指定參數類型):', placeholderQueryResult2.results);

// 範例 5: 使用 executeSQLCmd 執行帶有分頁的查詢
console.log('\n--- 執行帶有分頁的查詢 (executeSQLCmd) ---');
const productsPaged = await db.executeSQLCmd(
  'SELECT ProductID, ProductName, Price FROM Products ORDER BY ProductID;',
  [],
  { limit: 10, skip: 5 } // 獲取第 6 到第 15 筆資料
);
console.log('分頁查詢結果:', productsPaged.results);
```
