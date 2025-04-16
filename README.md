# Node.js MSSQL Database Connector

This module makes it super easy for your Node.js apps to connect to and play with Microsoft SQL Server databases. It handles all the behind-the-scenes stuff like keeping connections alive, making sure your data is safe from sneaky SQL injections, and even tidies up the data you get back so it's actually usable.

**Key Features:**

* **Transactions:** Keeps your database changes together. If one thing fails, everything rolls back. No more scattered SQL commands to worry about!
* **Connection Pooling:** Like having a bunch of ready-to-go database connections. Makes your app faster and more efficient.
* **Parameterized Queries:** This is your security guard against those nasty SQL injection attacks. Keeps your data safe and sound.
* **Result Formatting:** Dates, weird data formats? This thing tries to make them look nice and consistent for you automatically.
* **Pagination Support:** Got tons of data? Easily grab it page by page using `LIMIT` and `OFFSET`.
* **Easy to Use:** The way you talk to this module is clear and simple, so you can drop it into your project without a headache.

**Core Functionality:**

* Handles database transactions so you can focus on your app logic, not messy SQL.
* Provides connection pooling to keep things running smoothly and fast.
* Supports parameterized queries to block SQL injection and keep your data legit.
* Automatically formats dates, Buffers, and strings (Defaults to: `yyyy-MM-ddThh:mm:ss.nnn(+-)hh:mm` for your local time).
* Lets you grab data in chunks with `LIMIT` and `OFFSET` for pagination.
* A straightforward API that's easy to get the hang of and integrate.

**Tech Stack:**

* Node.js
* [`mssql` npm package](https://www.npmjs.com/package/mssql)
* [`dayjs` npm package](https://www.npmjs.com/package/dayjs)

**About Time Handling**

MSSQL's `datetime` and `datetime2` fields usually store time zone-aware data. So, when you get data back, the date and time might be in one of two formats, and the time zone info won't be shifted again:

* If the time is midnight (00:00:00), you'll get the date in `YYYY-MM-DD` format.
* If the time has hours, minutes, or seconds, you'll get it in `YYYY-MM-DDTHH:mm:dd.zzzZ` format.

***For example, if your MSSQL server is in the East Asia Time Zone (GMT+8):***

* `2025-01-01` becomes `"2025-01-01"`
* `2025-01-01 18:35:46` becomes `"2025-01-01T18:35:46+08:00"`

**Tweaking the Defaults**

In the `baseConfig`, you can set default values for things like `server`, `database`, `user`, `password`, and `pool` if you always connect to the same place. If you prefer to set these up every time you make a connection, this module gives you that option when you create a new instance.

---

**Usage Examples:**

**1. Error Handling with `try...catch...finally`:**

```javascript
const { MSSQLConnection } = require('db.js'); // Make sure the path is right!
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

2. Simple Usage:

```javascript
const { MSSQLConnection } = require('db.js'); // Adjust the path if needed

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

3. Using Transactions:
```javascript
const { MSSQLConnection } = require('db.js'); // Check your path!

async function fetchData(dbName) {
  const db = new MSSQLConnection('yourDatabase');
  const theTrans = await db.startTransaction();
  try {
    await db.open();
    const result = await db.executeQuery('SELECT * FROM yourTable');
    console.log(result.recordset);
    await db.commitTransaction(theTrans);
  } catch (error) {
    await sqlConn.rollbackTransaction(trans);
    console.error('Database error:', error);
  } finally {
    await db.close();
  }
}

fetchData();
```
4. Paged Queries:
```javascript
const { MSSQLConnection } = require('your-module-name'); // Replace with your actual module name!

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
5. Parameterized Queries
```javascript
// Example 1: Running a simple query without parameters using executeQuery
console.log('--- Running a simple query ---');
const simpleQueryResult = await db.executeQuery('SELECT GETDATE() AS CurrentDateTime;');
console.log('Query Result:', simpleQueryResult.recordset);

// Example 2: Running a query with parameters using executeQuery
console.log('\n--- Running a parameterized query (executeQuery) ---');
const productCode = 'ABC-123';
const minPrice = 50;
const parameterizedQueryResult = await db.executeQuery(
  'SELECT * FROM Products WHERE ProductCode = @code AND Price > @price;',
  [
    ['code', db.TYPES.VarChar, productCode],
    ['price', db.TYPES.Int, minPrice],
  ]
);
console.log('Parameterized Query Result:', parameterizedQueryResult.recordset);

// Example 3: Running a query with placeholders using executeSQLCmd (array parameters)
console.log('\n--- Running a query with placeholders (executeSQLCmd - array params) ---');
const orderId = 101;
const customerName = 'John Doe';
const placeholderQueryResult1 = await db.executeSQLCmd(
  'SELECT * FROM Orders WHERE OrderID = ? AND CustomerName = ?;',
  [orderId, customerName]
);
console.log('Placeholder Query Result (array params):', placeholderQueryResult1.results);

// Example 4: Running a query with placeholders using executeSQLCmd (explicit parameter types)
console.log('\n--- Running a query with placeholders (executeSQLCmd - typed params) ---');
const quantity = 5;
const lastOrderDate = new Date('2024-12-31T00:00:00Z');
const placeholderQueryResult2 = await db.executeSQLCmd(
  'SELECT * FROM OrderDetails WHERE Quantity > ? AND OrderDate <= ?;',
  [
    [quantity, db.TYPES.Int],
    [lastOrderDate, db.TYPES.DateTime],
  ]
);
console.log('Placeholder Query Result (typed params):', placeholderQueryResult2.results);

// Example 5: Running a paged query using executeSQLCmd
console.log('\n--- Running a paged query (executeSQLCmd) ---');
const productsPaged = await db.executeSQLCmd(
  'SELECT ProductID, ProductName, Price FROM Products ORDER BY ProductID;',
  [],
  { limit: 10, skip: 5 } // Get records 6 to 15
);
console.log('Paged Query Result:', productsPaged.results);
```
