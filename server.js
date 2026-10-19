require('./src/config/env');
const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { Server } = require('socket.io');

const { connectDB, isMemoryDB } = require('./src/config/db');
const errorHandler = require('./src/middleware/errorHandler');

// Route imports
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const tripRoutes = require('./src/routes/tripRoutes');
const destinationRoutes = require('./src/routes/destinationRoutes');
const itineraryRoutes = require('./src/routes/itineraryRoutes');
const memberRoutes = require('./src/routes/memberRoutes');
const voteRoutes = require('./src/routes/voteRoutes');
const expenseRoutes = require('./src/routes/expenseRoutes');
const settlementRoutes = require('./src/routes/settlementRoutes');
const packingRoutes = require('./src/routes/packingRoutes');
const changeRequestRoutes = require('./src/routes/changeRequestRoutes');
const scenarioRoutes = require('./src/routes/scenarioRoutes');
const diaryRoutes = require('./src/routes/diaryRoutes');
const bookingRoutes = require('./src/routes/bookingRoutes');
const availabilityRoutes = require('./src/routes/availabilityRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const reportRoutes = require('./src/routes/reportRoutes');
const joinRequestRoutes = require('./src/routes/joinRequestRoutes');
const mysteryTripRoutes = require('./src/routes/mysteryTripRoutes');
const wishlistRoutes = require('./src/routes/wishlistRoutes');

const User = require('./src/models/User');
const { seed } = require('./src/utils/seedData');
const { seedOrganisers } = require('./scripts/seedOrganisers');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Attach Socket.io instance to req for controllers
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Serve frontend static files with no-cache headers to ensure browser always loads latest scripts
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/destinations', destinationRoutes);

// Trip nested sub-routes
app.use('/api/trips/:tripId/itinerary', itineraryRoutes);
app.use('/api/trips/:tripId/members', memberRoutes);
app.use('/api/trips/:tripId/votes', voteRoutes);
app.use('/api/trips/:tripId/expenses', expenseRoutes);
app.use('/api/trips/:tripId/settlements', settlementRoutes);
app.use('/api/trips/:tripId/packing', packingRoutes);
app.use('/api/trips/:tripId/change-requests', changeRequestRoutes);
app.use('/api/trips/:tripId/scenarios', scenarioRoutes);
app.use('/api/trips/:tripId/diary', diaryRoutes);
app.use('/api/trips/:tripId/bookings', bookingRoutes);
app.use('/api/trips/:tripId/availability', availabilityRoutes);

// Global routes
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/join-requests', joinRequestRoutes);
app.use('/api/mystery-trips', mysteryTripRoutes);
app.use('/api/wishlist', wishlistRoutes);


// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    appName: 'JourneyHub',
    version: '1.0.0',
    mode: isMemoryDB() ? 'in-memory-mongodb' : 'persistent-mongodb',
    timestamp: new Date().toISOString()
  });
});

// SPA Fallback for client-side routing
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global Error Handler
app.use(errorHandler);

// Socket.IO event handlers
io.on('connection', (socket) => {
  // Join a trip room for live collaboration updates
  socket.on('join_trip', (tripId) => {
    socket.join(`trip_${tripId}`);
  });

  socket.on('leave_trip', (tripId) => {
    socket.leave(`trip_${tripId}`);
  });

  socket.on('disconnect', () => {});
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await connectDB();

    // Auto-seed if database is empty (e.g. running fresh in-memory)
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('[INIT] Database is empty. Seeding initial demo data...');
      await seed();
    } else {
      // Ensure the three predefined Organiser accounts (Sai, Dhanush, Divya) exist without overwriting
      await seedOrganisers();
    }

    server.listen(PORT, '0.0.0.0', () => {
      const { getEnvDiagnostics } = require('./src/config/env');
      const diag = getEnvDiagnostics();
      console.log(`====================================================`);
      console.log(`🚀 JourneyHub Server running on http://0.0.0.0:${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📦 Database: ${isMemoryDB() ? 'Embedded MongoDB (Self-contained in-memory)' : 'External Persistent MongoDB'}`);
      console.log(`----------------------------------------------------`);
      console.log(`📧 Gmail SMTP Service: ${diag.isConfigured ? 'READY (Real Gmail OTP enabled for ' + diag.smtpUserMasked + ')' : 'UNCONFIGURED'}`);
      console.log(`📱 MSG91 SMS Service:  ${diag.isMsg91Configured ? 'READY (AuthKey: ' + diag.msg91AuthKeyMasked + ', Template: ' + diag.msg91TemplateId + ')' : 'UNCONFIGURED'}`);
      console.log(`====================================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, server, io };
