
const mongoose = require('mongoose');


// BillsTransaction
// Records every bill payment made by a user.
// Used for history, reporting and reconciliation.


const billsTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tag_id: {
      type: String,
      required: true,
    },
    service_type: {
      type: String,
      enum: ['airtime', 'electricity', 'mobile_data', 'tv_subscription', 'exam_cards'],
      required: true,
    },
    service_title: {
      type: String,
      required: true,
    },
    provider: {
      type: String,
      required: true,
    },
    // Service-specific fields
    phone_number: { type: String, default: '' },
    meter_number: { type: String, default: '' },
    disco_code: { type: String, default: '' },
    meter_type: { type: String, default: '' },
    smartcard_number: { type: String, default: '' },
    customer_name: { type: String, default: '' },
    bouquet: { type: String, default: '' },
    network: { type: String, default: '' },
    data_plan: { type: String, default: '' },
    exam_type: { type: String, default: '' },
    quantity: { type: Number, default: 1 },
    delivery_phone: { type: String, default: '' },
    delivery_email: { type: String, default: '' },
    // Delivered pins (exam cards)
    pins_delivered: [{ type: String }],
    // Token (electricity)
    token_delivered: { type: String, default: '' },
    // Financial
    amount: {
      type: Number,
      required: true,
    },
    fee: {
      type: Number,
      default: 0,
    },
    total_amount: {
      type: Number,
      required: true,
    },
    wallet_balance_before: {
      type: Number,
      required: true,
    },
    wallet_balance_after: {
      type: Number,
      required: true,
    },
    // Coins earned on this transaction
    coins_earned: {
      type: Number,
      default: 0,
    },
    // Provider response
    provider_reference: { type: String, default: '' },
    provider_response: { type: mongoose.Schema.Types.Mixed, default: {} },
    // Transaction status
    status: {
      type: String,
      enum: ['pending', 'success', 'failed', 'refunded'],
      default: 'pending',
    },
    // Internal reference
    reference: {
      type: String,
      unique: true,
      required: true,
    },
  },
  { timestamps: true }
);

// Index for fast history queries
billsTransactionSchema.index({ userId: 1, createdAt: -1 });
billsTransactionSchema.index({ reference: 1 });
billsTransactionSchema.index({ status: 1 });

module.exports = mongoose.model('BillsTransaction', billsTransactionSchema);