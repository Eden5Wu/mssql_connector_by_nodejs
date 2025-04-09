const sqlConnector = require('mssql');
const dayjs = require("./date_utils.js");

class MSSQLConnection {
  constructor(dbName, config = {}) {
    this.baseConfig = {
      server: config.server || '',
      database: dbName,
      user: config.user || '',
      password: config.password || '',
      pool: {
        max: config.pool?.max || 10,
        min: config.pool?.min || 0,
        idleTimeoutMillis: config.pool?.idleTimeoutMillis || 30000,
      },
      options: {
        encrypt: config.options?.encrypt || false,
        trustServerCertificate: config.options?.trustServerCertificate || true,
      },
    };
    this.TYPES = sqlConnector.TYPES;
    this.dbPool = null;
    this.active = false;
  }

  get dbName() {
    return this._dbName;
  }

  set dbName(newDbName) {
    if (this._dbName !== newDbName) {
      dbPool.close();
      this.dbPool = null;
      this.active = false;
      this._dbName = newDbName;
      this.baseConfig.database = newDbName;
    }
  }  

  async open() {
      if(!this.active){
          try{
              this.dbPool = await sqlConnector.connect(this.baseConfig);
              this.active = true;
              console.log(`成功連線至資料庫: ${this.baseConfig.database}`);
          }catch (err) {
              console.error(`連線至資料庫 ${this.baseConfig.database} 失敗:`, err);
              throw err;
          }
      }
  }

  async close(){
      if(this.active && !this.transaction){
          try{
              await this.dbPool.close();
              this.dbPool = null;
              this.active = false;
              console.log(`資料庫連線已關閉: ${this.baseConfig.database}`);
          }catch(err){
              console.error(`關閉資料庫連線 ${this.baseConfig.database} 失敗:`, err);
              throw err;
          }
      } else if (this.transaction) {
        console.warn('有事務正在進行中，請先 Commit 或 Rollback。');
      }
  }

  async startTransaction() {
    if (!this.active) {
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
    if (transaction && this.transaction === transaction) {
      try {
        await transaction.commit();
        console.log('事務已提交。');
      } finally {
        this.transaction = null;
      }
    } else {
      console.warn('提供的事務與目前的事務不符，或沒有正在進行的事務。');
    }
  }

  async rollbackTransaction(transaction) {
    if (transaction && this.transaction === transaction) {
      try {
        await transaction.rollback();
        console.log('事務已回滾。');
      } finally {
        this.transaction = null;
      }
    } else {
      console.warn('提供的事務與目前的事務不符，或沒有正在進行的事務。');
    }
  }
    
  async executeQuery(query, parameters) { //移除dbName 參數, 使用 建構子 提供的 database 名稱
    try {
        if(!this.active){
            await this.open();
        }
      const request = this.dbPool.request();

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
      console.error('SQL Error', err);
      throw err;
    }
  }

  async executeSQLCmd(sql, hostVariables, options = {}) { //移除dbName 參數, 使用 建構子 提供的 database 名稱
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

      result.recordset?.forEach((row) => {
        for (const key in row) {
          if (row[key] instanceof Date) {
            //row[key] = formatISOWithTimezone(row[key]);
            row[key] = dayjs(row[key]).formatISOWithTimezone();
          }
          if (row[key] instanceof Buffer) {
            row[key] = row[key].toString('base64');
          }
        }
      });

      return {
        results: result.recordset,
        n: result.rowsAffected[result.rowsAffected.length - 1],
        responseTime: result.statistics?.elapsedMilliseconds || 0,
        warn: [],
      };
    } catch (err) {
      throw err;
    }
  }
}

module.exports = { MSSQLConnection };
