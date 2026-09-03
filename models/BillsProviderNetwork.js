
// ------------------------------------------------
// BillsProviderNetwork model
// Stores service IDs fetched from each provider.
// Populated automatically when provider syncs.
// One document per network/disco/provider combo.
// e.g. VTUGate + airtime + mtn = service_id 58
// ------------------------------------------------

const mongoose = require('mongoose');

const billsProviderNetworkSchema = new mongoose.Schema(
  {
    provider_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BillsProvider',
      required: true,
    },
    provider_slug: {
      type: String,
      required: true,
    },
    service_type: {
      type: String,
      enum: ['airtime', 'data', 'electricity', 'tv_subscription', 'exam_cards'],
      required: true,
    },
    // Network/disco/provider name from API
    // e.g. mtn, airtel, ikedc, dstv, waec
    network_name: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    // Display name for UI
    display_name: {
      type: String,
      required: true,
      trim: true,
    },
    // Provider's service ID for this network
    service_id: {
      type: String,
      required: true,
    },
    // Extra provider-specific data
    // e.g. data_type (sme/gifting), disco code etc
    extra_params: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Commission info from provider
    commission_type: { type: String, default: '' },
    commission_value: { type: Number, default: 0 },
    // Admin can hide specific networks
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    // Display order in mobile app
    sort_order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Compound index — one service_id per provider per service type per network
billsProviderNetworkSchema.index(
  { provider_id: 1, service_type: 1, network_name: 1 },
  { unique: true }
);

module.exports = mongoose.model('BillsProviderNetwork', billsProviderNetworkSchema);