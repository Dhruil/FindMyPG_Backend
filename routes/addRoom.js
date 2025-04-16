// routes/addRoom.js
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

// Configure CloudinaryStorage for room images
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'findmypg/roomImages',
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

router.post('/addRoom', upload.array('images[]'), async (req, res) => {
  // Create a connection for transaction
  const connection = await pool.getConnection();
  
  try {
    // Start transaction
    await connection.beginTransaction();
    
    // Parse data from form
    const data = JSON.parse(req.body.data);
    console.log('Received data:', data);
    
    // Extract room info
    const pgId = data.pg_id;
    const roomType = data.room_type;
    const availableRoom = data.available_room;
    const roomSize = data.room_size;
    const personType = data.person_type;
    const gender = data.gender;
    const noOfRooms = data.no_of_rooms;
    const rent = data.rent;
    
    // Validate required fields
    if (!roomType || !roomSize || !personType || !gender || !noOfRooms || !rent) {
      return res.status(400).json({
        status: "error",
        message: "Missing required fields"
      });
    }
    
    // Insert room details
    const roomQuery = `
      INSERT INTO room (pg_id, room_type, available_room, room_size, person_type, gender, no_of_rooms, rent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const roomResult = await connection.query(roomQuery, [
      pgId, roomType, availableRoom, roomSize, personType, gender, noOfRooms, rent
    ]);
    
    // Get the inserted room ID
    const roomId = roomResult[0].insertId;
    
    // Insert room facilities if provided
    const facilities = data.room_facilities;
    if (facilities) {
      // Create an array of facility names
      const facilityColumns = [
        'ac', 'tv', 'wifi', 'fridge', 'attached_bathroom', 'attached_toilets', 
        'balcony', 'wardrobe', 'safety_locker', 'study_table', 'mattress', 
        'bed_sheets', 'pillows'
      ];
      
      // Map values (convert to 0/1)
      const facilityValues = facilityColumns.map(key => facilities[key] ? 1 : 0);
      
      // Build the query
      const facilityQuery = `
        INSERT INTO room_facilities (room_id, ${facilityColumns.join(', ')})
        VALUES (?, ${facilityColumns.map(() => '?').join(', ')})
      `;
      
      await connection.query(facilityQuery, [roomId, ...facilityValues]);
    }
    
    // Handle uploaded images
    const uploadedImages = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        // Cloudinary URL is available in file.path
        const imageUrl = file.path;
        uploadedImages.push(imageUrl);
        
        // Insert image path into database
        const imageQuery = `
          INSERT INTO images (pg_id, room_id, image_path)
          VALUES (?, ?, ?)
        `;
        await connection.query(imageQuery, [pgId, roomId, imageUrl]);
      }
    }
    
    // Commit transaction
    await connection.commit();
    
    res.json({
      status: "success",
      message: "Room details added successfully",
      room_id: roomId,
      uploaded_images: uploadedImages
    });
    
  } catch (error) {
    // Rollback transaction on error
    await connection.rollback();
    
    console.error("Error adding room:", error);
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