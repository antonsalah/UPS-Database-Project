const express = require('express');
const db = require('./database'); // Adjust the path based on your project structure
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
      // Ensure this line correctly returns the insertId
      res.status(201).json({ message: "Employee added successfully", employeeNumber: results.insertId });

    });
  });

app.post('/log-hours', (req, res) => {
    // Placeholder: Logic to log employee hours
    res.json({ message: "Hours logged successfully", data: req.body });
});

app.post('/schedule-timeoff', (req, res) => {
    // Placeholder: Logic to schedule employee time off
    res.json({ message: "Time off scheduled successfully", data: req.body });
});

app.post('/input-financials', (req, res) => {
    // Placeholder: Logic to input financials
    res.json({ message: "Financials inputted successfully", data: req.body });
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
