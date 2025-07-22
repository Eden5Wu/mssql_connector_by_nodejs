[中文版本 / Chinese Version](README_ZH.md)

# Node.js MSSQL Database Connector

This module makes it super easy for your Node.js apps to connect to and play with Microsoft SQL Server databases. It handles all the behind-the-scenes stuff like keeping connections alive, making sure your data is safe from sneaky SQL injections, and even tidies up the data you get back so it's actually usable.

---

## **Key Features:**

* **Transactions:** Keeps your database changes together. If one thing fails, everything rolls back. No more scattered SQL commands to worry about!
* **Connection Pooling:** Like having a bunch of ready-to-go database connections. Makes your app faster and more efficient.
* **Parameterized Queries:** This is your security guard against those nasty SQL injection attacks. Keeps your data safe and sound.
* **Result Formatting:** Dates, weird data formats? This thing tries to make them look nice and consistent for you automatically.
* **Pagination Support:** Got tons of data? Easily grab it page by page using `LIMIT` and `OFFSET`.
* **Easy to Use:** The way you talk to this module is clear and simple, so you can drop it into your project without a headache.

---

## **Tech Stack:**

* Node.js
* [`mssql` npm package](https://www.npmjs.com/package/mssql)

---

## **About Time Handling**

Properly handling dates and times is crucial, and this module works in tandem with the underlying `mssql` driver's `useUTC` option. Here’s how it works.

### The `useUTC` Connection Option

The `mssql` driver has a connection option called `useUTC` that fundamentally changes how it interprets date/time values read from the database. These values from MSSQL's `datetime` or `datetime2` fields typically do not contain timezone information.

* `useUTC: true` (The default in `mssql`)
    * **What it does:** It assumes any date/time string from the database is in **UTC (Coordinated Universal Time, or +00:00)**.
    * **Best for:** New projects, global applications, or any environment where you want to standardize on UTC for all backend logic to avoid timezone issues. This is the recommended best practice for modern development.

* `useUTC: false`
    * **What it does:** It assumes any date/time string from the database is in the **same local timezone as your Node.js server**.
    * **Best for:** Environments where both the Node.js server and the database server operate in a single, consistent timezone (e.g., everything is in `UTC+8`). This is **essential** when working with legacy systems or existing databases that already store timestamps in a local timezone.

**For your environment, which co-exists with a Delphi system in a UTC+8 environment, you must set `useUTC: false` to ensure data consistency.**

### How This Module Formats Dates

After the `mssql` driver reads and interprets the date based on the `useUTC` setting, this module then formats the resulting JavaScript `Date` object into a standardized string with two specific rules:

1.  If the time is exactly midnight (**00:00:00.000**), it returns a simple date string: `YYYY-MM-DD`.
2.  For all other times, it returns a full ISO 8601 string with the correct timezone offset, like `YYYY-MM-DDTHH:mm:ss.sss+08:00`.

***For example, if your Node.js server is in the East Asia Time Zone (UTC+8) and you set `useUTC: false`:**_

* A database value of `2025-01-01 00:00:00` becomes `"2025-01-01"`.
* A database value of `2025-01-01 18:35:46` becomes `"2025-01-01T18:35:46+08:00"`.

---

## **Configuration**

You can set connection details like `server`, `database`, `user`, and `password` when you create a new `MSSQLConnection` instance. This includes the crucial `useUTC` option.

```javascript
const db = new MSSQLConnection('yourDatabase', {
  server: 'yourServer',
  user: 'yourUser',
  password: 'yourPassword',
  options: {
    // For legacy systems in a single timezone
    useUTC: false
  }
});

---

## **Common Issues & Solutions:**

* **"Connection not yet open" Error:**
    This error typically pops up when you try to run a query, but the underlying MSSQL connection hasn't been successfully established or has already closed. When you're not using connection pooling, the `MSSQLConnection` instance's lifecycle is tightly tied to its underlying connection. If you create multiple independent instances within a single function, you must explicitly call the `close()` method on each instance after you're done with your operations.

* **"Connection is closed" Error:**
    This error typically happens when you try to perform multiple queries within a single function without using a transaction. Transactions bind multiple database operations to the same connection, helping you avoid issues caused by connections being unexpectedly closed. For details, check out **Example 3: Using Transactions**.

---

## **Usage Examples:**

**(Examples 1 through 5 remain unchanged as they correctly demonstrate the module's functionality)**

**1. Error Handling with `try...catch...finally`:**
```javascript
const { MSSQLConnection } = require('./db.js'); // Make sure the path is right!
const db = new MSSQLConnection('yourDatabase', {
  server: 'yourServer',
  user: 'yourUser',
  password: 'yourPassword',
  options: { useUTC: false } // Recommended setting for your environment
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

**2. Simple Usage:**
```javascript
const { MSSQLConnection } = require('./db.js'); // Adjust the path if needed

async function fetchData(dbName) {
  const db = new MSSQLConnection('yourDatabase', { options: { useUTC: false } });
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

**3. Using Transactions:**
```javascript
const { MSSQLConnection } = require('./db.js');

async function fetchData(dbName) {
  const db = new MSSQLConnection('yourDatabase', { options: { useUTC: false } });
  const theTrans = await db.startTransaction()
  try {
    // open() is called automatically within the transaction
    const result = await db.executeQuery('SELECT * FROM yourTable');
    console.log(result.recordset);

    const result2 = await db.executeQuery('SELECT * FROM yourTable2');
    console.log(result2.recordset);
    await db.commitTransaction(theTrans)
  } catch (error) {
    await db.rollbackTransaction(theTrans);
    console.error('Database error:', error);
  } finally {
    await db.close();
  }
}

fetchData();
```

**4. Paged Queries:**
```javascript
const { MSSQLConnection } = require('your-module-name'); // Replace with your actual module name!

async function getPaginatedData() {
  const db = new MSSQLConnection('yourDatabase', { options: { useUTC: false } });
  try {
    await db.open();
    const page1 = await db.executeSQLCmd('SELECT * FROM yourTable ORDER BY id', [], { limit: 10, skip: 0 });
    console.log('Page 1:', page1.results);

    const page2 = await db.executeSQLCmd('SELECT * FROM yourTable ORDER BY id', [], { limit: 10, skip: 10 });
    console.log('Page 2:', page2.results);
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await db.close();
  }
}

getPaginatedData();
```

**5. Parameterized Queries:**
```javascript
// ... (assuming db is an already created MSSQLConnection instance)

// Example: Running a query with placeholders using executeSQLCmd
console.log('\n--- Running a query with placeholders ---');
const quantity = 5;
const lastOrderDate = new Date(); // Using a live Date object

const placeholderQueryResult = await db.executeSQLCmd(
  'SELECT * FROM OrderDetails WHERE Quantity > ? AND OrderDate <= ?;',
  [
    [quantity, db.TYPES.Int],
    [lastOrderDate, db.TYPES.DateTime], // The driver handles Date object conversion
  ]
);
console.log('Placeholder Query Result:', placeholderQueryResult.results);
```
