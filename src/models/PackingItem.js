const mongoose = require('mongoose');

const packingItemSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
      index: true
    },
    title: {
      type: String,
      required: [true, 'Packing item title is required'],
      trim: true
    },
    category: {
      type: String,
      enum: ['Clothing', 'Toiletries', 'Electronics', 'Documents & Money', 'Health & Medical', 'Footwear', 'Gear & Accessories', 'Misc'],
      default: 'Misc'
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1
    },
    isPacked: {
      type: Boolean,
      default: false
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    isShared: {
      type: Boolean,
      default: false
    },
    packedAt: {
      type: Date
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('PackingItem', packingItemSchema);
