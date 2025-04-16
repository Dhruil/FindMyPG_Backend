const express = require('express');
const app = express();
const connection = require('./db');

app.get('/users', (req, res) => {
  connection.query('SELECT * FROM users', (err, results) => {
    if (err) {
      return res.status(500).send('Database error');
    }
    res.json(results);
  });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
