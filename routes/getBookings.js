// routes/getBookings.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/get_bookRoom', async (req, res) => {
  try {
    // Get user_id from headers
    const userId = req.headers['user-id'];

    // Exit if user_id is not provided
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Missing user-id in headers. Access denied."
      });
    }

    // Query to get bookings for the user
    const query = "SELECT * FROM bookings WHERE user_id = ? ORDER BY booking_date DESC";
    const [bookings] = await pool.query(query, [userId]);

    if (bookings.length > 0) {
      res.json({
        success: true,
        data: bookings
      });
    } else {
      res.json({
        success: false,
        message: "No bookings found for this user."
      });
    }
  } catch (error) {
    console.error("Error fetching bookings:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

module.exports = router;