// routes/updatePG.js
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
    // Example URL: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/findmypg/pgImages/abcdef
    const regex = /\/v\d+\/(.+?)(?:\.[^.]+)?$/;
    const match = url.match(regex);
    return match ? match[1] : null;
  } catch (error) {
    console.error("Error extracting public_id:", error);
    return null;
  }
}

// Helper function to format date for MySQL
function formatDateForMySQL(dateString) {
  if (!dateString) return null;
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    
    return date.toISOString().slice(0, 10); // Format as YYYY-MM-DD
  } catch (error) {
    console.error("Date formatting error:", error);
    return null;
  }
}

/**
 * Update PG details, address, facilities, rules, charges and handle image uploads/deletions
 * @route POST /update_pg
 * @param {object} req.body.data - JSON string containing PG details
 * @param {array} req.body.RmImages - JSON string of image URLs to delete
 * @param {array} req.files - Image files to upload with field name 'PgImages[]'
 * @returns {Object} Success message or error
 */
router.post('/updatePG', upload.array('PgImages[]'), async (req, res) => {
  try {
    // Check if PG ID is provided in headers
    const pgId = req.headers.pg_id;
    if (!pgId) {
      return res.status(400).json({
        status: "error",
        message: "Invalid or missing PG ID"
      });
    }

    const uploadedImages = [];
    const results = { status: "success" };

    // Handle file uploads if any
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        // Cloudinary URL is available in file.path
        const imgUrl = file.path;
        uploadedImages.push(imgUrl);
        
        // Insert image into database
        await pool.query(
          'INSERT INTO images (pg_id, image_path) VALUES (?, ?)',
          [pgId, imgUrl]
        );
      }
      results.uploaded_images = uploadedImages;
    }

    // Handle image deletion if any
    if (req.body.RmImages) {
      try {
        const rmImages = JSON.parse(req.body.RmImages);
        const deletedImages = [];

        if (rmImages && rmImages.length > 0) {
          for (const imageUrl of rmImages) {
            // Remove from database first
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
        console.error("Error parsing RmImages:", parseError);
        // Continue execution even if image deletion fails
      }
    }

    // Process main data update
    if (req.body.data) {
      try {
        const data = JSON.parse(req.body.data);
        
        if (!data.pg_id) {
          return res.status(400).json({
            status: "error",
            message: "PG ID not provided in data"
          });
        }

        // Update address
        await pool.query(
          `UPDATE address SET 
          residence_name = ?, 
          street = ?,
          area = ?,
          city = ?,
          state = ?,
          zip = ?
          WHERE address_id = ?`,
          [
            data.residence_name,
            data.street,
            data.area,
            data.city,
            data.state,
            data.zip,
            data.address_id
          ]
        );

        // Format date to MySQL compatible format
        const operatingSince = formatDateForMySQL(data.operating_since);

        // Update PG details
        await pool.query(
          `UPDATE pg SET 
          pg_name = ?,
          description = ?,
          operating_since = ?
          WHERE pg_id = ?`,
          [
            data.pg_name,
            data.description,
            operatingSince,
            data.pg_id
          ]
        );

        // Update PG facilities
        if (data.pg_facilities) {
          // Building dynamic SQL for facilities update
          const facilityKeys = Object.keys(data.pg_facilities);
          if (facilityKeys.length > 0) {
            const facilityUpdates = facilityKeys.map(key => `${key} = ?`).join(', ');
            const facilityValues = facilityKeys.map(key => data.pg_facilities[key]);
            facilityValues.push(data.pg_id);
            
            await pool.query(
              `UPDATE pg_facilities SET ${facilityUpdates} WHERE pg_id = ?`,
              facilityValues
            );
          }
        }

        // Update PG rules
        if (data.rules_in_pg) {
          await pool.query(
            `UPDATE rules SET 
            visitor_allowed = ?,
            non_veg = ?,
            other_gender = ?,
            smoking = ?,
            drinking = ?,
            party = ?,
            gate_close_time = ?
            WHERE pg_id = ?`,
            [
              data.rules_in_pg.visitor_allowed,
              data.rules_in_pg.non_veg,
              data.rules_in_pg.other_gender,
              data.rules_in_pg.smoking,
              data.rules_in_pg.drinking,
              data.rules_in_pg.party,
              data.rules_in_pg.gate_close_time,
              data.pg_id
            ]
          );
        }

        // Update other charges
        if (data.other_charges) {
          const charges = data.other_charges;
          
          await pool.query(
            `UPDATE other_charges SET 
            electricity = ?,
            laundry = ?,
            food = ?,
            deposit_amount = ?,
            refundable = ?,
            notice_period = ?
            WHERE pg_id = ?`,
            [
              charges.electricity !== "" ? charges.electricity : null,
              charges.laundry !== "" ? charges.laundry : null,
              charges.food !== "" ? charges.food : null,
              charges.deposit_amount !== "" ? charges.deposit_amount : null,
              charges.refundable,
              charges.notice_period !== "" ? charges.notice_period : null,
              data.pg_id
            ]
          );
        }

        results.message = "PG details updated successfully";
      } catch (parseError) {
        console.error("Error parsing data:", parseError);
        return res.status(400).json({
          status: "error",
          message: "Invalid JSON data format"
        });
      }
    }

    res.json(results);
  } catch (error) {
    console.error("Error updating PG:", error);
    res.status(500).json({
      status: "error",
      message: "Error: " + error.message
    });
  }
});

module.exports = router;