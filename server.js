const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const session = require("express-session");
const path = require("path");

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "zWYx8088?",
    database: "mydb"
});

app.use(session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: false
}));

app.post("/register", async (req, res) => {
    const { username, password } = req.body;

    const sql = "SELECT * FROM users WHERE username = ?";
    db.query(sql, [username], async (err, result) => {
        if (err) throw err;

        if (result.length > 0) {
            res.status(409).send("Username already exists");
        } else {
            const hashedPassword = await bcrypt.hash(password, 10);
            const insertSql = "INSERT INTO users (username, password) VALUES (?, ?)";
            db.query(insertSql, [username, hashedPassword], (err, result) => {
                if (err) {
                    console.log("Error inserting user:", err);
                    res.status(500).send("Error inserting user");
                } else {
                    console.log("User inserted:", result.insertId);
                    res.status(200).send("User registered successfully");
                }
            });
        }
    });
});

app.delete('/deleteAccount', isAuthenticated, async (req, res) => {
    const { password } = req.body;

    // Get the current user's password from the database
    db.query('SELECT password FROM users WHERE id = ?', [req.session.user.id], async (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error fetching password');
            return;
        }

        const hashedPassword = result[0].password;

        // Check if the current password is correct
        const isCurrentPasswordValid = await bcrypt.compare(password, hashedPassword);
        if (isCurrentPasswordValid) {
            // If the current password is correct, delete the user and their records
            db.beginTransaction((err) => {
                if (err) {
                    console.log("Error beginning transaction:", err);
                    res.status(500).send("Error beginning transaction");
                    return;
                }

                // Delete user's links
                const deleteLinksSql = "DELETE links FROM links INNER JOIN records ON records.id = links.record_id WHERE records.user_id = ?";
                db.query(deleteLinksSql, [req.session.user.id], (err, result) => {
                    if (err) {
                        console.log("Error deleting links:", err);
                        db.rollback(() => {
                            res.status(500).send("Error deleting links");
                        });
                        return;
                    }

                    // Delete user's records
                    const deleteRecordsSql = "DELETE FROM records WHERE user_id = ?";
                    db.query(deleteRecordsSql, [req.session.user.id], (err, result) => {
                        if (err) {
                            console.log("Error deleting records:", err);
                            db.rollback(() => {
                                res.status(500).send("Error deleting records");
                            });
                            return;
                        }

                        // Delete the user
                        const deleteUserSql = "DELETE FROM users WHERE id = ?";
                        db.query(deleteUserSql, [req.session.user.id], (err, result) => {
                            if (err) {
                                console.log("Error deleting user:", err);
                                db.rollback(() => {
                                    res.status(500).send("Error deleting user");
                                });
                                return;
                            }

                            db.commit((err) => {
                                if (err) {
                                    console.log("Error committing transaction:", err);
                                    db.rollback(() => {
                                        res.status(500).send("Error committing transaction");
                                    });
                                    return;
                                }

                                req.session.destroy();
                                console.log("Account deleted successfully");
                                res.status(200).send("Account deleted successfully");
                            });
                        });
                    });
                });
            });
        } else {
            // If the current password is incorrect, send an error
            res.status(401).send('Incorrect password');
        }
    });
});


app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    const sql = "SELECT * FROM users WHERE username = ?";
    db.query(sql, [username], async (err, result) => {
        if (err) throw err;

        if (result.length > 0) {
            const user = result[0];

            const isPasswordValid = await bcrypt.compare(password, user.password);
            if (isPasswordValid) {
                req.session.user = { id: user.id, username: user.username };
                res.status(200).send("Logged in");
            } else {
                res.status(401).send("Invalid username or password");
            }
        } else {
            res.status(401).send("Invalid username or password");
        }
    });
});

app.get("/register", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "register.html"));
});

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "login.html"));
});

app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/login");
});

app.get('/account', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, "views", 'account.html'));
});

app.get('/getAccountCreationDate', isAuthenticated, (req, res) => {
    const sql = "SELECT account_creation_date FROM users WHERE id = ?";
    db.query(sql, [req.session.user.id], (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error fetching account creation date');
            return;
        }

        const accountCreationDate = result[0].account_creation_date;

        // Return the date in ISO format
        res.json({accountCreationDate: accountCreationDate.toISOString()});
    });
});


app.post('/changePassword', isAuthenticated, (req, res) => {
    const { currentPassword, newPassword } = req.body;

    // Get the current user's password from the database
    db.query('SELECT password FROM users WHERE id = ?', [req.session.user.id], async (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error fetching password');
            return;
        }

        const hashedPassword = result[0].password;

        // Check if the current password is correct
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, hashedPassword);
        if (isCurrentPasswordValid) {
            // If the current password is correct, update the password
            const newHashedPassword = await bcrypt.hash(newPassword, 10);
            db.query('UPDATE users SET password = ? WHERE id = ?', [newHashedPassword, req.session.user.id], (err, result) => {
                if (err) {
                    console.error(err);
                    res.status(500).send('Error updating password');
                    return;
                }

                res.sendStatus(200);
            });
        } else {
            // If the current password is incorrect, send an error
            res.status(401).send('Incorrect current password');
        }
    });
});


