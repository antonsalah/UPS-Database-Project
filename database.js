const mysql = require('mysql');

// Create a connection to the database
const dbConnection = mysql.createConnection({
  host     : 'localhost', // or your database host
  user     : 'root', // your database username
  password : '', // your database password
  database : 'group project'
});

// Connect to the database
dbConnection.connect(error => {
  if (error) throw error;
  console.log("Successfully connected to the database.");
});

module.exports = dbConnection;
