// routes/deletePGRoom.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

/**
 * Delete a PG or a room based on the provided ID
 * If PG deletion fails, attempts to delete the room instead
 * @route DELETE /delete_pg_room
 * @param {string} req.headers.id - ID of the PG/room to delete
 * @returns {Object} Success message or error
 */
router.post('/deletePG', async (req, res) => {
  // try {
  //   // Check if ID is provided in headers
  //   const id = req.headers.id;
  //   if (!id) {
  //     return res.status(400).json({
  //       status: "error",
  //       message: "Invalid or missing ID"
  //     });
  //   }

  //   console.log("Attempting to delete with ID:", id);
    
  //   let isDeleted = false;
  //   let message = "";
    
  //   // First try to delete from PG table
  //   try {
  //     const [pgResult] = await pool.query('DELETE FROM pg WHERE pg_id = ?', [id]);
      
  //     if (pgResult.affectedRows > 0) {
  //       isDeleted = true;
  //       message = `PG with ID ${id} deleted successfully.`;
  //     }
  //   } catch (pgError) {
  //     console.log("PG deletion failed, attempting room deletion:", pgError.message);
  //     // PG deletion failed, continue to room deletion
  //   }
    
  //   // If PG deletion didn't succeed, try to delete from room table
  //   if (!isDeleted) {
  //     try {
  //       const [roomResult] = await pool.query('DELETE FROM room WHERE room_id = ?', [id]);
        
  //       if (roomResult.affectedRows > 0) {
  //         isDeleted = true;
  //         message = `Room with ID ${id} deleted successfully.`;
  //       }
  //     } catch (roomError) {
  //       console.error("Room deletion failed:", roomError);
  //       // If both deletions failed, throw error
  //       if (!isDeleted) {
  //         return res.status(404).json({
  //           status: "error",
  //           message: "No matching PG or room found with the provided ID."
  //         });
  //       }
  //     }
  //   }
    
  //   // If either deletion succeeded
  //   if (isDeleted) {
  //     res.json({
  //       status: "success", 
  //       message: message
  //     });
  //   } else {
  //     res.status(404).json({
  //       status: "error",
  //       message: "No records found to delete with the provided ID."
  //     });
  //   }
  // } 
  
  try {
    // Check if PG ID is provided in headers
    const pgId = req.headers.id;
    if (!pgId) {
      return res.status(400).json({
        status: "error",
        message: "Invalid or missing PG ID"
      });
    }

    console.log("Deleting PG with ID:", pgId); // Log the ID for debugging
    await pool.query('DELETE FROM saved_pgs WHERE pg_id = ?', [pgId]);
    // Delete PG record
    await pool.query('DELETE FROM pg WHERE pg_id = ?', [pgId]);
    
    // Delete associated room records
    await pool.query('DELETE FROM room WHERE room_id = ?', [pgId]);
    
    res.json({
      status: "success", 
      message: `PG with ID ${pgId} deleted successfully.`
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