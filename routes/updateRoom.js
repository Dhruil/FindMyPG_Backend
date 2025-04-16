// routes/updateRoom.js
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

// Handle files with array field name notation
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Helper function to extract public_id from Cloudinary URL
function getPublicIdFromUrl(url) {
  try {
    // Example URL: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/findmypg/roomImages/abcdef
    const regex = /\/v\d+\/(.+?)(?:\.[^.]+)?$/;
    const match = url.match(regex);
    return match ? match[1] : null;
  } catch (error) {
    console.error("Error extracting public_id:", error);
    return null;
  }
}

/**
 * Update room details, facilities and handle image uploads/deletions
 * @route POST /update_room
 * @param {object} req.body.data - JSON string containing room details
 * @param {array} req.body.RmRoomImages - JSON string of image URLs to delete
 * @param {array} req.files - Image files to upload with field name 'RoomImages[]'
 * @returns {Object} Success message or error
 */
router.post('/updateRoom', upload.array('RoomImages[]'), async (req, res) => {
  try {
    // Process main data update
    if (!req.body.data) {
      return res.status(400).json({
        status: "error",
        message: "Room data not provided"
      });
    }

    let data;
    try {
      data = JSON.parse(req.body.data);
    } catch (parseError) {
      console.error("Error parsing data:", parseError);
      return res.status(400).json({
        status: "error",
        message: "Invalid JSON data format"
      });
    }
    
    if (!data.pg_id || !data.room_id) {
      return res.status(400).json({
        status: "error",
        message: "PG ID or Room ID not provided"
      });
    }

    const pgId = data.pg_id;
    const roomId = data.room_id;
    const results = { status: "success" };

    // Update room details
    await pool.query(
      `UPDATE room SET 
      room_type = ?, 
      available_room = ?,
      room_size = ?, 
      person_type = ?, 
      gender = ?, 
      no_of_rooms = ?, 
      rent = ? 
      WHERE room_id = ?`,
      [
        data.room_type,
        data.available_room,
        data.room_size,
        data.person_type,
        data.gender,
        data.no_of_rooms,
        data.rent,
        roomId
      ]
    );

    // Update room facilities if provided
    if (data.room_facilities) {
      await pool.query(
        `UPDATE room_facilities SET 
        ac = ?,
        tv = ?,
        wifi = ?,
        fridge = ?,
        attached_bathroom = ?,
        attached_toilets = ?,
        balcony = ?,
        wardrobe = ?,
        safety_locker = ?,
        study_table = ?,
        mattress = ?,
        bed_sheets = ?,
        pillows = ?
        WHERE room_id = ?`,
        [
          data.room_facilities.ac ? 1 : 0,
          data.room_facilities.tv ? 1 : 0,
          data.room_facilities.wifi ? 1 : 0,
          data.room_facilities.fridge ? 1 : 0,
          data.room_facilities.attached_bathroom ? 1 : 0,
          data.room_facilities.attached_toilets ? 1 : 0,
          data.room_facilities.balcony ? 1 : 0,
          data.room_facilities.wardrobe ? 1 : 0,
          data.room_facilities.safety_locker ? 1 : 0,
          data.room_facilities.study_table ? 1 : 0,
          data.room_facilities.mattress ? 1 : 0,
          data.room_facilities.bed_sheets ? 1 : 0,
          data.room_facilities.pillows ? 1 : 0,
          roomId
        ]
      );
    }

    // Handle file uploads if any
    const uploadedImages = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        // Cloudinary URL is available in file.path
        const imgUrl = file.path;
        uploadedImages.push(imgUrl);
        
        // Insert image into database
        await pool.query(
          'INSERT INTO images (pg_id, room_id, image_path) VALUES (?, ?, ?)',
          [pgId, roomId, imgUrl]
        );
      }
      results.uploaded_images = uploadedImages;
    }

    // Handle image deletion if any
    if (req.body.RmRoomImages) {
      try {
        const rmImages = JSON.parse(req.body.RmRoomImages);
        const deletedImages = [];

        if (rmImages && rmImages.length > 0) {
          for (const imageUrl of rmImages) {
            // Remove from database
            await pool.query(
              'DELETE FROM images WHERE image_path = ?',
              [imageUrl]
            );

            // Delete from Cloudinary
            const publicId = getPublicIdFromUrl(imageUrl);
            if (publicId) {
              try {
                const result = await cloudinary.uploader.destroy(publicId);
                if (result.result === 'ok') {
                  deletedImages.push(imageUrl);
                }
              } catch (cloudinaryError) {
                console.error("Cloudinary delete error:", cloudinaryError);
                // Continue execution even if Cloudinary delete fails
              }
            }
          }
          results.deleted = deletedImages;
        }
      } catch (parseError) {
        console.error("Error parsing RmRoomImages:", parseError);
        // Continue execution even if image deletion fails
      }
    }

    results.message = "Room details updated successfully";
    res.json(results);
  } catch (error) {
    console.error("Error updating room:", error);
    res.status(500).json({
      status: "error", 
      message: "Error: " + error.message
    });
  }
});

module.exports = router;