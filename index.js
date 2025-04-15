// server.js
const express = require('express');
const cors = require('cors');
const getPGs = require('./routes/getPGs');
const postBookingRoute = require('./routes/postBooking');
const getBookingsRouter = require('./routes/getBookings');
const getOwnerBookingsRouter = require('./routes/getOwnerBookings');
const getSavedPGsRouter = require('./routes/getSavedPGs');
const unsavePGRouter = require('./routes/unsavePG');
const savePGRouter = require('./routes/savePG');
const addPGRouter = require('./routes/addPG');
const addRoomRoutes = require('./routes/addRoom');
const registerRouter = require('./routes/register');
const savedPgRoutes = require('./routes/getSavedPgDetails');
const userUpdateRoutes = require('./routes/updateUser');
const bookingStatusRoute = require('./routes/updateBookingStatus');
const loginRoutes = require('./routes/login');
const ownerRoutes = require('./routes/getOwners');
const userRoutes = require('./routes/getUsers');
const pgDetailsRoutes = require('./routes/getPGDetails');
const updatePGRouter = require('./routes/updatePG');
const updateRoomRouter = require('./routes/updateRoom');
const deletePGRouter = require('./routes/deletePG');
const updateOwnerRoutes =require('./routes/updateOwner');
const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api', getPGs);
app.use('/api', postBookingRoute); // your route will be /api/bookings
app.use('/api', getBookingsRouter);
app.use('/api', getOwnerBookingsRouter);
app.use('/api', getSavedPGsRouter);
app.use('/api', unsavePGRouter);
app.use('/api', savePGRouter);
app.use('/api', addPGRouter);
app.use('/api', addRoomRoutes);
app.use('/api', registerRouter);
app.use('/api', savedPgRoutes);
app.use('/api', userUpdateRoutes);
app.use('/api', bookingStatusRoute);
app.use('/api', loginRoutes);
app.use('/api', ownerRoutes);
app.use('/api', userRoutes);
app.use('/api', pgDetailsRoutes);
app.use('/api', updatePGRouter);
app.use('/api', updateRoomRouter);
app.use('/api', deletePGRouter);
app.use('/api', updateOwnerRoutes);
app.use('/uploads', express.static('uploads'));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
