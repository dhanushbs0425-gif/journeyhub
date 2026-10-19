const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a trip title'],
      trim: true
    },
    destination: {
      type: String,
      required: [true, 'Please specify a destination'],
      trim: true
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    startDate: {
      type: Date,
      required: [true, 'Please specify the start date']
    },
    endDate: {
      type: Date,
      required: [true, 'Please specify the end date']
    },
    estimatedBudget: {
      type: Number,
      required: [true, 'Please specify an estimated budget'],
      min: [0, 'Estimated budget must be positive'],
      default: 1000
    },
    currency: {
      type: String,
      default: 'USD'
    },
    coverImage: {
      type: String,
      default: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80'
    },
    status: {
      type: String,
      enum: ['upcoming', 'ongoing', 'completed', 'cancelled', 'published', 'Published', 'draft', 'Draft'],
      default: 'upcoming'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    organiserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    capacity: {
      type: Number,
      default: 15,
      min: [1, 'Capacity must be at least 1']
    },
    availableSeats: {
      type: Number,
      default: 15,
      min: [0, 'Available seats cannot be negative']
    },
    price: {
      type: Number,
      default: 0
    },
    joiningDeadline: {
      type: Date
    },
    isPublished: {
      type: Boolean,
      default: true
    },
    publicationStatus: {
      type: String,
      enum: ['Draft', 'Published', 'Unpublished', 'draft', 'published', 'unpublished'],
      default: 'Published'
    },
    tags: [{
      type: String,
      trim: true
    }],
    emergencyContacts: [{
      name: { type: String, required: true },
      relation: { type: String, default: 'Contact' },
      phone: { type: String, required: true }
    }],
    readinessScore: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

// Ensure organiserId, availableSeats, isPublished, and publicationStatus are synced
tripSchema.pre('save', function (next) {
  if (!this.organiserId && this.createdBy) {
    this.organiserId = this.createdBy;
  }
  if (this.isNew && (this.availableSeats === undefined || this.availableSeats === null)) {
    this.availableSeats = this.capacity || 15;
  }

  // Bidirectional synchronisation between publicationStatus and isPublished
  if (this.publicationStatus) {
    const isPub = (this.publicationStatus || '').toLowerCase() === 'published';
    this.isPublished = isPub;
    this.publicationStatus = isPub ? 'Published' : 'Draft';
  } else {
    this.publicationStatus = this.isPublished !== false ? 'Published' : 'Draft';
  }

  // If status was set to published / Published, normalize status to upcoming while keeping published state
  if (this.status && (this.status === 'published' || this.status === 'Published')) {
    this.isPublished = true;
    this.publicationStatus = 'Published';
    this.status = 'upcoming';
  } else if (this.status && (this.status === 'draft' || this.status === 'Draft')) {
    this.isPublished = false;
    this.publicationStatus = 'Draft';
  }

  next();
});

tripSchema.index({ isPublished: 1, publicationStatus: 1, status: 1 });
tripSchema.index({ organiserId: 1, createdBy: 1 });

// Virtual for trip duration in days
tripSchema.virtual('durationDays').get(function () {
  if (!this.startDate || !this.endDate) return 1;
  const diffTime = Math.abs(new Date(this.endDate) - new Date(this.startDate));
  return Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
});

tripSchema.set('toJSON', { virtuals: true });
tripSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Trip', tripSchema);
