const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Profile & Password updates via /api/users
router.patch('/profile', protect, authController.updateProfile);
router.patch('/change-password', protect, authController.changePassword);

// Search & Stats
router.get('/search', protect, userController.searchUsers);
router.get('/stats', protect, userController.getUserStats);

module.exports = router;
