
// ------------------------------------------------
// BillsProvider model
// Stores bill payment provider credentials.
// API keys are AES-256-GCM encrypted before save.
// adapter_name maps to services/adapters/ folder.
// ------------------------------------------------

const mongoose = require('mongoose');

const billsProviderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // AES-256 encrypted API key
    api_key_encrypted: {
      type: String,
      required: true,
    },
    base_url: {
      type: String,
      required: true,
      trim: true,
    },
    // Maps to services/adapters/<adapter_name>Adapter.js
    adapter_name: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    // Which service types this provider supports
    supported_services: {
      airtime: { type: Boolean, default: false },
      data: { type: Boolean, default: false },
      electricity: { type: Boolean, default: false },
      tv_subscription: { type: Boolean, default: false },
      exam_cards: { type: Boolean, default: false },
    },
    // Overall provider status
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'inactive',
    },
    is_fallback: {
      type: Boolean,
      default: false,
    },
    added_by: {
      type: String,
      default: 'system',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BillsProvider', billsProviderSchema);