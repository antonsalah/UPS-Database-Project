const express = require('express');
const db = require('./database');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static('public')); // Serve static files

// Endpoint to add a new employee
app.post('/add-employee', (req, res) => {
    const { firstName, lastName, payRate } = req.body;
    const sql = `INSERT INTO employee (FirstName, LastName, PayRate) VALUES (?, ?, ?)`;
    
    db.query(sql, [firstName, lastName, payRate], (error, results) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ message: "Error adding employee", error: error.message });
      }
      // returns the insertId
      res.status(201).json({ message: "Employee added successfully", employeeNumber: results.insertId });

    });
  });

app.post('/log-hours', (req, res) => {
    // Placeholder: Logic to log employee hours
    res.json({ message: "Hours logged successfully", data: req.body });
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


app.post('/input-financials', (req, res) => {
    // Placeholder: Logic to input financials
    res.json({ message: "Financials inputted successfully", data: req.body });
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



// Start the server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
