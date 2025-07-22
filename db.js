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

      if (result && result.recordset) {
        result.recordset.forEach((row) => {
          for (const key in row) {
            if (typeof row[key] === 'string') {
              row[key] = row[key].trimEnd();
            }
          }
        });
      }

      return result;
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
    try {
      let paramIndex = 1;
      let modifiedSql = sql.replace(/\?/g, () => `@param${paramIndex++}`);
      const parameters = [];

      const hasParameters = sql.includes('?');

      if (hostVariables && hasParameters && Array.isArray(hostVariables)) {
        for (let i = 0; i < hostVariables.length; i++) {
          const param = hostVariables[i];
          let value, type;

          if (Array.isArray(param) && param.length === 2) {
            value = param[0];
            type = param[1];
          } else {
            value = param;
            type = this.TYPES.NVarChar;
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
          parameters.push([`param${i + 1}`, type, value]);
        }
      }

      const { limit, skip } = options;
      if (limit !== undefined && limit !== -1) {
        const hasOrderBy = /\bORDER BY\b/i.test(sql);
        if (hasOrderBy)
          modifiedSql += ` OFFSET ${skip || 0} ROWS FETCH NEXT ${limit} ROWS ONLY`;
      }

      const result = await this.executeQuery(modifiedSql, parameters);

      // 由 normalizeRow 取代重複內容
      if (result && result.recordset) 
        result.recordset = result.recordset.map(this.#normalizeRow);
      

      // 取消自定義內容, 符合多數人使用 mssql 的習慣
      // return {
      //   results: result.recordset,
      //   n: result.rowsAffected[result.rowsAffected.length - 1],
      //   responseTime: result.statistics?.elapsedMilliseconds || 0,
      //   warn: [],
      // };
      return result;
    } catch (err) {
      throw err;
    }
  }

  async executeMultiResult(sql, params = {}) {
    if (!this.connected) await this.open();

    const request = this.transaction
      ? this.transaction.request()
      : this.dbPool.request();

    for (const key in params) {
      request.input(key, params[key]);
    }

    const result = await request.query(sql);

    return Array.isArray(result.recordsets)
      ? result.recordsets.map(rs => rs.map(this.#normalizeRow))
      : []
  }

  #normalizeRow = (row) => {
    for (const key in row) {
      if (row[key] instanceof Date) {
        row[key] = formatDateToCustomISO(row[key], this.params.options.useUTC);
      }
      else if (row[key] instanceof Buffer) {
        row[key] = row[key].toString('base64');
      }
    }
    return row;
  };
}
module.exports = { MSSQLConnection };
