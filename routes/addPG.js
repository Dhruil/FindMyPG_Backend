// routes/addPG.js
require('dotenv').config();
const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure CloudinaryStorage for PG images
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'findmypg/pgImages',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    transformation: [{ width: 1000, crop: 'limit' }] // Optimize images
  }
});

// Create multer upload instance with file filter for images
const upload = multer({
  storage: storage,
  fileFilter: function(req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(file.originalname.toLowerCase().split('.').pop());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Changed from upload.array('images') to upload.array('images[]') to match React component
router.post('/addPG', upload.array('images[]'), async (req, res) => {
  // Create a connection for transaction
  const connection = await pool.getConnection();
  
  try {
    // Start transaction
    await connection.beginTransaction();
    
    // Parse data from form
    const data = JSON.parse(req.body.data);
    
    // Extract basic PG info
    const pgId = data.pg_id;
    const ownerId = data.owner_id;
    const pgName = data.pg_name;
    const addressId = data.address_id;
    const residenceName = data.residence_name;
    const street = data.street;
    const area = data.area;
    const city = data.city;
    const state = data.state;
    const zip = data.zip;
    const mapLocation = data.map_location;
    const description = data.description;
    const operatingSince = data.operating_since ? new Date(data.operating_since).toISOString().split('T')[0] : null; // Format as YYYY-MM-DD
    
    // Insert address
    const addressQuery = `
      INSERT INTO address (address_id, residence_name, street, area, city, state, zip)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    await connection.query(addressQuery, [
      addressId, residenceName, street, area, city, state, zip
    ]);
    
    // Insert PG details
    const pgQuery = `
      INSERT INTO pg (pg_id, owner_id, pg_name, address_id, map_location, description, operating_since)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    await connection.query(pgQuery, [
      pgId, ownerId, pgName, addressId, mapLocation, description, operatingSince
    ]);
    
    // Handle uploaded images
    const uploadedImages = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        // Cloudinary URL is available in file.path
        const imageUrl = file.path;
        uploadedImages.push(imageUrl);
        
        // Insert image path into database
        const imageQuery = `
          INSERT INTO images (pg_id, image_path)
          VALUES (?, ?)
        `;
        await connection.query(imageQuery, [pgId, imageUrl]);
      }
    }
    
    // Insert PG Facilities
    const facilities = data.pg_facilities;
    if (facilities) {
      const facilityColumns = Object.keys(facilities);
      const facilityValues = facilityColumns.map(key => facilities[key] ? 1 : 0);
      
      const facilityQuery = `
        INSERT INTO pg_facilities (pg_id, ${facilityColumns.join(', ')})
        VALUES (?, ${facilityColumns.map(() => '?').join(', ')})
      `;
      await connection.query(facilityQuery, [pgId, ...facilityValues]);
    }
    
    // Insert PG Rules
    const rules = data.rules_in_pg;
    if (rules) {
      const ruleColumns = Object.keys(rules);
      const ruleValues = ruleColumns.map(key => {
        const value = rules[key];
        return typeof value === 'boolean' ? (value ? 1 : 0) : value;
      });
      
      const ruleQuery = `
        INSERT INTO rules (pg_id, ${ruleColumns.join(', ')})
        VALUES (?, ${ruleColumns.map(() => '?').join(', ')})
      `;
      await connection.query(ruleQuery, [pgId, ...ruleValues]);
    }
    
    // Insert Other Charges
    const charges = data.other_charges;
    if (charges) {
      const chargeColumns = Object.keys(charges);
      const chargeValues = chargeColumns.map(key => {
        // Convert empty strings to NULL for numeric fields
        if (charges[key] === '' && ['electricity', 'laundry', 'food', 'deposit_amount', 'notice_period'].includes(key)) {
          return 0;
        }
        return charges[key];
      });
        
      const chargeQuery = `
        INSERT INTO other_charges (pg_id, ${chargeColumns.join(', ')})
        VALUES (?, ${chargeColumns.map(() => '?').join(', ')})
      `;
      await connection.query(chargeQuery, [pgId, ...chargeValues]);
    }
    
    // Commit transaction
    await connection.commit();
    
    res.json({
      status: "success",
      message: "PG details inserted successfully",
      uploaded_images: uploadedImages
    });
    
  } catch (error) {
    // Rollback transaction on error
    await connection.rollback();
    
    console.error("Error adding PG:", error);
    res.status(500).json({
      status: "error",
      message: "Server error",
      error: error.message
    });
  } finally {
    // Release connection
    connection.release();
  }
});

module.exports = router;