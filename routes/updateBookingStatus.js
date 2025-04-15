// routes/updateBookingStatus.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

/**
 * Update the status of a booking
 * @route POST /update_booking_status
 * @param {string} booking_id - ID of the booking to update
 * @param {string} status - New status value
 * @returns {Object} Success message or error
 */
router.post('/update_booking_status', async (req, res) => {
  try {
    const { booking_id, status } = req.body;
    
    // Validate required fields
    if (!booking_id || !status) {
      return res.status(400).json({
        success: false,
        message: "Missing booking_id or status."
      });
    }
    
    // Update booking status with parameterized query
    const [result] = await pool.query(
      'UPDATE bookings SET status = ? WHERE booking_id = ?',
      [status, booking_id]
    );
    
    // Check if any rows were affected
    if (result.affectedRows > 0) {
      res.json({
        success: true,
        message: "Booking status updated."
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Booking not found or no changes made."
      });
    }
  } catch (error) {
    console.error("Error updating booking status:", error);
    res.status(500).json({
      success: false,
      message: "Error: " + error.message
    });
  }
});

module.exports = router;