// routes/getPGDetails.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/getPG_Details', async (req, res) => {
  try {
    // Check headers
    const ownerId = req.headers.owner_id;
    let pgId = req.headers.pg_id;
    
    if (!ownerId && !pgId) {
      return res.status(400).json({ 
        status: "error", 
        message: "Invalid or missing owner_id or pg_id" 
      });
    }
    
    const response = [];

    // Main PG query
    if(pgId){
    var pgQuery = "SELECT * FROM pg WHERE owner_id = ? AND pg_id = ?";
    
    }else{
    var pgQuery = "SELECT * FROM pg WHERE owner_id = ? OR pg_id = ?";
    }
    const [pgResults] = await pool.query(pgQuery, [ownerId , pgId || null]);
    
    if (pgResults.length > 0) {
      for (const row of pgResults) {
        // Get address details
        const addressId = row.address_id;
        const addressQuery = "SELECT * FROM address WHERE address_id = ?";
        const [addressResults] = await pool.query(addressQuery, [addressId]);
        
        let address = "";
        let residenceName = "";
        let street = "";
        let area = "";
        let city = "";
        let state = "";
        let zip = "";
        
        if (addressResults.length > 0) {
          const addressRow = addressResults[0];
          address = `${addressRow.residence_name},${addressRow.street},${addressRow.area},${addressRow.city},${addressRow.state},${addressRow.zip}`;
          residenceName = addressRow.residence_name;
          street = addressRow.street;
          area = addressRow.area;
          city = addressRow.city;
          state = addressRow.state;
          zip = addressRow.zip;
        }
        
        // Get PG images
        pgId = row.pg_id;
        const imageQuery = "SELECT image_path FROM images WHERE pg_id = ? AND room_id IS NULL";
        const [imageResults] = await pool.query(imageQuery, [pgId]);
        
        const imagePaths = [];
        if (imageResults.length > 0) {
          for (const imageRow of imageResults) {
            imagePaths.push(imageRow.image_path);
          }
        }
        
        // Get PG facilities
        const pgFacilityQuery = `
          SELECT food, free_wifi, library, parking, lift, daily_cleaning, tv_lounge,
          laundry, ironing, kitchen, dining_Area, gym, ground, cafeteria, swimming_pool,
          game_zone, cab_facility, _24_x_7_water, _24_x_7_electricity, hot_water, ro_purifier,
          water_cooler, cctv, security_warden, medical_services 
          FROM pg_facilities 
          WHERE pg_id = ?
        `;
        const [pgFacilityResults] = await pool.query(pgFacilityQuery, [pgId]);
        
        let pgFacilityRow = null;
        let selectedAmenities = [];
        
        if (pgFacilityResults.length > 0) {
          pgFacilityRow = pgFacilityResults[0];
          
          // Get amenities with value "1"
          const pgAmenities = [];
          for (const [key, value] of Object.entries(pgFacilityRow)) {
            if (value === 1 || value === "1") {
              pgAmenities.push(key);
            }
          }
          
          // Get first 4 amenities
          selectedAmenities = pgAmenities.slice(0, 4);
        }
        
        // Get price range
        const priceRangeQuery = "SELECT MIN(rent) AS min_price, MAX(rent) AS max_price FROM room WHERE pg_id = ?";
        const [priceRangeResults] = await pool.query(priceRangeQuery, [pgId]);
        
        let minPrice = 0;
        let maxPrice = 0;
        let price = "";
        
        if (priceRangeResults.length > 0) {
          const priceRangeRow = priceRangeResults[0];
          minPrice = priceRangeRow.min_price;
          maxPrice = priceRangeRow.max_price;
          price = `₹${minPrice} - ₹${maxPrice}`;
        }
        
        // Get PG rules
        const pgRulesQuery = "SELECT * FROM rules WHERE pg_id = ?";
        const [pgRulesResults] = await pool.query(pgRulesQuery, [pgId]);
        
        let pgRulesRow = null;
        if (pgRulesResults.length > 0) {
          pgRulesRow = pgRulesResults[0];
        }
        
        // Get other charges
        const pgChargesQuery = "SELECT * FROM other_charges WHERE pg_id = ?";
        const [pgChargesResults] = await pool.query(pgChargesQuery, [pgId]);
        
        let pgChargesRow = null;
        if (pgChargesResults.length > 0) {
          pgChargesRow = pgChargesResults[0];
        }
        
        // Get room details
        const roomDetailsQuery = "SELECT * FROM room WHERE pg_id = ?";
        const [roomDetailsResults] = await pool.query(roomDetailsQuery, [pgId]);
        
        const rooms = [];
        let availability = 0;
        
        if (roomDetailsResults.length > 0) {
          for (const roomDetailsRow of roomDetailsResults) {
            const roomId = roomDetailsRow.room_id;
            availability += roomDetailsRow.available_room;
            
            // Get room images
            const roomImageQuery = "SELECT * FROM images WHERE pg_id = ? AND room_id = ?";
            const [roomImageResults] = await pool.query(roomImageQuery, [pgId, roomId]);
            
            const roomImages = [];
            if (roomImageResults.length > 0) {
              for (const roomImageRow of roomImageResults) {
                roomImages.push(roomImageRow.image_path);
              }
            }
            
            // Get room facilities
            const roomFacilityQuery = "SELECT * FROM room_facilities WHERE room_id = ?";
            const [roomFacilityResults] = await pool.query(roomFacilityQuery, [roomId]);
            
            if (roomFacilityResults.length > 0) {
              for (const roomFacilityRow of roomFacilityResults) {
                rooms.push({
                  ...roomDetailsRow,
                  room_facilities: roomFacilityRow,
                  images: roomImages
                });
              }
            }
          }
        }
        
        // Combine all data
        response.push({
          ...row,
          address,
          amenities: selectedAmenities,
          price,
          availability,
          images: imagePaths,
          pg_facilities: pgFacilityRow,
          rules_in_pg: pgRulesRow,
          other_charges: pgChargesRow,
          rooms,
          residence_name: residenceName,
          street,
          area,
          city,
          state,
          zip
        });
      }
    }
    
    res.json({ status: "success", owner: response });
  } catch (error) {
    console.error("Error fetching PG details:", error);
    res.status(500).json({
      status: "error",
      message: "Server error",
      error: error.message
    });
  }
});

module.exports = router;