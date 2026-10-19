const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip'
    },
    mysteryTrip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MysteryTrip'
    },
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: [
        'invite',
        'vote',
        'change_request',
        'budget_warning',
        'itinerary_conflict',
        'settlement',
        'general',
        'join_request',
        'join_approved',
        'join_rejected',
        'mystery_join_request',
        'mystery_approved',
        'mystery_rejected',
        'mystery_reveal'
      ],
      default: 'general'
    },
    link: {
      type: String,
      default: ''
    },
    isRead: {
      type: Boolean,
      default: false
    },
    readAt: {
      type: Date
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Map recipient alias to user field if passed
notificationSchema.pre('validate', function (next) {
  if (!this.user && this.get('recipient')) {
    this.user = this.get('recipient');
  }
  next();
});

notificationSchema.virtual('recipient')
  .get(function () { return this.user; })
  .set(function (val) { this.user = val; });

notificationSchema.virtual('unread')
  .get(function () { return !this.isRead; })
  .set(function (val) { this.isRead = !val; });

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
