// routes/updateUser.js
const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file upload
const uploadDir = 'uploads/users/';

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '_' + file.originalname);
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

// Configure upload
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 5 // 5MB max file size
  }
});

// Update user route with file upload
router.post('/updateUser', upload.single('avatar'), async (req, res) => {
  try {
    // Validate input
    const { id, name, phone, email, password, gender } = req.body;
    
    if (!id || !name || !phone || !email || !password || !gender) {
      return res.status(400).json({
        status: "error",
        message: "Missing required fields"
      });
    }
    
    // Build update data object
    const updateData = {
      name,
      phone,
      email,
      password,
      gender
    };
    
    // Handle avatar if uploaded
    if (req.file) {
      // Create URL for the uploaded file (adjust based on your server setup)
      const baseUrl = req.protocol + '://' + req.get('host');
      const profileImageUrl = baseUrl + '/' + req.file.path;
      
      // Add to update data
      updateData.profile_image = profileImageUrl;
    }
    
    // Create placeholders for query
    const placeholders = Object.keys(updateData)
      .map(key => `${key} = ?`)
      .join(', ');
    
    // Create query parameters array
    const queryParams = [...Object.values(updateData), id];
    
    // Update user
    const [result] = await pool.query(
      `UPDATE users SET ${placeholders} WHERE user_id = ?`,
      queryParams
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        status: "error",
        message: "User not found or no changes made"
      });
    }
    
    // Fetch updated user
    const [userRows] = await pool.query(
      'SELECT * FROM users WHERE user_id = ?',
      [id]
    );
    
    if (userRows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "User updated, but fetch failed"
      });
    }
    
    res.json({
      status: "success",
      message: "User updated successfully",
      user: userRows[0]
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      status: "error",
      message: "Update failed: " + error.message
    });
  }
});

module.exports = router;