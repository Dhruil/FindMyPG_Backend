// routes/login.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

router.post('/login', async (req, res) => {
  try {
    const data = req.body;
    
    if (!data) {
      return res.status(400).json({ success: false, message: "Invalid JSON" });
    }
    
    const userType = data.userType;
    const email = data.email;
    const password = data.password;
    
    if (userType === "owner") {
      // Check if email exists in owner table
      const [owners] = await pool.query('SELECT * FROM owner WHERE email = ?', [email]);
      
      if (owners.length > 0) {
        const owner = owners[0];
        if (owner.password === password) {
          res.json({
            success: true,
            message: "Login successful.",
            owner_id: owner.owner_id
          });
        } else {
          res.json({
            success: false,
            message: "Invalid password."
          });
        }
      } else {
        res.json({
          success: false,
          message: "Email does not exist."
        });
      }
    } else {
      // Check if email exists in users table
      const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
      
      if (users.length > 0) {
        const user = users[0];
        if (user.password === password) {
          res.json({
            success: true,
            message: "Login successful.",
            user_id: user.user_id
          });
        } else {
          res.json({
            success: false,
            message: "Invalid password."
          });
        }
      } else {
        res.json({
          success: false,
          message: "Email does not exist."
        });
      }
    }
  } catch (error) {
    console.error("Login error:", error);
    res.status(400).json({
      success: false,
      status: "error",
      message: error.message
    });
  }
});

module.exports = router;