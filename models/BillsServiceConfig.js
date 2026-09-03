
// ------------------------------------------------
// BillsServiceConfig model
// One document per service type.
// Admin sets active provider here.
// System always falls back to VTUGate if
// no active provider is set.
// ------------------------------------------------

const mongoose = require('mongoose');

const billsServiceConfigSchema = new mongoose.Schema(
  {
    service_type: {
      type: String,
      enum: ['airtime', 'data', 'electricity', 'tv_subscription', 'exam_cards'],
      required: true,
      unique: true,
    },
    // Active provider for this service
    active_provider_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BillsProvider',
      default: null,
    },
    // Fallback provider (always VTUGate)
    fallback_provider_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BillsProvider',
      default: null,
    },
    // Service visibility to users
    status: {
      type: String,
      enum: ['active', 'paused', 'hidden'],
      default: 'active',
    },
    updated_by: {
      type: String,
      default: 'system',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BillsServiceConfig', billsServiceConfigSchema);