function isAuthenticated(req, res, next) {
    if (req.session.user) {
        next();
    } else {
        res.redirect("/login");
    }
}

app.get("/main", isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, "views", "index.html"));
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "views", "login.html"));
});

app.get('/getData', isAuthenticated, (req, res) => {
    let sql = "SELECT * FROM records WHERE user_id = ?";
    const params = [req.session.user.id];
    const field = req.query.sort;
    const direction = req.query.direction;
    console.log("Field: ", field); // Log the field
    console.log("Direction: ", direction); // Log the direction
    if (field && direction) {
        if (['name', 'date', 'user_chosen_date', 'expiry_date'].includes(field) && ['asc', 'desc'].includes(direction)) {
            sql += ` ORDER BY ${field} ${direction.toUpperCase()} `;
        }
    }

    console.log("SQL query: ", sql); // Log the SQL query

    db.query(sql, params, async (err, result) => {
        if (err) throw err;
        console.log(result);
        const records = result;
        const linkSql = "SELECT * FROM links WHERE record_id = ?";

        // map each record to a Promise that resolves to the record with its links
        const recordsWithLinks = records.map(record => {
            return new Promise((resolve, reject) => {
                db.query(linkSql, [record.id], (err, result) => {
                    if (err) reject(err);
                    record.links = result;
                    resolve(record);
                });
            });
        });

        try {
            // wait for all Promises to resolve
            const completedRecords = await Promise.all(recordsWithLinks);
            res.json(completedRecords);
        } catch (error) {
            console.error(error);
            res.status(500).send("Error fetching data");
        }
    });
});

db.connect((err) => {
    if (err) throw err;
    console.log("Connected to the database!");
});

app.post("/saveData", isAuthenticated, async (req, res) => {
    const { name, links, date, Expirydate } = req.body;
    const user_chosen_date = new Date(date); // Parse user chosen date
    const expiry_date = new Date(Expirydate);
    const system_date = new Date(); // Get current date and time

    const sql = "INSERT INTO records (name, user_id, user_chosen_date, expiry_date, date) VALUES (?, ?, ?, ?, ?)";
    db.query(sql, [name, req.session.user.id, user_chosen_date, expiry_date, system_date], (err, result) => {
        if (err) {
            console.log("Error inserting records:", err);
            res.status(500).send("Error inserting records");
        } else {
            const recordId = result.insertId;
            if (links && links.length > 0) {
                const linkSql = "INSERT INTO links (record_id, link, linkName) VALUES (?, ?, ?)";
                
                db.beginTransaction((err) => {
                    if (err) {
                        console.log("Error beginning transaction:", err);
                        res.status(500).send("Error beginning transaction");
                        return;
                    }

                    for (const linkObject of links) {
                        db.query(linkSql, [recordId, linkObject.link, linkObject.linkName], (err, result) => {
                            if (err) {
                                console.log("Error inserting link:", err);
                                db.rollback(() => {
                                    res.status(500).send("Error inserting link");
                                });
                                return;
                            }
                        });
                    }

                    db.commit((err) => {
                        if (err) {
                            console.log("Error committing transaction:", err);
                            db.rollback(() => {
                                res.status(500).send("Error committing transaction");
                            });
                            return;
                        }

                        console.log("Links inserted");
                        res.status(200).send("Record inserted successfully");
                    });
                });
            } else {
                console.log("No link to insert");
                res.status(200).send("Record inserted successfully");
            }
        }
    });
});

app.delete('/deleteData/:id', isAuthenticated, (req, res) => {
    const { id } = req.params;

    const deleteLinksSql = "DELETE FROM links WHERE record_id = ?";
    db.query(deleteLinksSql, [id], (err, result) => {
        if (err) {
            console.log("Error deleting links:", err);
            res.status(500).send("Error deleting links");
        } else {
            const deleteRecordSql = "DELETE FROM records WHERE id = ? AND user_id = ?";
            db.query(deleteRecordSql, [id, req.session.user.id], (err, result) => {
                if (err) {
                    console.log("Error deleting record:", err);
                    res.status(500).send("Error deleting record");
                } else {
                    console.log("Record deleted successfully");
                    res.status(200).send("Record deleted successfully");
                }
            });
        }
    });
});


app.get('/searchData', isAuthenticated, (req, res) => {
    const name = req.query.name;
    const sql = "SELECT * FROM records WHERE name LIKE ? AND user_id = ?";
    db.query(sql, ['%' + name + '%', req.session.user.id], async (err, result) => {
        if (err) throw err;
        console.log(result);
        const records = result;
        const linkSql = "SELECT * FROM links WHERE record_id = ?";

        const recordsWithLinks = records.map(record => {
            return new Promise((resolve, reject) => {
                db.query(linkSql, [record.id], (err, result) => {
                    if (err) reject(err);
                    console.log('Link data:', result); 
                    record.links = result;
                    resolve(record);
                });
            });
        });

        try {
            const completedRecords = await Promise.all(recordsWithLinks);
            res.json(completedRecords);
        } catch (error) {
            console.error(error);
            res.status(500).send("Error fetching data");
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something went wrong!');
  });
  
