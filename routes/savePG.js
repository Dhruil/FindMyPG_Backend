// routes/savePG.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

router.post('/save_pg', async (req, res) => {
  try {
    const data = req.body;
    
    const userId = data.user_id || null;
    const pgId = data.pg_id || null;
    
    if (userId && pgId) {
      // Insert the PG into saved_pgs table
      const query = "INSERT INTO saved_pgs (user_id, pg_id) VALUES (?, ?)";
      const [result] = await pool.query(query, [userId, pgId]);
      
      if (result.affectedRows > 0) {
        res.json({ status: "success" });
      } else {
        res.json({ 
          status: "error", 
          message: "Failed to save PG" 
        });
      }
    } else {
      res.status(400).json({ 
        status: "error", 
        message: "Invalid input" 
      });
    }
  } catch (error) {
    console.error("Error saving PG:", error);
    
    // Check for duplicate entry error
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        status: "error",
        message: "PG already saved"
      });
    }
    
    res.status(500).json({
      status: "error",
      message: "Server error",
      error: error.message
    });
  }
});

module.exports = router;