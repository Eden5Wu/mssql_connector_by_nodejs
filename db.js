// db.js
const sqlConnector = require('mssql');
const { formatDateToCustomISO } = require('./date_utils.js');

class MSSQLConnection {
  constructor(config = {}) {
    this.params = {
      server: config.server || '',
      database: config.database || '',
      user: config.user || '',
      password: config.password || '',
      pool: {
        max: config.pool?.max || 10,
        min: config.pool?.min || 0,
        idleTimeoutMillis: config.pool?.idleTimeoutMillis || 30000,
      },
      options: {
        encrypt: config.options?.encrypt ?? false,
        trustServerCertificate: config.options?.trustServerCertificate ?? true,
        useUTC: config.options?.useUTC ?? false,
      },
    };

    this.TYPES = sqlConnector.TYPES;
    this.dbPool = null;
    this.transaction = null;
  }

  // 新增的 Builder 方法（可選用）
  withServer(server) {
    this.params.server = server;
    return this;
  }

  withDatabase(database) {
    this.params.database = database;
    return this;
  }

  withUser(user) {
    this.params.user = user;
    return this;
  }

  withPassword(password) {
    this.params.password = password;
    return this;
  }

  withOptions(options = {}) {
    Object.assign(this.params.options, options);
    return this;
  }

  withPool(poolConfig = {}) {
    Object.assign(this.params.pool, poolConfig);
    return this;
  }

  validate() {
    const required = ['server', 'database', 'user', 'password'];
    for (const key of required) {
      if (!this.params[key]) {
        throw new Error(`Missing required parameter: ${key}`);
      }
    }
  }

  get connected() {
    return this.dbPool?.connected || false;
  }

  async open() {
    this.validate();
    this.dbPool = await new sqlConnector.ConnectionPool(this.params).connect();
    return this;
  }

  async close() {
    if (this.dbPool) {
      await this.dbPool.close();
      this.dbPool = null;
    }
  }

  async startTransaction() {
    if (!this.dbPool?.connected) {
      await this.open();
    }
    if (!this.transaction) {
      this.transaction = new sqlConnector.Transaction(this.dbPool);
      await this.transaction.begin();
      console.log('事務已開始。');
      return this.transaction; // 返回 transaction
    } else {
      console.warn('已有事務正在進行中。');
      return this.transaction; // 返回現有的 transaction
    }
  }

  async commitTransaction(transaction) {
    const commitAndClear = async (tx) => {
      try {
        await tx.commit();
        console.log('Transaction committed.'); // 事務已提交。
      } catch (error) {
        console.error('Error committing transaction:', error); // 提交事務時發生錯誤：
        // 在這裡可以添加其他的錯誤處理邏輯，例如重試或通知
        throw error; // 重新拋出錯誤，以便調用者能夠處理
      } finally {
        this.transaction = null;
      }
    };

    if (!transaction && this.transaction) {
      await commitAndClear(this.transaction);
    } else if (transaction && this.transaction === transaction) {
      await commitAndClear(transaction);
    } else {
      console.warn('Provided transaction does not match current transaction, or no transaction is in progress.'); // 提供的事務與目前的事務不符，或沒有正在進行的事務。
    }
  }

  async rollbackTransaction(transaction) {
    const rollbackAndClear = async (tx) => {
      try {
        await tx.rollback();
        console.log('Transaction rolled back.'); // 事務已回滾。
      } catch (error) {
        console.error('Error rolling back transaction:', error); // 回滾事務時發生錯誤：
        // 在這裡可以添加其他的錯誤處理邏輯
      } finally {
        this.transaction = null;
      }
    };

    if (!transaction && this.transaction) {
      await rollbackAndClear(this.transaction);
    } else if (transaction && this.transaction === transaction) {
      await rollbackAndClear(transaction);
    } else {
      console.warn('Provided transaction does not match current transaction, or no transaction is in progress.'); // 提供的事務與目前的事務不符，或沒有正在進行的事務。
    }
  }
  
