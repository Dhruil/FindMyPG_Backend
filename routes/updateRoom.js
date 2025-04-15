// routes/updateRoom.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Set up multer for file uploads
const uploadDir = 'uploads/roomImages/';

// Create upload directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '_' + file.originalname);
  }
});

// Handle files with array field name notation
const upload = multer({ storage: storage });

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
    const baseUrl = `${req.protocol}://${req.get('host')}/`;
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
        const imgUrl = baseUrl + file.path;
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

            // Remove file from system
            const filePath = imageUrl.replace(baseUrl, '');
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              deletedImages.push(filePath);
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