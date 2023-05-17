var mysql = require('mysql2');
var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "zWYx8088?",
  database: "mydb"
});

con.connect(function(err) {
  if (err) throw err;
  console.log("Connected!");
  var sql = "ALTER TABLE users ADD COLUMN account_creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;";
  con.query(sql, function (err, result) {
    if (err) throw err;
    console.log("Changes made!");
  });
});


// "CREATE TABLE links (id INT AUTO_INCREMENT, record_id INT, link VARCHAR(255), linkName VARCHAR(255), PRIMARY KEY(id), FOREIGN KEY(record_id) REFERENCES records(id))"