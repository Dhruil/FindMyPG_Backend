// routes/postBooking.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

router.post('/bookRoom', async (req, res) => {
  try {
    const data = req.body;

    if (!data) {
      return res.status(400).json({ success: false, message: "Invalid JSON" });
    }

    // Extract values
    const userId = data.userId;
    const pgId = data.pgId;
    const pgName = data.pgName;
    const address = data.address;
    const roomType = data.roomType;
    const roomId = data.roomId;
    const amount = data.amount;
    const checkInDate = new Date(data.checkInDate).toISOString().split('T')[0]; // Format as YYYY-MM-DD
    const checkOutDate = new Date(data.checkOutDate).toISOString().split('T')[0];
    const status = data.status;
    const bookingDate = new Date(data.bookingDate).toISOString().split('T')[0];
    const userName = data.userDetails.name;
    const userEmail = data.userDetails.email;
    const userPhone = data.userDetails.phone;
    const userGender = data.userDetails.gender;
    const specialRequests = data.specialRequests;

    // Insert into bookings table with parameterized query
    const insert_query = `
      INSERT INTO bookings (
        user_id, pg_id, pg_name, address, room_type, room_id, amount,
        check_in_date, check_out_date, status, booking_date,
        user_name, user_gender, user_email, user_phone, special_requests
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      userId, pgId, pgName, address, roomType, roomId, amount,
      checkInDate, checkOutDate, status, bookingDate,
      userName, userGender, userEmail, userPhone, specialRequests
    ];

    const [result] = await pool.query(insert_query, values);

    if (result.affectedRows > 0) {
      res.json({ success: true, message: "Booking saved successfully" });
    } else {
      res.status(500).json({ success: false, message: "Error: Failed to insert booking" });
    }
  } catch (error) {
    console.error("Booking error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: error.message 
    });
  }
});

module.exports = router;