// routes/getUsers.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/getUser', async (req, res) => {
  try {
    // Check if user_id header exists
    const userId = req.headers.user_id;
    
    if (!userId) {
      return res.status(400).json({ 
        status: "error", 
        message: "Invalid or missing user_id" 
      });
    }
    
    // SQL query to get user details
    const sql = "SELECT * FROM users WHERE user_id = ?";
    
    // Execute query with parameterized value
    const [rows] = await pool.query(sql, [userId]);
    
    if (rows.length > 0) {
      const user = rows[0];
      res.json({ status: "success", user: user });
    } else {
      res.json({ status: "error", message: "No users found" });
    }
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ 
      status: "error", 
      message: "Server error", 
      error: error.message 
    });
  }
});

module.exports = router;