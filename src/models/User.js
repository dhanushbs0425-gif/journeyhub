const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your full name'],
      trim: true
    },
    email: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      index: true
    },
    phone: {
      type: String,
      trim: true,
      default: '',
      index: true
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false
    },
    role: {
      type: String,
      enum: ['organiser', 'organizer', 'user'],
      default: 'user',
      index: true
    },
    emailVerified: {
      type: Boolean,
      default: true,
      index: true
    },
    phoneVerified: {
      type: Boolean,
      default: false,
      index: true
    },
    verificationMethod: {
      type: String,
      enum: ['phone', 'email'],
      default: 'phone'
    },
    status: {
      type: String,
      enum: ['active', 'pending', 'suspended'],
      default: 'active'
    },
    profile: {
      phone: { type: String, default: '', trim: true },
      avatar: {
        type: String,
        default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'
      },
      bio: {
        type: String,
        maxlength: 300,
        default: 'Passionate globetrotter exploring new horizons.'
      },
      homeCity: { type: String, default: '', trim: true },
      budgetPreference: {
        type: String,
        enum: ['Budget', 'Moderate', 'Luxury', 'Backpacker'],
        default: 'Moderate'
      },
      preferredCategories: [{
        type: String
      }]
    },
    // Top-level mirrors for backward compatibility
    avatar: {
      type: String,
      default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'
    },
    phone: {
      type: String,
      trim: true,
      default: ''
    },
    bio: {
      type: String,
      maxlength: 300,
      default: 'Passionate globetrotter exploring new horizons.'
    },
    preferences: {
      currency: { type: String, default: 'INR' },
      budgetAlertThreshold: { type: Number, default: 80 }, // warning at 80%
      emailNotifications: { type: Boolean, default: true },
      theme: { type: String, enum: ['light', 'dark', 'navy'], default: 'navy' }
    },
    travelInterests: [{
      type: String,
      enum: ['Mountains', 'Beaches', 'Cultural', 'Adventure', 'Foodie', 'Road Trips', 'Heritage', 'Wildlife', 'Urban', 'Spiritual']
    }],
    emergencyContact: {
      name: { type: String, default: '' },
      relationship: { type: String, default: '' },
      phone: { type: String, default: '' }
    }
  },
  { timestamps: true }
);

// Virtual for passwordHash
userSchema.virtual('passwordHash').get(function () {
  return this.password;
}).set(function (val) {
  this.password = val;
});

// Sync top-level fields with profile subdocument before saving
userSchema.pre('save', async function (next) {
  // Sync profile <-> top level
  if (this.profile) {
    if (this.avatar && (!this.profile.avatar || this.isModified('avatar'))) {
      this.profile.avatar = this.avatar;
    } else if (this.profile.avatar) {
      this.avatar = this.profile.avatar;
    }

    if (this.phone && (!this.profile.phone || this.isModified('phone'))) {
      this.profile.phone = this.phone;
    } else if (this.profile.phone) {
      this.phone = this.profile.phone;
    }

    if (this.bio && (!this.profile.bio || this.isModified('bio'))) {
      this.profile.bio = this.bio;
    } else if (this.profile.bio) {
      this.bio = this.profile.bio;
    }
  }

  // Hash password before saving if modified and not already a bcrypt hash
  if (this.isModified('password')) {
    const isAlreadyHashed = typeof this.password === 'string' && /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(this.password);
    if (!isAlreadyHashed) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
  }

  next();
});

// Compare password helper
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Safe JSON serialization (strip password and passwordHash)
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.passwordHash;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
