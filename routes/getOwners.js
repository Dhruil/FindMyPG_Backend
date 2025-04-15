// routes/getOwners.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/getOwner', async (req, res) => {
  try {
    // Check if owner_id header exists
    const ownerId = req.headers.owner_id;
    
    if (!ownerId) {
      return res.status(400).json({ 
        status: "error", 
        message: "Invalid or missing owner_id" 
      });
    }
    
    // SQL query to get owner and address details
    const sql = `
      SELECT 
        o.owner_id, o.name AS owner_name, o.mobile, o.email, o.password, o.image, o.no_of_pg_hold, o.gender, o.aadhar_card,
        a.residence_name, a.street, a.area, a.city, a.state, a.zip
      FROM owner o
      INNER JOIN address a ON o.address_id = a.address_id
      WHERE o.owner_id = ?
    `;
    
    // Execute query with parameterized value
    const [rows] = await pool.query(sql, [ownerId]);
    
    if (rows.length > 0) {
      const row = rows[0];
      
      const owner = {
        id: row.owner_id,
        name: row.owner_name,
        mobile: row.mobile,
        email: row.email,
        password: row.password,
        image: row.image,
        no_of_pg_hold: row.no_of_pg_hold,
        gender: row.gender,
        aadhar_card: row.aadhar_card,
        address: {
          residence_name: row.residence_name,
          street: row.street,
          area: row.area,
          city: row.city,
          state: row.state,
          zip: row.zip
        }
      };
      
      res.json({ status: "success", owner: owner });
    } else {
      res.json({ status: "error", message: "No owners found" });
    }
  } catch (error) {
    console.error("Error fetching owner:", error);
    res.status(500).json({ 
      status: "error", 
      message: "Server error", 
      error: error.message 
    });
  }
});

module.exports = router;