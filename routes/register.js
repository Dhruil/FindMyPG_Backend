const express = require('express');
const router = express.Router();
const pool = require('../db');

router.post('/register', async (req, res) => {
    try {
      const { userType, name, email, password, phone } = req.body;
      
      // Process based on user type
      if (userType === "owner") {
        // Create default address first
        const [addressResult] = await pool.query(
          'INSERT INTO address (street, city, state, zip) VALUES (?, ?, ?, ?)',
          ['', '', '', '']
        );
        
        const addressId = addressResult.insertId;
        
        // Create owner with reference to address
        await pool.query(
          'INSERT INTO owner (name, email, mobile, password, address_id) VALUES (?, ?, ?, ?, ?)',
          [name, email, phone, password, addressId]
        );
        
        res.json({
          status: "success", 
          message: `${userType} Registered`
        });
      } else {
        // Create regular user
        await pool.query(
          'INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)',
          [name, email, phone, password]
        );
        
        res.json({
          status: "success", 
          message: `${userType} Registered`
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({
        status: "error",
        message: error.message
      });
    }
  });

  module.exports = router;