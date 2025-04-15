// routes/getSavedPgDetails.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

// Get PGs saved by a user
router.get('/get_saved_pg_details', async (req, res) => {
  try {
    const user_id = req.query.user_id;
    
    if (!user_id) {
      return res.status(400).json({
        status: "error",
        message: "Missing user_id parameter"
      });
    }
    
    // Get the saved PGs with their basic info
    const [savedPgs] = await pool.query(
      `SELECT pg.pg_id, pg.pg_name, pg.address_id, sp.saved_on
       FROM saved_pgs sp
       JOIN pg ON sp.pg_id = pg.pg_id
       WHERE sp.user_id = ?`,
      [user_id]
    );
    
    const response = [];
    
    // Process each saved PG
    for (const row of savedPgs) {
      const pg_id = row.pg_id;
      const pg_name = row.pg_name;
      
      // Convert saved_on date to required format
      const saved_on = new Date(row.saved_on).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
      
      // Get address details
      const [addressRows] = await pool.query(
        `SELECT residence_name, street, area, city, state, zip 
         FROM address 
         WHERE address_id = ?`,
        [row.address_id]
      );
      
      let address_str = "";
      if (addressRows.length > 0) {
        const addr = addressRows[0];
        address_str = `${addr.residence_name}, ${addr.street}, ${addr.area}, ${addr.city}, ${addr.state} - ${addr.zip}`;
      }
      
      // Get first image
      const [imageRows] = await pool.query(
        `SELECT image_path 
         FROM images 
         WHERE pg_id = ? AND room_id IS NULL 
         LIMIT 1`,
        [pg_id]
      );
      
      let image_path = "";
      if (imageRows.length > 0) {
        image_path = imageRows[0].image_path;
      }
      
      // Get price range
      const [priceRows] = await pool.query(
        `SELECT MIN(rent) AS min_price, MAX(rent) AS max_price 
         FROM room 
         WHERE pg_id = ?`,
        [pg_id]
      );
      
      let price_str = "";
      if (priceRows.length > 0) {
        const p = priceRows[0];
        price_str = `₹${p.min_price} - ₹${p.max_price}`;
      }
      
      // Add to response array
      response.push({
        id: pg_id,
        name: pg_name,
        address: address_str,
        image: image_path,
        price: price_str,
        savedOn: saved_on
      });
    }
    
    res.json({
      status: "success",
      savedPGs: response
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