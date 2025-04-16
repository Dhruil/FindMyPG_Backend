// routes/deletePG.js
require('dotenv').config();
const express = require('express');
const router = express.Router();
const pool = require('../db');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Helper function to extract public_id from Cloudinary URL
function getPublicIdFromUrl(url) {
  try {
    // Example URL: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/findmypg/pgImages/abcdef
    const regex = /\/v\d+\/(.+?)(?:\.[^.]+)?$/;
    const match = url.match(regex);
    return match ? match[1] : null;
  } catch (error) {
    console.error("Error extracting public_id:", error);
    return null;
  }
}

/**
 * Delete a PG or a room based on the provided ID
 * Deletes associated images from both database and Cloudinary
 * @route DELETE /delete_pg_room
 * @param {string} req.headers.id - ID of the PG/room to delete
 * @returns {Object} Success message or error
 */
router.post('/deletePG', async (req, res) => {
  try {
    // Check if PG ID is provided in headers
    const pgId = req.headers.id;
    if (!pgId) {
      return res.status(400).json({
        status: "error",
        message: "Invalid or missing PG ID"
      });
    }

    console.log("Deleting PG with ID:", pgId);
    var temp = 1;
    // First get all images associated with this PG or its rooms
    var [images] = await pool.query('SELECT image_path FROM images WHERE room_id = ?', [pgId]);

    if (images.length == 0) {
      var [images] = await pool.query('SELECT image_path FROM images WHERE pg_id = ?', [pgId]);
      var temp = 0;
    }

    // Delete images from Cloudinary
    const deletedImages = [];
    const failedImages = [];

    if (images && images.length > 0) {
      for (const image of images) {
        const imageUrl = image.image_path;
        const publicId = getPublicIdFromUrl(imageUrl);

        if (publicId) {
          try {
            const result = await cloudinary.uploader.destroy(publicId);
            if (result.result === 'ok') {
              deletedImages.push(imageUrl);
            } else {
              failedImages.push(imageUrl);
            }
          } catch (cloudinaryError) {
            console.error("Cloudinary delete error:", cloudinaryError);
            failedImages.push(imageUrl);
          }
        }
      }
    }

    // Delete images from database
    if (temp) {
      await pool.query('DELETE FROM images WHERE room_id = ?', [pgId]);
      await pool.query('DELETE FROM room WHERE room_id = ?', [pgId]);
      await pool.query('DELETE  FROM room_facilities room_id = ?', [pgId]);
    } else {
      await pool.query('DELETE FROM images WHERE pg_id = ?', [pgId]);


      // Delete from saved_pgs if applicable
      await pool.query('DELETE FROM saved_pgs WHERE pg_id = ?', [pgId]);

      // Delete from room_facilities
      await pool.query('DELETE  FROM room_facilities rf JOIN room r ON rf.room_id = r.room_id WHERE r.pg_id = ?', [pgId]);

      // Delete rooms
      await pool.query('DELETE FROM room WHERE pg_id = ?', [pgId]);

      // Delete PG facilities
      await pool.query('DELETE FROM pg_facilities WHERE pg_id = ?', [pgId]);

      // Delete rules
      await pool.query('DELETE FROM rules WHERE pg_id = ?', [pgId]);

      // Delete other_charges
      await pool.query('DELETE FROM other_charges WHERE pg_id = ?', [pgId]);

      // Get address_id before deleting PG
      const [pgData] = await pool.query('SELECT address_id FROM pg WHERE pg_id = ?', [pgId]);
      const addressId = pgData && pgData.length > 0 ? pgData[0].address_id : null;

      // Delete PG record
      await pool.query('DELETE FROM pg WHERE pg_id = ?', [pgId]);

      // Delete address if we found an address_id
      if (addressId) {
        await pool.query('DELETE FROM address WHERE address_id = ?', [addressId]);
      }
    }
    res.json({
      status: "success",
      message: `PG with ID ${pgId} deleted successfully.`,
      images_deleted: deletedImages.length,
      failed_image_deletions: failedImages.length
    });
  }
  catch (error) {
    console.error("Error in delete operation:", error);
    res.status(500).json({
      status: "error",
      message: "Error: " + error.message
    });
  }
});

module.exports = router;