  async executeQuery(query, parameters) {
    if (!this.transaction && !this.connected) {
      await this.open();
    }
  
    try {
      const request = this.transaction
        ? new sqlConnector.Request(this.transaction)
        : this.dbPool.request();
  
      if (parameters) {
        for (const [name, type, value] of parameters) {
          request.input(name, type, value);
        }
      }
  
      const result = await request.query(query);
  
      // 主要修改：直接對 result.recordsets 進行正規化
      if (Array.isArray(result.recordsets)) {
        result.recordsets = result.recordsets.map(rs => rs.map(this.#normalizeRow));
      } else {
        // 如果沒有 recordsets (例如執行 INSERT/UPDATE 等無回傳的語句)，則確保為空陣列
        result.recordsets = [];
        result.recordset = []; // 這裡仍然需要確保 result.recordset 在沒有 recordsets 時為空陣列
      }
  
      return result; // 回傳包含正規化後 recordsets 的完整結果物件
    } catch (err) {
      console.error('SQL Error', {
        query,
        parameters,
        error: err
      });
      throw err;
    }
  }

  async executeSQLCmd(sql, hostVariables, options = {}) {
    if (!this.transaction && !this.connected) {
      await this.open();
    }

    try {
      const request = this.transaction
        ? new sqlConnector.Request(this.transaction)
        : this.dbPool.request();

      // 使用 #prepareSqlRequest 處理參數綁定
      let processedSql = this.#prepareSqlRequest(sql, hostVariables, request);
      
      // executeSQLCmd 獨有的 OFFSET 分頁邏輯
      const { limit, skip } = options;
      if (limit !== undefined && limit !== -1) {
        const hasOrderBy = /\bORDER BY\b/i.test(processedSql); // 注意這裡要用 processedSql
        if (hasOrderBy)
          processedSql += ` OFFSET ${skip || 0} ROWS FETCH NEXT ${limit} ROWS ONLY`;
      }

      const result = await request.query(processedSql);

      // 由 normalizeRow 取代重複內容
      if (result && result.recordset) 
        result.recordset = result.recordset.map(this.#normalizeRow);
      
      return result;
    } catch (err) {
      console.error('SQL Error in executeSQLCmd', { // 增加錯誤來源識別
        query: sql, // 顯示原始查詢
        parameters: hostVariables,
        error: err
      });
      throw err;
    }
  }

  async executeMultiResult(sql, hostVariables) { // 參數改為 hostVariables 陣列
    if (!this.transaction && !this.connected) { // 考慮到事務，如果沒有事務則開啟連線
      await this.open();
    }

    try {
      const request = this.transaction
        ? new sqlConnector.Request(this.transaction) // 使用 Transaction.request()
        : this.dbPool.request();

      // 使用 #prepareSqlRequest 處理參數綁定
      const processedSql = this.#prepareSqlRequest(sql, hostVariables, request);

      const result = await request.query(processedSql);

      // 對每個 recordset 中的行進行正規化
      return Array.isArray(result.recordsets)
        ? result.recordsets.map(rs => rs.map(this.#normalizeRow))
        : [];
    } catch (err) {
      console.error('SQL Error in executeMultiResult', { // 增加錯誤來源識別
        query: sql, // 顯示原始查詢
        parameters: hostVariables,
        error: err
      });
      throw err;
    }
  }

  #normalizeRow = (row) => {
    for (const key in row) {
      if (row[key] instanceof Date) {
        row[key] = formatDateToCustomISO(row[key], this.params.options.useUTC);
      } else if (row[key] instanceof Buffer) {
        row[key] = row[key].toString('base64');
      } else if (typeof row[key] === 'string') { // 將 trimEnd() 邏輯整合進來
        row[key] = row[key].trimEnd();
      }
    }
    return row;
  };

  // 私有輔助函式：處理 SQL 參數綁定和型別推斷
  #prepareSqlRequest(sql, hostVariables, request) {
    let paramIndex = 1;
    let modifiedSql = sql.replace(/\?/g, () => `@param${paramIndex++}`);
    
    // 檢查是否有問號，如果沒有就跳過 hostVariables 處理
    const hasPositionalParams = sql.includes('?');

    if (hostVariables && Array.isArray(hostVariables) && hasPositionalParams) {
      for (let i = 0; i < hostVariables.length; i++) {
        const param = hostVariables[i];
        let value, type;

        if (Array.isArray(param) && param.length === 2) {
          value = param[0];
          type = param[1];
        } else {
          value = param;
          // 自動推斷型別的邏輯
          type = this.TYPES.NVarChar; // 預設為NVarChar
          if (typeof value === 'number') {
            if (Number.isInteger(value)) {
              type = this.TYPES.Int;
            } else {
              type = this.TYPES.Float;
            }
          } else if (value instanceof Date) {
            type = this.TYPES.DateTime;
          } else if (value instanceof Buffer) {
            type = this.TYPES.VarBinary;
          } else if (typeof value === 'boolean') {
            type = this.TYPES.Bit;
          }
        }
        // 將參數加入 request 物件
        request.input(`param${i + 1}`, type, value);
      }
    }
    return modifiedSql; // 返回修改後的 SQL 語句
  }
}
module.exports = { MSSQLConnection };
