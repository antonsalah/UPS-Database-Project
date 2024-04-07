const express = require('express');
const db = require('./database');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

app.post('/add-employee', (req, res) => {
    const { firstName, lastName, payRate } = req.body;
    const sql = `INSERT INTO employee (FirstName, LastName, PayRate) VALUES (?, ?, ?)`;
    
    db.query(sql, [firstName, lastName, payRate], (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: "Error adding employee", error: error.message });
      }
      res.status(201).json({ message: "Employee added successfully", employeeNumber: results.insertId });

    });
  });

  app.post('/query-employee-hours', (req, res) => {
    const { employeeNumber, firstName, lastName, startDate, endDate } = req.body;

    let sql = `SELECT e.FirstName, e.LastName, pr.Date as WorkDate, pr.HoursWorked, pr.NotariesSigned, pr.MailboxesOpened
               FROM pay_rate pr
               JOIN employee e ON pr.EmployeeID = e.EmployeeID
               WHERE 1=1`;

    const params = [];
    if (startDate) {
        sql += " AND pr.Date >= ?";
        params.push(startDate);
    }
    if (endDate) {
        sql += " AND pr.Date <= ?";
        params.push(endDate);
    } else {
        if (startDate) {
            sql += " AND pr.Date <= ?";
            params.push(startDate);
        }
    }
    if (employeeNumber) {
        sql += " AND e.EmployeeID = ?";
        params.push(employeeNumber);
    }
    if (firstName) {
        sql += " AND e.FirstName LIKE ?";
        params.push(`%${firstName}%`);
    }
    if (lastName) {
        sql += " AND e.LastName LIKE ?";
        params.push(`%${lastName}%`);
    }
    db.query(sql, params, (error, results) => {
        if (error) {
            console.error('Error querying employee hours:', error);
            return res.status(500).json({ message: "Failed to query employee hours", error: error.message });
        }
        res.json(results);
    });
});



app.post('/schedule-timeoff', (req, res) => {
  const { employeeID, dayOffStart, dayOffEnd, numberOfDays } = req.body;
  const sql = `INSERT INTO time_off (EmployeeID, DayOffStart, DayOffEnd, NumberOfDays) VALUES (?, ?, ?, ?)`;

  db.query(sql, [employeeID, dayOffStart, dayOffEnd, numberOfDays], (error, results) => {
    if (error) {
      console.error('Error scheduling time off:', error);
      return res.status(500).json({ message: "Failed to schedule time off", error: error.message });
    }
    res.json({ message: "Time off scheduled successfully", timeOffID: results.insertId });
  });
});


app.post('/submit-financials', (req, res) => {
  const { date, posA, posB, posC } = req.body;
  // Define an array of POS data to streamline inserts
  const posEntries = [
      { ...posA, pointOfService: 'A' },
      { ...posB, pointOfService: 'B' },
      { ...posC, pointOfService: 'C' }
  ];

  const sql = 'INSERT INTO financial (Date, PointOfService, Tendered, Deposit) VALUES ?';

  // Transform posEntries to match the bulk insert format expected by MySQL
  const values = posEntries.map(entry => [date, entry.pointOfService, entry.tendered, entry.deposit]);

  // Perform a bulk insert
  db.query(sql, [values], (error, results) => {
      if (error) {
          console.error('Error inserting financials:', error);
          return res.status(500).json({ message: "Failed to insert financials", error: error.message });
      }
      res.json({ message: "Financials submitted successfully" });
  });
});



app.get('/search-timeoff', (req, res) => {
  const { startDate, endDate, firstName, lastName } = req.query;
  
  let sql = `SELECT e.FirstName, e.LastName, t.DayOffStart, t.DayOffEnd
             FROM time_off t
             JOIN employee e ON t.EmployeeID = e.EmployeeID
             WHERE t.DayOffStart <= ? AND t.DayOffEnd >= ?`;

  const params = [endDate, startDate];

  if (firstName) {
      sql += " AND e.FirstName LIKE ?";
      params.push(`%${firstName}%`);
  }
  if (lastName) {
      sql += " AND e.LastName LIKE ?";
      params.push(`%${lastName}%`);
  }

  db.query(sql, params, (error, results) => {
      if (error) {
          console.error('Error fetching time off:', error);
          return res.status(500).json({ message: "Failed to fetch time off" });
      }
      res.json(results);
  });
});

app.post('/submit-work-hours', (req, res) => {
  const { employeeID, date, hoursWorked, notariesSigned, mailboxesOpened } = req.body;

  const sql = `INSERT INTO pay_rate (EmployeeID, Date, HoursWorked, NotariesSigned, MailboxesOpened) VALUES (?, ?, ?, ?, ?)`;

  db.query(sql, [employeeID, date, hoursWorked, notariesSigned, mailboxesOpened], (error, results) => {
      if (error) {
          console.error('Error inserting work hours:', error);
          return res.status(500).json({ message: "Failed to record work hours", error: error.message });
      }
      res.json({ message: "Work hours successfully recorded" });
  });
});

app.post('/query-pos', (req, res) => {
  const { posSelect, startDate, endDate } = req.body;

  let sql = `SELECT Date, PointOfService, Tendered, Deposit FROM financial WHERE Date >= ? AND Date <= ?`;
  const params = [startDate, endDate];

  if (posSelect !== 'ALL') {
      sql += ' AND PointOfService = ?';
      params.push(posSelect);
  }

  db.query(sql, params, (error, results) => {
      if (error) {
          console.error('Error querying financial data:', error);
          return res.status(500).json({ message: "Failed to query financial data", error: error.message });
      }
      res.json(results);
  });
});



// Start the server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
