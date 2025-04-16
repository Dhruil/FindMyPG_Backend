// routes/getOwnerBookings.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/get_owner_bookRoom', async (req, res) => {
  try {
    // Get owner_id from header
    const ownerId = req.headers.owner_id;
    console.log(req.headers)

    if (!ownerId) {
      return res.status(400).json({
        success: false,
        message: "Missing owner ID."
      });
    }

    // Step 1: Get all pg_ids for this owner
    const pgQuery = "SELECT pg_id FROM pg WHERE owner_id = ?";
    const [pgResults] = await pool.query(pgQuery, [ownerId]);

    if (pgResults.length === 0) {
      return res.json({
        success: true,
        bookings: [] // No PGs
      });
    }

    // Extract pg_ids from results
    const pgIds = pgResults.map(row => row.pg_id);

    // Step 2: Get bookings related to those PGs
    // Using ? placeholders for each pg_id in the IN clause
    const placeholders = pgIds.map(() => '?').join(',');
    const bookingsQuery = `SELECT * FROM bookings WHERE pg_id IN (${placeholders})`;
    
    const [bookingsResults] = await pool.query(bookingsQuery, pgIds);

    res.json({
      success: true,
      bookings: bookingsResults
    });
    
  } catch (error) {
    console.error("Error fetching owner bookings:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

module.exports = router;