# Node.js MSSQL 資料庫連接器 / Node.js MSSQL Database Connector

這個模組簡化了 Node.js 應用程式與 Microsoft SQL Server 資料庫的連接和查詢。它處理連線池、參數化查詢和結果格式化，使資料庫操作變得容易且直接。

This module simplifies connecting to and querying Microsoft SQL Server databases in Node.js applications. It handles connection pooling, parameterized queries, and result formatting, making database operations efficient and straightforward.

**主要特性 / Key Features:**

* **支援交易(事務) / Transactions:** 整合交易功能，避免 SQL 指令分散，確保資料庫操作的一致性。
* **連線池 / Connection Pooling:** 管理資料庫連線，以達到最佳效能，提高應用程式響應速度。
* **參數化查詢 / Parameterized Queries:** 防止 SQL 注入攻擊，確保資料完整性和安全性。
* **結果格式化 / Result Formatting:** 自動格式化日期、緩衝區和字串資料，使資料更易於使用。
* **分頁支援 / Pagination Support:** 使用 `LIMIT` 和 `OFFSET` 實現查詢分頁，方便處理大量資料。
* **容易使用 / Easy to Use:** 清晰直觀的 API 設計，便於開發者無縫整合到現有專案中。

**核心功能：**

* 支援資料庫交易(事務)，讓您可以專注於應用程式邏輯，而無需擔心複雜的 SQL 指令。
* 提供資料庫連線池功能，確保應用程式運行流暢且快速。
* 支援參數化查詢，有效阻擋 SQL 注入攻擊，保障資料的合法性。
* 自動格式化日期、Buffer 和字串資料 (預設為本地時間的 `yyyy-MM-ddThh:mm:ss.nnn(+-)hh:mm` 格式)。
* 支援使用 `LIMIT` 和 `OFFSET` 進行查詢分頁，方便分批獲取資料。
* 提供簡單而直觀的 API，易於上手和整合。

**技術棧 / Tech Stack:**

* Node.js
* [mssql npm package](https://www.npmjs.com/package/mssql)

**關於時間處理 / About Time Handling**

MSSQL 的 `datetime` 和 `datetime2` 欄位通常儲存已包含時區資訊的資料。因此，當您取回資料時，日期和時間可能會以兩種格式呈現，且不會再次進行時區偏移：

* 如果時間為午夜 (00:00:00)，您將會收到 `YYYY-MM-DD` 格式的日期。
* 如果時間包含時、分、秒，您將會收到 `YYYY-MM-DDTHH:mm:dd.zzzZ` 格式。

***例如：如果您的 MSSQL 伺服器位於東八區 (GMT+8)：***

* `2025-01-01` 會轉換為 `"2025-01-01"`
* `2025-01-01 18:35:46` 會轉換為 `"2025-01-01T18:35:46+08:00"`

***如何配置 `useUTC` 設定是取決於您應用程式目標的關鍵決定：***

* **情況一：與既有系統共存 (應設為 `false`)**

    若您的目標是與一個既有的、只在特定時區（例如 `UTC+8`）運作的系統（如 `Win32` 應用）及其資料庫共存，您應該將 `useUTC` 設定為 `false`。這能確保在讀取大量歷史資料時，時間不會被錯誤地偏移，以維持與舊系統的資料一致性。

* **情況二：開發新的全球化應用 (應設為 `true`)**

    若您正在開發一個新的、需要面向全球使用者的應用程式，那麼最佳實踐是將 `useUTC` 設定為 `true`（這也是 `mssql` 套件的預設值）。這會將所有時間以世界標準時間 (`UTC`) 來處理，從而消除時區混淆，是處理跨國應用的最穩健作法。

---

**配置連線參數 / Configuring Connection Parameters**

`MSSQLConnection` 類別的建構式接受一個 `config` 物件，您可以在其中指定連線參數，例如 `server`、`database`、`user`、`password`、連線池 (`pool`) 設定以及其他選項 (`options`)。這些參數會儲存在實例內部的 `params` 屬性中。如果您在 `config` 物件中省略了任何這些屬性，模組將使用預設值（例如：`server`、`database`、`user`、`password` 為空字串，或 `pool` 和 `options` 的預設值）。此外，您也可以在建立 `MSSQLConnection` 實例後，使用提供的建構方法（例如 `withServer()`、`withDatabase()`）來配置這些參數，為不同的連線情境提供彈性。

---

### 常見問題與處理 / Common Issues & Solutions:

* **"Connection not yet open" 錯誤：**
    此錯誤通常發生於嘗試執行查詢時，底層的 MSSQL 連接尚未成功建立或已經關閉。
    當未使用連接池設定時，`MSSQLConnection` 實例的生命週期與其底層的連接緊密相關。若是單一 function 內，有多個實例時，每個實例做完操作後，必須做 `close()`。

    ```javascript
    // isValid 未關閉會觸發 "Connection not yet open" 錯誤
    async function isValid() {
      const db = new MSSQLConnection({
        server: 'yourServer',
        database: 'yourDatabase',
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
      const db1 = new MSSQLConnection({ server: 'yourServer', database: 'yourDatabase', user: 'yourUser', password: 'yourPassword' });

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

* **"Connection is closed" 錯誤：**
    此錯誤通常發生於，單一 function 中多次執行查詢時。使用交易即可排除此問題。細節請參閱範例 `3. 使用交易(事務)`。

---

**[操作範例詳見英文版說明](README.md)**
