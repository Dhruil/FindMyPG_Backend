// routes/getPGs.js
const express = require('express');
const router = express.Router();
const pool = require('../db');

router.get('/getData', async (req, res) => {
  try {
    const [pgs] = await pool.query('SELECT * FROM pg');

    const response = await Promise.all(pgs.map(async (pg) => {
      const [[addressRow]] = await pool.query('SELECT * FROM address WHERE address_id = ?', [pg.address_id]);
      const [[ownerRow]] = await pool.query('SELECT * FROM owner WHERE owner_id = ?', [pg.owner_id]);
      const [imageRows] = await pool.query('SELECT image_path FROM images WHERE pg_id = ? AND room_id IS NULL', [pg.pg_id]);

      const image_path = [...new Set(imageRows.map(img => img.image_path))];

      const [[facilityRow]] = await pool.query('SELECT * FROM pg_facilities WHERE pg_id = ?', [pg.pg_id]) || [{}];
      const amenities = Object.entries(facilityRow || {})
        .filter(([key, value]) => value == 1)
        .map(([key]) => key)
        .slice(0, 4);

      const [[priceRow]] = await pool.query('SELECT MIN(rent) AS min_price, MAX(rent) AS max_price FROM room WHERE pg_id = ?', [pg.pg_id]);
      const price = `₹${priceRow.min_price} - ₹${priceRow.max_price}`;

      const [[rulesRow]] = await pool.query('SELECT * FROM rules WHERE pg_id = ?', [pg.pg_id]) || [{}];
      const [[chargesRow]] = await pool.query('SELECT * FROM other_charges WHERE pg_id = ?', [pg.pg_id]) || [{}];

      const [roomRows] = await pool.query('SELECT * FROM room WHERE pg_id = ?', [pg.pg_id]);

      let availability = 0;
      const rooms = await Promise.all(roomRows.map(async (room) => {
        availability += room.available_room;

        const [roomImages] = await pool.query('SELECT image_path FROM images WHERE pg_id = ? AND room_id = ?', [pg.pg_id, room.room_id]);
        const [facilityRows] = await pool.query('SELECT * FROM room_facilities WHERE room_id = ?', [room.room_id]);

        return {
          ...room,
          images: roomImages.map(r => r.image_path),
          room_facilities: facilityRows[0] || {}
        };
      }));

      return {
        ...pg,
        owner: ownerRow,
        address: `${addressRow.residence_name}, ${addressRow.street}, ${addressRow.area}, ${addressRow.city}, ${addressRow.state}, ${addressRow.zip}`,
        amenities,
        price,
        availability,
        images: image_path,
        pg_facilities: facilityRow || {},
        rules_in_pg: rulesRow || {},
        other_charges: chargesRow || {},
        rooms,
        residence_name: addressRow.residence_name,
        street: addressRow.street,
        area: addressRow.area,
        city: addressRow.city,
        state: addressRow.state,
        zip: addressRow.zip
      };
    }));

    res.json({ status: 'success', owner: response });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message || 'No details available' });
  }
});

module.exports = router;
