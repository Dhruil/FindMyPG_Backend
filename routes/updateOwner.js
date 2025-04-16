require('dotenv').config();
// routes/updateOwner.js
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

// Configure CloudinaryStorage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'findmypg/owners',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }]
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Accept images only
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
    return cb(new Error('Only image files are allowed!'), false);
  }
  cb(null, true);
};

// Configure upload with Cloudinary storage
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 5 // 5MB max file size
  }
});

// Update owner route with file upload
router.post('/updateOwner', upload.single('avatar'), async (req, res) => {
  // Start a transaction
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // Extract data from request body
    const { 
      id: owner_id,
      name, 
      mobile, 
      email, 
      password, 
      no_of_pg_hold, 
      gender,
      aadhar_card,
      residence_name, 
      street, 
      area, 
      city, 
      state, 
      zip 
    } = req.body;
    
    // Validate required fields
    if (!owner_id || !name || !mobile || !email || !password || !gender) {
      return res.status(400).json({
        status: "error",
        message: "Missing required fields"
      });
    }
    
    // Handle aadhar_card field properly for MySQL - must be a number or NULL, not the string "null"
    // If it's empty or explicitly "null", use actual NULL value
    const aadharValue = (aadhar_card === "" || aadhar_card === "null" || aadhar_card === null) 
                         ? null 
                         : aadhar_card;
    
    // Update image if uploaded
    if (req.file) {
      // Cloudinary already uploaded the file, we just need to save the URL
      const imageUrl = req.file.path;
      
      // Update image in database
      await connection.query(
        'UPDATE owner SET image = ? WHERE owner_id = ?',
        [imageUrl, owner_id]
      );
    }
    
    // Update owner table
    const [ownerResult] = await connection.query(
      `UPDATE owner 
       SET name = ?, mobile = ?, email = ?, password = ?,
           no_of_pg_hold = ?, gender = ?, aadhar_card = ?
       WHERE owner_id = ?`,
      [name, mobile, email, password, no_of_pg_hold, gender, aadharValue, owner_id]
    );
    
    // Update address table
    const [addressResult] = await connection.query(
      `UPDATE address 
       SET residence_name = ?, street = ?, area = ?, 
           city = ?, state = ?, zip = ?  
       WHERE address_id = (SELECT address_id FROM owner WHERE owner_id = ?)`,
      [residence_name, street, area, city, state, zip, owner_id]
    );
    
    // Fetch updated owner data
    const [ownerRows] = await connection.query(
      `SELECT 
        o.owner_id, o.name AS owner_name, o.mobile, o.email, o.password, o.image,
        o.no_of_pg_hold, o.gender, o.aadhar_card,
        a.residence_name, a.street, a.area, a.city, a.state, a.zip
       FROM owner o
       INNER JOIN address a ON o.address_id = a.address_id
       WHERE o.owner_id = ?`,
      [owner_id]
    );
    
    if (ownerRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        status: "error",
        message: "Owner not found"
      });
    }
    
    // Format owner data
    const owner = {
      id: ownerRows[0].owner_id,
      name: ownerRows[0].owner_name,
      mobile: ownerRows[0].mobile,
      email: ownerRows[0].email,
      password: ownerRows[0].password,
      image: ownerRows[0].image,
      no_of_pg_hold: ownerRows[0].no_of_pg_hold,
      gender: ownerRows[0].gender,
      aadhar_card: ownerRows[0].aadhar_card,
      address: {
        residence_name: ownerRows[0].residence_name,
        street: ownerRows[0].street,
        area: ownerRows[0].area,
        city: ownerRows[0].city,
        state: ownerRows[0].state,
        zip: ownerRows[0].zip
      }
    };
    
    // Commit transaction
    await connection.commit();
    
    res.json({
      status: "success",
      message: "Owner details updated successfully",
      owner: owner
    });
    
  } catch (error) {
    // Rollback in case of error
    await connection.rollback();
    console.error("Update owner error:", error);
    res.status(500).json({
      status: "error",
      message: "Update failed: " + error.message
    });
  } finally {
    // Release connection
    connection.release();
  }
});

module.exports = router;