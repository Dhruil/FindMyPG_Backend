// routes/unsavePG.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

router.post('/unsave_pg', async (req, res) => {
  try {
    const data = req.body;
    
    const userId = data.user_id || null;
    const pgId = data.pg_id || null;
    
    if (userId && pgId) {
      // Delete the saved PG entry
      const query = "DELETE FROM saved_pgs WHERE user_id = ? AND pg_id = ?";
      const [result] = await pool.query(query, [userId, pgId]);
      
      if (result.affectedRows > 0) {
        res.json({ status: "success" });
      } else {
        res.json({ 
          status: "error", 
          message: "Failed to remove PG or entry doesn't exist" 
        });
      }
    } else {
      res.status(400).json({ 
        status: "error", 
        message: "Invalid input" 
      });
    }
  } catch (error) {
    console.error("Error unsaving PG:", error);
    res.status(500).json({
      status: "error",
      message: "Server error",
      error: error.message
    });
  }
});

module.exports = router;