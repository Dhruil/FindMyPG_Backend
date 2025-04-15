// routes/getSavedPGs.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/get_saved_pgs', async (req, res) => {
  try {
    // Get user_id from headers
    const userId = req.headers['user_id'];

    // Check if user_id is provided
    if (!userId) {
      return res.status(400).json({
        status: "error",
        message: "Invalid or missing user_id"
      });
    }

    // Query to get saved PGs for the user
    const query = "SELECT pg_id FROM saved_pgs WHERE user_id = ?";
    const [results] = await pool.query(query, [userId]);

    // Extract pg_ids from results
    const savedPgs = results.map(row => row.pg_id);

    // Return the saved PGs
    res.json({
      status: "success",
      saved_pgs: savedPgs
    });
    
  } catch (error) {
    console.error("Error fetching saved PGs:", error);
    res.status(500).json({
      status: "error",
      message: "Server error",
      error: error.message
    });
  }
});

module.exports = router;