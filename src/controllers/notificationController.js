const Notification = require('../models/Notification');

/**
 * Get user's notifications
 * GET /api/notifications
 */
async function getNotifications(req, res, next) {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .populate('trip', 'title destination')
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({ user: req.user._id, isRead: false });

    res.json({
      success: true,
      unreadCount,
      notifications
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Mark a single notification as read
 * PUT /api/notifications/:id/read
 */
async function markAsRead(req, res, next) {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    res.json({
      success: true,
      notification
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Mark all notifications as read
 * PUT /api/notifications/read-all
 */
async function markAllAsRead(req, res, next) {
  try {
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a notification
 * DELETE /api/notifications/:id
 */
async function deleteNotification(req, res, next) {
  try {
    const notification = await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    res.json({
      success: true,
      message: 'Notification removed.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Clear all notifications
 * DELETE /api/notifications/clear-all
 */
async function clearAllNotifications(req, res, next) {
  try {
    await Notification.deleteMany({ user: req.user._id });

    res.json({
      success: true,
      message: 'Notification inbox cleared.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications
};
