const express = require('express');
const db = require('./database');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public'));

app.post('/calculate-pay', async (req, res) => {
  const { employeeID, startDate, endDate } = req.body;

  try {
      const sql = `SELECT e.PayRate, pr.HoursWorked, pr.NotariesSigned, pr.MailboxesOpened
                   FROM employee e
                   JOIN pay_rate pr ON e.EmployeeID = pr.EmployeeID
                   WHERE e.EmployeeID = ? AND pr.Date BETWEEN ? AND ?`;

      db.query(sql, [employeeID, startDate, endDate], (error, results) => {
          if (error) {
              console.error('Error calculating pay:', error);
              return res.status(500).json({ message: "Failed to calculate pay", error: error.message });
          }
          
          console.log(results);

          let totalRegularHours = 0;
          let totalOvertimeHours = 0;
          let totalWeeklyHours = 0;
          let totalNotaries = 0;
          let totalMailboxes = 0;

          results.forEach(row => {
              totalNotaries += row.NotariesSigned;
              totalMailboxes += row.MailboxesOpened;
              const dailyOvertime = row.HoursWorked > 8 ? row.HoursWorked - 8 : 0;
              totalOvertimeHours += dailyOvertime;
              totalWeeklyHours += row.HoursWorked;
              totalRegularHours += row.HoursWorked - dailyOvertime;
          });
          if (totalWeeklyHours > 40) {
              const weeklyOvertime = totalWeeklyHours - 40;
              totalOvertimeHours += weeklyOvertime;
              totalRegularHours -= weeklyOvertime;
          }
          const payRate = results.length > 0 ? results[0].PayRate : 0;
          const regularPay = totalRegularHours * payRate;
          const overtimePay = totalOvertimeHours * payRate * 1.5;
          const bonusPay = (totalNotaries * 3) + (totalMailboxes * 5);
          const totalPay = regularPay + overtimePay + bonusPay;

          res.json({
              totalHours: totalRegularHours + totalOvertimeHours,
              regularHours: totalRegularHours,
              overtimeHours: totalOvertimeHours,
              regularPay,
              overtimePay,
              bonusPay,
              totalPay
          });
      });
  } catch (error) {
      console.error('Server error:', error);
      res.status(500).json({ message: "Server error calculating pay." });
  }
});




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
  const posEntries = [
      { ...posA, pointOfService: 'A' },
      { ...posB, pointOfService: 'B' },
      { ...posC, pointOfService: 'C' }
  ];

  const sql = 'INSERT INTO financial (Date, PointOfService, Tendered, Deposit) VALUES ?';
  const values = posEntries.map(entry => [date, entry.pointOfService, entry.tendered, entry.deposit]);

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
